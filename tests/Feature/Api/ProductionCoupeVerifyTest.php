<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ProductionCoupeVerifyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $role = \App\Models\Role::firstOrCreate(['slug' => 'it'], ['name' => 'IT']);
        $this->actingAs(User::factory()->create(['role_id' => $role->id]));
    }

    public function test_f_req_106_brc_bundling_from_rejets_inspection_paquet()
    {
        $today = now()->toDateString();

        DB::table('rejets_inspection_paquet')->insert([
            'date' => $today,
            'period' => 'jour',
            'bundle_inspected' => 200,
            'bundle_reject' => 8,
            'is_active' => true,
        ]);

        $response = $this->getJson('/production/kpis');
        $response->assertStatus(200)
            ->assertJsonPath('br_bundling.value', 4)
            ->assertJsonPath('br_bundling.status', 'orange')
            ->assertJsonPath('br_bundling.source_active', true);
    }

    public function test_f_req_108_brc_print_from_sync_drive_br_print()
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
            ->assertJsonPath('br_print.status', 'green')
            ->assertJsonStructure(['br_print' => ['value', 'status', 'target', 'synced_at']]);
    }

    public function test_f_req_207_arrets_non_planifies_couverte()
    {
        $today = now()->toDateString();

        DB::table('lost_time')->insert([
            'date' => $today,
            'chaine' => 'CH1',
            'motif' => 'MATIERE',
            'minutes_perdues' => 25,
        ]);

        $response = $this->getJson('/production/breakdown/arrets_non_planifies');
        $response->assertStatus(200)
            ->assertJsonStructure(['kpi_key', 'period', 'rows', 'synced_at']);
    }

    public function test_f_req_208_efficience_departage_poste_221()
    {
        $today = now()->toDateString();

        DB::table('qte_produit_individuel_jour')->insert([
            'date' => $today,
            'employee_id' => 'EMP001',
            'chaine' => 'CH1',
            'poste' => 'OP221',
            'minutes_produites' => 350,
        ]);

        DB::table('minutes_presence')->insert([
            'date' => $today,
            'employee_id' => 'EMP001',
            'chaine' => 'CH1',
            'minutes_presence' => 480,
        ]);

        $response = $this->getJson('/production/coupe/departage?poste=221');
        $response->assertStatus(200)
            ->assertJsonPath('data.0.eff', 72.9);
    }

    public function test_f_req_209_efficience_vignettes_poste_213()
    {
        $today = now()->toDateString();

        DB::table('qte_produit_individuel_jour')->insert([
            'date' => $today,
            'employee_id' => 'EMP002',
            'chaine' => 'CH1',
            'poste' => 'OP213',
            'minutes_produites' => 400,
        ]);

        DB::table('minutes_presence')->insert([
            'date' => $today,
            'employee_id' => 'EMP002',
            'chaine' => 'CH1',
            'minutes_presence' => 480,
        ]);

        $response = $this->getJson('/production/coupe/departage?poste=213');
        $response->assertStatus(200)
            ->assertJsonPath('data.0.eff', 83.3);
    }

    public function test_f_req_210_top_operateurs_coupe()
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

        $response = $this->getJson('/production/top-operators?atelier=coupe');
        $response->assertStatus(200)
            ->assertJsonStructure(['data']);
    }

    public function test_f_req_302_of_encours_coupe()
    {
        DB::table('of_fabrication')->insert([
            'of_number' => 'OF001',
            'dt_debut' => now()->toDateString(),
            'dt_fin' => null,
        ]);

        $response = $this->getJson('/production/coupe/ofs');
        $response->assertStatus(200)
            ->assertJsonStructure(['data']);
    }

    public function test_f_req_303_quantite_of()
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

    public function test_f_req_311_couverture_coupe_correct_direction()
    {
        $today = now()->toDateString();

        DB::table('qte_engagement')->insert([
            'date' => $today,
            'chaine' => 'CH1',
            'commande' => 'CMD001',
            'of' => 'OF001',
            'article' => 'ART001',
            'quantite_engagee' => 5000,
        ]);

        DB::table('sortie_coupe')->insert([
            'date' => $today,
            'commande' => 'CMD001',
            'article' => 'ART001',
            'quantite_coupee' => 3000,
        ]);

        $response = $this->getJson('/production/coupe/coverage');
        $response->assertStatus(200)
            ->assertJsonStructure(['value', 'unit', 'delta_pcs', 'status']);
    }

    public function test_all_coupe_endpoints_return_synced_at()
    {
        $response = $this->getJson('/production/kpis');
        $response->assertStatus(200)
            ->assertJsonStructure([
                'br_bundling' => ['synced_at'],
                'br_print' => ['synced_at'],
            ]);
    }
}
