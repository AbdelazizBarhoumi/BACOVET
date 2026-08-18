<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\NovacityEndpointsController;
use App\Models\EndpointDatasetVariant;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EndpointDatasetsMultiVariantTest extends TestCase
{
    use RefreshDatabase;

    private string $dataFile;

    private string $disabledRootsFile;

    private string $paramsFile;

    protected function setUp(): void
    {
        parent::setUp();

        $this->dataFile = storage_path('framework/testing/endpoint-datasets-variant-data.json');
        $this->disabledRootsFile = storage_path('framework/testing/endpoint-disabled-roots.json');
        $this->paramsFile = storage_path('framework/testing/endpoint-params-variant.json');

        @mkdir(dirname($this->dataFile), 0755, true);

        config([
            'novacity.data_file' => 'framework/testing/endpoint-datasets-variant-data.json',
            'novacity.params_file' => 'framework/testing/endpoint-params-variant.json',
        ]);

        file_put_contents($this->paramsFile, json_encode([
            'https://api.primary.test' => [
                ['name' => 'chaine', 'values' => ['CH01', 'CH02', 'CH03']],
            ],
        ], JSON_PRETTY_PRINT));

        file_put_contents($this->dataFile, json_encode([
            [
                'id' => 'ep-chaine',
                'name' => 'chaine_data',
                'method' => 'GET',
                'endpoint' => 'https://api.primary.test/api/data/q/chaine_data?chaine=CH01',
                'status' => 200,
                'response' => [
                    'success' => true,
                    'source' => 'SDT',
                    'columns' => ['Chaine', 'Qty'],
                    'data' => [['Chaine' => 'CH01', 'Qty' => 1]],
                ],
            ],
        ], JSON_PRETTY_PRINT));

        NovacityEndpointsController::flushCache();
    }

    protected function tearDown(): void
    {
        @unlink($this->dataFile);
        @unlink($this->disabledRootsFile);
        @unlink($this->paramsFile);
        NovacityEndpointsController::flushCache();
        parent::tearDown();
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

    private function variant(string $value, array $rows): void
    {
        EndpointDatasetVariant::create([
            'slug' => 'api/data/q/chaine_data',
            'params' => ['chaine' => $value],
            'columns' => [
                ['name' => 'Chaine', 'type' => 'text'],
                ['name' => 'Qty', 'type' => 'number'],
            ],
            'sample_data' => $rows,
            'row_count' => count($rows),
            'last_status' => 'ok',
        ]);
    }

    private function datasetFor(array $selection): array
    {
        $query = http_build_query($selection, '', '&', PHP_QUERY_RFC3986);

        return collect(
            $this->actingAs($this->userWithRole())
                ->json('GET', '/api/endpoint-datasets?'.$query)
                ->json('datasets'),
        )->firstWhere('slug', 'api/data/q/chaine_data');
    }

    public function test_repeated_indexed_keys_keep_every_selected_value(): void
    {
        $this->variant('CH02', [['Chaine' => 'CH02', 'Qty' => 2]]);
        $this->variant('CH03', [['Chaine' => 'CH03', 'Qty' => 3]]);

        $dataset = collect(
            $this->actingAs($this->userWithRole())
                ->json('GET', '/api/endpoint-datasets?p[chaine][]=CH02&p[chaine][]=CH03')
                ->json('datasets'),
        )->firstWhere('slug', 'api/data/q/chaine_data');

        $this->assertNotNull($dataset);
        $this->assertCount(2, $dataset['sample_data']);
        $this->assertSame('CH02', $dataset['sample_data'][0]['Chaine']);
        $this->assertSame('CH03', $dataset['sample_data'][1]['Chaine']);
    }

    public function test_selection_including_the_url_value_merges_the_default_rows(): void
    {
        $this->variant('CH02', [['Chaine' => 'CH02', 'Qty' => 2]]);

        $dataset = $this->datasetFor([
            'p' => ['chaine' => ['CH01', 'CH02']],
        ]);

        $this->assertNotNull($dataset);
        $this->assertCount(2, $dataset['sample_data']);

        $chaines = array_values(array_unique(array_column($dataset['sample_data'], 'Chaine')));
        sort($chaines);

        $this->assertSame(['CH01', 'CH02'], $chaines);
    }

    public function test_single_select_of_the_url_value_keeps_the_default_rows(): void
    {
        $this->variant('CH02', [['Chaine' => 'CH02', 'Qty' => 2]]);

        $dataset = $this->datasetFor([
            'p' => ['chaine' => 'CH01'],
        ]);

        $this->assertNotNull($dataset);
        $this->assertCount(1, $dataset['sample_data']);
        $this->assertSame('CH01', $dataset['sample_data'][0]['Chaine']);
    }

    public function test_default_rows_overlapping_a_matching_variant_are_deduplicated(): void
    {
        $this->variant('CH01', [['Chaine' => 'CH01', 'Qty' => 1]]);

        $dataset = $this->datasetFor([
            'p' => ['chaine' => ['CH01', 'CH02']],
        ]);

        $this->assertNotNull($dataset);
        $this->assertCount(1, $dataset['sample_data']);
        $this->assertSame('CH01', $dataset['sample_data'][0]['Chaine']);
    }

    public function test_multiple_selected_values_merge_rows_across_matching_variants(): void
    {
        $this->variant('CH02', [['Chaine' => 'CH02', 'Qty' => 2]]);
        $this->variant('CH03', [['Chaine' => 'CH03', 'Qty' => 3]]);
        $this->variant('CH99', [['Chaine' => 'CH99', 'Qty' => 9]]);

        $dataset = $this->datasetFor([
            'p' => ['chaine' => ['CH02', 'CH03']],
        ]);

        $this->assertNotNull($dataset);
        $this->assertCount(2, $dataset['sample_data']);
        $this->assertSame(2, $dataset['row_count']);
        $this->assertSame('CH02', $dataset['sample_data'][0]['Chaine']);
        $this->assertSame('CH03', $dataset['sample_data'][1]['Chaine']);
        $this->assertSame('text', $dataset['columns'][0]['type']);
        $this->assertSame('number', $dataset['columns'][1]['type']);
    }

    public function test_duplicate_rows_across_variants_are_deduplicated(): void
    {
        $this->variant('CH02', [['Chaine' => 'CH02', 'Qty' => 2]]);
        $this->variant('CH03', [['Chaine' => 'CH02', 'Qty' => 2]]);

        $dataset = $this->datasetFor([
            'p' => ['chaine' => ['CH02', 'CH03']],
        ]);

        $this->assertNotNull($dataset);
        $this->assertCount(1, $dataset['sample_data']);
        $this->assertSame(1, $dataset['row_count']);
    }

    public function test_a_single_selection_still_resolves_exactly_one_variant(): void
    {
        $this->variant('CH02', [['Chaine' => 'CH02', 'Qty' => 2]]);

        $dataset = $this->datasetFor([
            'p' => ['chaine' => 'CH02'],
        ]);

        $this->assertNotNull($dataset);
        $this->assertCount(1, $dataset['sample_data']);
        $this->assertSame('CH02', $dataset['sample_data'][0]['Chaine']);
    }

    public function test_unselected_variants_fall_back_to_default_rows(): void
    {
        $dataset = $this->datasetFor([
            'p' => ['chaine' => 'CH99'],
        ]);

        $this->assertNotNull($dataset);
        $this->assertCount(1, $dataset['sample_data']);
        $this->assertSame('CH01', $dataset['sample_data'][0]['Chaine']);
    }
}