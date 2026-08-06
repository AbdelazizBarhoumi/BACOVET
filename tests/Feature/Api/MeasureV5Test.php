<?php

namespace Tests\Feature\Api;

use App\Models\MeasureV5;
use App\Models\V5User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MeasureV5Test extends TestCase
{
    use RefreshDatabase;

    protected V5User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = V5User::create([
            'email' => 'builder@test.com',
            'name' => 'Builder',
            'role' => 'it',
            'password' => '',
            'has_password' => false,
        ]);
        $this->actingAs($this->user, 'v5_users');
    }

    public function test_unauthenticated_returns_401(): void
    {
        $this->app['auth']->guard('v5_users')->logout();

        $this->getJson('/api/v5/measures')->assertStatus(401);
    }

    public function test_index_lists_all_measures(): void
    {
        MeasureV5::create(['name' => 'Total Sales', 'expression' => 'SUM(sales[Amount])', 'category' => 'Finance']);
        MeasureV5::create(['name' => 'Avg Price', 'expression' => 'AVG(sales[Price])', 'category' => 'Finance']);

        $response = $this->getJson('/api/v5/measures');

        $response->assertStatus(200);
        $this->assertCount(2, $response['measures']);
        $names = collect($response['measures'])->pluck('name')->all();
        $this->assertContains('Total Sales', $names);
        $this->assertContains('Avg Price', $names);
    }

    public function test_store_creates_measure_and_logs_activity(): void
    {
        $response = $this->postJson('/api/v5/measures', [
            'name' => 'Total Sales',
            'expression' => 'Total Sales = SUM(sales[Amount])',
            'category' => 'Finance',
            'description' => 'Sum of all sales',
        ]);

        $response->assertStatus(201);
        $this->assertEquals('Total Sales', $response['measure']['name']);
        $this->assertEquals('Finance', $response['measure']['category']);
        $this->assertDatabaseHas('measures_v5', ['name' => 'Total Sales']);
        $this->assertDatabaseHas('builder_activity_logs_v5', [
            'user_id' => $this->user->id,
            'action' => 'measure.create',
        ]);
    }

    public function test_store_persists_wizard_config(): void
    {
        $config = json_encode([
            'from' => 'wip_chaine',
            'to' => 'codestyle',
            'hops' => [
                [
                    'from' => 'wip_chaine',
                    'to' => 'codestyle',
                    'fromCol' => 'MONo',
                    'toCol' => 'SONo',
                    'kind' => 'fk_pk',
                    'overlap' => 0.36,
                    'confidence' => 0.46,
                    'verified' => false,
                ],
            ],
            'kind' => 'list',
            'column' => 'StyleCode',
            'agg' => 'sum',
        ]);

        $response = $this->postJson('/api/v5/measures', [
            'name' => 'Style Codes',
            'expression' => 'Style Codes = VALUES(FILTER(codestyle, ...))',
            'config' => $config,
        ]);

        $response->assertStatus(201);
        $this->assertEquals('Style Codes', $response['measure']['name']);
        $this->assertEquals(
            'wip_chaine',
            $response['measure']['config']['from'],
        );
        $this->assertEquals(
            'StyleCode',
            $response['measure']['config']['column'],
        );

        $stored = MeasureV5::where('name', 'Style Codes')->first();
        $this->assertNotNull($stored);
        $this->assertIsArray($stored->config);
        $this->assertEquals('codestyle', $stored->config['to']);
        $this->assertEquals('list', $stored->config['kind']);
        $this->assertFalse($stored->config['hops'][0]['verified']);
    }

    public function test_store_rejects_invalid_config_json(): void
    {
        $this->postJson('/api/v5/measures', [
            'name' => 'Broken Config',
            'expression' => 'Broken = 1',
            'config' => 'not-json{{{',
        ])->assertStatus(422);
    }

    public function test_update_replaces_wizard_config(): void
    {
        $measure = MeasureV5::create([
            'name' => 'Style Codes',
            'expression' => 'Style = 1',
            'config' => ['kind' => 'list'],
        ]);

        $response = $this->putJson("/api/v5/measures/{$measure->id}", [
            'name' => 'Style Codes',
            'expression' => 'Style = SUM(x)',
            'config' => json_encode(['kind' => 'number', 'agg' => 'sum']),
        ]);

        $response->assertStatus(200);
        $measure->refresh();
        $this->assertEquals('number', $measure->config['kind']);
        $this->assertEquals('sum', $measure->config['agg']);
    }

    public function test_store_normalizes_empty_category_to_null(): void
    {
        $this->postJson('/api/v5/measures', [
            'name' => 'Count Rows',
            'expression' => 'COUNTROWS()',
            'category' => '   ',
        ])->assertStatus(201);

        $this->assertDatabaseHas('measures_v5', [
            'name' => 'Count Rows',
            'category' => null,
        ]);
    }

    public function test_store_rejects_duplicate_name(): void
    {
        MeasureV5::create(['name' => 'Total Sales', 'expression' => 'SUM(sales[Amount])']);

        $this->postJson('/api/v5/measures', [
            'name' => 'Total Sales',
            'expression' => 'Total Sales = SUM(sales[Amount])',
        ])->assertStatus(422);
    }

    public function test_update_changes_expression_and_logs_activity(): void
    {
        $measure = MeasureV5::create([
            'name' => 'Old Name',
            'expression' => 'Old Name = SUM(sales[Amount])',
            'category' => null,
        ]);

        $response = $this->putJson("/api/v5/measures/{$measure->id}", [
            'name' => 'New Name',
            'expression' => 'New Name = SUM(sales[Amount]) - SUM(cost[Amount])',
            'category' => 'Finance',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('measures_v5', ['id' => $measure->id, 'name' => 'New Name']);
        $this->assertDatabaseHas('builder_activity_logs_v5', ['action' => 'measure.update']);
    }

    public function test_update_rejects_duplicate_name_of_other_measure(): void
    {
        $measure = MeasureV5::create(['name' => 'First', 'expression' => 'SUM(sales[Amount])']);
        MeasureV5::create(['name' => 'Second', 'expression' => 'SUM(sales[Amount])']);

        $this->putJson("/api/v5/measures/{$measure->id}", [
            'name' => 'Second',
            'expression' => 'Second = 1',
        ])->assertStatus(422);
    }

    public function test_destroy_deletes_measure_and_logs_activity(): void
    {
        $measure = MeasureV5::create(['name' => 'To Delete', 'expression' => 'SUM(sales[Amount])']);

        $response = $this->deleteJson("/api/v5/measures/{$measure->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('measures_v5', ['id' => $measure->id]);
        $this->assertDatabaseHas('builder_activity_logs_v5', ['action' => 'measure.delete']);
    }

    public function test_measures_are_shared_across_users(): void
    {
        MeasureV5::create(['name' => 'Shared Total', 'expression' => 'SUM(sales[Amount])']);

        $other = V5User::create([
            'email' => 'other@test.com',
            'name' => 'Other',
            'role' => 'viewer',
            'password' => '',
            'has_password' => false,
        ]);
        $this->actingAs($other, 'v5_users');

        $response = $this->getJson('/api/v5/measures');
        $response->assertStatus(200);
        $this->assertCount(1, $response['measures']);
        $this->assertEquals('Shared Total', $response['measures'][0]['name']);
    }
}
