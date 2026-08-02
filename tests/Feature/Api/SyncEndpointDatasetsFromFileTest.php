<?php

namespace Tests\Feature\Api;

use App\Models\EndpointDataset;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SyncEndpointDatasetsFromFileTest extends TestCase
{
    use RefreshDatabase;

    private const FIXTURE = 'app/public/data.from-file.test.json';

    protected function setUp(): void
    {
        parent::setUp();

        config(['novacity.data_file' => self::FIXTURE]);
    }

    protected function tearDown(): void
    {
        @unlink(storage_path(self::FIXTURE));

        parent::tearDown();
    }

    public function test_imports_tabular_get_endpoints_only(): void
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
                    'data' => [
                        ['code' => 'A', 'qty' => 2, 'created_on' => '2024-01-01'],
                        ['code' => 'B', 'qty' => 3, 'created_on' => '2024-01-02'],
                    ],
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

        $this->artisan('sync:endpoint-datasets:file', ['--file' => storage_path(self::FIXTURE)])
            ->assertSuccessful();

        $this->assertSame(1, EndpointDataset::count());
        $this->assertDatabaseHas('endpoint_datasets', ['slug' => 'api/data/itemtrxenq']);

        $row = EndpointDataset::where('slug', 'api/data/itemtrxenq')->firstOrFail();
        $this->assertSame('ItemTrxEnq (QCM)', $row->name);
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
                    'columns' => ['code'],
                    'data' => [['code' => 'A']],
                ],
            ],
        ]);

        $this->artisan('sync:endpoint-datasets:file', ['--file' => storage_path(self::FIXTURE)])
            ->assertSuccessful();

        $this->assertSame(1, EndpointDataset::count());
        $row = EndpointDataset::firstOrFail();
        $this->assertSame('ItemTrxEnq', $row->name);
        $this->assertSame(1, $row->row_count);
        $this->assertSame('A', $row->sample_data[0]['code']);
    }

    public function test_dry_run_writes_nothing(): void
    {
        $this->writeFixture([
            [
                'name' => 'ItemTrxEnq',
                'method' => 'GET',
                'endpoint' => 'http://novacity/api/data/itemtrxenq',
                'response' => [
                    'columns' => ['code'],
                    'data' => [['code' => 'A']],
                ],
            ],
        ]);

        $this->artisan('sync:endpoint-datasets:file', [
            '--file' => storage_path(self::FIXTURE),
            '--dry-run' => true,
        ])->assertSuccessful();

        $this->assertSame(0, EndpointDataset::count());
    }

    public function test_fails_when_file_missing(): void
    {
        $this->artisan('sync:endpoint-datasets:file')->assertFailed();
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
