<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class MaintenanceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'maintenance.enabled' => true,
            'maintenance.token' => 'test-maintenance-token',
        ]);
    }

    private function userWithRole(string $slug): User
    {
        $role = Role::updateOrCreate(
            ['slug' => $slug],
            ['name' => ucfirst($slug), 'slug' => $slug],
        );

        return User::factory()->create([
            'role_id' => $role->id,
            'is_active' => true,
        ]);
    }

    public function test_page_renders_for_it_role(): void
    {
        $this->actingAs($this->userWithRole('it'))
            ->get('/maintenance')
            ->assertOk();
    }

    public function test_page_denies_non_it_roles(): void
    {
        $this->actingAs($this->userWithRole('direction'))
            ->get('/maintenance')
            ->assertForbidden();
    }

    public function test_commands_endpoint_returns_allowlist_for_it_role(): void
    {
        $response = $this->actingAs($this->userWithRole('it'))
            ->getJson('/admin/maintenance/commands');

        $response->assertOk();
        $response->assertJsonStructure(['commands' => [
            '*' => ['id', 'label', 'signature', 'category', 'description', 'confirm'],
        ]]);
        $this->assertNotEmpty($response->json('commands'));
    }

    public function test_run_requires_a_token(): void
    {
        $this->actingAs($this->userWithRole('it'))
            ->postJson('/admin/maintenance/run', ['command' => 'cache:clear'])
            ->assertUnprocessable();
    }

    public function test_run_rejects_invalid_token(): void
    {
        $this->actingAs($this->userWithRole('it'))
            ->postJson('/admin/maintenance/run', [
                'command' => 'cache:clear',
                'token' => 'wrong-token',
            ])
            ->assertForbidden();
    }

    public function test_run_rejects_unknown_command(): void
    {
        $this->actingAs($this->userWithRole('it'))
            ->postJson('/admin/maintenance/run', [
                'command' => 'rm -rf /',
                'token' => 'test-maintenance-token',
            ])
            ->assertUnprocessable();
    }

    public function test_run_executes_a_real_command_with_valid_token(): void
    {
        $user = $this->userWithRole('it');

        $response = $this->actingAs($user)
            ->postJson('/admin/maintenance/run', [
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
        $this->userWithRole('it');

        $artisan = Artisan::partialMock();
        $artisan->shouldReceive('call')->with('migrate', ['--force' => true])->andReturn(0);
        $artisan->shouldReceive('output')->andReturn('Migration complete.');

        $this->actingAs($this->userWithRole('it'))
            ->postJson('/admin/maintenance/run', [
                'command' => 'migrate',
                'token' => 'test-maintenance-token',
            ])
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('exit_code', 0);
    }

    public function test_run_reports_non_zero_exit_code(): void
    {
        $this->userWithRole('it');

        $artisan = Artisan::partialMock();
        $artisan->shouldReceive('call')->with('sync:endpoint-data', [])->andReturn(1);
        $artisan->shouldReceive('output')->andReturn('Something went wrong');

        $this->actingAs($this->userWithRole('it'))
            ->postJson('/admin/maintenance/run', [
                'command' => 'sync:endpoint-data',
                'token' => 'test-maintenance-token',
            ])
            ->assertOk()
            ->assertJsonPath('success', false)
            ->assertJsonPath('exit_code', 1)
            ->assertJsonPath('error', 'Something went wrong');
    }

    public function test_panel_is_fail_closed_when_disabled(): void
    {
        config(['maintenance.enabled' => false]);

        $this->actingAs($this->userWithRole('it'))
            ->getJson('/admin/maintenance/commands')
            ->assertForbidden();

        $this->actingAs($this->userWithRole('it'))
            ->postJson('/admin/maintenance/run', [
                'command' => 'cache:clear',
                'token' => 'test-maintenance-token',
            ])
            ->assertForbidden();
    }
}
