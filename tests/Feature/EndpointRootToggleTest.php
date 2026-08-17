<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\NovacityEndpointsController;
use App\Models\EndpointDataset;
use App\Models\Role;
use App\Models\User;
use App\Services\EndpointDatasetRegistry;
use App\Support\RootState;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EndpointRootToggleTest extends TestCase
{
    use RefreshDatabase;

    private string $dataFile;

    private string $disabledRootsFile;

    protected function setUp(): void
    {
        parent::setUp();

        $this->dataFile = storage_path('framework/testing/endpoint-root-toggle-data.json');
        $this->disabledRootsFile = storage_path('framework/testing/endpoint-disabled-roots.json');

        @mkdir(dirname($this->dataFile), 0755, true);

        config([
            'novacity.data_file' => 'framework/testing/endpoint-root-toggle-data.json',
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

    public function test_disabling_a_root_disables_all_its_endpoints(): void
    {
        $this->writeData([
            $this->item('ep-1', 'a', 'https://api.test/api/data/a'),
            $this->item('ep-2', 'b', 'https://api.test/api/data/b'),
            $this->item('ep-3', 'c', 'https://api.other/api/data/c'),
        ]);

        foreach (['api/data/a', 'api/data/b', 'api/data/c'] as $slug) {
            EndpointDataset::updateOrCreate(
                ['slug' => $slug],
                ['name' => $slug, 'method' => 'GET', 'columns' => [], 'sample_data' => [], 'row_count' => 0, 'last_status' => 'ok'],
            );
        }

        $this->actingAs($this->userWithRole('it'))
            ->postJson('/novacity-endpoints/roots/toggle', [
                'root' => 'https://api.test',
                'disabled' => true,
            ])
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('root', 'https://api.test')
            ->assertJsonPath('disabled', true)
            ->assertJsonPath('count', 2);

        $slugs = $this->datasetSlugs();

        $this->assertNotContains('api/data/a', $slugs);
        $this->assertNotContains('api/data/b', $slugs);
        $this->assertContains('api/data/c', $slugs);

        $items = $this->actingAs($this->userWithRole('it'))
            ->getJson('/novacity-endpoints/list?enabled=all')
            ->assertOk()
            ->json('items');

        $byId = collect($items)->keyBy('id');

        $this->assertTrue($byId['ep-1']['disabled']);
        $this->assertTrue($byId['ep-1']['root_disabled']);
        $this->assertTrue($byId['ep-2']['disabled']);
        $this->assertTrue($byId['ep-2']['root_disabled']);
        $this->assertFalse($byId['ep-3']['disabled']);
        $this->assertFalse($byId['ep-3']['root_disabled']);

        $schema = $this->actingAs($this->userWithRole('it'))
            ->getJson('/novacity-endpoints/schema')
            ->assertOk()
            ->json('entries.*.slug');

        $this->assertNotContains('api/data/a', $schema);
        $this->assertNotContains('api/data/b', $schema);
        $this->assertContains('api/data/c', $schema);
    }

    public function test_reenabling_a_root_restores_dataset_rows(): void
    {
        $this->writeData([
            $this->item('ep-1', 'a', 'https://api.test/api/data/a'),
        ]);

        $this->actingAs($this->userWithRole('it'))
            ->postJson('/novacity-endpoints/roots/toggle', [
                'root' => 'https://api.test',
                'disabled' => true,
            ])
            ->assertOk();

        $this->assertNull(EndpointDataset::where('slug', 'api/data/a')->first());

        $this->actingAs($this->userWithRole('it'))
            ->postJson('/novacity-endpoints/roots/toggle', [
                'root' => 'https://api.test',
                'disabled' => false,
            ])
            ->assertOk()
            ->assertJsonPath('disabled', false)
            ->assertJsonPath('count', 1);

        $this->assertNotNull(EndpointDataset::where('slug', 'api/data/a')->first());
        $this->assertContains('api/data/a', $this->datasetSlugs());

        $items = $this->actingAs($this->userWithRole('it'))
            ->getJson('/novacity-endpoints/list')
            ->assertOk()
            ->json('items');

        $this->assertFalse($items[0]['disabled']);
        $this->assertFalse($items[0]['root_disabled']);
    }

    public function test_roots_endpoint_exposes_disabled_flag(): void
    {
        $this->writeData([
            $this->item('ep-1', 'a', 'https://api.test/api/data/a'),
            $this->item('ep-2', 'b', 'https://api.test/api/data/b'),
        ]);

        $this->actingAs($this->userWithRole('it'))
            ->postJson('/novacity-endpoints/roots/toggle', [
                'root' => 'https://api.test',
                'disabled' => true,
            ])
            ->assertOk();

        $roots = $this->actingAs($this->userWithRole('it'))
            ->getJson('/novacity-endpoints/roots')
            ->assertOk()
            ->json('roots');

        $root = collect($roots)->firstWhere('root', 'https://api.test');

        $this->assertNotNull($root);
        $this->assertTrue($root['disabled']);
        $this->assertSame(2, $root['count']);
    }

    public function test_individual_toggle_cannot_beat_a_disabled_root(): void
    {
        $this->writeData([
            $this->item('ep-1', 'a', 'https://api.test/api/data/a'),
        ]);

        $this->actingAs($this->userWithRole('it'))
            ->postJson('/novacity-endpoints/roots/toggle', [
                'root' => 'https://api.test',
                'disabled' => true,
            ])
            ->assertOk();

        // Re-enabling the individual endpoint does not bring it back while
        // its root stays disabled.
        $this->actingAs($this->userWithRole('it'))
            ->patchJson('/novacity-endpoints/ep-1/toggle', ['disabled' => false])
            ->assertOk()
            ->assertJsonPath('entry.disabled', true)
            ->assertJsonPath('entry.root_disabled', true);

        $this->assertNull(EndpointDataset::where('slug', 'api/data/a')->first());
    }

    public function test_refresh_group_on_disabled_root_errors(): void
    {
        $this->writeData([
            $this->item('ep-1', 'a', 'https://api.test/api/data/a'),
        ]);

        $this->actingAs($this->userWithRole('it'))
            ->postJson('/novacity-endpoints/roots/toggle', [
                'root' => 'https://api.test',
                'disabled' => true,
            ])
            ->assertOk();

        $this->actingAs($this->userWithRole('it'))
            ->postJson('/novacity-endpoints/refresh-group', [
                'root' => 'https://api.test',
            ])
            ->assertStatus(400)
            ->assertJsonPath('success', false)
            ->assertJsonPath('error', 'Racine désactivée — réactivez-la pour rafraîchir');
    }

    public function test_toggle_root_requires_it_role(): void
    {
        $this->writeData([
            $this->item('ep-1', 'a', 'https://api.test/api/data/a'),
        ]);

        $this->actingAs($this->userWithRole('resp_production'))
            ->postJson('/novacity-endpoints/roots/toggle', [
                'root' => 'https://api.test',
                'disabled' => true,
            ])
            ->assertForbidden();

        $this->assertFalse(RootState::isRootDisabled('https://api.test'));
    }
}