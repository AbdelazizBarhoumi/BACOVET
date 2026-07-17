<?php

namespace Tests\Feature\Api;

use App\Models\DataMapping;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class DataMappingSyncSqlTest extends TestCase
{
    use RefreshDatabase;

    protected function makeDataUser(string $role = 'it'): \App\Models\DataUser
    {
        return \App\Models\DataUser::create([
            'email' => fake()->unique()->safeEmail(),
            'name' => fake()->name(),
            'role' => $role,
            'password' => '',
            'has_password' => false,
        ]);
    }

    public function test_superadmin_can_sync_sql(): void
    {
        $user = $this->makeDataUser('it');
        $this->actingAs($user, 'data_users');

        $sql = "UPDATE `data_mappings` SET `name` = 'Test' WHERE `kpi` = 'F-REQ-001' AND `variable` = 'v1';";

        Http::fake([
            'http://external-api.test/sql' => Http::response($sql, 200, ['Content-Type' => 'application/sql']),
        ]);

        config(['services.sql_dump_url' => 'http://external-api.test/sql']);

        $response = $this->postJson('/data-mappings/sync-sql');

        $response->assertOk();
        $response->assertJsonFragment(['message' => 'SQL sync completed successfully']);
        $response->assertJsonStructure([
            'message',
            'sql_length',
            'commands' => [
                'export:mappings' => ['exit', 'output'],
                'export:endpoints' => ['exit', 'output'],
                'optimize:clear' => ['exit', 'output'],
            ],
        ]);
    }

    public function test_non_superadmin_is_rejected(): void
    {
        $user = $this->makeDataUser('direction');
        $this->actingAs($user, 'data_users');

        $response = $this->postJson('/data-mappings/sync-sql');

        $response->assertStatus(403);
        $response->assertJsonFragment(['message' => 'Unauthorized. Superadmin access required.']);
    }

    public function test_normal_user_is_rejected(): void
    {
        $user = $this->makeDataUser('resp_qualite');
        $this->actingAs($user, 'data_users');

        $response = $this->postJson('/data-mappings/sync-sql');

        $response->assertStatus(403);
    }

    public function test_returns_422_when_url_not_configured(): void
    {
        $user = $this->makeDataUser('it');
        $this->actingAs($user, 'data_users');

        config(['services.sql_dump_url' => '']);

        $response = $this->postJson('/data-mappings/sync-sql');

        $response->assertStatus(422);
        $response->assertJsonFragment(['message' => 'SQL_DUMP_URL is not configured in .env']);
    }

    public function test_returns_502_when_external_api_fails(): void
    {
        $user = $this->makeDataUser('it');
        $this->actingAs($user, 'data_users');

        Http::fake([
            'http://external-api.test/sql' => Http::response('Server Error', 500),
        ]);

        config(['services.sql_dump_url' => 'http://external-api.test/sql']);

        $response = $this->postJson('/data-mappings/sync-sql');

        $response->assertStatus(502);
        $response->assertJsonFragment(['message' => 'Failed to fetch SQL from external API']);
    }

    public function test_returns_422_when_sql_is_empty(): void
    {
        $user = $this->makeDataUser('it');
        $this->actingAs($user, 'data_users');

        Http::fake([
            'http://external-api.test/sql' => Http::response('', 200),
        ]);

        config(['services.sql_dump_url' => 'http://external-api.test/sql']);

        $response = $this->postJson('/data-mappings/sync-sql');

        $response->assertStatus(422);
        $response->assertJsonFragment(['message' => 'Received empty SQL content']);
    }

    public function test_executes_sql_and_runs_artisan_commands(): void
    {
        $user = $this->makeDataUser('it');
        $this->actingAs($user, 'data_users');

        DataMapping::create(['kpi' => 'F-REQ-001', 'name' => 'Old Name', 'variable' => 'v1']);

        $sql = "UPDATE `data_mappings` SET `name` = 'New Name' WHERE `kpi` = 'F-REQ-001' AND `variable` = 'v1';";

        Http::fake([
            'http://external-api.test/sql' => Http::response($sql, 200),
        ]);

        config(['services.sql_dump_url' => 'http://external-api.test/sql']);

        $response = $this->postJson('/data-mappings/sync-sql');

        $response->assertOk();

        $this->assertDatabaseHas('data_mappings', [
            'kpi' => 'F-REQ-001',
            'name' => 'New Name',
        ]);
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $response = $this->postJson('/data-mappings/sync-sql');

        $response->assertStatus(401);
    }
}
