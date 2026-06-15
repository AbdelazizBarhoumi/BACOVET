<?php

namespace Tests\Feature\Api;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class LogisticsTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $role = Role::firstOrCreate(['slug' => 'it'], ['name' => 'IT']);
        $this->user = User::factory()->create(['role_id' => $role->id]);
    }

    // ─── AUTH ──────────────────────────────────────────────────────────────

    public function test_unauthorized_user_cannot_access_logistics()
    {
        $role = Role::firstOrCreate(['slug' => 'resp_qualite'], ['name' => 'Resp Qualite']);
        $other = User::factory()->create(['role_id' => $role->id]);

        $response = $this->actingAs($other)->getJson('/logistics/kpis');

        $response->assertStatus(403);
    }

    public function test_direction_can_access_logistics()
    {
        $role = Role::firstOrCreate(['slug' => 'direction'], ['name' => 'Direction']);
        $user = User::factory()->create(['role_id' => $role->id]);

        $this->seedLogisticsData();

        $response = $this->actingAs($user)->getJson('/logistics/kpis');

        $response->assertStatus(200);
    }

    public function test_methodes_can_access_logistics()
    {
        $role = Role::firstOrCreate(['slug' => 'methodes'], ['name' => 'Methodes']);
        $user = User::factory()->create(['role_id' => $role->id]);

        $this->seedLogisticsData();

        $response = $this->actingAs($user)->getJson('/logistics/kpis');

        $response->assertStatus(200);
    }

    public function test_coupe_can_access_logistics()
    {
        $role = Role::firstOrCreate(['slug' => 'coupe'], ['name' => 'Coupe']);
        $user = User::factory()->create(['role_id' => $role->id]);

        $this->seedLogisticsData();

        $response = $this->actingAs($user)->getJson('/logistics/kpis');

        $response->assertStatus(200);
    }

    // ─── KPIS (Section A) ──────────────────────────────────────────────────

    public function test_kpis_endpoint_structure()
    {
        $this->seedLogisticsData();

        $response = $this->actingAs($this->user)->getJson('/logistics/kpis');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'dot' => ['value', 'status', 'source'],
                'hot' => ['value', 'status', 'source'],
                'respect_plan' => ['value', 'status', 'source', 'raw'],
                'lead_time' => ['value', 'status', 'unit', 'source'],
                'next_export',
                'synced_at',
            ]);
    }

    public function test_kpis_respect_planification_computed_from_db()
    {
        // Seed qte_produite for today
        DB::table('qte_produite')->insert([
            ['date' => now()->toDateString(), 'chaine' => 'CH1', 'shift_code' => 'M', 'quantite' => 500, 'synced_at' => now()],
            ['date' => now()->toDateString(), 'chaine' => 'CH2', 'shift_code' => 'M', 'quantite' => 300, 'synced_at' => now()],
            ['date' => now()->toDateString(), 'chaine' => 'CH1', 'shift_code' => 'A', 'quantite' => 200, 'synced_at' => now()],
        ]);

        $response = $this->actingAs($this->user)->getJson('/logistics/kpis');

        $response->assertStatus(200);

        $data = $response->json();
        // 500+300+200 = 1000; 1000/1000*100 = 100%
        $this->assertEquals(100.0, $data['respect_plan']['value']);
        $this->assertEquals('green', $data['respect_plan']['status']);
        $this->assertEquals(1000, $data['respect_plan']['raw']['qte_today']);
    }

    public function test_kpis_respect_planification_orange_when_below_95()
    {
        DB::table('qte_produite')->insert([
            ['date' => now()->toDateString(), 'chaine' => 'CH1', 'shift_code' => 'M', 'quantite' => 930, 'synced_at' => now()],
        ]);

        $response = $this->actingAs($this->user)->getJson('/logistics/kpis');

        $data = $response->json();
        // 930/1000*100 = 93% → orange (>= 92)
        $this->assertEquals(93.0, $data['respect_plan']['value']);
        $this->assertEquals('orange', $data['respect_plan']['status']);
    }

    public function test_kpis_respect_planification_red_when_below_92()
    {
        DB::table('qte_produite')->insert([
            ['date' => now()->toDateString(), 'chaine' => 'CH1', 'shift_code' => 'M', 'quantite' => 500, 'synced_at' => now()],
        ]);

        $response = $this->actingAs($this->user)->getJson('/logistics/kpis');

        $data = $response->json();
        // 500/1000*100 = 50% → red
        $this->assertEquals(50.0, $data['respect_plan']['value']);
        $this->assertEquals('red', $data['respect_plan']['status']);
    }

    public function test_kpis_respect_planification_grey_when_no_data()
    {
        $response = $this->actingAs($this->user)->getJson('/logistics/kpis');

        $data = $response->json();
        $this->assertNull($data['respect_plan']['value']);
        $this->assertEquals('grey', $data['respect_plan']['status']);
    }

    public function test_kpis_lead_time_is_32()
    {
        $response = $this->actingAs($this->user)->getJson('/logistics/kpis');

        $data = $response->json();
        $this->assertEquals(32, $data['lead_time']['value']);
        $this->assertEquals('j', $data['lead_time']['unit']);
    }

    // ─── STOCK KPIS (Section B) ────────────────────────────────────────────

    public function test_stock_kpis_endpoint_structure()
    {
        $this->seedLogisticsData();

        $response = $this->actingAs($this->user)->getJson('/logistics/stock-kpis');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'rotation' => ['stock_moyen', 'nb_lignes', 'note'],
                'stock_mort' => ['value', 'status', 'nb_articles_sans_mvt', 'qtte_sans_mvt', 'qtte_totale'],
                'occupation' => ['value', 'status', 'nb_rouleaux', 'conteneurs_actifs', 'total_conteneurs'],
                'synced_at',
            ]);
    }

    public function test_stock_kpis_dead_stock_formula()
    {
        // Seed data: 147329728.72 sans mvt / 162067420.25 total = ~9.09%
        DB::table('articles_sans_mouvement')->insert([
            'nb_articles_sans_mvt_365j' => 843,
            'qtte_sans_mvt_365j' => 147329728.72,
            'synced_at' => now(),
        ]);

        DB::table('quantite_totale_stock')->insert([
            'quantite_totale_stock' => 162067420.25,
            'synced_at' => now(),
        ]);

        $response = $this->actingAs($this->user)->getJson('/logistics/stock-kpis');

        $data = $response->json();
        // 147329728.72 / 162067420.25 * 100 = 90.91%
        $this->assertEqualsWithDelta(90.91, $data['stock_mort']['value'], 0.01);
        $this->assertEquals('red', $data['stock_mort']['status']); // > 12% = red
    }

    public function test_stock_kpis_occupation_formula()
    {
        DB::table('nombre_rouleaux')->insert([
            'nb_rouleaux' => 39031,
            'synced_at' => now(),
        ]);

        DB::table('capacite_stockage')->insert([
            'total_conteneurs' => 50000,
            'conteneurs_actifs' => 42864,
            'conteneurs_consommes' => 6000,
            'conteneurs_supprimes' => 1136,
            'synced_at' => now(),
        ]);

        $response = $this->actingAs($this->user)->getJson('/logistics/stock-kpis');

        $data = $response->json();
        // 39031 / 42864 * 100 = 91.06% → orange (85-95)
        $this->assertEqualsWithDelta(91.1, $data['occupation']['value'], 0.1);
        $this->assertEquals('orange', $data['occupation']['status']);
    }

    public function test_stock_kpis_occupation_green_when_below_85()
    {
        DB::table('nombre_rouleaux')->insert([
            'nb_rouleaux' => 30000,
            'synced_at' => now(),
        ]);

        DB::table('capacite_stockage')->insert([
            'total_conteneurs' => 50000,
            'conteneurs_actifs' => 42864,
            'conteneurs_consommes' => 6000,
            'conteneurs_supprimes' => 1136,
            'synced_at' => now(),
        ]);

        $response = $this->actingAs($this->user)->getJson('/logistics/stock-kpis');

        $data = $response->json();
        // 30000 / 42864 * 100 = 69.99% → green
        $this->assertEquals('green', $data['occupation']['status']);
    }

    public function test_stock_kpis_occupation_red_when_above_95()
    {
        DB::table('nombre_rouleaux')->insert([
            'nb_rouleaux' => 42000,
            'synced_at' => now(),
        ]);

        DB::table('capacite_stockage')->insert([
            'total_conteneurs' => 50000,
            'conteneurs_actifs' => 42864,
            'conteneurs_consommes' => 6000,
            'conteneurs_supprimes' => 1136,
            'synced_at' => now(),
        ]);

        $response = $this->actingAs($this->user)->getJson('/logistics/stock-kpis');

        $data = $response->json();
        // 42000 / 42864 * 100 = 97.98% → red
        $this->assertEquals('red', $data['occupation']['status']);
    }

    public function test_stock_kpis_empty_db_returns_grey()
    {
        $response = $this->actingAs($this->user)->getJson('/logistics/stock-kpis');

        $data = $response->json();
        $this->assertEquals('grey', $data['stock_mort']['status']);
        $this->assertEquals('grey', $data['occupation']['status']);
        $this->assertEquals(0, $data['rotation']['stock_moyen']);
    }

    // ─── STOCK COMPOSITION (Section C) ─────────────────────────────────────

    public function test_stock_composition_endpoint_structure()
    {
        $this->seedLogisticsData();

        $response = $this->actingAs($this->user)->getJson('/logistics/stock-composition');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'provenance',
                'famille',
                'typologie',
                'synced_at',
            ]);
    }

    public function test_stock_composition_filters_null_values()
    {
        DB::table('quantite_par_provenance')->insert([
            ['provenance' => 'Chine', 'quantite' => 4200, 'nb_articles' => 100, 'synced_at' => now()],
            ['provenance' => null, 'quantite' => 99999, 'nb_articles' => 0, 'synced_at' => now()], // rollup row
        ]);

        DB::table('quantite_par_famille')->insert([
            ['famille_fg' => 'Tissu', 'quantite' => 5000, 'synced_at' => now()],
            ['famille_fg' => null, 'quantite' => 99999, 'synced_at' => now()], // rollup
        ]);

        DB::table('quantite_par_typologie')->insert([
            ['typologie' => 'Cordon', 'quantite' => 540, 'nb_articles' => 10, 'synced_at' => now()],
            ['typologie' => null, 'quantite' => 99999, 'nb_articles' => 0, 'synced_at' => now()], // rollup
        ]);

        $response = $this->actingAs($this->user)->getJson('/logistics/stock-composition');

        $data = $response->json();
        // Null rollup rows should be excluded
        $this->assertCount(1, $data['provenance']);
        $this->assertCount(1, $data['famille']);
        $this->assertCount(1, $data['typologie']);
        $this->assertEquals('Chine', $data['provenance'][0]['name']);
    }

    public function test_stock_composition_empty_returns_empty_arrays()
    {
        $response = $this->actingAs($this->user)->getJson('/logistics/stock-composition');

        $data = $response->json();
        $this->assertCount(0, $data['provenance']);
        $this->assertCount(0, $data['famille']);
        $this->assertCount(0, $data['typologie']);
    }

    // ─── OFS (Section D) ───────────────────────────────────────────────────

    public function test_ofs_endpoint_structure()
    {
        $this->seedLogisticsData();

        $response = $this->actingAs($this->user)->getJson('/logistics/ofs');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'ofs' => [
                    '*' => ['of', 'avancement_pct', 'quantite_prevue', 'quantite_realisee', 'statut', 'colis'],
                ],
                'livraison' => ['value', 'status', 'total_ofs', 'transfert_total'],
                'delai_moyen' => ['value', 'status', 'nb_ofs'],
                'synced_at',
            ]);
    }

    public function test_ofs_livraison_formula()
    {
        DB::table('nombre_ofs_livres')->insert([
            'nb_of_livres_total' => 4270,
            'of_avec_transfert_coupe' => 3000,
            'of_avec_transfert_coupe_jemmel' => 213,
            'of_avec_transfert_coupe_total' => 3213,
            'synced_at' => now(),
        ]);

        $response = $this->actingAs($this->user)->getJson('/logistics/ofs');

        $data = $response->json();
        // 3213 / 4270 * 100 = 75.24% → red (< 77, thresholdStatus uses target-3 = 77)
        $this->assertEqualsWithDelta(75.2, $data['livraison']['value'], 0.1);
        $this->assertEquals('red', $data['livraison']['status']);
    }

    public function test_ofs_delai_moyen_from_db()
    {
        DB::table('moyenne_date_transfert')->insert([
            'moyenne_jours' => 4.16,
            'nb_of_consideres' => 150,
            'synced_at' => now(),
        ]);

        $response = $this->actingAs($this->user)->getJson('/logistics/ofs');

        $data = $response->json();
        // 4.16 days → orange (> 1, <= 3)
        $this->assertEquals(4.16, $data['delai_moyen']['value']);
        $this->assertEquals('red', $data['delai_moyen']['status']); // > 3
        $this->assertEquals(150, $data['delai_moyen']['nb_ofs']);
    }

    public function test_ofs_delai_moyen_green_when_1_day_or_less()
    {
        DB::table('moyenne_date_transfert')->insert([
            'moyenne_jours' => 0.8,
            'nb_of_consideres' => 100,
            'synced_at' => now(),
        ]);

        $response = $this->actingAs($this->user)->getJson('/logistics/ofs');

        $data = $response->json();
        $this->assertEquals('green', $data['delai_moyen']['status']);
    }

    public function test_ofs_delai_moyen_orange_when_1_to_3_days()
    {
        DB::table('moyenne_date_transfert')->insert([
            'moyenne_jours' => 2.5,
            'nb_of_consideres' => 100,
            'synced_at' => now(),
        ]);

        $response = $this->actingAs($this->user)->getJson('/logistics/ofs');

        $data = $response->json();
        $this->assertEquals('orange', $data['delai_moyen']['status']);
    }

    public function test_ofs_includes_colis_data()
    {
        DB::table('etat_avancement')->insert([
            'of' => 'OF-4402', 'avancement_pct' => 68, 'quantite_prevue' => 1000,
            'quantite_realisee' => 680, 'statut' => 'en_cours', 'synced_at' => now(),
        ]);

        DB::table('colis_total_var')->insert([
            'commande' => 'OF-4402', 'article' => 'ART-880', 'total_colis' => 50,
            'total_qte' => 1000, 'synced_at' => now(),
        ]);

        $response = $this->actingAs($this->user)->getJson('/logistics/ofs');

        $data = $response->json();
        $this->assertCount(1, $data['ofs']);
        $this->assertCount(1, $data['ofs'][0]['colis']);
        $this->assertEquals('ART-880', $data['ofs'][0]['colis'][0]['article']);
    }

    // ─── LIVRAISON (Section D separate endpoint) ───────────────────────────

    public function test_livraison_endpoint_structure()
    {
        $this->seedLogisticsData();

        $response = $this->actingAs($this->user)->getJson('/logistics/livraison');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'livraison' => ['value', 'status', 'total_ofs', 'transfert_total'],
                'delai_moyen' => ['value', 'status', 'nb_ofs'],
                'synced_at',
            ]);
    }

    // ─── COVERAGE (Section E) ──────────────────────────────────────────────

    public function test_coverage_endpoint_structure()
    {
        $this->seedLogisticsData();

        $response = $this->actingAs($this->user)->getJson('/logistics/coverage');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'chaine',
                'coupe',
                'serigraphie',
                'synced_at',
            ]);
    }

    public function test_coverage_chain_from_qte_engagement()
    {
        DB::table('qte_engagement')->insert([
            ['commande' => 'C1', 'date' => now()->toDateString(), 'chaine' => 'CH1', 'article' => 'A1', 'quantite_engagee' => 1200, 'synced_at' => now()],
            ['commande' => 'C2', 'date' => now()->toDateString(), 'chaine' => 'CH1', 'article' => 'A2', 'quantite_engagee' => 800, 'synced_at' => now()],
            ['commande' => 'C3', 'date' => now()->toDateString(), 'chaine' => 'CH2', 'article' => 'A1', 'quantite_engagee' => 1500, 'synced_at' => now()],
        ]);

        $response = $this->actingAs($this->user)->getJson('/logistics/coverage');

        $data = $response->json();
        $this->assertCount(2, $data['chaine']);
        // CH1: (1200+800)/100 = 20.0
        $ch1 = collect($data['chaine'])->firstWhere('name', 'CH1');
        $this->assertEquals(20.0, $ch1['jours']);
        // CH2: 1500/100 = 15.0
        $ch2 = collect($data['chaine'])->firstWhere('name', 'CH2');
        $this->assertEquals(15.0, $ch2['jours']);
    }

    public function test_coverage_couple_from_sortie_coupe()
    {
        DB::table('sortie_coupe')->insert([
            ['date' => now()->toDateString(), 'commande' => 'CMD-1', 'article' => 'ART-1', 'quantite_coupee' => 900, 'synced_at' => now()],
            ['date' => now()->toDateString(), 'commande' => 'CMD-2', 'article' => 'ART-2', 'quantite_coupee' => 600, 'synced_at' => now()],
        ]);

        // Need engagement data too for the formula (total_coupe - total_sortie) / 100
        DB::table('qte_engagement')->insert([
            ['commande' => 'CMD-1', 'date' => now()->toDateString(), 'chaine' => 'CH1', 'article' => 'ART-1', 'quantite_engagee' => 2000, 'synced_at' => now()],
            ['commande' => 'CMD-2', 'date' => now()->toDateString(), 'chaine' => 'CH1', 'article' => 'ART-2', 'quantite_engagee' => 1000, 'synced_at' => now()],
        ]);

        $response = $this->actingAs($this->user)->getJson('/logistics/coverage');

        $data = $response->json();
        // Coupe now returns single "Global" value: (3000 - 1500) / 100 = 15.0
        $this->assertCount(1, $data['coupe']);
        $this->assertEquals('Global', $data['coupe'][0]['name']);
        $this->assertEquals(15.0, $data['coupe'][0]['jours']);
    }

    public function test_coverage_empty_returns_empty_arrays()
    {
        $response = $this->actingAs($this->user)->getJson('/logistics/coverage');

        $data = $response->json();
        $this->assertCount(0, $data['chaine']);
        $this->assertCount(0, $data['coupe']);
        $this->assertCount(0, $data['serigraphie']);
    }

    // ─── STOCK SEARCH (Section F) ──────────────────────────────────────────

    public function test_stock_search_endpoint_structure()
    {
        $this->seedLogisticsData();

        $response = $this->actingAs($this->user)->getJson('/logistics/stock-search');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['code_mp', 'designation', 'famille', 'couleur', 'qtte', 'qtte_reserve', 'qtte_disponible'],
                ],
                'total',
                'page',
                'per_page',
                'total_pages',
                'stock_total',
                'synced_at',
            ]);
    }

    public function test_stock_search_joins_vue_stock_with_diva_stock()
    {
        // Seed vue_stock
        DB::table('vue_stock')->insert([
            ['idmp' => 'MP-001', 'code_mp' => 'MP-001', 'designation' => 'Tissu Coton', 'famille' => 'Tissu', 'couleur' => 'Noir', 'synced_at' => now()],
        ]);

        // Seed diva_stock with qtte and reserve
        DB::table('diva_stock')->insert([
            ['idmp' => 'MP-001', 'idmvt_stock' => 1, 'idmagasin' => 1, 'qtte' => 500, 'qtte_reserve' => 120, 'synced_at' => now()],
        ]);

        $response = $this->actingAs($this->user)->getJson('/logistics/stock-search');

        $data = $response->json();
        $this->assertCount(1, $data['data']);
        $this->assertEquals(500, $data['data'][0]['qtte']);
        $this->assertEquals(120, $data['data'][0]['qtte_reserve']);
        $this->assertEquals(380, $data['data'][0]['qtte_disponible']); // 500 - 120
    }

    public function test_stock_search_filters_by_query()
    {
        DB::table('vue_stock')->insert([
            ['idmp' => 'MP-001', 'code_mp' => 'MP-001', 'designation' => 'Tissu Coton', 'famille' => 'Tissu', 'couleur' => 'Noir', 'synced_at' => now()],
            ['idmp' => 'MP-002', 'code_mp' => 'MP-002', 'designation' => 'Elastique 20mm', 'famille' => 'Fourniture', 'couleur' => 'Blanc', 'synced_at' => now()],
            ['idmp' => 'MP-003', 'code_mp' => 'MP-003', 'designation' => 'Cordon Polyester', 'famille' => 'Fourniture', 'couleur' => 'Bleu', 'synced_at' => now()],
        ]);

        $response = $this->actingAs($this->user)->getJson('/logistics/stock-search?q=Coton');

        $data = $response->json();
        $this->assertCount(1, $data['data']);
        $this->assertEquals('Tissu Coton', $data['data'][0]['designation']);
    }

    public function test_stock_search_filters_by_famille()
    {
        DB::table('vue_stock')->insert([
            ['idmp' => 'MP-001', 'code_mp' => 'MP-001', 'designation' => 'Tissu', 'famille' => 'Tissu', 'couleur' => 'Noir', 'synced_at' => now()],
            ['idmp' => 'MP-002', 'code_mp' => 'MP-002', 'designation' => 'Elastique', 'famille' => 'Fourniture', 'couleur' => 'Blanc', 'synced_at' => now()],
        ]);

        $response = $this->actingAs($this->user)->getJson('/logistics/stock-search?famille=Fourniture');

        $data = $response->json();
        $this->assertCount(1, $data['data']);
        $this->assertEquals('Fourniture', $data['data'][0]['famille']);
    }

    public function test_stock_search_pagination()
    {
        // Insert 25 items
        $rows = [];
        for ($i = 1; $i <= 25; $i++) {
            $rows[] = [
                'idmp' => "MP-{$i}",
                'code_mp' => "MP-{$i}",
                'designation' => "Item {$i}",
                'famille' => 'Tissu',
                'couleur' => 'Noir',
                'synced_at' => now(),
            ];
        }
        DB::table('vue_stock')->insert($rows);

        // Page 1
        $response = $this->actingAs($this->user)->getJson('/logistics/stock-search?page=1');
        $data = $response->json();
        $this->assertCount(20, $data['data']);
        $this->assertEquals(1, $data['page']);
        $this->assertEquals(2, $data['total_pages']);
        $this->assertEquals(25, $data['total']);

        // Page 2
        $response = $this->actingAs($this->user)->getJson('/logistics/stock-search?page=2');
        $data = $response->json();
        $this->assertCount(5, $data['data']);
        $this->assertEquals(2, $data['page']);
    }

    public function test_stock_search_empty_db()
    {
        $response = $this->actingAs($this->user)->getJson('/logistics/stock-search');

        $data = $response->json();
        $this->assertCount(0, $data['data']);
        $this->assertEquals(0, $data['total']);
        $this->assertEquals(1, $data['total_pages']);
    }

    // ─── NO DATA / EMPTY STATE ─────────────────────────────────────────────

    public function test_all_endpoints_work_with_empty_db()
    {
        $endpoints = [
            '/logistics/kpis',
            '/logistics/stock-kpis',
            '/logistics/stock-composition',
            '/logistics/ofs',
            '/logistics/livraison',
            '/logistics/coverage',
            '/logistics/stock-search',
        ];

        foreach ($endpoints as $endpoint) {
            $response = $this->actingAs($this->user)->getJson($endpoint);
            $response->assertStatus(200, "Failed on {$endpoint}");
        }
    }

    // ─── SPEC COMPLIANCE: F-REQ references from Sprints.md ────────────────

    public function test_spec_freq_334_dot_card()
    {
        // F-REQ-334: DOT (Delivery On Time) — from GPRO Planning
        // Spec says: grey placeholder until GPRO Planning connected (B-04)
        $response = $this->actingAs($this->user)->getJson('/logistics/kpis');

        $data = $response->json();
        $this->assertArrayHasKey('dot', $data);
        $this->assertEquals('GPRO Planning', $data['dot']['source']);
        $this->assertEquals('pending', $data['dot']['status']);
        $this->assertNull($data['dot']['value']); // No value until B-04 resolved
        $this->assertEquals('B-04', $data['dot']['blocker']);
    }

    public function test_spec_freq_335_hot_card()
    {
        // F-REQ-335: HOT (Handover On Time) — from GPRO Planning
        // Spec says: grey placeholder until GPRO Planning connected (B-04)
        $response = $this->actingAs($this->user)->getJson('/logistics/kpis');

        $data = $response->json();
        $this->assertArrayHasKey('hot', $data);
        $this->assertEquals('GPRO Planning', $data['hot']['source']);
        $this->assertEquals('pending', $data['hot']['status']);
        $this->assertNull($data['hot']['value']); // No value until B-04 resolved
        $this->assertEquals('B-04', $data['hot']['blocker']);
    }

    public function test_spec_freq_336_respect_planification()
    {
        // F-REQ-336: Respect Planification — qte_produite / daily objective
        $response = $this->actingAs($this->user)->getJson('/logistics/kpis');

        $data = $response->json();
        $this->assertArrayHasKey('respect_plan', $data);
        $this->assertEquals('qte_produite', $data['respect_plan']['source']);
    }

    public function test_spec_freq_337_lead_time()
    {
        // F-REQ-337: Lead Time Global — STRH + LT Transport = 32 jours
        $response = $this->actingAs($this->user)->getJson('/logistics/kpis');

        $data = $response->json();
        $this->assertEquals(32, $data['lead_time']['value']);
        $this->assertEquals('j', $data['lead_time']['unit']);
    }

    public function test_spec_freq_316_317_318_rotation_stock()
    {
        // F-REQ-316/317/318: Stock rotation — stock_moyen
        DB::table('stock_moyen')->insert([
            'stock_moyen' => 38035.07,
            'nb_lignes_stock' => 4261,
            'synced_at' => now(),
        ]);

        $response = $this->actingAs($this->user)->getJson('/logistics/stock-kpis');

        $data = $response->json();
        $this->assertEquals(38035.07, $data['rotation']['stock_moyen']);
        $this->assertEquals(4261, $data['rotation']['nb_lignes']);
    }

    public function test_spec_freq_319_320_321_stock_mort()
    {
        // F-REQ-319/320/321: Dead stock — qtte_sans_mvt / qtte_totale
        $response = $this->actingAs($this->user)->getJson('/logistics/stock-kpis');

        $data = $response->json();
        $this->assertArrayHasKey('stock_mort', $data);
        $this->assertArrayHasKey('value', $data['stock_mort']);
        $this->assertArrayHasKey('status', $data['stock_mort']);
    }

    public function test_spec_freq_322_323_324_occupation()
    {
        // F-REQ-322/323/324: Occupation — rouleaux / conteneurs_actifs
        $response = $this->actingAs($this->user)->getJson('/logistics/stock-kpis');

        $data = $response->json();
        $this->assertArrayHasKey('occupation', $data);
        $this->assertArrayHasKey('value', $data['occupation']);
        $this->assertArrayHasKey('conteneurs_actifs', $data['occupation']);
    }

    public function test_spec_freq_325_326_327_livraison()
    {
        // F-REQ-325/326/327: Commandes livrées à temps
        $response = $this->actingAs($this->user)->getJson('/logistics/ofs');

        $data = $response->json();
        $this->assertArrayHasKey('livraison', $data);
        $this->assertArrayHasKey('value', $data['livraison']);
        $this->assertArrayHasKey('total_ofs', $data['livraison']);
        $this->assertArrayHasKey('transfert_total', $data['livraison']);
    }

    public function test_spec_freq_328_329_330_delai_moyen()
    {
        // F-REQ-328/329/330: Délai moyen de livraison
        $response = $this->actingAs($this->user)->getJson('/logistics/ofs');

        $data = $response->json();
        $this->assertArrayHasKey('delai_moyen', $data);
        $this->assertArrayHasKey('value', $data['delai_moyen']);
        $this->assertArrayHasKey('nb_ofs', $data['delai_moyen']);
    }

    public function test_spec_freq_331_typologie_pie()
    {
        // F-REQ-331: Stock par Typologie
        DB::table('quantite_par_typologie')->insert([
            ['typologie' => 'Cordon', 'quantite' => 540, 'nb_articles' => 10, 'synced_at' => now()],
        ]);

        $response = $this->actingAs($this->user)->getJson('/logistics/stock-composition');

        $data = $response->json();
        $this->assertCount(1, $data['typologie']);
        $this->assertEquals('Cordon', $data['typologie'][0]['name']);
        $this->assertEquals(540, $data['typologie'][0]['value']);
    }

    public function test_spec_freq_332_provenance_pie()
    {
        // F-REQ-332: Stock par Provenance
        DB::table('quantite_par_provenance')->insert([
            ['provenance' => 'Chine', 'quantite' => 4200, 'nb_articles' => 100, 'synced_at' => now()],
        ]);

        $response = $this->actingAs($this->user)->getJson('/logistics/stock-composition');

        $data = $response->json();
        $this->assertCount(1, $data['provenance']);
        $this->assertEquals('Chine', $data['provenance'][0]['name']);
    }

    public function test_spec_freq_333_famille_pie()
    {
        // F-REQ-333: Stock par Marque (famille)
        DB::table('quantite_par_famille')->insert([
            ['famille_fg' => 'DOMYOS', 'quantite' => 1800, 'synced_at' => now()],
        ]);

        $response = $this->actingAs($this->user)->getJson('/logistics/stock-composition');

        $data = $response->json();
        $this->assertCount(1, $data['famille']);
        $this->assertEquals('DOMYOS', $data['famille'][0]['name']);
    }

    public function test_spec_freq_310_couverture_chaine()
    {
        // F-REQ-310: Couverture Chaîne — from qte_engagement
        DB::table('qte_engagement')->insert([
            ['commande' => 'C1', 'date' => now()->toDateString(), 'chaine' => 'CH1', 'article' => 'A1', 'quantite_engagee' => 1200, 'synced_at' => now()],
        ]);

        $response = $this->actingAs($this->user)->getJson('/logistics/coverage');

        $data = $response->json();
        $this->assertNotEmpty($data['chaine']);
    }

    public function test_spec_freq_311_couverture_couple()
    {
        // F-REQ-311: Couverture Coupe — single Global value from sortie_coupe + qte_engagement
        DB::table('sortie_coupe')->insert([
            ['date' => now()->toDateString(), 'commande' => 'CMD-1', 'article' => 'ART-1', 'quantite_coupee' => 900, 'synced_at' => now()],
        ]);
        DB::table('qte_engagement')->insert([
            ['commande' => 'CMD-1', 'date' => now()->toDateString(), 'chaine' => 'CH1', 'article' => 'ART-1', 'quantite_engagee' => 2000, 'synced_at' => now()],
        ]);

        $response = $this->actingAs($this->user)->getJson('/logistics/coverage');

        $data = $response->json();
        $this->assertNotEmpty($data['coupe']);
        $this->assertEquals('Global', $data['coupe'][0]['name']);
    }

    public function test_spec_freq_309_couverture_serigraphie()
    {
        // F-REQ-309: Couverture Sérigraphie
        DB::table('qte_entree_serigraphie')->insert([
            ['date' => now()->toDateString(), 'article' => 'ART-1', 'couleur' => 'Noir', 'quantite' => 500, 'synced_at' => now()],
        ]);
        DB::table('sortie_serigraphie')->insert([
            ['date' => now()->toDateString(), 'article' => 'ART-1', 'couleur' => 'Noir', 'quantite' => 300, 'synced_at' => now()],
        ]);

        $response = $this->actingAs($this->user)->getJson('/logistics/coverage');

        $data = $response->json();
        $this->assertNotEmpty($data['serigraphie']);
        // 500 - 300 = 200; 200/100 = 2.0 jours
        $this->assertEquals(2.0, $data['serigraphie'][0]['jours']);
    }

    // ─── HELPERS ───────────────────────────────────────────────────────────

    private function seedLogisticsData(): void
    {
        DB::table('qte_produite')->insert([
            ['date' => now()->toDateString(), 'chaine' => 'CH1', 'shift_code' => 'M', 'quantite' => 500, 'synced_at' => now()],
        ]);

        DB::table('stock_moyen')->insert([
            'stock_moyen' => 38035.07, 'nb_lignes_stock' => 4261, 'synced_at' => now(),
        ]);

        DB::table('articles_sans_mouvement')->insert([
            'nb_articles_sans_mvt_365j' => 843, 'qtte_sans_mvt_365j' => 147329728.72, 'synced_at' => now(),
        ]);

        DB::table('quantite_totale_stock')->insert([
            'quantite_totale_stock' => 162067420.25, 'synced_at' => now(),
        ]);

        DB::table('nombre_rouleaux')->insert([
            'nb_rouleaux' => 39031, 'synced_at' => now(),
        ]);

        DB::table('capacite_stockage')->insert([
            'total_conteneurs' => 50000, 'conteneurs_actifs' => 42864,
            'conteneurs_consommes' => 6000, 'conteneurs_supprimes' => 1136, 'synced_at' => now(),
        ]);

        DB::table('quantite_par_provenance')->insert([
            ['provenance' => 'Chine', 'quantite' => 4200, 'nb_articles' => 100, 'synced_at' => now()],
        ]);

        DB::table('quantite_par_famille')->insert([
            ['famille_fg' => 'DOMYOS', 'quantite' => 1800, 'synced_at' => now()],
        ]);

        DB::table('quantite_par_typologie')->insert([
            ['typologie' => 'Cordon', 'quantite' => 540, 'nb_articles' => 10, 'synced_at' => now()],
        ]);

        DB::table('etat_avancement')->insert([
            'of' => 'OF-4402', 'avancement_pct' => 68, 'quantite_prevue' => 1000,
            'quantite_realisee' => 680, 'statut' => 'en_cours', 'synced_at' => now(),
        ]);

        DB::table('nombre_ofs_livres')->insert([
            'nb_of_livres_total' => 4270, 'of_avec_transfert_coupe' => 3000,
            'of_avec_transfert_coupe_jemmel' => 213, 'of_avec_transfert_coupe_total' => 3213, 'synced_at' => now(),
        ]);

        DB::table('moyenne_date_transfert')->insert([
            'moyenne_jours' => 4.16, 'nb_of_consideres' => 150, 'synced_at' => now(),
        ]);

        DB::table('vue_stock')->insert([
            ['idmp' => 'MP-001', 'code_mp' => 'MP-001', 'designation' => 'Tissu Coton', 'famille' => 'Tissu', 'couleur' => 'Noir', 'synced_at' => now()],
        ]);

        DB::table('diva_stock')->insert([
            ['idmp' => 'MP-001', 'idmvt_stock' => 1, 'idmagasin' => 1, 'qtte' => 500, 'qtte_reserve' => 120, 'synced_at' => now()],
        ]);

        DB::table('qte_engagement')->insert([
            ['commande' => 'C1', 'date' => now()->toDateString(), 'chaine' => 'CH1', 'article' => 'A1', 'quantite_engagee' => 1200, 'synced_at' => now()],
        ]);

        DB::table('sortie_coupe')->insert([
            ['date' => now()->toDateString(), 'commande' => 'CMD-1', 'article' => 'ART-1', 'quantite_coupee' => 900, 'synced_at' => now()],
        ]);

        DB::table('qte_entree_serigraphie')->insert([
            ['date' => now()->toDateString(), 'article' => 'ART-1', 'couleur' => 'Noir', 'quantite' => 500, 'synced_at' => now()],
        ]);

        DB::table('sortie_serigraphie')->insert([
            ['date' => now()->toDateString(), 'article' => 'ART-1', 'couleur' => 'Noir', 'quantite' => 300, 'synced_at' => now()],
        ]);
    }
}
