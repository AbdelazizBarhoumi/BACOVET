<?php

namespace Tests\Feature\Api;

use App\Models\EndpointDataset;
use App\Models\V5User;
use App\Services\EndpointDatasetRegistry;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EndpointDatasetV5Test extends TestCase
{
    use RefreshDatabase;

    private const FIXTURE = 'app/public/data.test.json';

    protected V5User $user;

    protected function setUp(): void
    {
        parent::setUp();

        config(['novacity.data_file' => self::FIXTURE]);
        app(EndpointDatasetRegistry::class)->forgetCache();

        $this->user = V5User::create([
            'email' => 'builder@test.com',
            'name' => 'Builder',
            'role' => 'it',
            'password' => '',
            'has_password' => false,
        ]);
        $this->actingAs($this->user, 'v5_users');
    }

    protected function tearDown(): void
    {
        @unlink(storage_path(self::FIXTURE));

        parent::tearDown();
    }

    public function test_unauthenticated_returns_401(): void
    {
        $this->app['auth']->guard('v5_users')->logout();

        $this->getJson('/api/v5/endpoint-datasets')->assertStatus(401);
    }

    public function test_schema_unauthenticated_returns_401(): void
    {
        $this->app['auth']->guard('v5_users')->logout();

        $this->getJson('/api/v5/schema')->assertStatus(401);
    }

    public function test_schema_returns_shared_join_analysis_for_v5_users(): void
    {
        $this->writeFixture([
            [
                'name' => 'Sales',
                'method' => 'GET',
                'endpoint' => 'http://novacity/api/data/sales',
                'response' => [
                    'columns' => ['Category', 'Amount', 'ProductId'],
                    'data' => [
                        ['Category' => 'A', 'Amount' => 10, 'ProductId' => 'P1'],
                        ['Category' => 'B', 'Amount' => 20, 'ProductId' => 'P2'],
                    ],
                ],
            ],
            [
                'name' => 'Products',
                'method' => 'GET',
                'endpoint' => 'http://novacity/api/data/products',
                'response' => [
                    'columns' => ['ProductId', 'Label'],
                    'data' => [
                        ['ProductId' => 'P1', 'Label' => 'One'],
                        ['ProductId' => 'P2', 'Label' => 'Two'],
                    ],
                ],
            ],
        ]);

        $response = $this->getJson('/api/v5/schema');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'entries',
            'columns',
            'foreign_keys',
            'generated_at',
        ]);
        $this->assertNotEmpty($response->json('entries'));

        // ProductId appears in both tables -> shared join column.
        $shared = collect($response->json('columns'))
            ->first(fn ($col) => strtolower($col['name']) === 'productid');
        $this->assertNotNull($shared);
        $this->assertGreaterThanOrEqual(2, $shared['endpoint_count']);
    }

    public function test_index_merges_structure_from_data_json_with_db_rows(): void
    {
        $this->writeFixture([
            [
                'name' => 'ItemTrxEnq (QCM)',
                'method' => 'GET',
                'endpoint' => 'http://novacity/api/data/itemtrxenq',
                'response' => [
                    'label' => 'Item Trx Enq',
                    'object' => 'ItemTrxEnq',
                    'object_type' => 'view',
                    'source' => 'QCM',
                    'columns' => ['code', 'qty', 'created_on'],
                    'data' => [['code' => 'stale']],
                ],
            ],
            [
                'name' => 'Admin Users',
                'method' => 'GET',
                'endpoint' => 'http://novacity/api/admin/users',
                'response' => [
                    'label' => 'Users',
                    'columns' => ['id'],
                    'data' => [['id' => 1]],
                ],
            ],
            [
                'name' => 'Empty',
                'method' => 'GET',
                'endpoint' => 'http://novacity/api/data/empty',
                'response' => [
                    'label' => 'Empty',
                    'columns' => ['id'],
                    'data' => [],
                ],
            ],
        ]);

        EndpointDataset::create([
            'slug' => 'api/data/itemtrxenq',
            'name' => 'Old Name',
            'method' => 'GET',
            'columns' => [['name' => 'code', 'type' => 'text']],
            'sample_data' => [['code' => 'A']],
            'row_count' => 1,
            'last_status' => 'ok',
        ]);

        $response = $this->getJson('/api/v5/endpoint-datasets');

        $response->assertStatus(200);
        $this->assertEquals(
            ['api/data/itemtrxenq'],
            array_column($response->json('datasets'), 'slug'),
        );
        $this->assertEquals('Item Trx Enq', $response->json('datasets.0.label'));
        $this->assertEquals('ItemTrxEnq', $response->json('datasets.0.object'));
        $this->assertEquals('QCM', $response->json('datasets.0.source'));
        $this->assertEquals(1, $response->json('datasets.0.row_count'));
        $this->assertEquals('A', $response->json('datasets.0.sample_data.0.code'));
        // Structure (column names + types) comes from the data.json + DB merge.
        $this->assertEquals(
            ['code', 'qty', 'created_on'],
            array_column($response->json('datasets.0.columns'), 'name'),
        );
        $this->assertEquals('text', $response->json('datasets.0.columns.0.type'));
    }

    public function test_index_excludes_datasets_without_db_rows(): void
    {
        $this->writeFixture([
            [
                'name' => 'ItemTrxEnq',
                'method' => 'GET',
                'endpoint' => 'http://novacity/api/data/itemtrxenq',
                'response' => [
                    'label' => 'Item Trx Enq',
                    'columns' => ['code'],
                    'data' => [['code' => 'stale']],
                ],
            ],
        ]);

        // No EndpointDataset row yet -> nothing should be returned.
        $response = $this->getJson('/api/v5/endpoint-datasets');

        $response->assertStatus(200);
        $this->assertSame([], $response->json('datasets'));
    }

    public function test_index_orders_by_slug(): void
    {
        $this->writeFixture([
            [
                'name' => 'Zeta',
                'method' => 'GET',
                'endpoint' => 'http://novacity/api/data/zeta',
                'response' => ['columns' => ['id'], 'data' => [['id' => 1]]],
            ],
            [
                'name' => 'Alpha',
                'method' => 'GET',
                'endpoint' => 'http://novacity/api/data/alpha',
                'response' => ['columns' => ['id'], 'data' => [['id' => 1]]],
            ],
        ]);

        EndpointDataset::create([
            'slug' => 'api/data/zeta',
            'name' => 'Zeta',
            'method' => 'GET',
            'row_count' => 1,
            'last_status' => 'ok',
        ]);
        EndpointDataset::create([
            'slug' => 'api/data/alpha',
            'name' => 'Alpha',
            'method' => 'GET',
            'row_count' => 1,
            'last_status' => 'ok',
        ]);

        $response = $this->getJson('/api/v5/endpoint-datasets');

        $this->assertEquals(
            ['api/data/alpha', 'api/data/zeta'],
            array_column($response->json('datasets'), 'slug'),
        );
    }

    public function test_index_includes_empty_fixture_tables_with_schema(): void
    {
        $this->writeFixture([
            $this->structure('sales', ['Category', 'Region', 'Amount', 'IsReturned', 'SaleDate']),
            $this->structure('sales_duplicate', ['Category', 'DuplicateName']),
            $this->structure('dates', ['SaleDate']),
            $this->structure('empty_table', ['Category', 'Amount']),
        ]);

        foreach (['sales', 'sales_duplicate', 'dates', 'empty_table'] as $slug) {
            EndpointDataset::create([
                'slug' => "api/data/{$slug}",
                'name' => $slug,
                'row_count' => $slug === 'empty_table' ? 0 : 1,
                'columns' => [['name' => 'Category', 'type' => 'text']],
                'sample_data' => $slug === 'empty_table' ? [] : [['Category' => 'A']],
                'last_status' => 'ok',
                'method' => 'GET',
            ]);
        }

        $response = $this->getJson('/api/v5/endpoint-datasets')->assertStatus(200);

        $datasets = collect($response->json('datasets'))->keyBy('slug');
        $this->assertCount(4, $datasets);
        $this->assertSame(0, $datasets['api/data/empty_table']['row_count']);
        $this->assertSame(
            ['Category', 'Amount'],
            array_column($datasets['api/data/empty_table']['columns'], 'name'),
        );
        $this->assertSame([], $datasets['api/data/empty_table']['sample_data']);
    }

    public function test_index_includes_datasets_with_error_status_and_their_last_good_data(): void
    {
        $this->writeFixture([
            [
                'name' => 'ItemTrxEnq',
                'method' => 'GET',
                'endpoint' => 'http://novacity/api/data/itemtrxenq',
                'response' => [
                    'label' => 'Item Trx Enq',
                    'columns' => ['code', 'qty'],
                    'data' => [['code' => 'stale']],
                ],
            ],
        ]);

        EndpointDataset::create([
            'slug' => 'api/data/itemtrxenq',
            'name' => 'ItemTrxEnq',
            'method' => 'GET',
            'columns' => [['name' => 'code', 'type' => 'text']],
            'sample_data' => [['code' => 'A']],
            'row_count' => 1,
            'last_status' => 'error',
            'last_error' => 'HTTP 500',
        ]);

        $response = $this->getJson('/api/v5/endpoint-datasets');

        $response->assertStatus(200);
        $this->assertEquals(
            ['api/data/itemtrxenq'],
            array_column($response->json('datasets'), 'slug'),
        );
        $this->assertEquals('error', $response->json('datasets.0.status'));
        $this->assertEquals('HTTP 500', $response->json('datasets.0.last_error'));
        $this->assertEquals(1, $response->json('datasets.0.row_count'));
        $this->assertEquals('A', $response->json('datasets.0.sample_data.0.code'));
        $this->assertEquals('text', $response->json('datasets.0.columns.0.type'));
    }

    private function writeFixture(array $data): void
    {
        $path = storage_path(self::FIXTURE);
        if (! is_dir(dirname($path))) {
            mkdir(dirname($path), 0777, true);
        }
        file_put_contents($path, json_encode($data, JSON_THROW_ON_ERROR));
    }

    private function structure(string $slug, array $columns): array
    {
        return [
            'name' => $slug,
            'method' => 'GET',
            'endpoint' => "http://novacity/api/data/{$slug}",
            'response' => [
                'label' => $slug,
                'columns' => $columns,
                'data' => [],
            ],
        ];
    }
}
