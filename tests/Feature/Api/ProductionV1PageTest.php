<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ProductionV1PageTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $role = \App\Models\Role::firstOrCreate(['slug' => 'it'], ['name' => 'IT']);
        $this->actingAs(User::factory()->create(['role_id' => $role->id]));
    }

    private function seedAll(): void
    {
        $today = now()->toDateString();

        DB::table('wip_chaine')->insert([
            'chaine' => 'CH1', 'en_cours' => 40, 'entree_jour' => 20, 'sortie_jour' => 15,
        ]);

        DB::table('efficience_chaine')->insert([
            'date' => $today, 'chaine' => 'CH1', 'efficience_pct' => 87.5,
            'heures_prod' => 8.0, 'heures_standards' => 7.0,
        ]);

        DB::table('etat_avancement')->insert([
            'of' => 'OF001', 'chaine' => 'CH1', 'quantite_prevue' => 500,
            'quantite_realisee' => 350, 'avancement_pct' => 70.0, 'statut' => 'en_cours',
        ]);

        DB::table('lost_time')->insert([
            'date' => $today, 'chaine' => 'CH1', 'motif' => 'Panne machine', 'minutes_perdues' => 45,
        ]);

        DB::table('sortie_coupe')->insert([
            'date' => $today, 'chaine' => 'CH1', 'quantite_coupee' => 120,
        ]);

        DB::table('qte_engagement')->insert([
            'date' => $today, 'of' => 'OF001', 'chaine' => 'CH1', 'quantite_engagee' => 150,
        ]);

        DB::table('qte_depart_chaine_article_of')->insert([
            'of' => 'OF001', 'chaine' => 'CH1', 'article' => 'ART-001', 'quantite' => 500,
        ]);

        DB::table('taging_reel')->insert([
            'date' => $today, 'chaine' => 'CH1', 'mono' => 'MO001',
            'total_engagement' => 100, 'total_embalage' => 80, 'statut_tagging' => 'OK',
        ]);

        DB::table('packets_rejetes')->insert([
            'date_rejet' => $today, 'rfid_introuvable' => 3, 'packet_annule' => 1,
        ]);

        DB::table('qte_produit_individuel_jour')->insert([
            'date' => $today, 'employee_id' => 'EMP001', 'chaine' => 'CH1',
            'quantite' => 80, 'minutes_produites' => 400, 'poste' => 'OP221',
        ]);

        DB::table('minutes_presence')->insert([
            'date' => $today, 'employee_id' => 'EMP001', 'chaine' => 'CH1', 'minutes_presence' => 480,
        ]);

        DB::table('temps_operation')->insert([
            'date' => $today, 'operation_code' => 'OP221', 'chaine' => 'CH1', 'temps_reel_s' => 3600,
        ]);

        DB::table('qte_entree_serigraphie')->insert([
            'date' => $today, 'of' => 'OF001', 'chaine' => 'CH1', 'article' => 'ART-001', 'quantite' => 600,
        ]);

        DB::table('sortie_serigraphie')->insert([
            'date' => $today, 'chaine' => 'CH1', 'quantite' => 400,
        ]);

        DB::table('vue_stock')->insert([
            'idmp' => 1, 'code_mp' => 'ART-001', 'designation' => 'T-Shirt Classic',
        ]);

        DB::table('of_fabrication')->insert([
            'of_number' => 'OF001', 'dt_debut' => $today, 'dt_fin' => now()->addDays(30)->toDateString(),
        ]);

        DB::table('pieces_ok_jour')->insert([
            'date' => $today, 'first_pass_today' => 2800,
        ]);

        DB::table('pieces_produites_jour')->insert([
            'date' => $today, 'produced_today' => 2900,
        ]);

        DB::table('rejets_inspection_paquet')->insert([
            'date' => $today, 'period' => 'jour', 'bundle_reject' => 8,
            'bundle_inspected' => 200, 'is_active' => 1,
        ]);

        DB::table('sync_drive_br_print')->insert([
            'date' => $today, 'nb_inspections' => 500, 'nb_rejets' => 15,
        ]);

        DB::table('sync_gpro_article_master')->insert([
            'code_article' => 'ART-001', 'sam_min' => 12.0, 'sot_min' => 10.0, 'effectif_requis' => 25,
        ]);

        DB::table('sync_gpro_chain_planning')->insert([
            'chaine' => 'CH1', 'objectif_journalier' => 100, 'cadence_hebdo' => 700,
        ]);

        DB::table('sync_gpro_of_dates')->insert([
            'of_numero' => 'OF001', 'chaine' => 'CH1', 'ehd' => '2026-08-01',
        ]);

        DB::table('sync_gpro_suivi_paquets')->insert([
            'of_numero' => 'OF001', 'est_solde' => 1, 'est_archive' => 1,
        ]);

        DB::table('sync_drive_cotation')->insert([
            'article' => 'ART-001', 'temps_cotation_min' => 12.0, 'temps_production_min' => 11.0,
        ]);

        DB::table('sync_drive_gammes')->insert([
            'article' => 'ART-001', 'nb_gammes_total' => 10, 'nb_gammes_acceptees_v1' => 8,
        ]);
    }

    // ── Row 1: Header KPIs ──────────────────────────────────────────────

    /** @test F-REQ-204 */
    public function test_owe_card_has_value()
    {
        $this->seedAll();
        $res = $this->getJson('/production/kpis')->json();
        $this->assertIsNumeric($res['avg_owe']['value']);
        $this->assertGreaterThan(0, $res['avg_owe']['value']);
    }

    /** @test F-REQ-211 */
    public function test_sam_card_has_value()
    {
        $this->seedAll();
        $res = $this->getJson('/production/chain-info')->json();
        $this->assertNotEmpty($res['data']);
        $sam = $res['data'][0]['sam'];
        $this->assertIsNumeric($sam);
        $this->assertGreaterThan(0, $sam);
    }

    /** @test F-REQ-212 */
    public function test_sot_card_has_value()
    {
        $this->seedAll();
        $res = $this->getJson('/production/chain-info')->json();
        $sot = $res['data'][0]['sot'];
        $this->assertIsNumeric($sot);
        $this->assertGreaterThan(0, $sot);
    }

    /** @test F-REQ-213 */
    public function test_effectif_card_has_value()
    {
        $this->seedAll();
        $res = $this->getJson('/production/chain-info')->json();
        $effectif = $res['data'][0]['effectif'];
        $this->assertIsNumeric($effectif);
        $this->assertGreaterThan(0, $effectif);
    }

    /** @test F-REQ-214 */
    public function test_article_card_has_value()
    {
        $this->seedAll();
        $res = $this->getJson('/production/chain-info')->json();
        $this->assertNotEquals('N/A', $res['data'][0]['article']);
        $this->assertNotEmpty($res['data'][0]['article']);
    }

    /** @test F-REQ-215 */
    public function test_designation_card_has_value()
    {
        $this->seedAll();
        $res = $this->getJson('/production/chain-info')->json();
        $this->assertNotEquals('N/A', $res['data'][0]['designation']);
        $this->assertNotEmpty($res['data'][0]['designation']);
    }

    /** @test F-REQ-201 */
    public function test_efficience_operateur_chart_has_data()
    {
        $this->seedAll();
        $res = $this->getJson('/production/top-operators?all=1')->json();
        $this->assertNotEmpty($res['data']);
        $this->assertGreaterThan(0, $res['data'][0]['eff']);
    }

    /** @test F-REQ-202 */
    public function test_efficience_chaine_gauge_has_value()
    {
        $this->seedAll();
        $res = $this->getJson('/production/efficience-gauges')->json();
        $this->assertNotEmpty($res['data']);
        $this->assertGreaterThan(0, $res['data'][0]['efficience_pct']);
    }

    /** @test F-REQ-203 */
    public function test_efficience_trend_has_data()
    {
        $this->seedAll();
        $res = $this->getJson('/production/efficience-trend')->json();
        $this->assertNotEmpty($res['data']);
        $this->assertArrayHasKey('eff', $res['data'][0]);
        $this->assertArrayHasKey('jour', $res['data'][0]);
    }

    /** @test F-REQ-205 */
    public function test_wip_card_has_value()
    {
        $this->seedAll();
        $res = $this->getJson('/production/kpis')->json();
        $this->assertGreaterThan(0, $res['total_wip']['value']);
    }

    /** @test F-REQ-206 */
    public function test_wip_optimal_has_data()
    {
        $this->seedAll();
        $res = $this->getJson('/production/wip')->json();
        $this->assertNotEmpty($res['data']);
        $this->assertArrayHasKey('sortie', $res['data'][0]);
        $this->assertArrayHasKey('engagement', $res['data'][0]);
    }

    /** @test F-REQ-207 */
    public function test_stoppage_timeline_has_data()
    {
        $this->seedAll();
        $res = $this->getJson('/production/stoppage-timeline')->json();
        $this->assertNotEmpty($res['data']);
        $this->assertNotNull($res['data'][0]['motif']);
        $this->assertGreaterThan(0, $res['data'][0]['duration']);
    }

    /** @test F-REQ-208 */
    public function test_departage_chart_has_data()
    {
        $this->seedAll();
        $res = $this->getJson('/production/coupe/departage?poste=OP221')->json();
        $this->assertNotEmpty($res['data']);
        $this->assertGreaterThan(0, $res['data'][0]['eff']);
    }

    /** @test F-REQ-209 */
    public function test_vignettes_chart_has_data()
    {
        DB::table('qte_produit_individuel_jour')->insert([
            'date' => now()->toDateString(), 'employee_id' => 'EMP002', 'chaine' => 'CH1',
            'quantite' => 70, 'minutes_produites' => 380, 'poste' => 'OP213',
        ]);
        DB::table('minutes_presence')->insert([
            'date' => now()->toDateString(), 'employee_id' => 'EMP002', 'chaine' => 'CH1', 'minutes_presence' => 460,
        ]);
        $res = $this->getJson('/production/coupe/departage?poste=OP213')->json();
        $this->assertNotEmpty($res['data']);
        $this->assertGreaterThan(0, $res['data'][0]['eff']);
    }

    /** @test F-REQ-210 */
    public function test_top_operateurs_has_data()
    {
        $this->seedAll();
        $res = $this->getJson('/production/top-operators')->json();
        $this->assertNotEmpty($res['data']);
        $this->assertGreaterThan(0, $res['data'][0]['eff']);
    }

    /** @test F-REQ-102 */
    public function test_brc_gtd_card_has_value()
    {
        DB::table('check_pass_qte')->insert([
            'log_date' => now()->toDateString(), 'shortname' => 'CH1', 'defect_pct' => 3.5,
        ]);
        $res = $this->getJson('/production/kpis')->json();
        $this->assertIsNumeric($res['br_gtd']['value']);
        $this->assertEquals(3.5, $res['br_gtd']['value']);
    }

    /** @test F-REQ-104 */
    public function test_rft_card_has_value()
    {
        $this->seedAll();
        $res = $this->getJson('/production/kpis')->json();
        $this->assertIsNumeric($res['rft_production']['value']);
        $this->assertGreaterThan(0, $res['rft_production']['value']);
    }

    /** @test F-REQ-106 */
    public function test_br_bundling_card_has_value()
    {
        $this->seedAll();
        $res = $this->getJson('/production/kpis')->json();
        $this->assertIsNumeric($res['br_bundling']['value']);
        $this->assertGreaterThan(0, $res['br_bundling']['value']);
    }

    /** @test F-REQ-108 */
    public function test_br_print_card_has_value()
    {
        $this->seedAll();
        $res = $this->getJson('/production/kpis')->json();
        $this->assertIsNumeric($res['br_print']['value']);
        $this->assertGreaterThan(0, $res['br_print']['value']);
    }

    /** @test lost_time */
    public function test_lost_time_card_has_value()
    {
        $this->seedAll();
        $res = $this->getJson('/production/kpis')->json();
        $this->assertGreaterThan(0, $res['total_lost_time']['value']);
    }

    /** @test order-tracking */
    public function test_order_tracking_has_data()
    {
        $this->seedAll();
        $res = $this->getJson('/production/order-tracking')->json();
        $this->assertNotEmpty($res['data']);
        $this->assertArrayHasKey('orderId', $res['data'][0]);
        $this->assertArrayHasKey('overallPct', $res['data'][0]);
    }

    /** @test of-donuts */
    public function test_of_donuts_has_data()
    {
        $this->seedAll();
        $res = $this->getJson('/production/of-donuts')->json();
        $this->assertNotEmpty($res['data']);
        $this->assertArrayHasKey('of', $res['data'][0]);
        $this->assertArrayHasKey('pct', $res['data'][0]);
    }

    /** @test serigraphie coverage */
    public function test_serigraphie_coverage_has_value()
    {
        $this->seedAll();
        $res = $this->getJson('/production/serigraphie/coverage')->json();
        $this->assertIsNumeric($res['value']);
        $this->assertArrayHasKey('status', $res);
    }

    /** @test coupe coverage */
    public function test_coupe_coverage_has_value()
    {
        $this->seedAll();
        $res = $this->getJson('/production/coupe/coverage')->json();
        $this->assertIsNumeric($res['value']);
        $this->assertArrayHasKey('status', $res);
    }

    /** @test all KPIs have synced_at */
    public function test_all_kpi_cards_have_synced_at()
    {
        $this->seedAll();
        $res = $this->getJson('/production/kpis')->json();
        foreach (['avg_efficience', 'avg_owe', 'rft_production', 'total_wip', 'total_lost_time', 'br_gtd', 'br_bundling', 'br_print'] as $kpi) {
            $this->assertArrayHasKey('synced_at', $res[$kpi], "KPI '{$kpi}' missing synced_at");
        }
    }
}
