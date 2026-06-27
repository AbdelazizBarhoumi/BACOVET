<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ProductionSerigraphieVerifyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $role = \App\Models\Role::firstOrCreate(['slug' => 'it'], ['name' => 'IT']);
        $this->actingAs(User::factory()->create(['role_id' => $role->id]));
    }

    public function test_f_req_104_rft_production_in_serigraphie()
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
            ->assertJsonPath('rft_production.status', 'orange');
    }

    public function test_f_req_108_brc_print_for_serigraphie()
    {
        $today = now()->toDateString();

        DB::table('sync_drive_br_print')->insert([
            'date' => $today,
            'nb_inspections' => 500,
            'nb_rejets' => 15,
            'synced_at' => now()->toIso8601String(),
        ]);

        $response = $this->getJson('/production/kpis');
        $response->assertStatus(200)
            ->assertJsonPath('br_print.value', 3)
            ->assertJsonPath('br_print.status', 'green');
    }

    public function test_f_req_205_wip_in_serigraphie()
    {
        DB::table('wip_chaine')->insert([
            'chaine' => 'CH1',
            'en_cours' => 40,
            'entree_jour' => 100,
            'sortie_jour' => 90,
        ]);

        $response = $this->getJson('/production/kpis');
        $response->assertStatus(200)
            ->assertJsonPath('total_wip.value', 40);
    }

    public function test_f_req_206_wip_optimal_in_serigraphie()
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

    public function test_f_req_207_arrets_non_planifies_in_serigraphie()
    {
        $today = now()->toDateString();

        DB::table('lost_time')->insert([
            'date' => $today,
            'chaine' => 'CH1',
            'motif' => 'MAINT',
            'minutes_perdues' => 15,
        ]);

        $response = $this->getJson('/production/breakdown/arrets_non_planifies');
        $response->assertStatus(200)
            ->assertJsonStructure(['kpi_key', 'rows', 'synced_at']);
    }

    public function test_f_req_210_top_operateurs_in_serigraphie()
    {
        $today = now()->toDateString();

        DB::table('qte_produit_individuel_jour')->insert([
            'date' => $today,
            'employee_id' => 'EMP001',
            'chaine' => 'CH1',
            'minutes_produites' => 400,
        ]);

        DB::table('minutes_presence')->insert([
            'date' => $today,
            'employee_id' => 'EMP001',
            'chaine' => 'CH1',
            'minutes_presence' => 480,
        ]);

        $response = $this->getJson('/production/top-operators?atelier=serigraphie');
        $response->assertStatus(200)
            ->assertJsonStructure(['data']);
    }

    public function test_f_req_301_of_confection_in_serigraphie()
    {
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

    public function test_f_req_303_quantite_of_in_serigraphie()
    {
        DB::table('qte_depart_chaine_article_of')->insert([
            'of' => 'OF001',
            'chaine' => 'CH1',
            'article' => 'ART001',
            'quantite' => 500,
        ]);

        $response = $this->getJson('/production/coupe/qte-departage');
        $response->assertStatus(200)
            ->assertJsonStructure(['data']);
    }

    public function test_f_req_309_couverture_serigraphie_correct_formula()
    {
        $today = now()->toDateString();

        DB::table('qte_entree_serigraphie')->insert([
            'date' => $today,
            'article' => 'ART001',
            'couleur' => 'Blanc',
            'quantite' => 600,
        ]);

        DB::table('sortie_serigraphie')->insert([
            'date' => $today,
            'article' => 'ART001',
            'couleur' => 'Blanc',
            'quantite' => 400,
        ]);

        $response = $this->getJson('/production/serigraphie/coverage');
        $response->assertStatus(200)
            ->assertJsonPath('value', 200)
            ->assertJsonStructure(['value', 'status', 'target']);
    }

    public function test_f_req_312_objectif_in_serigraphie()
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

    public function test_wip_chaine_breakdown_uses_service_not_hardcoded()
    {
        DB::table('wip_chaine')->insert([
            'chaine' => 'CH1',
            'en_cours' => 80,
        ]);

        $response = $this->getJson('/production/breakdown/wip_chaine');
        $response->assertStatus(200)
            ->assertJsonPath('rows.0.status', 'red');
    }
}
