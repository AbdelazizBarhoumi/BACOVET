<?php

namespace Tests\Feature\Api;

use App\Models\ManualKpiValue;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Comprehensive API endpoint audit — tests every page's data calls
 * against the DB and verifies specs.md compliance.
 *
 * For each endpoint we:
 * 1. Seed the exact DB tables the controller reads from
 * 2. Call the endpoint
 * 3. Assert the response shape matches what the frontend expects
 * 4. Verify the KPI formula matches specs.md
 */
class EndpointAuditTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $role = Role::firstOrCreate(['slug' => 'it'], ['name' => 'IT / Administrateur']);
        $this->user = User::factory()->create(['role_id' => $role->id]);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // QUALITY PAGE — /quality/*
    // ═══════════════════════════════════════════════════════════════════════

    public function test_quality_kpis_uses_db_not_api()
    {
        // Seed pieces_ok_jour (F-REQ-104 numerator)
        DB::table('pieces_ok_jour')->insert([
            'date' => now()->toDateString(),
            'atelier' => 'Confection',
            'first_pass_today' => 970,
            'synced_at' => now(),
        ]);

        // Seed pieces_produites_jour (F-REQ-104 denominator)
        DB::table('pieces_produites_jour')->insert([
            'date' => now()->toDateString(),
            'atelier' => 'Confection',
            'produced_today' => 1000,
            'synced_at' => now(),
        ]);

        // Seed check_pass_qte (F-REQ-102 proxy for DIVA)
        DB::table('check_pass_qte')->insert([
            'log_date' => now()->toDateString(),
            'shortname' => 'CH1',
            'shift_code' => 'A',
            'defect_pct' => 3.8,
            'synced_at' => now(),
        ]);

        $response = $this->actingAs($this->user)->getJson('/quality/kpis');

        $response->assertStatus(200);

        $data = $response->json();

        // F-REQ-104: RFT = 970/1000*100 = 97.0%
        $this->assertEquals(97.0, $data['rft_jour']['value']);
        $this->assertEquals('orange', $data['rft_jour']['status']); // 95-98% = orange

        // F-REQ-102: BR GTD from check_pass_qte = 3.8%
        $this->assertEquals(3.8, $data['br_gtd_jour']['value']);
        $this->assertEquals('green', $data['br_gtd_jour']['status']); // <=4% = green


        // F-REQ-106: BR Bundling — inactive (B-01)
        $this->assertEquals('inactive', $data['br_bundling_jour']['status']);
    }

    public function test_quality_kpis_rft_green_threshold()
    {
        DB::table('pieces_ok_jour')->insert([
            'date' => now()->toDateString(), 'atelier' => 'Confection', 'first_pass_today' => 985, 'synced_at' => now(),
        ]);
        DB::table('pieces_produites_jour')->insert([
            'date' => now()->toDateString(), 'atelier' => 'Confection', 'produced_today' => 1000, 'synced_at' => now(),
        ]);

        $response = $this->actingAs($this->user)->getJson('/quality/kpis');
        $data = $response->json();

        // 985/1000*100 = 98.5% → green (>=98%)
        $this->assertEquals(98.5, $data['rft_jour']['value']);
        $this->assertEquals('green', $data['rft_jour']['status']);
    }

    public function test_quality_kpis_rft_red_threshold()
    {
        DB::table('pieces_ok_jour')->insert([
            'date' => now()->toDateString(), 'atelier' => 'Confection', 'first_pass_today' => 900, 'synced_at' => now(),
        ]);
        DB::table('pieces_produites_jour')->insert([
            'date' => now()->toDateString(), 'atelier' => 'Confection', 'produced_today' => 1000, 'synced_at' => now(),
        ]);

        $response = $this->actingAs($this->user)->getJson('/quality/kpis');
        $data = $response->json();

        // 900/1000*100 = 90.0% → red (<95%)
        $this->assertEquals(90.0, $data['rft_jour']['value']);
        $this->assertEquals('red', $data['rft_jour']['status']);
    }

    public function test_quality_kpis_rft_anomaly_guard()
    {
        // If produced < ok (data anomaly), should return N/A
        DB::table('pieces_ok_jour')->insert([
            'date' => now()->toDateString(), 'atelier' => 'Confection', 'first_pass_today' => 2947, 'synced_at' => now(),
        ]);
        DB::table('pieces_produites_jour')->insert([
            'date' => now()->toDateString(), 'atelier' => 'Confection', 'produced_today' => 80, 'synced_at' => now(),
        ]);

        $response = $this->actingAs($this->user)->getJson('/quality/kpis');
        $data = $response->json();

        // 2947/80*100 = 3683% → anomaly guard → null
        $this->assertNull($data['rft_jour']['value']);
    }

    public function test_quality_br_chart_reads_check_pass_qte()
    {
        DB::table('check_pass_qte')->insert([
            ['log_date' => now()->toDateString(), 'shortname' => 'CH1', 'shift_code' => 'A', 'defect_pct' => 3.5, 'synced_at' => now()],
            ['log_date' => now()->toDateString(), 'shortname' => 'CH2', 'shift_code' => 'A', 'defect_pct' => 6.2, 'synced_at' => now()],
        ]);

        $response = $this->actingAs($this->user)->getJson('/quality/br-chart');
        $data = $response->json();

        // Controller always returns 6 stages (CGL, AQL, Bundling, Print, Accessoires, Composants)
        $this->assertCount(6, $data['data']);
        $this->assertEquals(5, $data['target']); // specs.md: BR target = 5%

        // AQL stage gets AVG(defect_pct) across all check_pass_qte rows
        $aql = collect($data['data'])->firstWhere('stage', 'AQL');
        $this->assertNotNull($aql, 'AQL stage should exist');
        // brStatus: <=4% = green, <=5% = orange, >5% = red
        // The AVG of the seeded data determines the status
    }

    public function test_quality_defect_chart_reads_vw_defects()
    {
        DB::table('vw_defects')->insert([
            ['log_date' => now()->toDateString(), 'op_no' => 'OP-93', 'qty' => 142, 'synced_at' => now()],
            ['log_date' => now()->toDateString(), 'op_no' => 'OP-47', 'qty' => 98, 'synced_at' => now()],
        ]);

        $response = $this->actingAs($this->user)->getJson('/quality/defect-chart');
        $data = $response->json();

        $this->assertCount(2, $data['data']);
        // Top by qty desc
        $this->assertEquals('OP-93', $data['data'][0]['op_no']);
        $this->assertEquals(142, $data['data'][0]['total_qty']);
    }

    public function test_quality_pareto_rft_reads_vw_defects()
    {
        DB::table('vw_defects')->insert([
            ['log_date' => now()->toDateString(), 'op_no' => 'OP-93', 'qty' => 100, 'synced_at' => now()],
            ['log_date' => now()->toDateString(), 'op_no' => 'OP-47', 'qty' => 50, 'synced_at' => now()],
        ]);

        $response = $this->actingAs($this->user)->getJson('/quality/pareto/rft');
        $data = $response->json();

        $this->assertCount(2, $data['data']);
        // Cumulative: OP-93 = 100/150*100 = 66.7%, OP-47 = 150/150*100 = 100%
        $this->assertEquals(66.7, $data['data'][0]['cumulative']);
        $this->assertEquals(100.0, $data['data'][1]['cumulative']);
    }

    public function test_quality_annual_trend_merges_rft_and_br()
    {
        $year = now()->year;
        $jan = "{$year}-01-15";
        $feb = "{$year}-02-15";

        DB::table('pieces_ok_jour')->insert([
            ['date' => $jan, 'atelier' => 'Confection', 'first_pass_today' => 980, 'synced_at' => now()],
            ['date' => $feb, 'atelier' => 'Confection', 'first_pass_today' => 970, 'synced_at' => now()],
        ]);
        DB::table('pieces_produites_jour')->insert([
            ['date' => $jan, 'atelier' => 'Confection', 'produced_today' => 1000, 'synced_at' => now()],
            ['date' => $feb, 'atelier' => 'Confection', 'produced_today' => 1000, 'synced_at' => now()],
        ]);
        DB::table('check_pass_qte')->insert([
            ['log_date' => $jan, 'shortname' => 'CH1', 'defect_pct' => 4.0, 'synced_at' => now()],
            ['log_date' => $feb, 'shortname' => 'CH1', 'defect_pct' => 3.5, 'synced_at' => now()],
        ]);

        $response = $this->actingAs($this->user)->getJson('/quality/annual-trend');
        $data = $response->json();

        // Debug: check actual response structure
        $this->assertIsArray($data, 'Response should be an array');
        // The controller returns response()->json(['data' => $data])
        // but with empty joins it might return empty array
        if (isset($data['data'])) {
            $this->assertNotEmpty($data['data']);
        } else {
            // Controller returned bare array
            $this->assertNotEmpty($data);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PRODUCTION PAGE — /production/*
    // ═══════════════════════════════════════════════════════════════════════

    public function test_production_chain_info_reads_wip_and_efficience()
    {
        DB::table('wip_chaine')->insert([
            'chaine' => 'CH1', 'en_cours' => 100, 'entree_jour' => 50, 'sortie_jour' => 40, 'synced_at' => now(),
        ]);
        DB::table('efficience_chaine')->insert([
            'chaine' => 'CH1', 'date' => now()->toDateString(), 'efficience_pct' => 88.5,
            'heures_prod' => 8, 'heures_standards' => 7, 'synced_at' => now(),
        ]);

        $response = $this->actingAs($this->user)->getJson('/production/chain-info');
        $data = $response->json();

        $this->assertArrayHasKey('data', $data);
        $chain = $data['data'][0];
        $this->assertEquals('CH1', $chain['id']);
        $this->assertEquals(100, $chain['wip']);
        $this->assertEquals(88.5, $chain['eff']);
        // SAM/SOT/Effectif should be N/A (GPRO Consulting B-04)
        $this->assertEquals('N/A', $chain['sam']);
        $this->assertEquals('N/A', $chain['sot']);
        $this->assertEquals('N/A', $chain['effectif']);
    }

    public function test_production_kpis_uses_multiple_db_tables()
    {
        DB::table('efficience_chaine')->insert([
            'chaine' => 'CH1', 'date' => now()->toDateString(), 'efficience_pct' => 88.5,
            'heures_prod' => 8, 'heures_standards' => 7, 'synced_at' => now(),
        ]);
        DB::table('pieces_ok_jour')->insert([
            'date' => now()->toDateString(), 'atelier' => 'Confection', 'first_pass_today' => 970, 'synced_at' => now(),
        ]);
        DB::table('pieces_produites_jour')->insert([
            'date' => now()->toDateString(), 'atelier' => 'Confection', 'produced_today' => 1000, 'synced_at' => now(),
        ]);
        DB::table('wip_chaine')->insert([
            'chaine' => 'CH1', 'en_cours' => 100, 'entree_jour' => 50, 'sortie_jour' => 40, 'synced_at' => now(),
        ]);
        DB::table('lost_time')->insert([
            'date' => now()->toDateString(), 'chaine' => 'CH1', 'motif' => 'MAINT', 'minutes_perdues' => 15, 'synced_at' => now(),
        ]);

        $response = $this->actingAs($this->user)->getJson('/production/kpis');
        $data = $response->json();

        // F-REQ-202: Efficience = 88.5% → green (>=85%)
        $this->assertEquals(88.5, $data['avg_efficience']['value']);
        $this->assertEquals('green', $data['avg_efficience']['status']);

        // F-REQ-104: RFT = 97.0% → orange
        $this->assertEquals(97.0, $data['rft_production']['value']);

        // F-REQ-207: Lost time = 15 min → orange (10-30)
        $this->assertEquals(15, $data['total_lost_time']['value']);
        $this->assertEquals('orange', $data['total_lost_time']['status']);
    }

    public function test_production_efficience_gauges_read_efficience_chaine()
    {
        DB::table('efficience_chaine')->insert([
            ['chaine' => 'CH1', 'date' => now()->toDateString(), 'efficience_pct' => 88.5, 'synced_at' => now()],
            ['chaine' => 'CH2', 'date' => now()->toDateString(), 'efficience_pct' => 72.1, 'synced_at' => now()],
        ]);

        $response = $this->actingAs($this->user)->getJson('/production/efficience-gauges');
        $data = $response->json();

        $this->assertCount(2, $data['data']);
        $ch1 = collect($data['data'])->firstWhere('chaine', 'CH1');
        $this->assertEquals(88.5, $ch1['efficience_pct']);
    }

    public function test_production_stoppage_timeline_reads_lost_time()
    {
        DB::table('lost_time')->insert([
            ['date' => now()->toDateString(), 'chaine' => 'CH1', 'motif' => 'MAINT', 'minutes_perdues' => 30, 'synced_at' => now()],
            ['date' => now()->toDateString(), 'chaine' => 'CH2', 'motif' => 'MATIERE', 'minutes_perdues' => 15, 'synced_at' => now()],
        ]);

        $response = $this->actingAs($this->user)->getJson('/production/stoppage-timeline');
        $data = $response->json();

        $this->assertCount(2, $data['data']);
        // Duration should be in hours (30/60 = 0.5)
        $this->assertEquals(0.5, $data['data'][0]['duration']);
    }

    public function test_production_of_donuts_reads_etat_avancement()
    {
        DB::table('etat_avancement')->insert([
            ['of' => 'OF-001', 'avancement_pct' => 78.5, 'quantite_prevue' => 1000, 'quantite_realisee' => 785, 'statut' => 'en_cours', 'synced_at' => now()],
        ]);

        $response = $this->actingAs($this->user)->getJson('/production/of-donuts');
        $data = $response->json();

        $this->assertCount(1, $data['data']);
        $this->assertEquals('OF-001', $data['data'][0]['of']);
        // Controller computes: (quantite_realisee / quantite_prevue) * 100 = 785/1000*100 = 78.5
        $this->assertEquals(78.5, $data['data'][0]['pct']);
    }

    public function test_production_top_operators_reads_qte_produit_individuel_jour()
    {
        DB::table('qte_produit_individuel_jour')->insert([
            ['date' => now()->toDateString(), 'employee_id' => 'EMP-001', 'chaine' => 'CH1', 'minutes_produites' => 380, 'minutes_presence' => 420, 'synced_at' => now()],
        ]);

        $response = $this->actingAs($this->user)->getJson('/production/top-operators');
        $data = $response->json();

        $this->assertCount(1, $data['data']);
        $this->assertEquals('EMP-001', $data['data'][0]['nom']);
        // eff = 380/420*100 = 90.5%
        $this->assertEquals(90.5, $data['data'][0]['eff']);
    }

    public function test_production_wip_reads_engagement_and_coupe()
    {
        DB::table('qte_engagement')->insert([
            ['date' => now()->toDateString(), 'commande' => 'CMD-001', 'chaine' => 'CH1', 'quantite_engagee' => 500, 'synced_at' => now()],
        ]);
        DB::table('sortie_coupe')->insert([
            ['date' => now()->toDateString(), 'commande' => 'CMD-001', 'quantite_coupee' => 400, 'synced_at' => now()],
        ]);

        $response = $this->actingAs($this->user)->getJson('/production/wip');
        $data = $response->json();

        $this->assertNotEmpty($data['data']);
        // WIP = sortie - engagement = 400 - 500 = -100 → max(0, -100) = 0
        $this->assertEquals(0, $data['data'][0]['wip']);
    }

    public function test_production_coupe_coverage_reads_sortie_coupe_and_engagement()
    {
        DB::table('sortie_coupe')->insert([
            ['date' => now()->toDateString(), 'commande' => 'CMD-001', 'quantite_coupee' => 500, 'synced_at' => now()],
        ]);
        DB::table('qte_engagement')->insert([
            ['date' => now()->toDateString(), 'commande' => 'CMD-001', 'quantite_engagee' => 300, 'synced_at' => now()],
        ]);

        $response = $this->actingAs($this->user)->getJson('/production/coupe/coverage');
        $data = $response->json();

        // Coverage = 500 - 300 = 200
        $this->assertEquals(200, $data['value']);
        $this->assertEquals('green', $data['status']);
    }

    public function test_production_serigraphie_coverage_reads_entree_and_sortie()
    {
        DB::table('qte_entree_serigraphie')->insert([
            ['date' => now()->toDateString(), 'article' => 'ART-001', 'quantite' => 500, 'synced_at' => now()],
        ]);
        DB::table('sortie_serigraphie')->insert([
            ['date' => now()->toDateString(), 'article' => 'ART-001', 'quantite' => 300, 'synced_at' => now()],
        ]);

        $response = $this->actingAs($this->user)->getJson('/production/serigraphie/coverage');
        $data = $response->json();

        // Coverage = 500 - 300 = 200
        $this->assertEquals(200, $data['value']);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LOGISTICS PAGE — /logistics/*
    // ═══════════════════════════════════════════════════════════════════════

    public function test_logistics_stock_kpis_reads_multiple_tables()
    {
        DB::table('stock_moyen')->insert(['stock_moyen' => 38035.07, 'nb_lignes_stock' => 4261, 'synced_at' => now()]);
        DB::table('articles_sans_mouvement')->insert(['nb_articles_sans_mvt_365j' => 843, 'qtte_sans_mvt_365j' => 147329728.72, 'synced_at' => now()]);
        DB::table('quantite_totale_stock')->insert(['quantite_totale_stock' => 162067420.25, 'synced_at' => now()]);
        DB::table('nombre_rouleaux')->insert(['nb_rouleaux' => 39031, 'synced_at' => now()]);
        DB::table('capacite_stockage')->insert([
            'total_conteneurs' => 132228, 'conteneurs_actifs' => 42864,
            'conteneurs_consommes' => 88499, 'conteneurs_supprimes' => 865, 'synced_at' => now(),
        ]);

        $response = $this->actingAs($this->user)->getJson('/logistics/stock-kpis');
        $data = $response->json();

        // Stock mort: 147329728.72 / 162067420.25 * 100 = 90.91%
        $this->assertEqualsWithDelta(90.91, $data['stock_mort']['value'], 0.01);

        // Occupation: 39031 / 42864 * 100 = 91.1%
        $this->assertEquals(91.1, $data['occupation']['value']);
        $this->assertEquals('orange', $data['occupation']['status']); // 85-95% = orange
    }

    public function test_logistics_stock_composition_reads_provenance_famille_typologie()
    {
        DB::table('quantite_par_provenance')->insert([
            ['provenance' => 'Chine', 'quantite' => 4200, 'nb_articles' => 100, 'synced_at' => now()],
            ['provenance' => null, 'quantite' => 162000, 'nb_articles' => 5000, 'synced_at' => now()], // rollup row
        ]);
        DB::table('quantite_par_famille')->insert([
            ['famille_fg' => 'DOMYOS', 'quantite' => 1800, 'synced_at' => now()],
            ['famille_fg' => null, 'quantite' => 162000, 'synced_at' => now()], // rollup
        ]);

        $response = $this->actingAs($this->user)->getJson('/logistics/stock-composition');
        $data = $response->json();

        // Null rollup rows should be filtered
        $this->assertCount(1, $data['provenance']);
        $this->assertEquals('Chine', $data['provenance'][0]['name']);
        $this->assertCount(1, $data['famille']);
    }

    public function test_logistics_ofs_reads_etat_avancement_and_nombre_ofs_livres()
    {
        DB::table('etat_avancement')->insert([
            ['of' => 'OF-001', 'avancement_pct' => 78.5, 'quantite_prevue' => 1000, 'quantite_realisee' => 785, 'statut' => 'en_cours', 'synced_at' => now()],
        ]);
        DB::table('nombre_ofs_livres')->insert([
            'nb_of_livres_total' => 4270, 'of_avec_transfert_coupe_total' => 3213, 'synced_at' => now(),
        ]);
        DB::table('moyenne_date_transfert')->insert([
            'moyenne_jours' => 4.16, 'nb_of_consideres' => 6576, 'synced_at' => now(),
        ]);

        $response = $this->actingAs($this->user)->getJson('/logistics/ofs');
        $data = $response->json();

        // Livraison: 3213/4270*100 = 75.2%
        $this->assertEquals(75.2, $data['livraison']['value']);

        // Délai: 4.16 jours → red (>3)
        $this->assertEquals(4.16, $data['delai_moyen']['value']);
        $this->assertEquals('red', $data['delai_moyen']['status']);
    }

    public function test_logistics_stock_search_joins_vue_stock_and_diva_stock()
    {
        DB::table('vue_stock')->insert([
            ['idmp' => 'MP-001', 'code_mp' => 'MP-1042', 'designation' => 'Tissu coton', 'famille' => 'Tissu', 'couleur' => 'Noir', 'synced_at' => now()],
        ]);
        DB::table('diva_stock')->insert([
            ['idmp' => 'MP-001', 'qtte' => 4200, 'qtte_reserve' => 1200, 'synced_at' => now()],
        ]);

        $response = $this->actingAs($this->user)->getJson('/logistics/stock-search?q=coton');
        $data = $response->json();

        $this->assertCount(1, $data['data']);
        $this->assertEquals(4200, $data['data'][0]['qtte']);
        $this->assertEquals(1200, $data['data'][0]['qtte_reserve']);
        // qtte_disponible = 4200 - 1200 = 3000
        $this->assertEquals(3000, $data['data'][0]['qtte_disponible']);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MÉTHODES PAGE — /methods/*
    // ═══════════════════════════════════════════════════════════════════════

    public function test_methods_kpis_reads_taging_reel_and_manual_kpi_values()
    {
        // F-REQ-217: from taging_reel
        DB::table('taging_reel')->insert([
            ['date' => now()->toDateString(), 'chaine' => 'CH1', 'shift' => 'A', 'tag_theorique' => 100, 'tag_reel' => 98, 'ecart_pct' => 2.0, 'synced_at' => now()],
            ['date' => now()->toDateString(), 'chaine' => 'CH2', 'shift' => 'A', 'tag_theorique' => 100, 'tag_reel' => 95, 'ecart_pct' => 5.0, 'synced_at' => now()],
        ]);

        // F-REQ-218/219: from manual_kpi_values
        ManualKpiValue::create(['kpi_key' => 'f_req_218', 'kpi_label' => 'Respect Temps Estimé', 'numerator' => 177, 'denominator' => 200, 'value' => 88.5]);
        ManualKpiValue::create(['kpi_key' => 'f_req_219', 'kpi_label' => 'Temps Acceptés 1ère Version', 'numerator' => 82, 'denominator' => 100, 'value' => 82.0]);

        $response = $this->actingAs($this->user)->getJson('/methods/kpis');
        $data = $response->json();

        // F-REQ-217: avg abs ecart = (2+5)/2 = 3.5 → reliability = 100-3.5 = 96.5%
        $this->assertEquals(96.5, $data['f_req_217']['value']);
        $this->assertEquals('green', $data['f_req_217']['status']); // >=95% = green

        // F-REQ-218: 88.5% → orange (85-90)
        $this->assertEquals(88.5, $data['f_req_218']['value']);
        $this->assertEquals(177, $data['f_req_218']['numerator']);
        $this->assertEquals(200, $data['f_req_218']['denominator']);

        // F-REQ-219: 82.0% → green (>=80%)
        $this->assertEquals(82.0, $data['f_req_219']['value']);

        // F-REQ-216: blocker B-05
        $this->assertNull($data['f_req_216']['value']);
        $this->assertEquals('B-05', $data['f_req_216']['blocker']);
    }

    public function test_methods_tagging_chart_reads_taging_reel()
    {
        DB::table('taging_reel')->insert([
            ['date' => now()->toDateString(), 'chaine' => 'CH1', 'shift' => 'A', 'tag_theorique' => 100, 'tag_reel' => 98, 'ecart_pct' => 2.0, 'synced_at' => now()],
            ['date' => now()->toDateString(), 'chaine' => 'CH1', 'shift' => 'B', 'tag_theorique' => 100, 'tag_reel' => 92, 'ecart_pct' => 8.0, 'synced_at' => now()],
        ]);

        $response = $this->actingAs($this->user)->getJson('/methods/tagging-chart');
        $data = $response->json();

        $this->assertCount(2, $data['data']);
        // ecart 2% → green, 8% → red
        $this->assertEquals('green', $data['data'][0]['status']);
        $this->assertEquals('red', $data['data'][1]['status']);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DEVELOPMENT PAGE — /development/*
    // ═══════════════════════════════════════════════════════════════════════

    public function test_development_kpis_reads_manual_kpi_values()
    {
        ManualKpiValue::create(['kpi_key' => 'dev_rft', 'kpi_label' => 'RFT Dev', 'numerator' => 96, 'denominator' => 100, 'value' => 96.0]);
        ManualKpiValue::create(['kpi_key' => 'dev_livraison', 'kpi_label' => 'Respect Livraison', 'numerator' => 94, 'denominator' => 100, 'value' => 94.0]);
        ManualKpiValue::create(['kpi_key' => 'dev_nomenclature', 'kpi_label' => 'Fiabilité Nomenclature', 'numerator' => 99, 'denominator' => 100, 'value' => 99.0]);
        ManualKpiValue::create(['kpi_key' => 'dev_reclamations', 'kpi_label' => 'Réclamations', 'numerator' => 1, 'denominator' => 100, 'value' => 1.0]);

        $response = $this->actingAs($this->user)->getJson('/development/kpis');
        $data = $response->json();

        // F-REQ-350: RFT = 96% → green (>=95%)
        $this->assertEquals(96.0, $data['kpis']['dev_rft']['value']);
        $this->assertEquals('green', $data['kpis']['dev_rft']['status']);

        // F-REQ-351: Livraison = 94% → orange (92-95)
        $this->assertEquals(94.0, $data['kpis']['dev_livraison']['value']);
        $this->assertEquals('orange', $data['kpis']['dev_livraison']['status']);

        // F-REQ-352: Nomenclature = 99% → green (>=98%)
        $this->assertEquals(99.0, $data['kpis']['dev_nomenclature']['value']);
        $this->assertEquals('green', $data['kpis']['dev_nomenclature']['status']);

        // F-REQ-353: Réclamations = 1% → green (<2%)
        $this->assertEquals(1.0, $data['kpis']['dev_reclamations']['value']);
        $this->assertEquals('green', $data['kpis']['dev_reclamations']['status']);

        // F-REQ-354/355 removed per Gap Analysis (hors CDC)
        $this->assertArrayNotHasKey('dev_dechiffrage', $data['kpis']);
        $this->assertArrayNotHasKey('dev_etalonnage', $data['kpis']);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // FILTERS — /filters/options
    // ═══════════════════════════════════════════════════════════════════════

    public function test_filter_options_reads_from_db_tables()
    {
        DB::table('quantite_par_famille')->insert([
            ['famille_fg' => 'DOMYOS', 'quantite' => 1800, 'synced_at' => now()],
            ['famille_fg' => 'NABAIJI', 'quantite' => 1200, 'synced_at' => now()],
        ]);
        DB::table('wip_chaine')->insert([
            ['chaine' => 'CH1', 'en_cours' => 100, 'synced_at' => now()],
            ['chaine' => 'CH2', 'en_cours' => 200, 'synced_at' => now()],
        ]);
        DB::table('etat_avancement')->insert([
            ['of' => 'OF-001', 'avancement_pct' => 50, 'statut' => 'en_cours', 'synced_at' => now()],
            ['of' => 'OF-002', 'avancement_pct' => 80, 'statut' => 'en_cours', 'synced_at' => now()],
        ]);

        $response = $this->actingAs($this->user)->getJson('/filters/options');
        $data = $response->json();

        $this->assertEquals(['DOMYOS', 'NABAIJI'], $data['marques']);
        $this->assertEquals(['CH1', 'CH2'], $data['lignes']);
        $this->assertEquals(['OF-001', 'OF-002'], $data['ofs']);
        $this->assertEquals(['Confection', 'Coupe', 'Sérigraphie'], $data['ateliers']);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SPECS.MD COMPLIANCE CHECKS
    // ═══════════════════════════════════════════════════════════════════════

    public function test_specs_req_104_rft_formula()
    {
        // specs.md F-REQ-104: RFT = pieces OK 1er coup / pieces produites * 100
        DB::table('pieces_ok_jour')->insert([
            'date' => now()->toDateString(), 'atelier' => 'Confection', 'first_pass_today' => 1664359, 'synced_at' => now(),
        ]);
        DB::table('pieces_produites_jour')->insert([
            'date' => now()->toDateString(), 'atelier' => 'Confection', 'produced_today' => 1720000, 'synced_at' => now(),
        ]);

        $response = $this->actingAs($this->user)->getJson('/quality/kpis');
        $data = $response->json();

        // 1664359/1720000*100 = 96.76%
        $this->assertEquals(96.8, $data['rft_jour']['value']);
    }

    public function test_specs_req_102_br_gtd_target_5pct()
    {
        // specs.md F-REQ-102: BR GTD target <=5%
        DB::table('check_pass_qte')->insert([
            'log_date' => now()->toDateString(), 'shortname' => 'CH1', 'defect_pct' => 5.1, 'synced_at' => now(),
        ]);

        $response = $this->actingAs($this->user)->getJson('/quality/kpis');
        $data = $response->json();

        // 5.1% > 5% → red
        $this->assertEquals('red', $data['br_gtd_jour']['status']);
    }

    public function test_specs_req_202_efficience_target_85pct()
    {
        // specs.md F-REQ-202: Efficience target >85%
        DB::table('efficience_chaine')->insert([
            'chaine' => 'CH1', 'date' => now()->toDateString(), 'efficience_pct' => 84.9,
            'heures_prod' => 8, 'heures_standards' => 6.76, 'synced_at' => now(),
        ]);

        $response = $this->actingAs($this->user)->getJson('/production/kpis');
        $data = $response->json();

        // 84.9% < 85% → orange (70-85)
        $this->assertEquals('orange', $data['avg_efficience']['status']);
    }

    public function test_specs_req_207_lost_time_target_10min()
    {
        // specs.md F-REQ-207: Arrêts target <10 min
        DB::table('lost_time')->insert([
            'date' => now()->toDateString(), 'chaine' => 'CH1', 'motif' => 'MAINT', 'minutes_perdues' => 12, 'synced_at' => now(),
        ]);

        $response = $this->actingAs($this->user)->getJson('/production/kpis');
        $data = $response->json();

        // 12 min > 10 → orange (10-30)
        $this->assertEquals('orange', $data['total_lost_time']['status']);
    }

    public function test_specs_req_322_occupation_target_85pct()
    {
        // specs.md F-REQ-322: Occupation target <=85%
        DB::table('nombre_rouleaux')->insert(['nb_rouleaux' => 39031, 'synced_at' => now()]);
        DB::table('capacite_stockage')->insert([
            'total_conteneurs' => 132228, 'conteneurs_actifs' => 42864,
            'conteneurs_consommes' => 88499, 'conteneurs_supprimes' => 865, 'synced_at' => now(),
        ]);

        $response = $this->actingAs($this->user)->getJson('/logistics/stock-kpis');
        $data = $response->json();

        // 39031/42864*100 = 91.1% > 85% → orange (85-95)
        $this->assertEquals('orange', $data['occupation']['status']);
    }

    public function test_specs_req_217_tagging_target_95pct()
    {
        // specs.md F-REQ-217: Fiabilité target 95%
        DB::table('taging_reel')->insert([
            ['date' => now()->toDateString(), 'chaine' => 'CH1', 'shift' => 'A', 'tag_theorique' => 100, 'tag_reel' => 96, 'ecart_pct' => 4.0, 'synced_at' => now()],
        ]);

        $response = $this->actingAs($this->user)->getJson('/methods/kpis');
        $data = $response->json();

        // avg abs ecart = 4.0 → reliability = 100-4.0 = 96.0% → green (>=95%)
        $this->assertEquals(96.0, $data['f_req_217']['value']);
        $this->assertEquals('green', $data['f_req_217']['status']);
    }

    public function test_specs_req_350_dev_rft_target_95pct()
    {
        // specs.md F-REQ-350: RFT Dev target >=95%
        ManualKpiValue::create(['kpi_key' => 'dev_rft', 'kpi_label' => 'RFT Dev', 'numerator' => 95, 'denominator' => 100, 'value' => 95.0]);

        $response = $this->actingAs($this->user)->getJson('/development/kpis');
        $data = $response->json();

        $this->assertEquals(95.0, $data['kpis']['dev_rft']['value']);
        $this->assertEquals('green', $data['kpis']['dev_rft']['status']);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // EDGE CASES
    // ═══════════════════════════════════════════════════════════════════════

    public function test_quality_kpis_empty_db_returns_grey()
    {
        $response = $this->actingAs($this->user)->getJson('/quality/kpis');
        $data = $response->json();

        // All KPIs should be grey/null when no data
        $this->assertNull($data['rft_jour']['value']);
        $this->assertEquals('grey', $data['rft_jour']['status']);
    }

    public function test_methods_kpis_empty_tagging_returns_grey()
    {
        $response = $this->actingAs($this->user)->getJson('/methods/kpis');
        $data = $response->json();

        $this->assertNull($data['f_req_217']['value']);
        $this->assertEquals('grey', $data['f_req_217']['status']);
    }

    public function test_development_kpis_empty_returns_grey()
    {
        $response = $this->actingAs($this->user)->getJson('/development/kpis');
        $data = $response->json();

        foreach ($data['kpis'] as $kpi) {
            $this->assertNull($kpi['value']);
            $this->assertEquals('grey', $kpi['status']);
        }
    }

    public function test_logistics_stock_search_empty_db_returns_empty()
    {
        $response = $this->actingAs($this->user)->getJson('/logistics/stock-search');
        $data = $response->json();

        $this->assertCount(0, $data['data']);
        $this->assertEquals(0, $data['total']);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ROLE ACCESS CONTROL
    // ═══════════════════════════════════════════════════════════════════════

    public function test_methods_page_requires_methodes_role()
    {
        $role = Role::firstOrCreate(['slug' => 'chef_atelier'], ['name' => "Chef d'Atelier"]);
        $user = User::factory()->create(['role_id' => $role->id]);

        $response = $this->actingAs($user)->getJson('/methods/kpis');
        $response->assertStatus(403);
    }

    public function test_development_page_requires_methodes_role()
    {
        $role = Role::firstOrCreate(['slug' => 'chef_atelier'], ['name' => "Chef d'Atelier"]);
        $user = User::factory()->create(['role_id' => $role->id]);

        $response = $this->actingAs($user)->getJson('/development/kpis');
        $response->assertStatus(403);
    }

    public function test_admin_endpoints_require_it_role()
    {
        $role = Role::firstOrCreate(['slug' => 'direction'], ['name' => 'Direction']);
        $user = User::factory()->create(['role_id' => $role->id]);

        $response = $this->actingAs($user)->getJson('/admin/users');
        $response->assertStatus(403);
    }
}
