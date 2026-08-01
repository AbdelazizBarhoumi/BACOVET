<?php

namespace Tests\Feature\Api;

use App\Models\AuditLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;
use Tests\Traits\TestHelpers;

class MaintenanceControllerTest extends TestCase
{
    use RefreshDatabase;
    use TestHelpers;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'maintenance.enabled' => true,
            'maintenance.token' => 'test-maintenance-token',
        ]);
    }

    public function test_commands_endpoint_returns_allowlist_for_it_role(): void
    {
        $this->seedRoles();
        $this->actingAsRole('it');

        $response = $this->getJson('/admin/maintenance/commands');

        $response->assertOk();
        $response->assertJsonStructure(['commands' => [
            '*' => ['id', 'label', 'signature', 'category', 'description', 'confirm'],
        ]]);
        $this->assertNotEmpty($response->json('commands'));
    }

    public function test_commands_endpoint_denies_non_it_roles(): void
    {
        $this->seedRoles();
        $this->actingAsRole('direction');

        $this->getJson('/admin/maintenance/commands')->assertForbidden();
    }

    public function test_run_requires_a_token(): void
    {
        $this->seedRoles();
        $this->actingAsRole('it');

        $this->postJson('/admin/maintenance/run', [
            'command' => 'cache:clear',
        ])->assertUnprocessable();
    }

    public function test_run_rejects_invalid_token(): void
    {
        $this->seedRoles();
        $this->actingAsRole('it');

        $this->postJson('/admin/maintenance/run', [
            'command' => 'cache:clear',
            'token' => 'wrong-token',
        ])->assertForbidden();
    }

    public function test_run_rejects_unknown_command(): void
    {
        $this->seedRoles();
        $this->actingAsRole('it');

        $this->postJson('/admin/maintenance/run', [
            'command' => 'rm -rf /',
            'token' => 'test-maintenance-token',
        ])->assertUnprocessable();
    }

    public function test_run_executes_command_and_returns_output(): void
    {
        $this->seedRoles();
        $user = $this->actingAsRole('it');

        $response = $this->postJson('/admin/maintenance/run', [
            'command' => 'cache:clear',
            'token' => 'test-maintenance-token',
        ]);

        $response->assertOk();
        $response->assertJsonPath('success', true);
        $response->assertJsonPath('command', 'cache:clear');
        $response->assertJsonPath('exit_code', 0);
        $response->assertJsonPath('error', null);
        $this->assertNotEmpty($response->json('output'));

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'action_type' => 'SYSTEM',
        ]);
        $this->assertTrue(
            AuditLog::where('message', 'like', '%Commande artisan lancée: Vider le cache%')->exists()
        );
    }

    public function test_run_parses_flags_from_signature(): void
    {
        $this->seedRoles();
        $this->actingAsRole('it');

        $artisan = Artisan::partialMock();
        $artisan->shouldReceive('call')->with('migrate', ['--force' => true])->andReturn(0);
        $artisan->shouldReceive('output')->andReturn('Migration complete.');

        $response = $this->postJson('/admin/maintenance/run', [
            'command' => 'migrate',
            'token' => 'test-maintenance-token',
        ]);

        $response->assertOk();
        $response->assertJsonPath('success', true);
        $response->assertJsonPath('exit_code', 0);
    }

    public function test_run_executes_a_real_command_successfully(): void
    {
        $this->seedRoles();
        $this->actingAsRole('it');

        $response = $this->postJson('/admin/maintenance/run', [
            'command' => 'about',
            'token' => 'test-maintenance-token',
        ]);

        $response->assertOk();
        $response->assertJsonPath('success', true);
        $response->assertJsonPath('exit_code', 0);
    }

    public function test_artisan_accepts_option_prefixed_keys(): void
    {
        $exitCode = Artisan::call('about', ['--only' => 'environment']);

        $this->assertSame(0, $exitCode);
    }

    public function test_run_reports_non_zero_exit_code(): void    {
        $this->seedRoles();
        $this->actingAsRole('it');

        $artisan = Artisan::partialMock();
        $artisan->shouldReceive('call')->with('sync:quality', [])->andReturn(1);
        $artisan->shouldReceive('output')->andReturn('Something went wrong');

        $response = $this->postJson('/admin/maintenance/run', [
            'command' => 'sync:quality',
            'token' => 'test-maintenance-token',
        ]);

        $response->assertOk();
        $response->assertJsonPath('success', false);
        $response->assertJsonPath('exit_code', 1);
        $response->assertJsonPath('error', 'Something went wrong');
    }

    public function test_run_handles_exceptions_gracefully(): void
    {
        $this->seedRoles();
        $this->actingAsRole('it');

        $artisan = Artisan::partialMock();
        $artisan->shouldReceive('call')->with('sync:drive', [])
            ->andThrow(new \RuntimeException('Drive API unreachable'));

        $response = $this->postJson('/admin/maintenance/run', [
            'command' => 'sync:drive',
            'token' => 'test-maintenance-token',
        ]);

        $response->assertOk();
        $response->assertJsonPath('success', false);
        $response->assertJsonPath('exit_code', 1);
        $response->assertJsonPath('error', 'Drive API unreachable');

        $this->assertTrue(
            AuditLog::where('message', 'like', '%Commande artisan en échec (exception)%')->exists()
        );
    }

    public function test_panel_page_is_accessible_for_it_role(): void
    {
        $this->seedRoles();
        $this->actingAsRole('it');

        $this->get('/maintenance')->assertOk();
    }

    public function test_panel_page_denies_non_it_roles(): void
    {
        $this->seedRoles();
        $this->actingAsRole('direction');

        $this->get('/maintenance')->assertForbidden();
    }

    public function test_panel_is_fail_closed_when_disabled(): void
    {
        config(['maintenance.enabled' => false]);

        $this->seedRoles();
        $this->actingAsRole('it');

        $this->getJson('/admin/maintenance/commands')->assertForbidden();

        $this->postJson('/admin/maintenance/run', [
            'command' => 'cache:clear',
            'token' => 'test-maintenance-token',
        ])->assertForbidden();
    }
}
