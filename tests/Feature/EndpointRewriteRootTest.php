<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\NovacityEndpointsController;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EndpointRewriteRootTest extends TestCase
{
    use RefreshDatabase;

    private string $dataFile;

    protected function setUp(): void
    {
        parent::setUp();

        $this->dataFile = storage_path('framework/testing/endpoint-rewrite-data.json');

        @mkdir(dirname($this->dataFile), 0755, true);

        config([
            'novacity.data_file' => 'framework/testing/endpoint-rewrite-data.json',
        ]);

        NovacityEndpointsController::flushCache();
    }

    protected function tearDown(): void
    {
        @unlink($this->dataFile);
        NovacityEndpointsController::flushCache();
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

    private function readData(): array
    {
        return json_decode((string) file_get_contents($this->dataFile), true);
    }

    private function item(string $id, string $name, string $endpoint): array
    {
        return [
            'id' => $id,
            'name' => $name,
            'method' => 'GET',
            'endpoint' => $endpoint,
            'status' => 200,
            'response' => new \stdClass,
        ];
    }

    public function test_rewrite_root_requires_it_role(): void
    {
        $this->actingAs($this->userWithRole('resp_production'))
            ->postJson('/novacity-endpoints/rewrite-root', [
                'old_root' => 'https://old.example.com',
                'new_root' => 'https://new.example.com',
            ])
            ->assertForbidden();
    }

    public function test_rewrites_only_endpoints_matching_the_old_root(): void
    {
        $this->writeData([
            $this->item('ep-1', 'a', 'https://old.example.com/api/data/a'),
            $this->item('ep-2', 'b', 'https://old.example.com/api/data/b?limit=10'),
            $this->item('ep-3', 'c', 'https://custom.example.com/api/data/c'),
        ]);

        $this->actingAs($this->userWithRole('it'))
            ->postJson('/novacity-endpoints/rewrite-root', [
                'old_root' => 'https://old.example.com',
                'new_root' => 'https://new.example.com',
            ])
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('changed', 2);

        $byId = collect($this->readData())->keyBy('id');

        $this->assertSame('https://new.example.com/api/data/a', $byId['ep-1']['endpoint']);
        $this->assertSame('https://new.example.com/api/data/b?limit=10', $byId['ep-2']['endpoint']);
        $this->assertSame('https://custom.example.com/api/data/c', $byId['ep-3']['endpoint']);
    }

    public function test_noop_when_roots_only_differ_by_trailing_slash(): void
    {
        $this->writeData([
            $this->item('ep-1', 'a', 'https://old.example.com/api/data/a'),
        ]);

        $this->actingAs($this->userWithRole('it'))
            ->postJson('/novacity-endpoints/rewrite-root', [
                'old_root' => 'https://old.example.com',
                'new_root' => 'https://old.example.com/',
            ])
            ->assertOk()
            ->assertJsonPath('changed', 0);
    }
}
