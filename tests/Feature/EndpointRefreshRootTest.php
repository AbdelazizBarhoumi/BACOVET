<?php

namespace Tests\Feature;

use App\Models\EndpointDataset;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class EndpointRefreshRootTest extends TestCase
{
    use RefreshDatabase;

    private string $dataFile;

    protected function setUp(): void
    {
        parent::setUp();

        $this->dataFile = storage_path('framework/testing/endpoint-refresh-root-data.json');

        @mkdir(dirname($this->dataFile), 0755, true);

        config([
            'novacity.data_file' => 'framework/testing/endpoint-refresh-root-data.json',
            'novacity.refresh_meta' => 'framework/testing/endpoint-refresh-root-meta.json',
            'novacity.base_url' => 'https://api.primary.test',
            'novacity.api_key' => 'test-key',
            'novacity.admin_token' => '',
            'novacity.web_timeout' => 60,
        ]);
    }

    protected function tearDown(): void
    {
        @unlink($this->dataFile);
        @unlink(storage_path('framework/testing/endpoint-refresh-root-meta.json'));
        parent::tearDown();
    }

    private function userWithRole(string $slug): User
    {
        $role = Role::updateOrCreate(
            ['slug' => $slug],
            ['name' => $slug, 'slug' => $slug],
        );

        return User::factory()->create([
            'role_id' => $role->id,
            'is_active' => true,
        ]);
    }

    private function writeData(array $items): void
    {
        file_put_contents($this->dataFile, json_encode($items, JSON_PRETTY_PRINT));
    }

    private function item(string $id, string $name, string $endpoint): array
    {
        return [
            'id' => $id,
            'name' => $name,
            'method' => 'GET',
            'endpoint' => $endpoint,
            'status' => 200,
            'response' => ['success' => true, 'data' => []],
        ];
    }

    public function test_refresh_runs_full_phase(): void
    {
        $this->writeData([
            $this->item('ep-1', 'a', 'https://api.primary.test/api/data/a'),
        ]);

        Artisan::spy()
            ->shouldReceive('call')
            ->once()
            ->with('sync:endpoint-data', [
                '--phase' => 'all',
                '--force' => true,
                '--timeout' => 60,
            ])
            ->andReturn(0);

        $this->actingAs($this->userWithRole('it'))
            ->postJson('/novacity-endpoints/refresh')
            ->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_refresh_one_targets_endpoints_own_root(): void
    {
        $this->writeData([
            $this->item('ep-1', 'a', 'https://api.primary.test/api/data/a'),
            $this->item('ep-2', 'b', 'https://api.custom.test/api/data/b'),
        ]);

        Artisan::spy()
            ->shouldReceive('call')
            ->once()
            ->with('sync:endpoint-data', [
                '--phase' => 'refresh',
                '--force' => true,
                '--timeout' => 60,
                '--id' => 'ep-2',
            ])
            ->andReturn(0);

        $this->actingAs($this->userWithRole('it'))
            ->postJson('/novacity-endpoints/'.urlencode('ep-2').'/refresh')
            ->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_command_refresh_one_hits_custom_root(): void
    {
        $this->writeData([
            $this->item('ep-1', 'a', 'https://api.primary.test/api/data/a'),
            $this->item('ep-2', 'b', 'https://api.custom.test/api/data/b'),
        ]);

        Http::fake([
            'https://api.primary.test/api/data/a*' => Http::response(['success' => true, 'data' => []], 200),
            'https://api.custom.test/api/data/b*' => Http::response(['success' => true, 'data' => []], 200),
        ]);

        $this->artisan('sync:endpoint-data', [
            '--phase' => 'refresh',
            '--force' => true,
            '--retry' => 0,
            '--id' => 'ep-2',
        ])->assertSuccessful();

        Http::assertSent(fn ($request) => str_starts_with($request->url(), 'https://api.custom.test/api/data/b'));
        Http::assertNotSent(fn ($request) => str_starts_with($request->url(), 'https://api.primary.test'));
    }

    public function test_command_refresh_one_updates_dataset_row(): void
    {
        $this->writeData([
            $this->item('ep-1', 'a', 'https://api.primary.test/api/data/a'),
            $this->item('ep-2', 'b', 'https://api.custom.test/api/data/b'),
        ]);

        Http::fake([
            'https://api.custom.test/api/data/b*' => Http::response([
                'success' => true,
                'data' => [
                    ['id' => 1, 'label' => 'LIVE'],
                    ['id' => 2, 'label' => 'FRESH'],
                ],
            ], 200),
        ]);

        $this->artisan('sync:endpoint-data', [
            '--phase' => 'refresh',
            '--force' => true,
            '--retry' => 0,
            '--id' => 'ep-2',
        ])->assertSuccessful();

        $dataset = EndpointDataset::where('slug', 'api/data/b')->first();

        $this->assertNotNull($dataset);
        $this->assertSame(2, $dataset->row_count);
        $this->assertSame('ok', $dataset->last_status);
        $this->assertSame('LIVE', $dataset->sample_data[0]['label'] ?? null);
    }
}
