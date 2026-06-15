<?php

namespace Tests\Feature\Api;

use App\Models\Role;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ProductionFilterTest extends TestCase
{
    use RefreshDatabase;

    protected $user;

    protected function setUp(): void
    {
        parent::setUp();

        $role = Role::firstOrCreate(['slug' => 'it'], ['name' => 'IT']);
        $this->user = User::factory()->create(['role_id' => $role->id, 'is_active' => true]);

        $today = Carbon::today()->toDateString();

        // Seed Confection data
        DB::table('efficience_chaine')->insert([
            'chaine' => 'CH1',
            'date' => $today,
            'efficience_pct' => 80.0,
            'atelier' => 'confection',
            'synced_at' => now(),
        ]);

        // Seed Coupe data
        DB::table('efficience_chaine')->insert([
            'chaine' => 'COU1',
            'date' => $today,
            'efficience_pct' => 90.0,
            'atelier' => 'coupe',
            'synced_at' => now(),
        ]);

        // Seed pieces_ok_jour for Confection
        DB::table('pieces_ok_jour')->insert([
            'date' => $today,
            'first_pass_today' => 100,
            'atelier' => 'confection',
            'synced_at' => now(),
        ]);

        // Seed pieces_ok_jour for Coupe
        DB::table('pieces_ok_jour')->insert([
            'date' => $today,
            'first_pass_today' => 50,
            'atelier' => 'coupe',
            'synced_at' => now(),
        ]);

        // Seed qte_produit_individuel_jour with JOIN context
        DB::table('qte_produit_individuel_jour')->insert([
            'date' => $today,
            'employee_id' => 'EMP1',
            'chaine' => 'CH1',
            'minutes_produites' => 400,
            'atelier' => 'confection',
            'synced_at' => now(),
        ]);
        DB::table('minutes_presence')->insert([
            'date' => $today,
            'employee_id' => 'EMP1',
            'minutes_presence' => 480,
            'chaine' => 'CH1',
            'atelier' => 'confection',
            'synced_at' => now(),
        ]);
    }

    public function test_kpis_filter_by_atelier()
    {
        // Confection
        $response = $this->actingAs($this->user)->getJson('/production/kpis?atelier=confection');
        $response->assertStatus(200);
        $this->assertEquals(80.0, $response->json('avg_efficience.value'));

        // Coupe
        $response = $this->actingAs($this->user)->getJson('/production/kpis?atelier=coupe');
        $response->assertStatus(200);
        $this->assertEquals(90.0, $response->json('avg_efficience.value'));
    }

    public function test_efficience_gauges_filter_by_atelier()
    {
        $response = $this->actingAs($this->user)->getJson('/production/efficience-gauges?atelier=confection');
        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.chaine', 'CH1');

        $response = $this->actingAs($this->user)->getJson('/production/efficience-gauges?atelier=coupe');
        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.chaine', 'COU1');
    }

    public function test_top_operators_avoids_ambiguous_column()
    {
        // This test verifies the fix for "Column 'atelier' in where clause is ambiguous"
        $response = $this->actingAs($this->user)->getJson('/production/top-operators?atelier=confection');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.nom', 'EMP1');
    }
}
