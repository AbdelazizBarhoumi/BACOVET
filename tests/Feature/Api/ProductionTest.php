<?php

namespace Tests\Feature\Api;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ProductionTest extends TestCase
{
    use RefreshDatabase;

    protected $user;

    protected function setUp(): void
    {
        parent::setUp();

        $role = Role::firstOrCreate(['slug' => 'it'], ['name' => 'IT']);
        $this->user = User::factory()->create(['role_id' => $role->id]);

        // Seed some dummy data
        DB::table('wip_chaine')->insert([
            'chaine' => 'CH1',
            'en_cours' => 100,
            'entree_jour' => 50,
            'sortie_jour' => 40,
            'synced_at' => now(),
        ]);

        DB::table('efficience_chaine')->insert([
            'chaine' => 'CH1',
            'date' => now()->toDateString(),
            'efficience_pct' => 88.5,
            'heures_prod' => 8,
            'heures_standards' => 7,
            'synced_at' => now(),
        ]);
    }

    public function test_can_get_chain_info()
    {
        $response = $this->actingAs($this->user)->getJson('/production/chain-info');

        $response->assertStatus(200)
            ->assertJsonStructure(['data' => [['id', 'of', 'eff', 'wip', 'status']]]);
    }

    public function test_can_get_kpis()
    {
        $response = $this->actingAs($this->user)->getJson('/production/kpis');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'avg_efficience' => ['value', 'status', 'target'],
                'total_wip' => ['value', 'status', 'target'],
                'total_lost_time' => ['value', 'status', 'target'],
            ]);
    }

    public function test_can_get_efficience_gauges()
    {
        $response = $this->actingAs($this->user)->getJson('/production/efficience-gauges');

        $response->assertStatus(200)
            ->assertJsonStructure(['data' => [['chaine', 'efficience_pct']]]);
    }

    public function test_unauthorized_user_cannot_access_production_api()
    {
        $role = Role::firstOrCreate(['slug' => 'operator'], ['name' => 'Operator']);
        $otherUser = User::factory()->create(['role_id' => $role->id]);

        $response = $this->actingAs($otherUser)->getJson('/production/kpis');

        $response->assertStatus(403);
    }
}
