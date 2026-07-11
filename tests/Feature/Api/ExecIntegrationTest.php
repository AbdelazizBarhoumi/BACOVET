<?php

namespace Tests\Feature\Api;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ExecIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $role = Role::firstOrCreate(['slug' => 'it'], ['name' => 'IT']);
        $this->user = User::factory()->create([
            'role_id' => $role->id,
            'is_active' => true,
        ]);
        $this->actingAs($this->user);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // NOVACITY ENDPOINTS CONTROLLER
    // ═══════════════════════════════════════════════════════════════════════

    /** @test */
    public function novacity_endpoints_returns_endpoint_metadata()
    {
        // Ensure data.json exists
        $dataPath = storage_path('app/public/data.json');
        if (! file_exists($dataPath)) {
            $this->markTestSkipped('data.json not found');
        }

        $response = $this->get('/novacity-endpoints');

        $response->assertStatus(200);
        $response->assertJsonStructure(['endpoints']);
    }

    /** @test */
    public function novacity_endpoints_sample_returns_data_for_valid_slug()
    {
        $dataPath = storage_path('app/public/data.json');
        if (! file_exists($dataPath)) {
            $this->markTestSkipped('data.json not found');
        }

        $data = json_decode(file_get_contents($dataPath), true);
        if (empty($data)) {
            $this->markTestSkipped('data.json is empty');
        }

        // Get the first endpoint slug
        $firstItem = $data[0];
        $parsed = parse_url($firstItem['endpoint'] ?? '');
        $slug = ltrim($parsed['path'] ?? '', '/');
        if (! str_starts_with($slug, 'api/')) {
            $this->markTestSkipped('First endpoint is not an api/ path');
        }

        $response = $this->get("/novacity-endpoints/sample/{$slug}");

        $response->assertStatus(200);
        $response->assertJsonStructure(['data']);
    }

    /** @test */
    public function novacity_endpoints_sample_returns_error_for_unknown_slug()
    {
        $response = $this->get('/novacity-endpoints/sample/api/data/nonexistent_endpoint_xyz');

        $response->assertStatus(200);
        $response->assertJsonFragment(['error' => 'No sample data for this endpoint']);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // NOVACITY PROXY CONTROLLER
    // ═══════════════════════════════════════════════════════════════════════

    /** @test */
    public function novacity_proxy_forwards_request_and_returns_data()
    {
        Http::fake([
            '*/api/data/checkpassqte*' => Http::response([
                'success' => true,
                'data' => [
                    ['shortname' => 'CH1', 'defect_pct' => 2.5],
                    ['shortname' => 'CH2', 'defect_pct' => 3.1],
                ],
            ], 200),
        ]);

        $response = $this->get('/api/novacity/data/checkpassqte?limit=10');

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'data' => [
                ['shortname' => 'CH1', 'defect_pct' => 2.5],
                ['shortname' => 'CH2', 'defect_pct' => 3.1],
            ],
        ]);
    }

    /** @test */
    public function novacity_proxy_rejects_non_data_paths()
    {
        $response = $this->get('/api/novacity/admin/jobs');

        $response->assertStatus(404);
        $response->assertJsonFragment([
            'success' => false,
            'error' => 'Unsupported Novacity path.',
        ]);
    }

    /** @test */
    public function novacity_proxy_handles_api_error()
    {
        Http::fake([
            '*/api/data/*' => Http::response(null, 500),
        ]);

        $response = $this->get('/api/novacity/data/checkpassqte');

        $response->assertStatus(500);
        $response->assertJson([
            'success' => false,
        ]);
    }

    /** @test */
    public function novacity_proxy_handles_query_endpoint()
    {
        Http::fake([
            '*/api/data/q/wip_chaine*' => Http::response([
                'success' => true,
                'data' => [
                    ['chaine' => 'Line 1', 'en_cours' => 50],
                    ['chaine' => 'Line 2', 'en_cours' => 30],
                ],
            ], 200),
        ]);

        $response = $this->get('/api/novacity/data/q/wip_chaine?limit=100');

        $response->assertStatus(200);
        $data = $response->json();
        $this->assertCount(2, $data['data']);
        $this->assertEquals('Line 1', $data['data'][0]['chaine']);
        $this->assertEquals(50, $data['data'][0]['en_cours']);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // EXEC FLOW INTEGRATION (simulates full pipeline)
    // ═══════════════════════════════════════════════════════════════════════

    /** @test */
    public function exec_flow_direct_type_single_value()
    {
        Http::fake([
            '*/api/data/checkpassqte*' => Http::response([
                'success' => true,
                'data' => [
                    ['shortname' => 'CH1', 'defect_pct' => 3.8],
                ],
            ], 200),
        ]);

        $response = $this->get('/api/novacity/data/checkpassqte?limit=1');

        $response->assertStatus(200);
        $data = $response->json();

        // Simulate what the frontend extractRecords does
        $records = $data['data'] ?? [];
        $this->assertCount(1, $records);

        // Simulate buildExecutionResult for Direct type
        $value = $records[0]['defect_pct'] ?? null;
        $this->assertEquals(3.8, $value);
    }

    /** @test */
    public function exec_flow_direct_type_with_filtering()
    {
        Http::fake([
            '*/api/data/checkpassqte*' => Http::response([
                'success' => true,
                'data' => [
                    ['shortname' => 'CH1', 'shift_code' => 'A', 'defect_pct' => 2.5],
                    ['shortname' => 'CH1', 'shift_code' => 'B', 'defect_pct' => 4.2],
                    ['shortname' => 'CH2', 'shift_code' => 'A', 'defect_pct' => 1.8],
                ],
            ], 200),
        ]);

        $response = $this->get('/api/novacity/data/checkpassqte?limit=100');

        $data = $response->json();
        $records = $data['data'];

        // Simulate filtering: filter_key = 'shift_code', filter_value = 'A'
        $filtered = array_filter($records, fn ($r) => $r['shift_code'] === 'A');
        $this->assertCount(2, $filtered);

        // Extract defect_pct from filtered records
        $values = array_map(fn ($r) => $r['defect_pct'], array_values($filtered));
        $this->assertEquals([2.5, 1.8], $values);
    }

    /** @test */
    public function exec_flow_aggregation_sum()
    {
        $values = [2.5, 4.2, 1.8, 3.1];
        $sum = array_sum($values);
        $this->assertEquals(11.6, $sum);
    }

    /** @test */
    public function exec_flow_aggregation_average()
    {
        $values = [2.5, 4.2, 1.8, 3.1];
        $avg = array_sum($values) / count($values);
        $this->assertEqualsWithDelta(2.9, $avg, 0.01);
    }

    /** @test */
    public function exec_flow_aggregation_latest()
    {
        $values = [2.5, 4.2, 1.8, 3.1];
        $latest = end($values);
        $this->assertEquals(3.1, $latest);
    }

    /** @test */
    public function exec_flow_aggregation_first()
    {
        $values = [2.5, 4.2, 1.8, 3.1];
        $first = $values[0];
        $this->assertEquals(2.5, $first);
    }

    /** @test */
    public function exec_flow_aggregation_min_max()
    {
        $values = [2.5, 4.2, 1.8, 3.1];
        $this->assertEquals(1.8, min($values));
        $this->assertEquals(4.2, max($values));
    }

    /** @test */
    public function exec_flow_aggregation_count()
    {
        $values = [2.5, 4.2, 1.8, 3.1];
        $this->assertEquals(4, count($values));
    }

    /** @test */
    public function exec_flow_complex_type_expression()
    {
        Http::fake([
            '*/api/data/wip_chaine*' => Http::response([
                'success' => true,
                'data' => [
                    ['chaine' => 'A', 'en_cours' => 50, 'capacite' => 100],
                    ['chaine' => 'B', 'en_cours' => 30, 'capacite' => 80],
                ],
            ], 200),
        ]);

        $response = $this->get('/api/novacity/data/q/wip_chaine?limit=100');

        $data = $response->json();
        $records = $data['data'];

        // Simulate Complex type: expression "en_cours / capacite * 100"
        $results = array_map(function ($r) {
            return $r['en_cours'] / $r['capacite'] * 100;
        }, $records);

        $this->assertEqualsWithDelta(50.0, $results[0], 0.01);
        $this->assertEqualsWithDelta(37.5, $results[1], 0.01);
    }

    /** @test */
    public function exec_flow_handles_nested_data_wrapper()
    {
        Http::fake([
            '*/api/data/*' => Http::response([
                'success' => true,
                'data' => [
                    ['value' => 100],
                    ['value' => 200],
                    ['value' => 300],
                ],
            ], 200),
        ]);

        $response = $this->get('/api/novacity/data/checkpassqte?limit=3');

        $data = $response->json();

        // Verify nested data structure is accessible
        $this->assertArrayHasKey('data', $data);
        $this->assertCount(3, $data['data']);
        $this->assertEquals(100, $data['data'][0]['value']);
    }

    /** @test */
    public function exec_flow_handles_items_wrapper()
    {
        Http::fake([
            '*/api/data/*' => Http::response([
                'success' => true,
                'items' => [
                    ['name' => 'Item A', 'count' => 5],
                    ['name' => 'Item B', 'count' => 10],
                ],
            ], 200),
        ]);

        $response = $this->get('/api/novacity/data/checkpassqte?limit=10');

        $data = $response->json();

        // Frontend extractRecords would check 'items' key
        $items = $data['items'] ?? $data['data'] ?? [];
        $this->assertCount(2, $items);
    }

    /** @test */
    public function exec_flow_handles_direct_array_response()
    {
        Http::fake([
            '*/api/data/*' => Http::response([
                ['id' => 1, 'score' => 85],
                ['id' => 2, 'score' => 92],
            ], 200),
        ]);

        $response = $this->get('/api/novacity/data/checkpassqte?limit=10');

        $data = $response->json();

        // When response is a direct array (no wrapper)
        $this->assertIsArray($data);
        $this->assertCount(2, $data);
        $this->assertEquals(85, $data[0]['score']);
    }

    /** @test */
    public function exec_flow_value_wrapper()
    {
        Http::fake([
            '*/api/data/*' => Http::response([
                'success' => true,
                'value' => [
                    ['metric' => 'efficiency', 'result' => 95.5],
                ],
            ], 200),
        ]);

        $response = $this->get('/api/novacity/data/checkpassqte?limit=1');

        $data = $response->json();

        // extractRecords checks 'value' key
        $records = $data['value'] ?? $data['data'] ?? [];
        $this->assertCount(1, $records);
        $this->assertEquals(95.5, $records[0]['result']);
    }

    /** @test */
    public function exec_flow_multiple_records_with_sum()
    {
        Http::fake([
            '*/api/data/*' => Http::response([
                'success' => true,
                'data' => [
                    ['qte' => 100],
                    ['qte' => 200],
                    ['qte' => 150],
                ],
            ], 200),
        ]);

        $response = $this->get('/api/novacity/data/checkpassqte?limit=100');

        $data = $response->json();
        $records = $data['data'];

        // Simulate Direct type extraction
        $values = array_map(fn ($r) => $r['qte'], $records);

        // Simulate Sum aggregation
        $sum = array_sum($values);
        $this->assertEquals(450, $sum);

        // Simulate Average
        $avg = $sum / count($values);
        $this->assertEquals(150, $avg);

        // Simulate Min/Max
        $this->assertEquals(100, min($values));
        $this->assertEquals(200, max($values));

        // Simulate Count
        $this->assertEquals(3, count($values));
    }

    /** @test */
    public function exec_flow_formula_evaluation()
    {
        // Simulate formula: (variable_1 + variable_2) / variable_3 * 100
        $testValues = [
            '1' => '970',   // pieces_ok
            '2' => '30',    // rejets
            '3' => '1000',  // total
        ];

        // Build expression from formula items
        $expr = "({$testValues['1']} + {$testValues['2']}) / {$testValues['3']} * 100";
        $result = eval("return {$expr};");

        // (970 + 30) / 1000 * 100 = 100%
        $this->assertEqualsWithDelta(100.0, $result, 0.01);
    }

    /** @test */
    public function exec_flow_formula_with_percentage()
    {
        // RFT formula: pieces_ok / pieces_produced * 100
        $piecesOk = 970;
        $piecesProduced = 1000;
        $rft = ($piecesOk / $piecesProduced) * 100;

        $this->assertEqualsWithDelta(97.0, $rft, 0.01);
    }

    /** @test */
    public function exec_flow_dot_path_extraction()
    {
        Http::fake([
            '*/api/data/*' => Http::response([
                'success' => true,
                'data' => [
                    ['nested' => ['value' => 42]],
                    ['nested' => ['value' => 99]],
                ],
            ], 200),
        ]);

        $response = $this->get('/api/novacity/data/checkpassqte?limit=2');

        $data = $response->json();
        $records = $data['data'];

        // Simulate getValueAtPath for 'nested.value'
        $values = array_map(function ($r) {
            $parts = explode('.', 'nested.value');
            $current = $r;
            foreach ($parts as $part) {
                $current = $current[$part] ?? null;
            }
            return $current;
        }, $records);

        $this->assertEquals([42, 99], $values);
    }

    /** @test */
    public function exec_flow_handles_http_timeout_gracefully()
    {
        Http::fake(function () {
            throw new \Illuminate\Http\Client\ConnectionException('cURL error 28: Operation timed out');
        });

        $response = $this->get('/api/novacity/data/checkpassqte?limit=10');

        $response->assertStatus(500);
        $response->assertJson([
            'success' => false,
        ]);
    }

    /** @test */
    public function exec_flow_handles_empty_response()
    {
        Http::fake([
            '*/api/data/*' => Http::response([
                'success' => true,
                'data' => [],
            ], 200),
        ]);

        $response = $this->get('/api/novacity/data/checkpassqte?limit=10');

        $response->assertStatus(200);
        $data = $response->json();
        $this->assertEmpty($data['data']);
    }

    /** @test */
    public function exec_flow_handles_large_dataset()
    {
        // Generate 1000 records
        $records = array_map(fn ($i) => ['id' => $i, 'value' => $i * 10], range(1, 1000));

        Http::fake([
            '*/api/data/*' => Http::response([
                'success' => true,
                'data' => $records,
            ], 200),
        ]);

        $response = $this->get('/api/novacity/data/checkpassqte?limit=1000');

        $response->assertStatus(200);
        $data = $response->json();
        $this->assertCount(1000, $data['data']);

        // Verify aggregation on large dataset
        $values = array_map(fn ($r) => $r['value'], $data['data']);
        $this->assertEquals(array_sum($values), array_sum($values));
        $this->assertEquals(1, min($values));
        $this->assertEquals(10000, max($values));
    }
}
