<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\NovacityEndpointsController;
use App\Models\EndpointDataset;
use App\Models\Role;
use App\Models\User;
use App\Services\EndpointDatasetRegistry;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EndpointToggleTest extends TestCase
{
    use RefreshDatabase;

    private string $dataFile;

    protected function setUp(): void
    {
        parent::setUp();

        $this->dataFile = storage_path('framework/testing/endpoint-toggle-data.json');

        @mkdir(dirname($this->dataFile), 0755, true);

        config([
            'novacity.data_file' => 'framework/testing/endpoint-toggle-data.json',
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
            'response' => [
                'success' => true,
                'source' => 'SDT',
                'columns' => ['ProdGroup', 'WIP_Chaine'],
                'data' => [['ProdGroup' => 'A', 'WIP_Chaine' => 1]],
            ],
        ];
    }

    private function writeData(array $items): void
    {
        file_put_contents($this->dataFile, json_encode($items, JSON_PRETTY_PRINT));
    }

    private function datasetSlugs(): array
    {
        app(EndpointDatasetRegistry::class)->forgetCache();

        return $this->actingAs($this->userWithRole('admin'))
            ->getJson('/api/endpoint-datasets')
            ->assertOk()
            ->json('datasets.*.slug');
    }

    public function test_list_exposes_disabled_flag(): void
    {
        $this->writeData([
            $this->item('ep-1', 'a', 'https://api.test/api/data/a'),
        ]);

        $this->actingAs($this->userWithRole('it'))
            ->getJson('/novacity-endpoints/list')
            ->assertOk()
            ->assertJsonPath('items.0.disabled', false);
    }

    public function test_toggle_removes_dataset_and_excludes_from_schema(): void
    {
        $this->writeData([
            $this->item('ep-1', 'a', 'https://api.test/api/data/a'),
            $this->item('ep-2', 'b', 'https://api.test/api/data/b'),
        ]);

        EndpointDataset::updateOrCreate(
            ['slug' => 'api/data/a'],
            ['name' => 'a', 'method' => 'GET', 'columns' => [], 'sample_data' => [], 'row_count' => 0, 'last_status' => 'ok'],
        );
        EndpointDataset::updateOrCreate(
            ['slug' => 'api/data/b'],
            ['name' => 'b', 'method' => 'GET', 'columns' => [], 'sample_data' => [], 'row_count' => 0, 'last_status' => 'ok'],
        );

        $this->actingAs($this->userWithRole('it'))
            ->patchJson('/novacity-endpoints/ep-1/toggle', ['disabled' => true])
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('entry.disabled', true);

        $slugs = $this->datasetSlugs();

        $this->assertNotContains('api/data/a', $slugs);
        $this->assertContains('api/data/b', $slugs);

        $this->assertNull(EndpointDataset::where('slug', 'api/data/a')->first());

        $schema = $this->actingAs($this->userWithRole('it'))
            ->getJson('/novacity-endpoints/schema')
            ->assertOk()
            ->json('entries.*.slug');

        $this->assertNotContains('api/data/a', $schema);
        $this->assertContains('api/data/b', $schema);
    }

    public function test_reenable_restores_dataset_entry(): void
    {
        $this->writeData([
            $this->item('ep-1', 'a', 'https://api.test/api/data/a'),
        ]);

        $this->actingAs($this->userWithRole('it'))
            ->patchJson('/novacity-endpoints/ep-1/toggle', ['disabled' => true])
            ->assertOk();

        $this->assertNull(EndpointDataset::where('slug', 'api/data/a')->first());

        $this->actingAs($this->userWithRole('it'))
            ->patchJson('/novacity-endpoints/ep-1/toggle', ['disabled' => false])
            ->assertOk()
            ->assertJsonPath('entry.disabled', false);

        $this->assertNotNull(EndpointDataset::where('slug', 'api/data/a')->first());
        $this->assertContains('api/data/a', $this->datasetSlugs());
    }

    public function test_update_accepts_disabled_flag(): void
    {
        $this->writeData([
            $this->item('ep-1', 'a', 'https://api.test/api/data/a'),
        ]);

        $this->actingAs($this->userWithRole('it'))
            ->putJson('/novacity-endpoints/ep-1', ['disabled' => true])
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->actingAs($this->userWithRole('it'))
            ->getJson('/novacity-endpoints/list?enabled=0')
            ->assertOk()
            ->assertJsonPath('items.0.disabled', true);

        $this->assertNotContains('api/data/a', $this->datasetSlugs());
    }

    public function test_toggle_requires_it_role(): void
    {
        $this->writeData([
            $this->item('ep-1', 'a', 'https://api.test/api/data/a'),
        ]);

        $this->actingAs($this->userWithRole('resp_production'))
            ->patchJson('/novacity-endpoints/ep-1/toggle', ['disabled' => true])
            ->assertForbidden();
    }
}
