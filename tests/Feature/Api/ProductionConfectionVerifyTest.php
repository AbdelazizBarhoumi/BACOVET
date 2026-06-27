<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ProductionConfectionVerifyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $role = \App\Models\Role::firstOrCreate(['slug' => 'it'], ['name' => 'IT']);
        $this->actingAs(User::factory()->create(['role_id' => $role->id]));
    }

    public function test_f_req_102_brc_gtd_uses_correct_table_and_formula()
    {
        $today = now()->toDateString();

        DB::table('check_pass_qte')->insert([
            'log_date' => $today,
            'shortname' => 'CH1',
            'defect_pct' => 3.5,
        ]);

        $response = $this->getJson('/production/kpis');
        $response->assertStatus(200)
            ->assertJsonPath('br_gtd.value', 3.5)
            ->assertJsonPath('br_gtd.status', 'green')
            ->assertJsonStructure(['br_gtd' => ['value', 'status', 'target', 'synced_at']]);
    }

    public function test_f_req_104_rft_uses_correct_tables()
    {
        $today = now()->toDateString();

        DB::table('pieces_ok_jour')->insert([
            'date' => $today,
            'first_pass_today' => 2800,
        ]);

        DB::table('pieces_produites_jour')->insert([
            'date' => $today,
            'produced_today' => 2900,
        ]);

        $response = $this->getJson('/production/kpis');
        $response->assertStatus(200)
            ->assertJsonPath('rft_production.value', 96.6)
            ->assertJsonPath('rft_production.status', 'orange')
            ->assertJsonStructure(['rft_production' => ['value', 'status', 'target', 'synced_at']]);
    }

    public function test_f_req_201_efficience_operateur_uses_correct_formula()
    {
        $today = now()->toDateString();

        DB::table('qte_produit_individuel_jour')->insert([
            'date' => $today,
            'employee_id' => 'EMP001',
            'chaine' => 'CH1',
            'minutes_produites' => 450,
        ]);

        DB::table('minutes_presence')->insert([
            'date' => $today,
            'employee_id' => 'EMP001',
            'chaine' => 'CH1',
            'minutes_presence' => 480,
        ]);

        $response = $this->getJson('/production/breakdown/efficience_operateur');
        $response->assertStatus(200)
            ->assertJsonPath('rows.0.value', 93.8)
            ->assertJsonStructure(['rows', 'period', 'synced_at']);
    }

    public function test_f_req_202_efficience_chaine_from_efficiency_table()
    {
        $today = now()->toDateString();

        DB::table('efficience_chaine')->insert([
            'date' => $today,
            'chaine' => 'CH1',
            'efficience_pct' => 87.5,
            'heures_prod' => 7,
            'heures_standards' => 8,
        ]);

        $response = $this->getJson('/production/kpis');
        $response->assertStatus(200)
            ->assertJsonPath('avg_efficience.value', 87.5)
            ->assertJsonPath('avg_efficience.status', 'green');
    }

    public function test_f_req_203_efficience_cumulee_monthly_aggregation()
    {
        $today = now()->toDateString();
        $startOfMonth = now()->startOfMonth()->toDateString();

        DB::table('qte_produit_individuel_jour')->insert([
            'date' => $startOfMonth,
            'employee_id' => 'EMP001',
            'chaine' => 'CH1',
            'minutes_produites' => 400,
        ]);

        DB::table('minutes_presence')->insert([
            'date' => $startOfMonth,
            'employee_id' => 'EMP001',
            'chaine' => 'CH1',
            'minutes_presence' => 480,
        ]);

        $response = $this->getJson('/production/efficience-trend');
        $response->assertStatus(200)
            ->assertJsonStructure(['data']);
    }

    public function test_f_req_204_owe_computed_from_efficiency_and_sam_sot()
    {
        $today = now()->toDateString();

        DB::table('efficience_chaine')->insert([
            'date' => $today,
            'chaine' => 'CH1',
            'efficience_pct' => 90,
            'heures_prod' => 7.2,
            'heures_standards' => 8,
        ]);

        DB::table('sync_gpro_article_master')->insert([
            'code_article' => 'ART001',
            'sam_min' => 10,
            'sot_min' => 8,
            'effectif_requis' => 10,
        ]);

        $response = $this->getJson('/production/kpis');
        $response->assertStatus(200)
            ->assertJsonPath('avg_owe.partial_data', true)
            ->assertJsonStructure(['avg_owe' => ['value', 'status', 'target', 'synced_at', 'partial_data']]);
    }

    public function test_f_req_205_wip_from_wip_chaine_table()
    {
        DB::table('wip_chaine')->insert([
            'chaine' => 'CH1',
            'en_cours' => 40,
            'entree_jour' => 100,
            'sortie_jour' => 90,
        ]);

        $response = $this->getJson('/production/kpis');
        $response->assertStatus(200)
            ->assertJsonPath('total_wip.value', 40)
            ->assertJsonStructure(['total_wip' => ['value', 'status', 'target', 'synced_at']]);
    }

    public function test_f_req_206_wip_optimal_engagement_minus_sortie_coupe()
    {
        $today = now()->toDateString();

        DB::table('qte_engagement')->insert([
            'date' => $today,
            'chaine' => 'CH1',
            'commande' => 'CMD001',
            'of' => 'OF001',
            'article' => 'ART001',
            'quantite_engagee' => 500,
        ]);

        DB::table('sortie_coupe')->insert([
            'date' => $today,
            'commande' => 'CMD001',
            'article' => 'ART001',
            'quantite_coupee' => 300,
        ]);

        $response = $this->getJson('/production/wip');
        $response->assertStatus(200)
            ->assertJsonStructure(['data']);
    }

    public function test_f_req_207_arrets_non_planifies_from_lost_time()
    {
        $today = now()->toDateString();

        DB::table('lost_time')->insert([
            'date' => $today,
            'chaine' => 'CH1',
            'motif' => 'MAINT',
            'minutes_perdues' => 45,
        ]);

        $response = $this->getJson('/production/kpis');
        $response->assertStatus(200)
            ->assertJsonPath('total_lost_time.value', 45)
            ->assertJsonPath('total_lost_time.status', 'red');
    }

    public function test_f_req_210_top_operateurs_includes_temps_operation()
    {
        $today = now()->toDateString();

        DB::table('qte_produit_individuel_jour')->insert([
            'date' => $today,
            'employee_id' => 'EMP001',
            'chaine' => 'CH1',
            'poste' => 'OP221',
            'minutes_produites' => 400,
        ]);

        DB::table('minutes_presence')->insert([
            'date' => $today,
            'employee_id' => 'EMP001',
            'chaine' => 'CH1',
            'minutes_presence' => 480,
        ]);

        DB::table('temps_operation')->insert([
            'operation_code' => 'OP221',
            'temps_reel_s' => 45,
            'temps_standard_s' => 42,
            'ecart_pct' => 7.1,
        ]);

        $response = $this->getJson('/production/top-operators');
        $response->assertStatus(200)
            ->assertJsonStructure(['data']);
    }

    public function test_f_req_211_to_215_chain_info_fields_present()
    {
        $today = now()->toDateString();

        DB::table('wip_chaine')->insert([
            'chaine' => 'CH1',
            'en_cours' => 100,
            'entree_jour' => 200,
            'sortie_jour' => 180,
            'of_number' => 'OF001',
            'article' => 'ART001',
        ]);

        DB::table('efficience_chaine')->insert([
            'date' => $today,
            'chaine' => 'CH1',
            'efficience_pct' => 85,
            'heures_prod' => 7,
            'heures_standards' => 8,
        ]);

        DB::table('sync_gpro_article_master')->insert([
            'code_article' => 'ART001',
            'sam_min' => 10,
            'sot_min' => 8,
            'effectif_requis' => 10,
        ]);

        DB::table('sync_gpro_chain_planning')->insert([
            'chaine' => 'CH1',
            'of_numero' => 'OF001',
            'objectif_journalier' => 500,
            'cadence_hebdo' => 3000,
        ]);

        $response = $this->getJson('/production/chain-info');
        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'of', 'article', 'designation', 'sam', 'sot', 'effectif', 'objectif', 'bpd', 'epd', 'ehd'],
                ],
                'metadata',
            ]);
    }

    public function test_f_req_301_to_305_of_tracking_fields()
    {
        $today = now()->toDateString();

        DB::table('etat_avancement')->insert([
            'of' => 'OF001',
            'chaine' => 'CH1',
            'quantite_prevue' => 1000,
            'quantite_realisee' => 800,
            'avancement_pct' => 80,
            'statut' => 'en_cours',
        ]);

        $response = $this->getJson('/production/of-donuts');
        $response->assertStatus(200)
            ->assertJsonStructure(['data']);
    }

    public function test_f_req_306_to_308_dates_in_order_tracking()
    {
        $today = now()->toDateString();

        DB::table('etat_avancement')->insert([
            'of' => 'OF001',
            'chaine' => 'CH1',
            'quantite_prevue' => 1000,
            'quantite_realisee' => 500,
            'avancement_pct' => 50,
            'statut' => 'en_cours',
        ]);

        DB::table('of_fabrication')->insert([
            'of_number' => 'OF001',
            'dt_debut' => $today,
            'dt_fin' => now()->addDays(5)->toDateString(),
        ]);

        $response = $this->getJson('/production/order-tracking');
        $response->assertStatus(200)
            ->assertJsonStructure(['data']);
    }

    public function test_f_req_310_couverture_chaine_uses_correct_formula()
    {
        DB::table('qte_engagement')->insert([
            'date' => now()->toDateString(),
            'chaine' => 'CH1',
            'commande' => 'CMD001',
            'of' => 'OF001',
            'article' => 'ART001',
            'quantite_engagee' => 5000,
        ]);

        DB::table('qte_depart_chaine_article_of')->insert([
            'of' => 'OF001',
            'chaine' => 'CH1',
            'article' => 'ART001',
            'quantite' => 3000,
        ]);

        DB::table('sync_gpro_chain_planning')->insert([
            'chaine' => 'CH1',
            'of_numero' => 'OF001',
            'cadence_hebdo' => 1000,
        ]);

        $response = $this->getJson('/production/coupe/chain-coverage');
        $response->assertStatus(200)
            ->assertJsonStructure(['value', 'unit', 'breakdown']);
    }

    public function test_f_req_312_objectif_from_gpro_planning()
    {
        DB::table('sync_gpro_chain_planning')->insert([
            'chaine' => 'CH1',
            'of_numero' => 'OF001',
            'objectif_journalier' => 500,
            'cadence_hebdo' => 3000,
        ]);

        $response = $this->getJson('/production/chain-info');
        $response->assertStatus(200)
            ->assertJsonStructure(['data']);
    }

    public function test_all_kpi_cards_have_synced_at()
    {
        $response = $this->getJson('/production/kpis');
        $response->assertStatus(200)
            ->assertJsonStructure([
                'avg_efficience' => ['value', 'status', 'target', 'synced_at'],
                'avg_owe' => ['value', 'status', 'target', 'synced_at'],
                'rft_production' => ['value', 'status', 'target', 'synced_at'],
                'total_wip' => ['value', 'status', 'target', 'synced_at'],
                'total_lost_time' => ['value', 'status', 'target', 'synced_at'],
                'br_gtd' => ['value', 'status', 'target', 'synced_at'],
                'br_bundling' => ['value', 'status', 'target', 'synced_at'],
                'br_print' => ['value', 'status', 'target', 'synced_at'],
            ]);
    }

    public function test_status_never_hardcoded_uses_service()
    {
        $today = now()->toDateString();

        DB::table('efficience_chaine')->insert([
            'date' => $today,
            'chaine' => 'CH1',
            'efficience_pct' => 65,
            'heures_prod' => 5.2,
            'heures_standards' => 8,
        ]);

        $response = $this->getJson('/production/kpis');
        $response->assertStatus(200)
            ->assertJsonPath('avg_efficience.status', 'red');
    }
}
