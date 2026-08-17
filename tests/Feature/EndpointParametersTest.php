<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\NovacityEndpointsController;
use App\Models\Role;
use App\Models\User;
use App\Support\RootParameters;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EndpointParametersTest extends TestCase
{
    use RefreshDatabase;

    private string $dataFile;

    private string $paramsFile;

    protected function setUp(): void
    {
        parent::setUp();

        $this->dataFile = storage_path('framework/testing/endpoint-params-data.json');
        $this->paramsFile = storage_path('framework/testing/endpoint-params-test.json');

        @mkdir(dirname($this->dataFile), 0755, true);

        config([
            'novacity.data_file' => 'framework/testing/endpoint-params-data.json',
            'novacity.params_file' => 'framework/testing/endpoint-params-test.json',
        ]);

        NovacityEndpointsController::flushCache();
    }

    protected function tearDown(): void
    {
        @unlink($this->dataFile);
        @unlink($this->paramsFile);
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
                'columns' => ['Composant', 'Qte'],
                'data' => [['Composant' => 'A', 'Qte' => 1]],
            ],
        ];
    }

    private function writeData(array $items): void
    {
        file_put_contents($this->dataFile, json_encode($items, JSON_PRETTY_PRINT));
    }

    public function test_set_parameter_rewrites_the_stored_url_and_preserves_others(): void
    {
        $this->writeData([
            $this->item('ep-1', 'Efficience', 'https://api.test/data/kpi/efficience-chaine?chaine=CH01&limit=100&offset=0'),
        ]);

        $this->actingAs($this->userWithRole('it'))
            ->postJson('/novacity-endpoints/ep-1/parameter', [
                'name' => 'chaine',
                'value' => 'CH02',
            ])
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('entry.endpoint', 'https://api.test/data/kpi/efficience-chaine?chaine=CH02&limit=100&offset=0');
    }

    public function test_set_parameter_appends_when_the_url_has_no_query(): void
    {
        $this->writeData([
            $this->item('ep-1', 'OF', 'https://api.test/data/of-chaine'),
        ]);

        $this->actingAs($this->userWithRole('it'))
            ->postJson('/novacity-endpoints/ep-1/parameter', [
                'name' => 'chaine',
                'value' => 'CH01',
            ])
            ->assertOk()
            ->assertJsonPath('entry.endpoint', 'https://api.test/data/of-chaine?chaine=CH01');
    }

    public function test_summary_exposes_declared_parameters_with_selected_value(): void
    {
        $this->writeData([
            $this->item('ep-1', 'Efficience', 'https://api.test/data/kpi/efficience-chaine?chaine=CH01'),
        ]);

        RootParameters::save('https://api.test', [
            ['name' => 'chaine', 'values' => ['CH01', 'CH02', 'CH03']],
        ]);

        $this->actingAs($this->userWithRole('it'))
            ->getJson('/novacity-endpoints/list')
            ->assertOk()
            ->assertJsonPath('items.0.parameters.0.name', 'chaine')
            ->assertJsonPath('items.0.parameters.0.selected', 'CH01')
            ->assertJsonPath('items.0.parameters.0.values', ['CH01', 'CH02', 'CH03']);
    }

    public function test_summary_omits_parameters_not_present_in_the_url(): void
    {
        $this->writeData([
            $this->item('ep-1', 'Efficience', 'https://api.test/data/kpi/efficience-chaine'),
        ]);

        RootParameters::save('https://api.test', [
            ['name' => 'chaine', 'values' => ['CH01', 'CH02']],
        ]);

        $this->actingAs($this->userWithRole('it'))
            ->getJson('/novacity-endpoints/list')
            ->assertOk()
            ->assertJsonPath('items.0.parameters', []);
    }

    public function test_parameters_are_scoped_to_the_endpoint_root(): void
    {
        $this->writeData([
            $this->item('ep-1', 'Efficience', 'https://api.test/data/kpi/efficience-chaine?chaine=CH01'),
            $this->item('ep-2', 'Wip', 'https://other.test/api/data/q/wip_chaine?chaine=CH01'),
        ]);

        RootParameters::save('https://api.test', [
            ['name' => 'chaine', 'values' => ['CH01', 'CH02']],
        ]);

        $this->actingAs($this->userWithRole('it'))
            ->getJson('/novacity-endpoints/list')
            ->assertOk()
            ->assertJsonCount(1, 'items.0.parameters')
            ->assertJsonPath('items.1.parameters', []);
    }

    public function test_store_and_list_root_parameters(): void
    {
        $this->writeData([
            $this->item('ep-1', 'Efficience', 'https://api.test/data/kpi/efficience-chaine?chaine=CH01'),
        ]);

        $this->actingAs($this->userWithRole('it'))
            ->postJson('/novacity-endpoints/params/roots', [
                'root' => 'https://api.test',
                'parameters' => [
                    ['name' => 'chaine', 'values' => ['CH01', 'CH02', 'CH03', 'CH04']],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('parameters.0.values', ['CH01', 'CH02', 'CH03', 'CH04']);

        $this->actingAs($this->userWithRole('it'))
            ->getJson('/novacity-endpoints/params')
            ->assertOk()
            ->assertJsonPath('roots.0.root', 'https://api.test')
            ->assertJsonPath('roots.0.parameters.0.name', 'chaine');
    }

    public function test_delete_root_parameter(): void
    {
        $this->writeData([
            $this->item('ep-1', 'Efficience', 'https://api.test/data/kpi/efficience-chaine?chaine=CH01'),
        ]);

        RootParameters::save('https://api.test', [
            ['name' => 'chaine', 'values' => ['CH01', 'CH02']],
        ]);

        $this->actingAs($this->userWithRole('it'))
            ->postJson('/novacity-endpoints/params/roots/delete', [
                'root' => 'https://api.test',
                'name' => 'chaine',
            ])
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('parameters', []);

        $this->actingAs($this->userWithRole('it'))
            ->getJson('/novacity-endpoints/list')
            ->assertOk()
            ->assertJsonPath('items.0.parameters', []);
    }

    public function test_parameters_require_it_role(): void
    {
        $this->writeData([
            $this->item('ep-1', 'Efficience', 'https://api.test/data/kpi/efficience-chaine?chaine=CH01'),
        ]);

        $this->actingAs($this->userWithRole('resp_production'))
            ->postJson('/novacity-endpoints/ep-1/parameter', [
                'name' => 'chaine',
                'value' => 'CH02',
            ])
            ->assertForbidden();

        $this->actingAs($this->userWithRole('resp_production'))
            ->getJson('/novacity-endpoints/params')
            ->assertForbidden();
    }
}
