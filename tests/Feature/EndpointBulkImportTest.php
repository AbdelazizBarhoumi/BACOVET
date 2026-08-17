<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\NovacityEndpointsController;
use App\Models\EndpointDataset;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class EndpointBulkImportTest extends TestCase
{
    use RefreshDatabase;

    private string $dataFile;

    protected function setUp(): void
    {
        parent::setUp();

        $this->dataFile = storage_path('framework/testing/endpoint-import-data.json');

        @mkdir(dirname($this->dataFile), 0755, true);

        config([
            'novacity.data_file' => 'framework/testing/endpoint-import-data.json',
            'novacity.base_url' => 'https://api.test',
            'novacity.api_key' => 'test-key',
            'novacity.timeout' => 5,
        ]);

        file_put_contents($this->dataFile, '[]');

        // Import now auto-syncs the created endpoints into datasets, which
        // fires live fetches — prevent stray requests so each test fakes the
        // endpoints it actually imports.
        Http::preventStrayRequests();

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

    private function storedEntries(): array
    {
        $raw = json_decode((string) file_get_contents($this->dataFile), true);

        return is_array($raw) ? $raw : [];
    }

    public function test_csv_import_creates_entries_and_exposes_them_in_the_list(): void
    {
        Http::fake([
            'https://api.test/api/data/itemtrxenq*' => Http::response(['success' => true, 'data' => [['code' => 'A', 'qty' => 10]]], 200),
            'https://api.test/api/data/ordre_fabrication*' => Http::response(['success' => true, 'data' => [['n_of' => 'OF-1']]], 200),
        ]);

        $csv = <<<'CSV'
            name,method,endpoint,status
            ItemTrxEnq (SDT),GET,https://api.test/api/data/itemtrxenq,200
            OrdreFabrication (QCM),GET,https://api.test/api/data/ordre_fabrication,200
            CSV;

        $this->actingAs($this->userWithRole('it'))
            ->postJson('/novacity-endpoints/import', ['mode' => 'csv', 'content' => $csv])
            ->assertOk()
            ->assertJsonPath('created', 2)
            ->assertJsonPath('skipped', 0)
            ->assertJsonCount(0, 'errors')
            ->assertJsonCount(2, 'entries');

        $entries = $this->storedEntries();

        $this->assertCount(2, $entries);

        $byEndpoint = collect($entries)->keyBy('endpoint');

        $this->assertSame('ItemTrxEnq (SDT)', $byEndpoint['https://api.test/api/data/itemtrxenq']['name']);
        $this->assertSame('GET', $byEndpoint['https://api.test/api/data/itemtrxenq']['method']);
        $this->assertFalse($byEndpoint['https://api.test/api/data/itemtrxenq']['disabled']);

        // Imported entries are visible in the endpoints list…
        $this->actingAs($this->userWithRole('it'))
            ->getJson('/novacity-endpoints/list')
            ->assertOk()
            ->assertJsonPath('total', 2);

        // …and are auto-synced into datasets: the scoped datasets sync fetched
        // live rows and derived columns for the imported GET endpoints.
        $dataset = EndpointDataset::where('slug', 'api/data/itemtrxenq')->first();

        $this->assertNotNull($dataset);
        $this->assertSame('ItemTrxEnq (SDT)', $dataset->name);
        $this->assertSame(1, $dataset->row_count);
        $this->assertSame([['code' => 'A', 'qty' => 10]], $dataset->sample_data);
    }

    public function test_json_import_accepts_array_and_wrapped_payload(): void
    {
        Http::fake(['https://api.test/api/data/*' => Http::response(['success' => true, 'data' => [['x' => 1]]], 200)]);

        $json = json_encode([
            ['name' => 'One', 'method' => 'GET', 'endpoint' => 'https://api.test/api/data/one'],
            ['name' => 'Two', 'method' => 'POST', 'endpoint' => 'https://api.test/api/data/two', 'status' => 201],
        ]);

        $this->actingAs($this->userWithRole('it'))
            ->postJson('/novacity-endpoints/import', ['mode' => 'json', 'content' => $json])
            ->assertOk()
            ->assertJsonPath('created', 2);

        $wrapped = json_encode([
            'endpoints' => [
                ['name' => 'Three', 'method' => 'GET', 'endpoint' => 'https://api.test/api/data/three'],
            ],
        ]);

        $this->actingAs($this->userWithRole('it'))
            ->postJson('/novacity-endpoints/import', ['mode' => 'json', 'content' => $wrapped])
            ->assertOk()
            ->assertJsonPath('created', 1);

        $this->assertCount(3, $this->storedEntries());
    }

    public function test_import_reports_invalid_rows_and_keeps_valid_ones(): void
    {
        Http::fake(['https://api.test/api/data/*' => Http::response(['success' => true, 'data' => [['x' => 1]]], 200)]);

        $csv = <<<'CSV'
            name,method,endpoint,status
            Good,GET,https://api.test/api/data/good,200
            BadMethod,PUT,https://api.test/api/data/bad,200
            ,GET,https://api.test/api/data/noname,200
            BadUrl,GET,not-a-url,200
            CSV;

        $first = $this->actingAs($this->userWithRole('it'))
            ->postJson('/novacity-endpoints/import', ['mode' => 'csv', 'content' => $csv])
            ->assertOk()
            ->assertJsonPath('created', 1)
            ->assertJsonPath('skipped', 0)
            ->assertJsonCount(3, 'errors')
            ->json();

        $messages = collect($first['errors'])->pluck('error')->all();

        $this->assertContains('method doit être GET ou POST (reçu PUT)', $messages);
        $this->assertContains('name est obligatoire', $messages);
        $this->assertContains('endpoint doit être une URL valide', $messages);

        $this->assertCount(1, $this->storedEntries());
    }

    public function test_import_skips_existing_endpoint_urls(): void
    {
        Http::fake(['https://api.test/api/data/*' => Http::response(['success' => true, 'data' => [['x' => 1]]], 200)]);

        file_put_contents($this->dataFile, json_encode([
            [
                'id' => 'ep-1',
                'name' => 'Existing',
                'method' => 'GET',
                'endpoint' => 'https://api.test/api/data/existing',
                'status' => 200,
                'response' => new \stdClass,
                'disabled' => false,
            ],
        ]));

        $csv = <<<'CSV'
            name,method,endpoint
            Existing,GET,https://api.test/api/data/existing
            New,GET,https://api.test/api/data/new
            CSV;

        $this->actingAs($this->userWithRole('it'))
            ->postJson('/novacity-endpoints/import', ['mode' => 'csv', 'content' => $csv])
            ->assertOk()
            ->assertJsonPath('created', 1)
            ->assertJsonPath('skipped', 1);

        $this->assertCount(2, $this->storedEntries());
    }

    public function test_import_requires_it_role(): void
    {
        $this->actingAs($this->userWithRole('resp_production'))
            ->postJson('/novacity-endpoints/import', ['mode' => 'csv', 'content' => 'name,method,endpoint'])
            ->assertForbidden();
    }
}
