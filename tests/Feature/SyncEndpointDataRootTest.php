<?php

namespace Tests\Feature;

use App\Console\Commands\RunEndpointSync;
use App\Models\EndpointDataset;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SyncEndpointDataRootTest extends TestCase
{
    use RefreshDatabase;

    private string $dataFile;

    private string $metaFile;

    private string $rootsFile;

    protected function setUp(): void
    {
        parent::setUp();

        $this->dataFile = storage_path('framework/testing/endpoint-root-data.json');
        $this->metaFile = storage_path('framework/testing/endpoint-root-meta.json');
        $this->rootsFile = storage_path('framework/testing/endpoint-root-roots.json');

        @mkdir(dirname($this->dataFile), 0755, true);

        config([
            'novacity.base_url' => 'https://api.primary.test',
            'novacity.api_key' => 'global-key',
            'novacity.admin_token' => '',
            'novacity.timeout' => 5,
            'novacity.data_file' => 'framework/testing/endpoint-root-data.json',
            'novacity.refresh_meta' => 'framework/testing/endpoint-root-meta.json',
            'novacity.roots_file' => 'framework/testing/endpoint-root-roots.json',
        ]);

        Cache::flush();
    }

    protected function tearDown(): void
    {
        @unlink($this->dataFile);
        @unlink($this->metaFile);
        @unlink($this->rootsFile);
        parent::tearDown();
    }

    private function writeRootCredentials(array $credentials): void
    {
        file_put_contents($this->rootsFile, json_encode($credentials, JSON_PRETTY_PRINT));
    }

    private function writeData(array $items): void
    {
        file_put_contents($this->dataFile, json_encode($items, JSON_PRETTY_PRINT));
    }

    public function test_refresh_respects_each_endpoints_own_root(): void
    {
        $this->writeData([
            ['id' => 'ep-1', 'name' => 'v_primary', 'method' => 'GET', 'endpoint' => 'https://api.primary.test/api/data/v_primary', 'status' => 200, 'response' => new \stdClass],
            ['id' => 'ep-2', 'name' => 'v_custom', 'method' => 'GET', 'endpoint' => 'https://api.custom.test/api/data/v_custom', 'status' => 200, 'response' => new \stdClass],
            ['id' => 'ep-3', 'name' => 'v_relative', 'method' => 'GET', 'endpoint' => 'api/data/v_relative', 'status' => 200, 'response' => new \stdClass],
        ]);

        Http::fake([
            'https://api.primary.test/api/data/v_primary*' => Http::response(['success' => true, 'data' => [['a' => 1]]], 200),
            'https://api.custom.test/api/data/v_custom*' => Http::response(['success' => true, 'data' => [['b' => 2]]], 200),
            'https://api.primary.test/api/data/v_relative*' => Http::response(['success' => true, 'data' => [['c' => 3]]], 200),
        ]);

        $this->artisan('sync:endpoint-data', ['--phase' => 'refresh', '--force' => true, '--retry' => 0])
            ->assertSuccessful();

        Http::assertSent(fn ($request) => str_starts_with($request->url(), 'https://api.primary.test/api/data/v_primary'));
        Http::assertSent(fn ($request) => str_starts_with($request->url(), 'https://api.custom.test/api/data/v_custom'));
        Http::assertSent(fn ($request) => str_starts_with($request->url(), 'https://api.primary.test/api/data/v_relative'));

        $data = collect($this->readData())->keyBy('id');

        $this->assertSame(200, $data['ep-1']['status']);
        $this->assertSame(200, $data['ep-2']['status']);
        $this->assertSame(200, $data['ep-3']['status']);
    }

    public function test_root_option_only_refreshes_matching_root(): void
    {
        $this->writeData([
            ['id' => 'ep-1', 'name' => 'v_primary', 'method' => 'GET', 'endpoint' => 'https://api.primary.test/api/data/v_primary', 'status' => 502, 'response' => new \stdClass],
            ['id' => 'ep-2', 'name' => 'v_custom', 'method' => 'GET', 'endpoint' => 'https://api.custom.test/api/data/v_custom', 'status' => 502, 'response' => new \stdClass],
        ]);

        Cache::put('endpoints:refresh:retry_pending', true, now()->addDay());

        Http::fake([
            'https://api.custom.test/api/data/v_custom*' => Http::response(['success' => true, 'data' => []], 200),
            'https://api.primary.test/api/data/v_primary*' => Http::response(['success' => true, 'data' => []], 200),
        ]);

        $this->artisan('sync:endpoint-data', ['--phase' => 'refresh', '--force' => true, '--retry' => 0, '--root' => 'https://api.custom.test'])
            ->assertSuccessful();

        Http::assertNotSent(fn ($request) => str_starts_with($request->url(), 'https://api.primary.test'));

        $data = collect($this->readData())->keyBy('id');

        $this->assertSame(200, $data['ep-2']['status']);
        $this->assertSame(502, $data['ep-1']['status']);
    }

    public function test_root_option_errors_when_no_match(): void
    {
        $this->writeData([
            ['id' => 'ep-1', 'name' => 'v_primary', 'method' => 'GET', 'endpoint' => 'https://api.primary.test/api/data/v_primary', 'status' => 200, 'response' => new \stdClass],
        ]);

        $this->artisan('sync:endpoint-data', ['--phase' => 'refresh', '--force' => true, '--root' => 'https://api.missing.test'])
            ->assertFailed()
            ->expectsOutputToContain('No endpoint found with root https://api.missing.test');
    }

    public function test_id_option_refresh_uses_per_root_key_for_data_root(): void
    {
        $this->writeRootCredentials([
            'https://api.custom.test' => ['api_key' => 'custom-root-key'],
        ]);

        $this->writeData([
            ['id' => 'ep-1', 'name' => 'v_primary', 'method' => 'GET', 'endpoint' => 'https://api.primary.test/api/data/v_primary', 'status' => 502, 'response' => new \stdClass],
            ['id' => 'ep-2', 'name' => 'v_custom', 'method' => 'GET', 'endpoint' => 'https://api.custom.test/api/data/v_custom', 'status' => 502, 'response' => new \stdClass],
        ]);

        Http::fake([
            'https://api.custom.test/api/data/v_custom*' => Http::response(['success' => true, 'data' => [['b' => 2]]], 200),
            'https://api.primary.test/api/data/v_primary*' => Http::response(['success' => true, 'data' => [['a' => 1]]], 200),
        ]);

        $this->artisan('sync:endpoint-data', [
            '--phase' => 'refresh',
            '--force' => true,
            '--retry' => 0,
            '--id' => 'ep-2',
        ])->assertSuccessful();

        Http::assertSent(fn ($request) => str_starts_with($request->url(), 'https://api.custom.test/api/data/v_custom')
            && $request->header('x-api-key') === ['custom-root-key']);

        Http::assertNotSent(fn ($request) => str_starts_with($request->url(), 'https://api.primary.test'));

        $data = collect($this->readData())->keyBy('id');

        $this->assertSame(200, $data['ep-2']['status']);
        $this->assertSame(502, $data['ep-1']['status']);
    }

    public function test_root_option_refresh_uses_per_root_key_for_root_with_no_admin_endpoints(): void
    {
        $this->writeRootCredentials([
            'https://api.custom.test' => ['api_key' => 'custom-root-key'],
        ]);

        $this->writeData([
            ['id' => 'ep-2', 'name' => 'v_custom', 'method' => 'GET', 'endpoint' => 'https://api.custom.test/api/data/v_custom', 'status' => 502, 'response' => new \stdClass],
        ]);

        Http::fake([
            'https://api.custom.test/api/data/v_custom*' => Http::response(['success' => true, 'data' => [['b' => 2]]], 200),
        ]);

        $this->artisan('sync:endpoint-data', [
            '--phase' => 'refresh',
            '--force' => true,
            '--retry' => 0,
            '--root' => 'https://api.custom.test',
        ])->assertSuccessful();

        Http::assertSent(fn ($request) => str_starts_with($request->url(), 'https://api.custom.test/api/data/v_custom')
            && $request->header('x-api-key') === ['custom-root-key']);

        $data = collect($this->readData())->keyBy('id');

        $this->assertSame(200, $data['ep-2']['status']);
    }

    public function test_endpoint_sync_run_publishes_and_clears_running_flag(): void
    {
        $this->writeData([
            ['id' => 'ep-1', 'name' => 'v_primary', 'method' => 'GET', 'endpoint' => 'https://api.primary.test/api/data/v_primary', 'status' => 200, 'response' => ['data' => [['a' => 1]], 'label' => 'V', 'object' => 'O', 'object_type' => 'T']],
        ]);

        Http::fake([
            'https://api.primary.test/api/data/v_primary*' => Http::response(['success' => true, 'data' => [['a' => 2]]], 200),
        ]);

        $this->assertFalse(Cache::has(RunEndpointSync::RUNNING_KEY));

        $this->artisan('endpoint-sync:run', ['--timeout' => 5])
            ->assertSuccessful();

        $this->assertFalse(Cache::has(RunEndpointSync::RUNNING_KEY));

        $this->assertDatabaseHas('endpoint_datasets', [
            'slug' => 'api/data/v_primary',
            'last_status' => 'ok',
        ]);
    }

    public function test_datasets_root_option_only_syncs_matching_root(): void
    {
        $this->writeData([
            ['id' => 'ep-1', 'name' => 'v_primary', 'method' => 'GET', 'endpoint' => 'https://api.primary.test/api/data/v_primary', 'status' => 200, 'response' => ['data' => [['a' => 1], ['a' => 2]], 'label' => 'P', 'object' => 'O', 'object_type' => 'T']],
            ['id' => 'ep-2', 'name' => 'v_custom', 'method' => 'GET', 'endpoint' => 'https://api.custom.test/api/data/v_custom', 'status' => 200, 'response' => ['data' => [['b' => 3]], 'label' => 'C', 'object' => 'O2', 'object_type' => 'T2']],
        ]);

        Http::fake([
            'https://api.custom.test/api/data/v_custom*' => Http::response(['success' => true, 'data' => [['b' => 9]]], 200),
        ]);

        $this->artisan('sync:endpoint-data', [
            '--phase' => 'datasets',
            '--force' => true,
            '--retry' => 0,
            '--batch' => 5,
            '--root' => 'https://api.custom.test',
        ])->assertSuccessful();

        Http::assertNotSent(fn ($request) => str_starts_with($request->url(), 'https://api.primary.test'));

        $this->assertDatabaseHas('endpoint_datasets', ['slug' => 'api/data/v_custom', 'last_status' => 'ok', 'row_count' => 1]);
        $this->assertDatabaseMissing('endpoint_datasets', ['slug' => 'api/data/v_primary']);

        $data = collect($this->readData())->keyBy('id');

        $this->assertSame([['b' => 9]], $data['ep-2']['response']['data']);
        $this->assertSame([['a' => 1], ['a' => 2]], $data['ep-1']['response']['data']);
    }

    public function test_datasets_root_option_errors_when_no_match(): void
    {
        $this->writeData([
            ['id' => 'ep-1', 'name' => 'v_primary', 'method' => 'GET', 'endpoint' => 'https://api.primary.test/api/data/v_primary', 'status' => 200, 'response' => ['data' => [['a' => 1]]]],
        ]);

        $this->artisan('sync:endpoint-data', [
            '--phase' => 'datasets',
            '--force' => true,
            '--retry' => 0,
            '--root' => 'https://api.missing.test',
        ])->assertFailed()
            ->expectsOutputToContain('No endpoint found with root https://api.missing.test');
    }

    public function test_datasets_slug_option_only_syncs_matching_slug(): void
    {
        $this->writeData([
            ['id' => 'ep-1', 'name' => 'v_primary', 'method' => 'GET', 'endpoint' => 'https://api.primary.test/api/data/v_primary', 'status' => 200, 'response' => ['data' => [['a' => 1], ['a' => 2]], 'label' => 'P', 'object' => 'O', 'object_type' => 'T']],
            ['id' => 'ep-2', 'name' => 'v_custom', 'method' => 'GET', 'endpoint' => 'https://api.custom.test/api/data/v_custom', 'status' => 200, 'response' => ['data' => [['b' => 3]], 'label' => 'C', 'object' => 'O2', 'object_type' => 'T2']],
        ]);

        Http::fake([
            'https://api.custom.test/api/data/v_custom*' => Http::response(['success' => true, 'data' => [['b' => 9]]], 200),
        ]);

        $this->artisan('sync:endpoint-data', [
            '--phase' => 'datasets',
            '--force' => true,
            '--retry' => 0,
            '--batch' => 5,
            '--slug' => ['api/data/v_custom'],
        ])->assertSuccessful();

        Http::assertNotSent(fn ($request) => str_starts_with($request->url(), 'https://api.primary.test'));

        $this->assertDatabaseHas('endpoint_datasets', ['slug' => 'api/data/v_custom', 'last_status' => 'ok', 'row_count' => 1]);
        $this->assertDatabaseMissing('endpoint_datasets', ['slug' => 'api/data/v_primary']);
    }

    public function test_datasets_sync_derives_columns_from_live_rows_for_column_less_endpoints(): void
    {
        // Freshly imported endpoints have no columns/rows in data.json yet;
        // the datasets phase must fetch live rows and derive columns from them.
        $this->writeData([
            ['id' => 'ep-1', 'name' => 'v_primary', 'method' => 'GET', 'endpoint' => 'https://api.primary.test/api/data/v_primary', 'status' => 200, 'response' => new \stdClass],
        ]);

        Http::fake([
            'https://api.primary.test/api/data/v_primary*' => Http::response(['success' => true, 'data' => [['code' => 'A', 'qty' => 10]]], 200),
        ]);

        $this->artisan('sync:endpoint-data', [
            '--phase' => 'datasets',
            '--force' => true,
            '--retry' => 0,
            '--slug' => ['api/data/v_primary'],
        ])->assertSuccessful();

        $this->assertDatabaseHas('endpoint_datasets', [
            'slug' => 'api/data/v_primary',
            'last_status' => 'ok',
            'row_count' => 1,
        ]);

        $dataset = EndpointDataset::where('slug', 'api/data/v_primary')->first();

        $this->assertSame([
            ['name' => 'code', 'type' => 'text'],
            ['name' => 'qty', 'type' => 'number'],
        ], $dataset->columns);
        $this->assertSame([['code' => 'A', 'qty' => 10]], $dataset->sample_data);
    }

    public function test_datasets_sync_derives_columns_from_live_single_object_rows(): void
    {
        // A single-object response (KPI snapshot) must become a dataset: the
        // object's keys are the columns and the object is served as one row.
        $this->writeData([
            ['id' => 'ep-1', 'name' => 'kpi_snapshot', 'method' => 'GET', 'endpoint' => 'https://api.primary.test/data/kpi/snapshot', 'status' => 200, 'response' => new \stdClass],
        ]);

        Http::fake([
            'https://api.primary.test/data/kpi/snapshot*' => Http::response(['success' => true, 'data' => ['chaine' => 'CH01', 'efficience_pct' => 85, 'effectif' => 12]], 200),
        ]);

        $this->artisan('sync:endpoint-data', [
            '--phase' => 'datasets',
            '--force' => true,
            '--retry' => 0,
            '--slug' => ['data/kpi/snapshot'],
        ])->assertSuccessful();

        $this->assertDatabaseHas('endpoint_datasets', [
            'slug' => 'data/kpi/snapshot',
            'last_status' => 'ok',
            'row_count' => 1,
        ]);

        $dataset = EndpointDataset::where('slug', 'data/kpi/snapshot')->first();

        $this->assertSame(['chaine', 'efficience_pct', 'effectif'], array_column($dataset->columns, 'name'));
        $this->assertSame([['chaine' => 'CH01', 'efficience_pct' => 85, 'effectif' => 12]], $dataset->sample_data);
    }

    public function test_datasets_sync_exposes_nested_object_list_columns_and_rows(): void
    {
        // Nested object-lists inside a single-object `data` must be reachable:
        // their keys become columns and each element a denormalized row.
        $this->writeData([
            ['id' => 'ep-1', 'name' => 'pareto_defauts', 'method' => 'GET', 'endpoint' => 'https://api.primary.test/data/kpi/pareto-defauts', 'status' => 200, 'response' => new \stdClass],
        ]);

        Http::fake([
            'https://api.primary.test/data/kpi/pareto-defauts*' => Http::response(['success' => true, 'data' => [
                'chaine' => 'CH01',
                'total' => 8,
                'defauts' => [
                    ['category' => 'couleur', 'count' => 4, 'cumulative_pct' => 50],
                    ['category' => 'elasticite', 'count' => 4, 'cumulative_pct' => 100],
                ],
            ]], 200),
        ]);

        $this->artisan('sync:endpoint-data', [
            '--phase' => 'datasets',
            '--force' => true,
            '--retry' => 0,
            '--slug' => ['data/kpi/pareto-defauts'],
        ])->assertSuccessful();

        $this->assertDatabaseHas('endpoint_datasets', [
            'slug' => 'data/kpi/pareto-defauts',
            'last_status' => 'ok',
            'row_count' => 2,
        ]);

        $dataset = EndpointDataset::where('slug', 'data/kpi/pareto-defauts')->first();

        $this->assertSame(
            ['chaine', 'total', 'category', 'count', 'cumulative_pct'],
            array_column($dataset->columns, 'name'),
        );
        $this->assertSame([
            ['chaine' => 'CH01', 'total' => 8, 'category' => 'couleur', 'count' => 4, 'cumulative_pct' => 50],
            ['chaine' => 'CH01', 'total' => 8, 'category' => 'elasticite', 'count' => 4, 'cumulative_pct' => 100],
        ], $dataset->sample_data);
    }

    public function test_datasets_sync_skips_endpoint_without_data_key_after_fetch(): void
    {
        // A response without a `data` key (e.g. KPI snapshots with nested
        // jour/dernier_jour/annee objects) is not tabular — no dataset row.
        $this->writeData([
            ['id' => 'ep-1', 'name' => 'kpi_br_cgl', 'method' => 'GET', 'endpoint' => 'https://api.primary.test/api/data/q/kpi_br_cgl', 'status' => 200, 'response' => new \stdClass],
        ]);

        Http::fake([
            'https://api.primary.test/api/data/q/kpi_br_cgl*' => Http::response(['success' => true, 'req' => 'F-REQ-102', 'jour' => ['day' => '2026-08-17', 'br_pct' => 27.96]], 200),
        ]);

        $this->artisan('sync:endpoint-data', [
            '--phase' => 'datasets',
            '--force' => true,
            '--retry' => 0,
            '--slug' => ['api/data/q/kpi_br_cgl'],
        ])->assertSuccessful();

        $this->assertDatabaseMissing('endpoint_datasets', ['slug' => 'api/data/q/kpi_br_cgl']);
    }

    public function test_datasets_sync_collapses_multiple_object_lists_to_a_single_row(): void
    {
        // A single-object `data` with several nested object-lists (like the
        // chaine-complet KPI object) must not be expanded into a cartesian
        // product: that would blow up memory. It is served as one row.
        $this->writeData([
            ['id' => 'ep-1', 'name' => 'chaine_complet', 'method' => 'GET', 'endpoint' => 'https://api.primary.test/data/kpi/chaine-complet', 'status' => 200, 'response' => new \stdClass],
        ]);

        Http::fake([
            'https://api.primary.test/data/kpi/chaine-complet*' => Http::response(['success' => true, 'data' => [
                'chaine' => 'CH01',
                'gpro' => [
                    ['day' => '2026-08-15', 'effectif' => 16],
                    ['day' => '2026-08-16', 'effectif' => 18],
                ],
                'top_ops' => [
                    ['opno' => 225, 'qty' => 456],
                    ['opno' => 224, 'qty' => 84],
                ],
                'orders' => [
                    ['n_of' => '4524764431', 'qte' => 2868],
                    ['n_of' => '4524760712', 'qte' => 5892],
                ],
            ]], 200),
        ]);

        $this->artisan('sync:endpoint-data', [
            '--phase' => 'datasets',
            '--force' => true,
            '--retry' => 0,
            '--slug' => ['data/kpi/chaine-complet'],
        ])->assertSuccessful();

        $this->assertDatabaseHas('endpoint_datasets', [
            'slug' => 'data/kpi/chaine-complet',
            'last_status' => 'ok',
            'row_count' => 1,
        ]);

        $dataset = EndpointDataset::where('slug', 'data/kpi/chaine-complet')->first();

        $this->assertCount(1, $dataset->sample_data);
        $this->assertSame('CH01', $dataset->sample_data[0]['chaine']);
        $this->assertSame(['chaine', 'day', 'effectif', 'opno', 'qty', 'n_of', 'qte'], array_column($dataset->columns, 'name'));
    }

    private function readData(): array
    {
        return json_decode((string) file_get_contents($this->dataFile), true);
    }
}
