<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\NovacityEndpointsController;
use App\Models\EndpointDataset;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Process\PendingProcess;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Process;
use Tests\TestCase;

class EndpointDatasetsFallbackTest extends TestCase
{
    use RefreshDatabase;

    private string $dataFile;

    private string $disabledRootsFile;

    protected function setUp(): void
    {
        parent::setUp();

        $this->dataFile = storage_path('framework/testing/endpoint-datasets-fallback-data.json');
        $this->disabledRootsFile = storage_path('framework/testing/endpoint-disabled-roots.json');

        @mkdir(dirname($this->dataFile), 0755, true);

        config([
            'novacity.data_file' => 'framework/testing/endpoint-datasets-fallback-data.json',
        ]);

        $this->writeData([
            [
                'id' => 'ep-1',
                'name' => 'wip_chaine (SDT)',
                'method' => 'GET',
                'endpoint' => 'https://api.primary.test/api/data/q/wip_chaine',
                'status' => 200,
                'response' => [
                    'success' => true,
                    'source' => 'SDT',
                    'columns' => ['ProdGroup', 'WIP_Chaine'],
                    'data' => array_map(
                        fn (int $i): array => ['ProdGroup' => "CH{$i}J", 'WIP_Chaine' => $i],
                        range(1, 27),
                    ),
                ],
            ],
            [
                'id' => 'ep-2',
                'name' => 'taging_reel (QCM)',
                'method' => 'GET',
                'endpoint' => 'https://api.primary.test/api/data/q/taging_reel',
                'status' => 200,
                'response' => [
                    'success' => true,
                    'source' => 'QCM',
                    'columns' => ['MONo', 'ProdGroup'],
                    'data' => array_map(
                        fn (int $i): array => ['MONo' => "MO{$i}", 'ProdGroup' => 'A'],
                        range(1, 100),
                    ),
                ],
            ],
        ]);

        NovacityEndpointsController::flushCache();
    }

    protected function tearDown(): void
    {
        @unlink($this->dataFile);
        @unlink($this->disabledRootsFile);
        NovacityEndpointsController::flushCache();
        parent::tearDown();
    }

    private function writeData(array $items): void
    {
        file_put_contents($this->dataFile, json_encode($items, JSON_PRETTY_PRINT));
    }

    private function userWithRole(): User
    {
        $role = Role::updateOrCreate(
            ['slug' => 'admin'],
            ['name' => 'Admin', 'slug' => 'admin'],
        );

        return User::factory()->create([
            'role_id' => $role->id,
            'is_active' => true,
        ]);
    }

    public function test_datasets_fall_back_to_data_json_rows_when_the_db_never_synced(): void
    {
        $user = $this->userWithRole();

        $response = $this->actingAs($user)->getJson('/api/endpoint-datasets');

        $response->assertOk()
            ->assertJsonStructure(['datasets' => ['*' => ['slug', 'name', 'sample_data', 'row_count']]]);

        $bySlug = collect($response->json('datasets'))->keyBy('slug');

        $expected = [
            'api/data/q/wip_chaine' => 27,
            'api/data/q/taging_reel' => 100,
        ];

        foreach ($expected as $slug => $count) {
            $this->assertTrue($bySlug->has($slug), "{$slug} missing from /api/endpoint-datasets");

            $dataset = $bySlug[$slug];

            $this->assertIsArray($dataset['sample_data']);
            $this->assertCount($count, $dataset['sample_data']);
            $this->assertSame($count, $dataset['row_count']);
        }
    }

    public function test_live_synced_rows_win_over_the_data_json_snapshot(): void
    {
        $user = $this->userWithRole();

        EndpointDataset::updateOrCreate(
            ['slug' => 'api/data/q/wip_chaine'],
            [
                'name' => 'wip_chaine',
                'method' => 'GET',
                'label' => null,
                'object' => null,
                'object_type' => null,
                'source' => 'SDT',
                'columns' => [
                    ['name' => 'ProdGroup', 'type' => 'text'],
                    ['name' => 'WIP_Chaine', 'type' => 'number'],
                ],
                'sample_data' => [['ProdGroup' => 'LIVE', 'WIP_Chaine' => 5]],
                'row_count' => 1,
                'last_status' => 'ok',
            ],
        );

        $dataset = collect(
            $this->actingAs($user)->json('GET', '/api/endpoint-datasets')->json('datasets'),
        )->firstWhere('slug', 'api/data/q/wip_chaine');

        $this->assertNotNull($dataset);
        $this->assertSame([['ProdGroup' => 'LIVE', 'WIP_Chaine' => 5]], $dataset['sample_data']);
        $this->assertSame(1, $dataset['row_count']);
    }

    public function test_sync_endpoint_is_fire_and_forget_detached(): void
    {
        $user = $this->userWithRole();

        Process::fake();

        $this->actingAs($user)
            ->postJson('/api/endpoint-datasets/sync')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('queued', true)
            ->assertJsonPath('running', true);

        Process::assertRan(fn (PendingProcess $process) => str_contains((string) $process->command ?? '', 'endpoint-sync:run'));
    }

    public function test_sync_endpoint_acks_when_a_sweep_is_already_running(): void
    {
        $user = $this->userWithRole();

        Cache::put(
            \App\Console\Commands\RunEndpointSync::RUNNING_KEY,
            now()->toIso8601String(),
            now()->addHours(2),
        );

        $this->actingAs($user)
            ->postJson('/api/endpoint-datasets/sync')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('queued', false)
            ->assertJsonPath('reason', 'already_running');

        Process::assertNothingRan();
    }
}
