<?php

namespace Tests\Feature\Api;

use App\Models\AuditLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class ScheduleRunTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'schedule.enabled' => true,
            'schedule.token' => 'test-schedule-token',
        ]);
    }

    public function test_run_requires_a_token(): void
    {
        $this->getJson('/schedule/run')->assertForbidden();
    }

    public function test_run_rejects_invalid_token(): void
    {
        $this->getJson('/schedule/run?token=wrong-token')->assertForbidden();

        $this->getJson('/schedule/run', [
            'X-Schedule-Token' => 'wrong-token',
        ])->assertForbidden();
    }

    public function test_run_is_fail_closed_when_token_is_empty(): void
    {
        config(['schedule.token' => '']);

        $this->getJson('/schedule/run?token=test-schedule-token')->assertForbidden();
    }

    public function test_run_is_disabled_when_webhook_turned_off(): void
    {
        config(['schedule.enabled' => false]);

        $this->getJson('/schedule/run?token=test-schedule-token')->assertForbidden();
    }

    public function test_run_executes_schedule_via_query_token(): void
    {
        $artisan = Artisan::partialMock();
        $artisan->shouldReceive('call')->with('schedule:run', [])->andReturn(0);
        $artisan->shouldReceive('output')->andReturn('Running [sync:quality]...');

        $response = $this->getJson('/schedule/run?token=test-schedule-token');

        $response->assertOk();
        $response->assertJsonPath('success', true);
        $response->assertJsonPath('command', 'schedule:run');
        $response->assertJsonPath('exit_code', 0);
        $response->assertJsonPath('error', null);
        $this->assertStringContainsString('sync:quality', $response->json('output'));
    }

    public function test_run_executes_schedule_via_header_token(): void
    {
        $artisan = Artisan::partialMock();
        $artisan->shouldReceive('call')->with('schedule:run', [])->andReturn(0);
        $artisan->shouldReceive('output')->andReturn('No scheduled commands are ready to run.');

        $response = $this->getJson('/schedule/run', [
            'X-Schedule-Token' => 'test-schedule-token',
        ]);

        $response->assertOk();
        $response->assertJsonPath('success', true);
    }

    public function test_run_reports_non_zero_exit_code(): void
    {
        $artisan = Artisan::partialMock();
        $artisan->shouldReceive('call')->with('schedule:run', [])->andReturn(1);
        $artisan->shouldReceive('output')->andReturn('Something went wrong');

        $response = $this->getJson('/schedule/run?token=test-schedule-token');

        $response->assertOk();
        $response->assertJsonPath('success', false);
        $response->assertJsonPath('exit_code', 1);
        $response->assertJsonPath('error', 'Something went wrong');
    }

    public function test_run_handles_exceptions_gracefully(): void
    {
        $artisan = Artisan::partialMock();
        $artisan->shouldReceive('call')->with('schedule:run', [])
            ->andThrow(new \RuntimeException('Schedule failed'));

        $response = $this->getJson('/schedule/run?token=test-schedule-token');

        $response->assertOk();
        $response->assertJsonPath('success', false);
        $response->assertJsonPath('exit_code', 1);
        $response->assertJsonPath('error', 'Schedule failed');

        $this->assertTrue(
            AuditLog::where('message', 'like', '%Planificateur en échec (exception)%')->exists()
        );
    }

    public function test_run_writes_audit_log(): void
    {
        $artisan = Artisan::partialMock();
        $artisan->shouldReceive('call')->with('schedule:run', [])->andReturn(0);
        $artisan->shouldReceive('output')->andReturn('Running [sync:quality]...');

        $this->getJson('/schedule/run?token=test-schedule-token')->assertOk();

        $this->assertTrue(
            AuditLog::where('message', 'like', '%Planificateur exécuté via webhook%')->exists()
        );
        $this->assertTrue(
            AuditLog::where('action_type', 'SYSTEM')->whereNull('user_id')->exists()
        );
    }
}
