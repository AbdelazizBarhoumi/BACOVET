<?php

namespace Tests\Feature\Api;

use App\Models\EndpointDataset;
use App\Services\EndpointDatasetRegistry;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SyncEndpointDatasetsTest extends TestCase
{
    use RefreshDatabase;

    private const FIXTURE = 'app/public/data.test.json';

    protected function setUp(): void
    {
        parent::setUp();

        config(['novacity.data_file' => self::FIXTURE]);
        config(['novacity.base_url' => 'http://novacity']);
        config(['novacity.api_key' => 'secret']);
        app(EndpointDatasetRegistry::class)->forgetCache();
    }

    protected function tearDown(): void
    {
        @unlink(storage_path(self::FIXTURE));

        parent::tearDown();
    }

    public function test_syncs_tabular_get_endpoints_only(): void
    {
        $this->writeFixture([
            [
                'name' => 'ItemTrxEnq (QCM)',
                'method' => 'GET',
                'endpoint' => 'http://novacity/api/data/itemtrxenq',
                'response' => [
                    'label' => 'Item Trx Enq',
                    'object' => 'ItemTrxEnq',
                    'columns' => ['code', 'qty', 'created_on'],
                    'data' => [['code' => 'stale']],
                ],
            ],
            [
                'name' => 'Auth Me',
                'method' => 'GET',
                'endpoint' => 'http://novacity/api/auth/me',
                'response' => ['data' => [['id' => 1]]],
            ],
            [
                'name' => 'Admin Users',
                'method' => 'GET',
                'endpoint' => 'http://novacity/api/admin/users',
                'response' => ['data' => [['id' => 1]]],
            ],
            [
                'name' => 'Post Only',
                'method' => 'POST',
                'endpoint' => 'http://novacity/api/data/post',
                'response' => ['data' => [['id' => 1]]],
            ],
        ]);

        Http::fake([
            'novacity/api/data/itemtrxenq*' => Http::response([
                'success' => true,
                'label' => 'Item Trx Enq',
                'object' => 'ItemTrxEnq',
                'columns' => ['code', 'qty', 'created_on'],
                'data' => [
                    ['code' => 'A', 'qty' => 2, 'created_on' => '2024-01-01'],
                    ['code' => 'B', 'qty' => 3, 'created_on' => '2024-01-02'],
                ],
            ]),
        ]);

        $this->artisan('sync:endpoint-datasets')->assertSuccessful();

        $this->assertSame(1, EndpointDataset::count());
        $this->assertDatabaseHas('endpoint_datasets', ['slug' => 'api/data/itemtrxenq']);

        $row = EndpointDataset::where('slug', 'api/data/itemtrxenq')->firstOrFail();
        $this->assertSame('Item Trx Enq', $row->label);
        $this->assertSame('ItemTrxEnq', $row->object);
        $this->assertSame('QCM', $row->source);
        $this->assertSame('ok', $row->last_status);
        $this->assertSame(2, $row->row_count);
        $this->assertEquals(
            ['code' => 'text', 'qty' => 'number', 'created_on' => 'date'],
            collect($row->columns)
                ->mapWithKeys(fn (array $c): array => [$c['name'] => $c['type']])
                ->all(),
        );
        $this->assertSame('A', $row->sample_data[0]['code']);
    }

    public function test_upsert_updates_existing_slug(): void
    {
        EndpointDataset::create([
            'slug' => 'api/data/itemtrxenq',
            'name' => 'Old',
            'method' => 'GET',
            'row_count' => 0,
            'last_status' => 'ok',
        ]);

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

        Http::fake([
            'novacity/api/data/itemtrxenq*' => Http::response([
                'success' => true,
                'data' => [['code' => 'A']],
            ]),
        ]);

        $this->artisan('sync:endpoint-datasets')->assertSuccessful();

        $this->assertSame(1, EndpointDataset::count());
        $this->assertSame('ItemTrxEnq', EndpointDataset::firstOrFail()->name);
        $this->assertSame(1, EndpointDataset::firstOrFail()->row_count);
        $this->assertSame('A', EndpointDataset::firstOrFail()->sample_data[0]['code']);
    }

    public function test_records_error_and_keeps_previous_row_count_when_fetch_fails(): void
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

        Http::fake([
            'novacity/api/data/itemtrxenq*' => Http::failedConnection('Connection refused'),
        ]);

        $this->artisan('sync:endpoint-datasets')->assertSuccessful();

        $row = EndpointDataset::where('slug', 'api/data/itemtrxenq')->firstOrFail();
        $this->assertSame('error', $row->last_status);
        $this->assertStringContainsString('Connection refused', $row->last_error);
        $this->assertSame(0, $row->row_count);
        $this->assertSame([], $row->sample_data);
    }

    public function test_fails_when_file_missing(): void
    {
        $this->artisan('sync:endpoint-datasets')->assertFailed();
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
