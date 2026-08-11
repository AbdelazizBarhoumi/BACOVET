<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\NovacityEndpointsController;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EndpointListRootTest extends TestCase
{
    use RefreshDatabase;

    private string $dataFile;

    protected function setUp(): void
    {
        parent::setUp();

        $this->dataFile = storage_path('framework/testing/endpoint-list-root-data.json');

        @mkdir(dirname($this->dataFile), 0755, true);

        config([
            'novacity.data_file' => 'framework/testing/endpoint-list-root-data.json',
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

    private function writeData(array $items): void
    {
        file_put_contents($this->dataFile, json_encode($items, JSON_PRETTY_PRINT));
    }

    public function test_list_exposes_root_and_by_root(): void
    {
        $this->writeData([
            $this->item('ep-1', 'a', 'https://api.primary.test/api/data/a'),
            $this->item('ep-2', 'b', 'https://api.custom.test/api/data/b'),
        ]);

        $response = $this->actingAs($this->userWithRole('it'))
            ->getJson('/novacity-endpoints/list')
            ->assertOk();

        $response->assertJsonPath('items.0.root', 'https://api.primary.test');

        $json = $response->json();

        $this->assertSame(1, $json['stats']['by_root']['https://api.primary.test']);
        $this->assertSame(1, $json['stats']['by_root']['https://api.custom.test']);
    }

    public function test_list_filters_by_root(): void
    {
        $this->writeData([
            $this->item('ep-1', 'a', 'https://api.primary.test/api/data/a'),
            $this->item('ep-2', 'b', 'https://api.custom.test/api/data/b'),
            $this->item('ep-3', 'c', 'https://api.primary.test/api/data/c'),
        ]);

        $response = $this->actingAs($this->userWithRole('it'))
            ->getJson('/novacity-endpoints/list?root=https%3A%2F%2Fapi.primary.test')
            ->assertOk();

        $ids = collect($response->json('items'))->pluck('id')->all();
        $this->assertSame(['ep-1', 'ep-3'], $ids);
    }
}
