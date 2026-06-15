<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ProductionFixesE2ETest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $role = \App\Models\Role::firstOrCreate(['slug' => 'it'], ['name' => 'IT']);
        $this->actingAs(User::factory()->create(['role_id' => $role->id]));
    }

    public function test_top_operators_uses_correct_join_and_fields()
    {
        $today = now()->toDateString();

        // Seed qte_produit_individuel_jour
        DB::table('qte_produit_individuel_jour')->insert([
            'date' => $today,
            'employee_id' => 'EMP001',
            'chaine' => 'CH1',
            'poste' => 'OP221',
            'minutes_produites' => 400,
            'minutes_presence' => 0, // Should be ignored if we join
        ]);

        // Seed minutes_presence
        DB::table('minutes_presence')->insert([
            'date' => $today,
            'employee_id' => 'EMP001',
            'chaine' => 'CH1',
            'minutes_presence' => 480,
        ]);

        $response = $this->getJson('/production/top-operators');

        $response->assertStatus(200)
            ->assertJsonPath('data.0.nom', 'EMP001')
            ->assertJsonPath('data.0.eff', 83.3) // (400 / 480) * 100
            ->assertJsonPath('data.0.chaine', 'CH1');
    }

    public function test_breakdown_efficience_operateur_works()
    {
        $today = now()->toDateString();

        DB::table('qte_produit_individuel_jour')->insert([
            'date' => $today,
            'employee_id' => 'EMP001',
            'chaine' => 'CH1',
            'poste' => 'OP221',
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
            ->assertJsonStructure(['rows', 'period', 'synced_at'])
            ->assertJsonPath('rows.0.employe', 'EMP001')
            ->assertJsonPath('rows.0.value', 93.8); // (450 / 480) * 100
    }

    public function test_coupe_departage_supports_poste_filtering_and_join()
    {
        $today = now()->toDateString();

        DB::table('qte_produit_individuel_jour')->insert([
            'date' => $today,
            'employee_id' => 'EMP_COUPE',
            'chaine' => 'CH1',
            'poste' => 'OP221',
            'minutes_produites' => 300,
        ]);

        DB::table('minutes_presence')->insert([
            'date' => $today,
            'employee_id' => 'EMP_COUPE',
            'chaine' => 'CH1',
            'minutes_presence' => 480,
        ]);

        $response = $this->getJson('/production/coupe/departage?poste=221');

        $response->assertStatus(200)
            ->assertJsonPath('data.0.employe', 'EMP_COUPE')
            ->assertJsonPath('data.0.eff', 62.5); // (300 / 480) * 100
    }
}
