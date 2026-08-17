<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\NovacityEndpointsController;
use App\Models\EndpointDataset;
use App\Models\EndpointDatasetVariant;
use App\Models\Role;
use App\Models\User;
use App\Support\RootParameters;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class DashboardParametersTest extends TestCase
{
    use RefreshDatabase;

    private string $dataFile;

    private string $paramsFile;

    protected function setUp(): void
    {
        parent::setUp();

        $this->dataFile = storage_path('framework/testing/dashboard-parameters-data.json');
        $this->paramsFile = storage_path('framework/testing/dashboard-parameters-params.json');

        @mkdir(dirname($this->dataFile), 0755, true);

        config([
            'novacity.base_url' => 'https://api.primary.test',
            'novacity.api_key' => 'global-key',
            'novacity.data_file' => 'framework/testing/dashboard-parameters-data.json',
            'novacity.params_file' => 'framework/testing/dashboard-parameters-params.json',
        ]);

        Cache::flush();
        NovacityEndpointsController::flushCache();
    }

    protected function tearDown(): void
    {
        @unlink($this->dataFile);
        @unlink($this->paramsFile);
        Cache::flush();
        NovacityEndpointsController::flushCache();
        parent::tearDown();
    }

    private function user(): User
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

    private function item(string $endpoint, ?array $rows = null, array $columns = ['ProdGroup', 'WIP_Chaine']): array
    {
        return [
            'id' => 'ep-'.substr(md5($endpoint), 0, 6),
            'name' => 'wip_chaine (SDT)',
            'method' => 'GET',
            'endpoint' => $endpoint,
            'status' => 200,
            'response' => [
                'success' => true,
                'source' => 'SDT',
                'columns' => $columns,
                'data' => $rows ?? [['ProdGroup' => 'CH01', 'WIP_Chaine' => 1]],
            ],
        ];
    }

    private function writeData(array $items): void
    {
        file_put_contents($this->dataFile, json_encode($items, JSON_PRETTY_PRINT));
    }

    private function seedVariant(string $slug, array $params, array $rows, string $status = 'ok'): EndpointDatasetVariant
    {
        return EndpointDatasetVariant::updateOrCreate(
            ['slug' => $slug, 'params' => $params],
            [
                'columns' => [
                    ['name' => 'ProdGroup', 'type' => 'text'],
                    ['name' => 'WIP_Chaine', 'type' => 'number'],
                ],
                'sample_data' => $rows,
                'row_count' => count($rows),
                'last_status' => $status,
                'last_error' => null,
                'last_synced_at' => now()->subMinutes(2),
            ],
        );
    }

    public function test_dashboard_parameters_lists_declared_params_used_by_datasets(): void
    {
        $this->writeData([
            $this->item('https://api.primary.test/api/data/kpi/efficience-chaine?chaine=CH01'),
        ]);

        RootParameters::save('https://api.primary.test', [
            ['name' => 'chaine', 'values' => ['CH01', 'CH02', 'CH03']],
        ]);

        $this->actingAs($this->user())
            ->getJson('/api/dashboard-parameters')
            ->assertOk()
            ->assertJsonCount(1, 'parameters')
            ->assertJsonPath('parameters.0.root', 'https://api.primary.test')
            ->assertJsonPath('parameters.0.name', 'chaine')
            ->assertJsonPath('parameters.0.values', ['CH01', 'CH02', 'CH03'])
            ->assertJsonPath('parameters.0.current', 'CH01')
            ->assertJsonPath('parameters.0.affected_slugs', ['api/data/kpi/efficience-chaine']);
    }

    public function test_dashboard_parameters_omits_declarations_no_dataset_uses(): void
    {
        $this->writeData([
            $this->item('https://api.primary.test/api/data/kpi/efficience-chaine?chaine=CH01'),
        ]);

        RootParameters::save('https://api.primary.test', [
            ['name' => 'chaine', 'values' => ['CH01', 'CH02']],
            ['name' => 'zone', 'values' => ['ZA', 'ZB']],
        ]);

        $this->actingAs($this->user())
            ->getJson('/api/dashboard-parameters')
            ->assertOk()
            ->assertJsonCount(1, 'parameters')
            ->assertJsonPath('parameters.0.name', 'chaine');
    }

    public function test_dashboard_parameters_is_empty_without_declarations(): void
    {
        $this->writeData([
            $this->item('https://api.primary.test/api/data/kpi/efficience-chaine?chaine=CH01'),
        ]);

        $this->actingAs($this->user())
            ->getJson('/api/dashboard-parameters')
            ->assertOk()
            ->assertJsonPath('parameters', []);
    }

    public function test_datasets_serve_default_rows_without_a_selection(): void
    {
        $this->writeData([
            $this->item('https://api.primary.test/api/data/kpi/efficience-chaine?chaine=CH01', [['ProdGroup' => 'CH01', 'WIP_Chaine' => 1]]),
        ]);

        EndpointDataset::updateOrCreate(
            ['slug' => 'api/data/kpi/efficience-chaine'],
            [
                'name' => 'wip_chaine',
                'method' => 'GET',
                'columns' => [
                    ['name' => 'ProdGroup', 'type' => 'text'],
                    ['name' => 'WIP_Chaine', 'type' => 'number'],
                ],
                'sample_data' => [['ProdGroup' => 'CH01', 'WIP_Chaine' => 1]],
                'row_count' => 1,
                'last_status' => 'ok',
                'last_synced_at' => now()->subMinutes(2),
            ],
        );

        $dataset = collect(
            $this->actingAs($this->user())->getJson('/api/endpoint-datasets')->json('datasets'),
        )->firstWhere('slug', 'api/data/kpi/efficience-chaine');

        $this->assertNotNull($dataset);
        $this->assertSame([['ProdGroup' => 'CH01', 'WIP_Chaine' => 1]], $dataset['sample_data']);
        $this->assertSame([], $dataset['params']);
    }

    public function test_datasets_serve_the_selected_variant(): void
    {
        $this->writeData([
            $this->item('https://api.primary.test/api/data/kpi/efficience-chaine?chaine=CH01', [['ProdGroup' => 'CH01', 'WIP_Chaine' => 1]]),
        ]);

        EndpointDataset::updateOrCreate(
            ['slug' => 'api/data/kpi/efficience-chaine'],
            [
                'name' => 'wip_chaine',
                'method' => 'GET',
                'columns' => [
                    ['name' => 'ProdGroup', 'type' => 'text'],
                    ['name' => 'WIP_Chaine', 'type' => 'number'],
                ],
                'sample_data' => [['ProdGroup' => 'CH01', 'WIP_Chaine' => 1]],
                'row_count' => 1,
                'last_status' => 'ok',
                'last_synced_at' => now()->subMinutes(2),
            ],
        );

        $variant = $this->seedVariant(
            'api/data/kpi/efficience-chaine',
            ['chaine' => 'CH02'],
            [['ProdGroup' => 'CH02', 'WIP_Chaine' => 2]],
        );

        RootParameters::save('https://api.primary.test', [
            ['name' => 'chaine', 'values' => ['CH01', 'CH02', 'CH03']],
        ]);

        $dataset = collect(
            $this->actingAs($this->user())
                ->getJson('/api/endpoint-datasets?p[chaine]=CH02')
                ->json('datasets'),
        )->firstWhere('slug', 'api/data/kpi/efficience-chaine');

        $this->assertNotNull($dataset);
        $this->assertSame([['ProdGroup' => 'CH02', 'WIP_Chaine' => 2]], $dataset['sample_data']);
        $this->assertSame(['chaine' => 'CH02'], $dataset['params']);
        $this->assertSame('ok', $dataset['status']);
        $this->assertSame($variant->last_synced_at->toISOString(), $dataset['last_synced_at']);
    }

    public function test_datasets_fall_back_to_default_when_the_selected_variant_is_not_stored(): void
    {
        $this->writeData([
            $this->item('https://api.primary.test/api/data/kpi/efficience-chaine?chaine=CH01', [['ProdGroup' => 'CH01', 'WIP_Chaine' => 1]]),
        ]);

        EndpointDataset::updateOrCreate(
            ['slug' => 'api/data/kpi/efficience-chaine'],
            [
                'name' => 'wip_chaine',
                'method' => 'GET',
                'columns' => [
                    ['name' => 'ProdGroup', 'type' => 'text'],
                    ['name' => 'WIP_Chaine', 'type' => 'number'],
                ],
                'sample_data' => [['ProdGroup' => 'CH01', 'WIP_Chaine' => 1]],
                'row_count' => 1,
                'last_status' => 'ok',
                'last_synced_at' => now()->subMinutes(2),
            ],
        );

        RootParameters::save('https://api.primary.test', [
            ['name' => 'chaine', 'values' => ['CH01', 'CH02', 'CH03']],
        ]);

        $dataset = collect(
            $this->actingAs($this->user())
                ->getJson('/api/endpoint-datasets?p[chaine]=CH99')
                ->json('datasets'),
        )->firstWhere('slug', 'api/data/kpi/efficience-chaine');

        $this->assertNotNull($dataset);
        $this->assertSame([['ProdGroup' => 'CH01', 'WIP_Chaine' => 1]], $dataset['sample_data']);
        $this->assertSame([], $dataset['params']);
    }

    public function test_datasets_ignore_a_selection_for_datasets_that_do_not_use_the_parameter(): void
    {
        $this->writeData([
            $this->item('https://api.primary.test/api/data/kpi/efficience-chaine?chaine=CH01', [['ProdGroup' => 'CH01', 'WIP_Chaine' => 1]]),
            $this->item('https://api.primary.test/api/data/q/taging_reel', [['MONo' => 'MO1', 'ProdGroup' => 'A']], ['MONo', 'ProdGroup']),
        ]);

        foreach (['api/data/kpi/efficience-chaine', 'api/data/q/taging_reel'] as $slug) {
            EndpointDataset::updateOrCreate(
                ['slug' => $slug],
                [
                    'name' => $slug,
                    'method' => 'GET',
                    'columns' => [
                        ['name' => 'ProdGroup', 'type' => 'text'],
                    ],
                    'sample_data' => $slug === 'api/data/kpi/efficience-chaine'
                        ? [['ProdGroup' => 'CH01', 'WIP_Chaine' => 1]]
                        : [['MONo' => 'MO1', 'ProdGroup' => 'A']],
                    'row_count' => 1,
                    'last_status' => 'ok',
                    'last_synced_at' => now()->subMinutes(2),
                ],
            );
        }

        $this->seedVariant(
            'api/data/kpi/efficience-chaine',
            ['chaine' => 'CH02'],
            [['ProdGroup' => 'CH02', 'WIP_Chaine' => 2]],
        );

        RootParameters::save('https://api.primary.test', [
            ['name' => 'chaine', 'values' => ['CH01', 'CH02', 'CH03']],
        ]);

        $datasets = collect(
            $this->actingAs($this->user())
                ->getJson('/api/endpoint-datasets?p[chaine]=CH02')
                ->json('datasets'),
        )->keyBy('slug');

        $this->assertSame([['ProdGroup' => 'CH02', 'WIP_Chaine' => 2]], $datasets['api/data/kpi/efficience-chaine']['sample_data']);
        $this->assertSame([['MONo' => 'MO1', 'ProdGroup' => 'A']], $datasets['api/data/q/taging_reel']['sample_data']);
        $this->assertSame([], $datasets['api/data/q/taging_reel']['params']);
    }

    public function test_sync_stores_one_variant_per_parameter_value(): void
    {
        $this->writeData([
            $this->item('https://api.primary.test/api/data/kpi/efficience-chaine?chaine=CH01'),
        ]);

        RootParameters::save('https://api.primary.test', [
            ['name' => 'chaine', 'values' => ['CH01', 'CH02', 'CH03']],
        ]);

        Http::fake(function (Request $request) {
            $query = [];
            parse_str((string) parse_url($request->url(), PHP_URL_QUERY), $query);
            $value = (string) ($query['chaine'] ?? 'UNKNOWN');

            return Http::response([
                'success' => true,
                'source' => 'SDT',
                'columns' => ['ProdGroup', 'WIP_Chaine'],
                'data' => [['ProdGroup' => $value, 'WIP_Chaine' => mb_strlen($value)]],
            ], 200);
        });

        $this->artisan('sync:endpoint-data', [
            '--phase' => 'datasets',
            '--force' => true,
            '--retry' => 0,
            '--root' => 'https://api.primary.test',
        ])->assertSuccessful();

        $this->assertDatabaseHas('endpoint_datasets', ['slug' => 'api/data/kpi/efficience-chaine', 'row_count' => 1]);

        $variants = EndpointDatasetVariant::where('slug', 'api/data/kpi/efficience-chaine')->get()->keyBy(
            fn (EndpointDatasetVariant $v): string => (string) ($v->params['chaine'] ?? ''),
        );

        // CH01 is deduplicated against the default variant (same URL), so only
        // the two other values produce a separate stored snapshot.
        $this->assertCount(2, $variants);

        foreach (['CH02', 'CH03'] as $value) {
            $this->assertArrayHasKey($value, $variants->all(), "Variant {$value} missing");
            $this->assertSame($value, $variants[$value]->sample_data[0]['ProdGroup']);
        }
    }
}
