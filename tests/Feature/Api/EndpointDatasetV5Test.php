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

    private function writeFixture(array $data): void
    {
        $path = storage_path(self::FIXTURE);
        if (! is_dir(dirname($path))) {
            mkdir(dirname($path), 0777, true);
        }
        file_put_contents($path, json_encode($data, JSON_THROW_ON_ERROR));
    }
}
