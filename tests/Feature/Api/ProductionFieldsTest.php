<?php

namespace Tests\Feature\Api;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ProductionFieldsTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed roles if not present
        if (! Role::count()) {
            $this->artisan('db:seed', ['--class' => 'RoleSeeder']);
        }

        $role = Role::where('slug', 'resp_production')->first();
        $this->user = User::create([
            'name' => 'Prod User',
            'matricule' => 'PRD-001',
            'email' => 'prod@test.com',
            'password' => bcrypt('password'),
            'role_id' => $role->id,
            'is_active' => true,
        ]);
    }

    /** @test */
    public function chain_info_returns_values_from_stock_and_depart_tables()
    {
        // Insert WIP data
        DB::table('wip_chaine')->insert([
            'chaine' => 'CH1',
            'of_number' => 'OF-123',
            'en_cours' => 1000,
            'entree_jour' => 100,
            'sortie_jour' => 50,
        ]);

        // Insert Stock data for Designation
        DB::table('vue_stock')->insert([
            'idmp' => 1,
            'code_mp' => 'ART-ABC',
            'designation' => 'TEST DESIGNATION',
        ]);

        // Insert Depart data for Objectif and Article
        DB::table('qte_depart_chaine_article_of')->insert([
            'of' => 'OF-123',
            'chaine' => 'CH1',
            'article' => 'ART-ABC',
            'quantite' => 500,
        ]);

        // Insert Efficiency data for HP/HS
        DB::table('efficience_chaine')->insert([
            'chaine' => 'CH1',
            'date' => now()->toDateString(),
            'heures_prod' => 8.0,
            'heures_standards' => 7.0,
            'efficience_pct' => 87.5,
        ]);

        $response = $this->actingAs($this->user)
            ->getJson('/production/chain-info');

        $response->assertStatus(200);
        $data = $response->json('data.0');

        $this->assertEquals('TEST DESIGNATION', $data['designation']);
        $this->assertEquals(500, $data['objectif']);
        $this->assertEquals(8.0, $data['hp']);
        $this->assertEquals(7.0, $data['hs']);

        // SAM and Effectif should still be N/A
        $this->assertEquals('N/A', $data['sam']);
        $this->assertEquals('N/A', $data['effectif']);
    }

    /** @test */
    public function kpis_returns_na_for_owe_and_includes_rft()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/production/kpis');

        $response->assertStatus(200);

        $response->assertJsonFragment([
            'avg_owe' => [
                'value' => 'N/A',
                'status' => 'grey',
                'target' => '≥ 70%',
                'blocker' => 'SAM (F-REQ-211) manquant',
            ],
        ]);

        $this->assertArrayHasKey('rft_production', $response->json());
        $this->assertEquals('≥ 98%', $response->json('rft_production.target'));
    }

    /** @test */
    public function top_operators_uses_minutes_produites_and_presence_join()
    {
        // Insert some data
        DB::table('qte_produit_individuel_jour')->insert([
            'date' => now()->toDateString(),
            'employee_id' => 'EMP1',
            'chaine' => 'CH1',
            'quantite' => 100,
            'minutes_produites' => 80,
        ]);

        DB::table('minutes_presence')->insert([
            'date' => now()->toDateString(),
            'employee_id' => 'EMP1',
            'chaine' => 'CH1',
            'minutes_presence' => 100,
        ]);

        $response = $this->actingAs($this->user)
            ->getJson('/production/top-operators');

        $response->assertStatus(200);
        $data = $response->json('data');

        // Efficiency should be 80 / 100 * 100 = 80.0
        $this->assertEquals(80.0, $data[0]['eff']);
        $this->assertEquals('EMP1', $data[0]['nom']);
    }
}
