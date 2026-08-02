<?php

namespace Tests\Feature\Api;

use App\Models\MeasureLibraryV6;
use App\Models\V6User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MeasureLibraryV6Test extends TestCase
{
    use RefreshDatabase;

    protected V6User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = V6User::create([
            'email' => 'builder@test.com',
            'name' => 'Builder',
            'role' => 'it',
            'password' => '',
            'has_password' => false,
        ]);
        $this->actingAs($this->user, 'v6_users');
    }

    public function test_unauthenticated_returns_401(): void
    {
        $this->app['auth']->guard('v6_users')->logout();

        $this->getJson('/api/v6/measures')->assertStatus(401);
        $this->postJson('/api/v6/measures', [
            'name' => 'Total Sales',
            'expression' => 'SUM(Amount)',
        ])->assertStatus(401);
    }

    public function test_index_lists_shared_measures(): void
    {
        MeasureLibraryV6::create([
            'name' => 'Total Sales',
            'expression' => 'SUM(Amount)',
            'category' => 'Finance',
        ]);
        MeasureLibraryV6::create([
            'name' => 'Margin',
            'expression' => 'SUM(Amount)-SUM(Cost)',
        ]);

        $response = $this->getJson('/api/v6/measures')->assertStatus(200);

        $this->assertCount(2, $response->json('measures'));
        $this->assertEquals('Total Sales', $response->json('measures.0.name'));
        $this->assertEquals('Finance', $response->json('measures.0.category'));
    }

    public function test_store_creates_measure(): void
    {
        $response = $this->postJson('/api/v6/measures', [
            'name' => 'Total Sales',
            'expression' => 'SUM(Amount)-SUM(Cost)',
            'description' => 'Chiffre d\'affaires net',
            'category' => 'Finance',
        ])->assertStatus(201);

        $this->assertEquals('Total Sales', $response->json('measure.name'));
        $this->assertDatabaseHas('measures_library_v6', [
            'name' => 'Total Sales',
            'category' => 'Finance',
        ]);
    }

    public function test_store_requires_name_expression_and_unique_name(): void
    {
        $this->postJson('/api/v6/measures', ['name' => '', 'expression' => 'SUM(Amount)'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('name');

        $this->postJson('/api/v6/measures', ['name' => 'Total', 'expression' => ''])
            ->assertStatus(422)
            ->assertJsonValidationErrors('expression');

        MeasureLibraryV6::create(['name' => 'Total', 'expression' => 'SUM(Amount)']);
        $this->postJson('/api/v6/measures', ['name' => 'Total', 'expression' => 'AVG(Price)'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('name');
    }

    public function test_update_renames_measure_ignoring_self(): void
    {
        $measure = MeasureLibraryV6::create([
            'name' => 'Old Name',
            'expression' => 'SUM(Amount)',
            'category' => 'Ops',
        ]);

        $response = $this->putJson("/api/v6/measures/{$measure->id}", [
            'name' => 'New Name',
            'expression' => 'AVG(Price)',
            'category' => 'Finance',
        ])->assertStatus(200);

        $this->assertEquals('New Name', $response->json('measure.name'));
        $this->assertEquals('Finance', $response->json('measure.category'));
        $this->assertDatabaseHas('measures_library_v6', ['id' => $measure->id, 'name' => 'New Name']);
        $this->assertDatabaseMissing('measures_library_v6', ['name' => 'Old Name']);
    }

    public function test_update_rejects_duplicate_name_from_another_measure(): void
    {
        MeasureLibraryV6::create(['name' => 'Taken', 'expression' => 'SUM(Amount)']);
        $measure = MeasureLibraryV6::create(['name' => 'Mine', 'expression' => 'SUM(Cost)']);

        $this->putJson("/api/v6/measures/{$measure->id}", [
            'name' => 'Taken',
            'expression' => 'SUM(Cost)',
        ])->assertStatus(422)
            ->assertJsonValidationErrors('name');
    }

    public function test_destroy_deletes_measure(): void
    {
        $measure = MeasureLibraryV6::create([
            'name' => 'Total Sales',
            'expression' => 'SUM(Amount)',
        ]);

        $this->deleteJson("/api/v6/measures/{$measure->id}")->assertStatus(200);

        $this->assertDatabaseMissing('measures_library_v6', ['id' => $measure->id]);
    }

    public function test_missing_measure_returns_404(): void
    {
        $this->putJson('/api/v6/measures/999', [
            'name' => 'X',
            'expression' => 'SUM(Amount)',
        ])->assertStatus(404);

        $this->deleteJson('/api/v6/measures/999')->assertStatus(404);
    }
}
