<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class EndpointGroupRefreshTest extends TestCase
{
    use RefreshDatabase;

    private string $dataFile;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');

        $this->dataFile = storage_path('framework/testing/endpoint-group-data.json');

        @mkdir(dirname($this->dataFile), 0755, true);

        config([
            'novacity.data_file' => 'framework/testing/endpoint-group-data.json',
            'novacity.refresh_meta' => 'framework/testing/endpoint-group-meta.json',
            'novacity.base_url' => 'https://api.primary.test',
            'novacity.api_key' => 'test-key',
        ]);
    }

    protected function tearDown(): void
    {
        @unlink($this->dataFile);
        @unlink(storage_path('framework/testing/endpoint-group-meta.json'));
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

    public function test_refresh_group_requires_it_role(): void
    {
        $this->writeData([
            $this->item('ep-1', 'a', 'https://api.primary.test/api/data/a'),
        ]);

        $this->actingAs($this->userWithRole('resp_production'))
            ->postJson('/novacity-endpoints/refresh-group', [
                'root' => 'https://api.primary.test',
            ])
            ->assertForbidden();
    }

    public function test_refresh_group_runs_command_with_root(): void
    {
        config(['novacity.web_timeout' => 60]);

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
                '--root' => 'https://api.custom.test',
            ])
            ->andReturn(0);

        $this->actingAs($this->userWithRole('it'))
            ->postJson('/novacity-endpoints/refresh-group', [
                'root' => 'https://api.custom.test',
            ])
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['meta', 'retry_pending_count', 'retry_ids']);
    }
}
