<?php

namespace Tests\Feature\Api;

use App\Http\Controllers\Api\NovacityEndpointsController;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NovacityEndpointsSchemaTest extends TestCase
{
    use RefreshDatabase;

    private string $testDir;

    private string $dataPath;

    protected function setUp(): void
    {
        parent::setUp();

        $this->testDir = storage_path('app/public/_schema_tests_'.uniqid());
        mkdir($this->testDir, 0755, true);
        $this->dataPath = $this->testDir.'/data.json';

        config(['novacity.data_file' => str_replace(storage_path().DIRECTORY_SEPARATOR, '', $this->dataPath)]);
        config(['novacity.data_backup' => str_replace(storage_path().DIRECTORY_SEPARATOR, '', $this->dataPath.'.bak')]);

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
                'id' => 'mp-famille',
                'name' => '13 — MpFamille (DIVATEX)',
                'method' => 'GET',
                'endpoint' => 'https://api.example.com/api/data/mpfamille',
                'status' => 200,
                'response' => [
                    'success' => true,
                    'source' => 'DIVATEX',
                    'columns' => ['IDMPFamille', 'Code', 'Famille'],
                    'data' => [
                        ['IDMPFamille' => 1, 'Code' => 'MP1', 'Famille' => 'Boutons'],
                        ['IDMPFamille' => 2, 'Code' => 'MP2', 'Famille' => 'Tissus'],
                    ],
                ],
            ],
            [
                'id' => 'mp',
                'name' => '14 — Mp (DIVATEX)',
                'method' => 'GET',
                'endpoint' => 'https://api.example.com/api/data/mp',
                'status' => 200,
                'response' => [
                    'success' => true,
                    'source' => 'DIVATEX',
                    'columns' => ['IDMPFamille', 'IDMP', 'Reference', 'Description'],
                    'data' => [
                        ['IDMPFamille' => 1, 'IDMP' => 10, 'Reference' => 'REF-A', 'Description' => 'Aa'],
                        ['IDMPFamille' => 1, 'IDMP' => 11, 'Reference' => 'REF-B', 'Description' => 'Bb'],
                        ['IDMPFamille' => 2, 'IDMP' => 12, 'Reference' => 'REF-C', 'Description' => 'Cc'],
                    ],
                ],
            ],
            [
                'id' => 'articles-colis',
                'name' => '18 —  ArticlesColis (DIVATEX)',
                'method' => 'GET',
                'endpoint' => 'https://api.example.com/api/data/articlescolis',
                'status' => 200,
                'response' => [
                    'success' => true,
                    'source' => 'DIVATEX',
                    'columns' => ['IDArticleColis', 'IDColis', 'IDMP', 'Qtte'],
                    'data' => [
                        ['IDArticleColis' => 100, 'IDColis' => 5, 'IDMP' => 10, 'Qtte' => 2],
                        ['IDArticleColis' => 101, 'IDColis' => 5, 'IDMP' => 11, 'Qtte' => 3],
                        ['IDArticleColis' => 102, 'IDColis' => 6, 'IDMP' => 12, 'Qtte' => 1],
                    ],
                ],
            ],
            [
                'id' => 'item-trx',
                'name' => '01 — ItemTrxEnq (SDT)',
                'method' => 'GET',
                'endpoint' => 'https://api.example.com/api/data/itemtrxenq',
                'status' => 200,
                'response' => [
                    'success' => true,
                    'source' => 'SDT',
                    'columns' => ['TransactionID', 'ProdGroup', 'ShiftCode'],
                    'data' => [
                        ['TransactionID' => 1, 'ProdGroup' => 'CH01', 'ShiftCode' => 'JOUR'],
                        ['TransactionID' => 2, 'ProdGroup' => 'CH02', 'ShiftCode' => 'JOUR'],
                    ],
                ],
            ],
            [
                'id' => 'wip-chaine',
                'name' => '🟢 Q-03 — wip_chaine (SDT)',
                'method' => 'GET',
                'endpoint' => 'https://api.example.com/api/data/q/wip_chaine',
                'status' => 200,
                'response' => [
                    'success' => true,
                    'source' => 'SDT',
                    'columns' => ['ProdGroup', 'Wip'],
                    'data' => [
                        ['ProdGroup' => 'CH01', 'Wip' => 40],
                        ['ProdGroup' => 'CH03', 'Wip' => 90],
                    ],
                ],
            ],
            [
                'id' => 'broken',
                'name' => 'Broken (QCM)',
                'method' => 'GET',
                'endpoint' => 'https://api.example.com/api/data/rovereffectiveness',
                'status' => 500,
                'response' => ['success' => false, 'message' => 'boom'],
            ],
        ];
    }

    private function schemaJson(?string $query = null): array
    {
        $url = '/novacity-endpoints/schema'.($query ? "?{$query}" : '');

        return $this->getJson($url)->assertStatus(200)->json();
    }

    /** @test */
    public function schema_returns_analysis_sections()
    {
        $json = $this->schemaJson();

        $this->assertArrayHasKey('entries', $json);
        $this->assertArrayHasKey('columns', $json);
        $this->assertArrayHasKey('foreign_keys', $json);
        $this->assertArrayHasKey('generated_at', $json);
        $this->assertCount(6, $json['entries']);
    }

    /** @test */
    public function schema_detects_primary_keys_by_name_heuristics()
    {
        $entries = collect($this->schemaJson()['entries'])->keyBy('name');

        $this->assertSame('IDMP', $entries->get('14 — Mp (DIVATEX)')['primary_key']['column']);
        $this->assertSame('IDMPFamille', $entries->get('13 — MpFamille (DIVATEX)')['primary_key']['column']);
        $this->assertSame('IDArticleColis', $entries->get('18 —  ArticlesColis (DIVATEX)')['primary_key']['column']);
        $this->assertSame('TransactionID', $entries->get('01 — ItemTrxEnq (SDT)')['primary_key']['column']);
        $this->assertContains('Reference', $entries->get('14 — Mp (DIVATEX)')['candidate_keys']);
        $this->assertSame(0.95, $entries->get('14 — Mp (DIVATEX)')['primary_key']['confidence']);
    }

    /** @test */
    public function schema_detects_foreign_keys_by_name_match_and_coverage()
    {
        $groups = collect($this->schemaJson()['foreign_keys'])->keyBy('entry_name');

        $articles = $groups->get('18 —  ArticlesColis (DIVATEX)');
        $this->assertNotNull($articles);

        $idmpRef = collect($articles['references'])->firstWhere('column', 'IDMP');
        $this->assertNotNull($idmpRef);
        $this->assertSame('14 — Mp (DIVATEX)', $idmpRef['refs'][0]['entry_name']);
        $this->assertSame('name', $idmpRef['refs'][0]['match']);
        $this->assertEquals(1.0, $idmpRef['refs'][0]['coverage']);
        $this->assertGreaterThanOrEqual(0.9, $idmpRef['refs'][0]['confidence']);
    }

    /** @test */
    public function schema_registers_shared_join_columns()
    {
        $columns = collect($this->schemaJson()['columns'])->keyBy('name');

        $prodGroup = $columns->get('ProdGroup');
        $this->assertNotNull($prodGroup);
        $this->assertSame(2, $prodGroup['endpoint_count']);
        $this->assertContains('CH01', $prodGroup['distinct_values']);
        $this->assertContains('SDT', $prodGroup['sources']);
        $this->assertSame(2, $prodGroup['endpoints'][0]['distinct_count']);
    }

    /** @test */
    public function schema_filters_shared_columns_by_column_query()
    {
        $json = $this->schemaJson('column=prodgroup');

        $this->assertCount(1, $json['columns']);
        $this->assertSame('ProdGroup', $json['columns'][0]['name']);
    }

    /** @test */
    public function schema_skips_key_detection_for_entries_without_rows()
    {
        $entries = collect($this->schemaJson()['entries'])->keyBy('name');

        $broken = $entries->get('Broken (QCM)');
        $this->assertNotNull($broken);
        $this->assertSame(0, $broken['row_count']);
        $this->assertNull($broken['primary_key']);
        $this->assertSame([], $broken['candidate_keys']);
    }

    /** @test */
    public function schema_returns_404_for_invalid_or_missing_file()
    {
        config(['novacity.data_file' => 'app/public/does-not-exist.json']);
        NovacityEndpointsController::flushCache();
        $this->getJson('/novacity-endpoints/schema')->assertStatus(404);

        file_put_contents($this->dataPath, '{{{ not json');
        NovacityEndpointsController::flushCache();
        $this->getJson('/novacity-endpoints/schema')->assertStatus(404);
    }

    /** @test */
    public function unauthenticated_and_non_it_requests_are_rejected()
    {
        auth()->logout();
        $this->getJson('/novacity-endpoints/schema')->assertStatus(401);

        $direction = \App\Models\Role::firstOrCreate(['slug' => 'direction'], ['name' => 'Direction']);
        $user = User::factory()->create(['role_id' => $direction->id, 'is_active' => true]);
        $this->actingAs($user);
        $this->getJson('/novacity-endpoints/schema')->assertStatus(403);
    }
}
