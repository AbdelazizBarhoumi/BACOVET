<?php

namespace Tests\Feature\Api;

use App\Models\DataMapping;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DataMappingTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $role = Role::firstOrCreate(['slug' => 'it'], ['name' => 'IT']);
        $this->user = User::factory()->create([
            'role_id' => $role->id,
            'is_active' => true,
        ]);
        $this->actingAs($this->user);
    }

    // ── INDEX ─────────────────────────────────────────────────────────

    public function test_lists_all_data_mappings(): void
    {
        DataMapping::create(['kpi' => 'F-REQ-101', 'name' => 'BR', 'variable' => 'Test']);
        DataMapping::create(['kpi' => 'F-REQ-102', 'name' => 'BR GTD', 'variable' => 'Test 2']);

        $response = $this->get('/data-mappings');

        $response->assertStatus(200);
        $response->assertJsonCount(2);
        $response->assertJsonFragment(['kpi' => 'F-REQ-101']);
        $response->assertJsonFragment(['kpi' => 'F-REQ-102']);
    }

    public function test_returns_empty_when_no_mappings(): void
    {
        $response = $this->get('/data-mappings');

        $response->assertStatus(200);
        $response->assertJson([]);
    }

    // ── STORE ─────────────────────────────────────────────────────────

    public function test_creates_a_new_mapping(): void
    {
        $response = $this->postJson('/data-mappings', [
            'kpi' => 'F-REQ-201',
            'name' => 'Efficience',
            'variable' => 'Taux efficience',
            'endpoint' => 'api/data/q/efficience_chaine',
            'variable_type' => 'Direct',
            'variable_key' => 'Efficience_Pourcentage',
            'is_filtered' => false,
            'filter_key' => '',
            'filter_value' => '',
            'has_function' => false,
            'fn' => 'Latest',
            'modules' => ['quality', 'production'],
        ]);

        $response->assertStatus(201);
        $response->assertJsonFragment([
            'kpi' => 'F-REQ-201',
            'name' => 'Efficience',
            'endpoint' => 'api/data/q/efficience_chaine',
        ]);

        $this->assertDatabaseHas('data_mappings', [
            'kpi' => 'F-REQ-201',
            'variable_key' => 'Efficience_Pourcentage',
        ]);
    }

    public function test_creates_mapping_with_minimal_fields(): void
    {
        $response = $this->postJson('/data-mappings', [
            'kpi' => 'F-REQ-300',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('data_mappings', [
            'kpi' => 'F-REQ-300',
            'name' => '',
            'variable' => '',
            'variable_type' => 'Direct',
            'fn' => 'Latest',
        ]);
    }

    public function test_creates_mapping_with_modules(): void
    {
        $response = $this->postJson('/data-mappings', [
            'kpi' => 'F-REQ-400',
            'modules' => ['production', 'production:coupe', 'production:confection', 'methodes'],
        ]);

        $response->assertStatus(201);

        $mapping = DataMapping::where('kpi', 'F-REQ-400')->first();
        $this->assertEquals(['production', 'production:coupe', 'production:confection', 'methodes'], $mapping->modules);
    }

    public function test_creates_mapping_with_null_optional_fields(): void
    {
        $response = $this->postJson('/data-mappings', [
            'kpi' => 'F-REQ-500',
            'endpoint' => null,
            'variable_key' => null,
            'filter_key' => null,
            'filter_value' => null,
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('data_mappings', [
            'kpi' => 'F-REQ-500',
            'endpoint' => null,
            'variable_key' => null,
        ]);
    }

    public function test_rejects_store_without_kpi(): void
    {
        $response = $this->postJson('/data-mappings', [
            'name' => 'Test',
        ]);

        $response->assertStatus(422);
    }

    public function test_rejects_invalid_variable_type(): void
    {
        $response = $this->postJson('/data-mappings', [
            'kpi' => 'F-REQ-600',
            'variable_type' => 'Invalid',
        ]);

        $response->assertStatus(422);
    }

    public function test_rejects_invalid_fn_value(): void
    {
        $response = $this->postJson('/data-mappings', [
            'kpi' => 'F-REQ-700',
            'fn' => 'InvalidFn',
        ]);

        $response->assertStatus(422);
    }

    // ── UPDATE ────────────────────────────────────────────────────────

    public function test_updates_a_mapping(): void
    {
        $mapping = DataMapping::create(['kpi' => 'F-REQ-101', 'name' => 'BR']);

        $response = $this->putJson("/data-mappings/{$mapping->id}", [
            'name' => 'BR Updated',
            'endpoint' => 'api/data/q/wip_chaine',
            'variable_key' => 'WIP_Chaine',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('data_mappings', [
            'id' => $mapping->id,
            'name' => 'BR Updated',
            'endpoint' => 'api/data/q/wip_chaine',
            'variable_key' => 'WIP_Chaine',
        ]);
    }

    public function test_updates_modules(): void
    {
        $mapping = DataMapping::create(['kpi' => 'F-REQ-101', 'modules' => ['quality']]);

        $response = $this->putJson("/data-mappings/{$mapping->id}", [
            'modules' => ['quality', 'production', 'production:coupe'],
        ]);

        $response->assertStatus(200);
        $mapping->refresh();
        $this->assertEquals(['quality', 'production', 'production:coupe'], $mapping->modules);
    }

    public function test_updates_with_null_values(): void
    {
        $mapping = DataMapping::create([
            'kpi' => 'F-REQ-101',
            'endpoint' => 'api/data/q/test',
            'variable_key' => 'SomeKey',
        ]);

        $response = $this->putJson("/data-mappings/{$mapping->id}", [
            'endpoint' => null,
            'variable_key' => null,
        ]);

        $response->assertStatus(200);
        $mapping->refresh();
        $this->assertNull($mapping->endpoint);
        $this->assertNull($mapping->variable_key);
    }

    public function test_returns_404_for_nonexistent_mapping(): void
    {
        $response = $this->putJson('/data-mappings/99999', [
            'name' => 'Test',
        ]);

        $response->assertStatus(404);
    }

    // ── DESTROY ───────────────────────────────────────────────────────

    public function test_deletes_a_mapping(): void
    {
        $mapping = DataMapping::create(['kpi' => 'F-REQ-101']);

        $response = $this->deleteJson("/data-mappings/{$mapping->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('data_mappings', ['id' => $mapping->id]);
    }

    public function test_returns_404_when_deleting_nonexistent(): void
    {
        $response = $this->deleteJson('/data-mappings/99999');

        $response->assertStatus(404);
    }

    // ── BATCH UPDATE ──────────────────────────────────────────────────

    public function test_batch_updates_multiple_mappings(): void
    {
        $m1 = DataMapping::create(['kpi' => 'F-REQ-101', 'name' => 'BR']);
        $m2 = DataMapping::create(['kpi' => 'F-REQ-102', 'name' => 'BR GTD']);

        $response = $this->postJson('/data-mappings/batch', [
            'mappings' => [
                ['id' => $m1->id, 'name' => 'BR Updated', 'endpoint' => 'api/data/q/test1'],
                ['id' => $m2->id, 'name' => 'BR GTD Updated', 'endpoint' => 'api/data/q/test2'],
            ],
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('data_mappings', ['id' => $m1->id, 'name' => 'BR Updated']);
        $this->assertDatabaseHas('data_mappings', ['id' => $m2->id, 'name' => 'BR GTD Updated']);
    }

    public function test_batch_updates_with_modules(): void
    {
        $m1 = DataMapping::create(['kpi' => 'F-REQ-101', 'modules' => []]);

        $response = $this->postJson('/data-mappings/batch', [
            'mappings' => [
                ['id' => $m1->id, 'modules' => ['quality', 'production:flux']],
            ],
        ]);

        $response->assertStatus(200);
        $m1->refresh();
        $this->assertEquals(['quality', 'production:flux'], $m1->modules);
    }

    public function test_batch_updates_with_null_values(): void
    {
        $m1 = DataMapping::create([
            'kpi' => 'F-REQ-101',
            'endpoint' => 'api/data/q/test',
            'variable_key' => 'SomeKey',
        ]);

        $response = $this->postJson('/data-mappings/batch', [
            'mappings' => [
                ['id' => $m1->id, 'endpoint' => null, 'variable_key' => null],
            ],
        ]);

        $response->assertStatus(200);
        $m1->refresh();
        $this->assertNull($m1->endpoint);
        $this->assertNull($m1->variable_key);
    }

    public function test_rejects_batch_update_without_id(): void
    {
        $response = $this->postJson('/data-mappings/batch', [
            'mappings' => [
                ['name' => 'No ID'],
            ],
        ]);

        $response->assertStatus(422);
    }

    public function test_rejects_batch_update_with_nonexistent_mapping(): void
    {
        $response = $this->postJson('/data-mappings/batch', [
            'mappings' => [
                ['id' => 99999, 'name' => 'Ghost'],
            ],
        ]);

        $response->assertStatus(422);
    }

    public function test_rejects_batch_update_without_mappings(): void
    {
        $response = $this->postJson('/data-mappings/batch', []);

        $response->assertStatus(422);
    }

    // ── SEED ──────────────────────────────────────────────────────────

    public function test_seeds_from_kpi_seed_when_empty(): void
    {
        $response = $this->postJson('/data-mappings/seed');

        $response->assertStatus(200);
        $this->assertGreaterThan(0, DataMapping::count());
    }

    public function test_skips_seed_when_already_seeded(): void
    {
        DataMapping::create(['kpi' => 'F-REQ-101']);

        $response = $this->postJson('/data-mappings/seed');

        $response->assertStatus(200);
        $response->assertJsonFragment(['message' => 'Table already seeded.']);
        $this->assertEquals(1, DataMapping::count());
    }

    // ── INTEGRATION: FULL CRUD FLOW ──────────────────────────────────

    public function test_full_crud_lifecycle(): void
    {
        // Create
        $createRes = $this->postJson('/data-mappings', [
            'kpi' => 'F-REQ-999',
            'name' => 'Lifecycle Test',
            'modules' => ['quality'],
        ]);
        $createRes->assertStatus(201);
        $id = $createRes->json('mapping.id');

        // Read
        $listRes = $this->get('/data-mappings');
        $listRes->assertStatus(200);
        $this->assertDatabaseHas('data_mappings', ['id' => $id, 'kpi' => 'F-REQ-999']);

        // Update
        $updateRes = $this->putJson("/data-mappings/{$id}", [
            'name' => 'Lifecycle Updated',
            'modules' => ['quality', 'production'],
        ]);
        $updateRes->assertStatus(200);
        $this->assertDatabaseHas('data_mappings', ['id' => $id, 'name' => 'Lifecycle Updated']);

        // Delete
        $deleteRes = $this->deleteJson("/data-mappings/{$id}");
        $deleteRes->assertStatus(200);
        $this->assertDatabaseMissing('data_mappings', ['id' => $id]);
    }

    public function test_batch_crud_lifecycle(): void
    {
        $m1 = DataMapping::create(['kpi' => 'F-REQ-801', 'name' => 'Batch 1']);
        $m2 = DataMapping::create(['kpi' => 'F-REQ-802', 'name' => 'Batch 2']);

        // Batch update
        $batchRes = $this->postJson('/data-mappings/batch', [
            'mappings' => [
                ['id' => $m1->id, 'name' => 'Batch 1 Updated', 'modules' => ['quality']],
                ['id' => $m2->id, 'name' => 'Batch 2 Updated', 'modules' => ['production', 'production:coupe']],
            ],
        ]);
        $batchRes->assertStatus(200);

        $m1->refresh();
        $m2->refresh();
        $this->assertEquals(['quality'], $m1->modules);
        $this->assertEquals(['production', 'production:coupe'], $m2->modules);

        // Delete both
        $this->deleteJson("/data-mappings/{$m1->id}")->assertStatus(200);
        $this->deleteJson("/data-mappings/{$m2->id}")->assertStatus(200);
        $this->assertDatabaseMissing('data_mappings', ['id' => $m1->id]);
        $this->assertDatabaseMissing('data_mappings', ['id' => $m2->id]);
    }

    // ── AUTH ──────────────────────────────────────────────────────────

    public function test_rejects_unauthenticated_requests(): void
    {
        $this->app['auth']->forgetGuards();

        $this->get('/data-mappings')->assertStatus(302);
        $this->postJson('/data-mappings', ['kpi' => 'TEST'])->assertStatus(401);
    }
}
