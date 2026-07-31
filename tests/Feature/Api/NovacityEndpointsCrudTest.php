<?php

namespace Tests\Feature\Api;

use App\Http\Controllers\Api\NovacityEndpointsController;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class NovacityEndpointsCrudTest extends TestCase
{
    use RefreshDatabase;

    private string $testDir;

    private string $dataPath;

    private string $backupPath;

    protected function setUp(): void
    {
        parent::setUp();

        $this->testDir = storage_path('app/public/_endpoint_tests_'.uniqid());
        mkdir($this->testDir, 0755, true);
        $this->dataPath = $this->testDir.'/data.json';
        $this->backupPath = $this->testDir.'/data.json.bak';

        config(['novacity.data_file' => str_replace(storage_path().DIRECTORY_SEPARATOR, '', $this->dataPath)]);
        config(['novacity.data_backup' => str_replace(storage_path().DIRECTORY_SEPARATOR, '', $this->backupPath)]);

        file_put_contents($this->dataPath, json_encode($this->fixture(), JSON_PRETTY_PRINT));

        $role = \App\Models\Role::firstOrCreate(['slug' => 'it'], ['name' => 'IT']);
        $this->user = User::factory()->create([
            'role_id' => $role->id,
            'is_active' => true,
        ]);
        $this->actingAs($this->user);

        NovacityEndpointsController::flushCache();
    }

    protected function tearDown(): void
    {
        NovacityEndpointsController::flushCache();
        if (is_dir($this->testDir)) {
            foreach (glob($this->testDir.'/*') ?: [] as $file) {
                @unlink($file);
            }
            @rmdir($this->testDir);
        }
        parent::tearDown();
    }

    private function fixture(): array
    {
        return [
            [
                'id' => '00000000-0000-0000-0000-000000000001',
                'name' => '🔑 Health (OTHER)',
                'method' => 'GET',
                'endpoint' => 'https://api.example.com/',
                'status' => 200,
                'response' => [
                    'name' => 'Novacity API',
                    'version' => '1.0.0',
                    'status' => 'running',
                    'docs' => '/api/admin/health',
                ],
            ],
            [
                'id' => '00000000-0000-0000-0000-000000000002',
                'name' => '01 — ItemTrxEnq (SDT)',
                'method' => 'GET',
                'endpoint' => 'https://api.example.com/api/data/itemtrxenq?limit=100&offset=0',
                'status' => 200,
                'response' => [
                    'success' => true,
                    'endpoint' => 'itemtrxenq',
                    'label' => 'ItemTrxEnq',
                    'source' => 'SDT',
                    'object' => 'vwItemTrxEnq',
                    'object_type' => 'view',
                    'columns' => ['IsSplit', 'TransactionID', 'StartTime', 'Quantity', 'SAM', 'ShiftCode'],
                    'date_filter' => 'none',
                    'count' => 2,
                    'data' => [
                        ['IsSplit' => false, 'TransactionID' => 308175, 'StartTime' => '2016-12-27T15:59:55.000Z', 'Quantity' => 36, 'SAM' => null, 'ShiftCode' => 'JOUR      '],
                        ['IsSplit' => true, 'TransactionID' => 308176, 'StartTime' => '2016-12-27T16:00:00.000Z', 'Quantity' => 12.5, 'SAM' => null, 'ShiftCode' => 'JOUR      '],
                    ],
                ],
            ],
            [
                'id' => '00000000-0000-0000-0000-000000000003',
                'name' => 'Q-01 — colis (DIVATEX)',
                'method' => 'GET',
                'endpoint' => 'https://api.example.com/api/data/q/colis_total_3var?limit=100&offset=0',
                'status' => 200,
                'response' => [
                    'success' => true,
                    'query' => 'SELECT 1',
                    'count' => 1,
                    'limit' => 100,
                    'offset' => 0,
                    'data' => [['Colis' => 120, 'Label' => 'abc']],
                ],
            ],
            [
                'id' => '00000000-0000-0000-0000-000000000004',
                'name' => 'Broken (QCM)',
                'method' => 'GET',
                'endpoint' => 'https://api.example.com/api/data/rovereffectiveness',
                'status' => 500,
                'response' => ['success' => false, 'message' => 'boom'],
            ],
        ];
    }

    private function readFile(): array
    {
        return json_decode(file_get_contents($this->dataPath), true);
    }

    private function firstId(): string
    {
        $items = json_decode(file_get_contents($this->dataPath), true);

        return $items[0]['id'];
    }

    /** @test */
    public function index_returns_lightweight_summaries_and_stats()
    {
        $response = $this->getJson('/novacity-endpoints/list');

        $response->assertStatus(200);
        $json = $response->json();

        $this->assertCount(4, $json['items']);
        $this->assertSame(4, $json['total']);
        $this->assertSame(4, $json['stats']['total']);
        $this->assertSame(4, $json['stats']['by_method']['GET']);

        $first = $json['items'][1];
        $this->assertArrayHasKey('id', $first);
        $this->assertSame('01 — ItemTrxEnq (SDT)', $first['name']);
        $this->assertSame('SDT', $first['source']);
        $this->assertSame(2, $first['row_count']);
        $this->assertTrue($first['has_data']);
        $this->assertSame(['IsSplit', 'TransactionID', 'StartTime', 'Quantity', 'SAM', 'ShiftCode'], $first['columns']);
        $this->assertArrayNotHasKey('response', $first);
    }

    /** @test */
    public function index_filters_by_search_method_source_and_status_group()
    {
        $this->assertSame(1, $this->getJson('/novacity-endpoints/list?search=itemtrx')->json()['total']);
        $this->assertSame(1, $this->getJson('/novacity-endpoints/list?source=divatex')->json()['total']);
        $this->assertSame(1, $this->getJson('/novacity-endpoints/list?status_group=error')->json()['total']);
        $this->assertSame(0, $this->getJson('/novacity-endpoints/list?method=POST')->json()['total']);
        $this->assertSame(3, $this->getJson('/novacity-endpoints/list?status_group=ok')->json()['total']);
    }

    /** @test */
    public function index_paginates()
    {
        $response = $this->getJson('/novacity-endpoints/list?per_page=2&page=1');

        $response->assertStatus(200);
        $json = $response->json();
        $this->assertSame(4, $json['total']);
        $this->assertCount(2, $json['items']);
        $this->assertSame(1, $json['page']);
        $this->assertSame(2, $json['per_page']);
    }

    /** @test */
    public function store_creates_entry_and_persists_ids()
    {
        $payload = [
            'name' => 'My new endpoint (SDT)',
            'method' => 'POST',
            'endpoint' => 'https://api.example.com/api/data/custom',
            'status' => 200,
            'response' => ['success' => true, 'data' => [['a' => 1]]],
        ];

        $response = $this->postJson('/novacity-endpoints', $payload);

        $response->assertStatus(201);
        $entry = $response->json()['entry'];
        $this->assertNotEmpty($entry['id']);
        $this->assertSame('My new endpoint (SDT)', $entry['name']);
        $this->assertSame('POST', $entry['method']);
        $this->assertSame(['success' => true, 'data' => [['a' => 1]]], $entry['response']);

        $file = $this->readFile();
        $this->assertCount(5, $file);
        foreach ($file as $item) {
            $this->assertNotEmpty($item['id'], 'Every persisted entry must have an id');
        }
    }

    /** @test */
    public function store_rejects_invalid_payloads()
    {
        $this->postJson('/novacity-endpoints', [
            'name' => '',
            'method' => 'DELETE',
            'endpoint' => 'not-a-url',
            'status' => 9999,
            'response' => [],
        ])->assertStatus(422);
    }

    /** @test */
    public function show_returns_full_entry()
    {
        $id = $this->firstId();

        $response = $this->getJson("/novacity-endpoints/{$id}");

        $response->assertStatus(200);
        $entry = $response->json()['entry'];
        $this->assertSame($id, $entry['id']);
        $this->assertArrayHasKey('response', $entry);
    }

    /** @test */
    public function show_returns_404_for_unknown_id()
    {
        $this->getJson('/novacity-endpoints/does-not-exist')
            ->assertStatus(404);
    }

    /** @test */
    public function update_modifies_fields_and_keeps_id()
    {
        $id = $this->firstId();

        $response = $this->putJson("/novacity-endpoints/{$id}", [
            'name' => 'Renamed',
            'status' => 201,
            'response' => ['message' => 'updated'],
        ]);

        $response->assertStatus(200);
        $entry = $response->json()['entry'];
        $this->assertSame($id, $entry['id']);
        $this->assertSame('Renamed', $entry['name']);
        $this->assertSame(201, $entry['status']);
        $this->assertSame(['message' => 'updated'], $entry['response']);
        $this->assertSame('https://api.example.com/', $entry['endpoint']);
    }

    /** @test */
    public function update_returns_404_for_unknown_id()
    {
        $this->putJson('/novacity-endpoints/does-not-exist', ['name' => 'x'])
            ->assertStatus(404);
    }

    /** @test */
    public function destroy_removes_entry_and_creates_backup()
    {
        $id = $this->firstId();

        $response = $this->deleteJson("/novacity-endpoints/{$id}");

        $response->assertStatus(200);
        $this->assertCount(3, $this->readFile());
        $this->assertFileExists($this->backupPath);
        $this->getJson('/novacity-endpoints/list')->assertJsonFragment(['total' => 3]);
    }

    /** @test */
    public function destroy_returns_404_for_unknown_id()
    {
        $this->deleteJson('/novacity-endpoints/does-not-exist')
            ->assertStatus(404);
    }

    /** @test */
    public function duplicate_creates_copy_with_new_id_after_original()
    {
        $id = $this->firstId();

        $response = $this->postJson("/novacity-endpoints/{$id}/duplicate");

        $response->assertStatus(200);
        $copy = $response->json()['entry'];
        $this->assertNotSame($id, $copy['id']);
        $this->assertStringContainsString('(copy)', $copy['name']);

        $file = $this->readFile();
        $this->assertCount(5, $file);
        $this->assertSame($id, $file[0]['id'], 'Original stays in place');
        $this->assertSame($copy['id'], $file[1]['id'], 'Copy must sit right after the original');
    }

    /** @test */
    public function reorder_reorders_entries()
    {
        $file = $this->readFile();
        $ids = array_column($file, 'id');
        $reversed = array_reverse($ids);

        $response = $this->postJson('/novacity-endpoints/reorder', ['ids' => $reversed]);

        $response->assertStatus(200);
        $this->assertSame($reversed, array_column($this->readFile(), 'id'));
    }

    /** @test */
    public function reorder_rejects_incomplete_or_unknown_ids()
    {
        $file = $this->readFile();
        $ids = array_column($file, 'id');

        $this->postJson('/novacity-endpoints/reorder', ['ids' => [$ids[0]]])
            ->assertStatus(422);

        $this->postJson('/novacity-endpoints/reorder', ['ids' => [...$ids, 'bogus']])
            ->assertStatus(422);
    }

    /** @test */
    public function structure_derives_columns_and_inferred_types()
    {
        $response = $this->getJson('/novacity-endpoints/structure');

        $response->assertStatus(200);
        $structure = collect($response->json()['structure'])->keyBy('name');

        $item = $structure->get('01 — ItemTrxEnq (SDT)');
        $this->assertNotNull($item);
        $this->assertSame('view', $item['object_type']);
        $this->assertSame(2, $item['row_count']);

        $byName = collect($item['columns'])->keyBy('name');
        $this->assertSame('boolean', $byName->get('IsSplit')['type']);
        $this->assertSame('integer', $byName->get('TransactionID')['type']);
        $this->assertSame('date', $byName->get('StartTime')['type']);
        $this->assertSame('string', $byName->get('ShiftCode')['type']);
        $this->assertSame('null', $byName->get('SAM')['type']);
        $this->assertTrue($byName->get('SAM')['nullable']);
        $this->assertContains($byName->get('Quantity')['type'], ['mixed', 'number', 'integer']);

        $divatex = $structure->get('Q-01 — colis (DIVATEX)');
        $this->assertSame('DIVATEX', $divatex['source']);
        $this->assertSame('integer', collect($divatex['columns'])->firstWhere('name', 'Colis')['type']);
    }

    /** @test */
    public function missing_file_returns_404()
    {
        config(['novacity.data_file' => 'app/public/does-not-exist.json']);
        NovacityEndpointsController::flushCache();

        $this->getJson('/novacity-endpoints/list')->assertStatus(404);
        $this->getJson('/novacity-endpoints/structure')->assertStatus(404);
    }

    /** @test */
    public function invalid_json_returns_404()
    {
        file_put_contents($this->dataPath, '{{{ not json');
        NovacityEndpointsController::flushCache();

        $this->getJson('/novacity-endpoints/list')->assertStatus(404);
    }

    /** @test */
    public function test_fetches_live_endpoint_and_returns_json_without_saving()
    {
        Http::fake([
            'https://live.test/api/data/itemtrxenq*' => Http::response([
                'success' => true,
                'data' => [['TransactionID' => 1]],
            ], 200),
        ]);

        $before = count($this->readFile());

        $response = $this->postJson('/novacity-endpoints/test', [
            'name' => 'Live (SDT)',
            'method' => 'GET',
            'path' => 'api/data/itemtrxenq?limit=1',
            'baseUrl' => 'https://live.test',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('status', 200)
            ->assertJsonPath('url', 'https://live.test/api/data/itemtrxenq?limit=1')
            ->assertJsonPath('response.data.0.TransactionID', 1);

        $this->assertCount($before, $this->readFile(), 'test must not persist anything');

        Http::assertSent(function ($request) {
            return $request->url() === 'https://live.test/api/data/itemtrxenq?limit=1'
                && $request->header('x-api-key')[0] === config('novacity.api_key');
        });
    }

    /** @test */
    public function test_falls_back_to_env_base_url_when_root_not_submitted()
    {
        config(['novacity.base_url' => 'https://env.test']);

        Http::fake([
            'https://env.test/api/data/itemtrxenq*' => Http::response([
                'success' => true,
                'data' => [],
            ], 200),
        ]);

        $this->postJson('/novacity-endpoints/test', [
            'name' => 'Env (SDT)',
            'method' => 'GET',
            'path' => 'api/data/itemtrxenq',
        ])->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('url', 'https://env.test/api/data/itemtrxenq');

        Http::assertSent(function ($request) {
            return $request->url() === 'https://env.test/api/data/itemtrxenq';
        });
    }

    /** @test */
    public function test_rejects_non_200_status()
    {
        Http::fake([
            'https://live.test/*' => Http::response(null, 500),
        ]);

        $this->postJson('/novacity-endpoints/test', [
            'name' => 'Down (SDT)',
            'method' => 'GET',
            'path' => 'api/data/broken',
            'baseUrl' => 'https://live.test',
        ])->assertStatus(200)
            ->assertJsonPath('success', false)
            ->assertJsonPath('status', 500)
            ->assertJsonMissingPath('response');
    }

    /** @test */
    public function test_rejects_non_json_200_response()
    {
        Http::fake([
            'https://live.test/*' => Http::response('plain text body', 200),
        ]);

        $this->postJson('/novacity-endpoints/test', [
            'name' => 'Html (SDT)',
            'method' => 'GET',
            'path' => 'api/data/html',
            'baseUrl' => 'https://live.test',
        ])->assertStatus(200)
            ->assertJsonPath('success', false)
            ->assertJsonPath('error', 'Response is not a valid JSON object or array')
            ->assertJsonMissingPath('response');
    }

    /** @test */
    public function test_requires_valid_path_and_base_url()
    {
        Http::fake();

        $this->postJson('/novacity-endpoints/test', [
            'name' => '',
            'method' => 'DELETE',
            'path' => '',
            'baseUrl' => 'not-a-url',
        ])->assertStatus(422);

        config(['novacity.base_url' => '']);
        $this->postJson('/novacity-endpoints/test', [
            'name' => 'No root',
            'method' => 'GET',
            'path' => 'api/data/x',
        ])->assertStatus(400)
            ->assertJsonPath('success', false)
            ->assertJsonPath('error', 'Novacity base URL not configured');
    }

    /** @test */
    public function unauthenticated_requests_are_rejected()
    {
        auth()->logout();

        $this->getJson('/novacity-endpoints/list')->assertStatus(401);
        $this->postJson('/novacity-endpoints', [])->assertStatus(401);
    }

    /** @test */
    public function non_it_roles_are_rejected()
    {
        $direction = \App\Models\Role::firstOrCreate(['slug' => 'direction'], ['name' => 'Direction']);
        $user = User::factory()->create(['role_id' => $direction->id, 'is_active' => true]);
        $this->actingAs($user);

        $this->getJson('/novacity-endpoints/list')->assertStatus(403);
        $this->deleteJson('/novacity-endpoints/some-id')->assertStatus(403);
    }
}
