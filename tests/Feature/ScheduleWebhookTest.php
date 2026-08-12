<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Process\PendingProcess;
use Illuminate\Support\Facades\Process;
use Tests\TestCase;

class ScheduleWebhookTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'schedule.enabled' => true,
            'schedule.token' => 'test-token',
        ]);
    }

    public function test_webhook_requires_valid_token(): void
    {
        $this->getJson('/schedule/run?token=wrong')
            ->assertStatus(403)
            ->assertJsonPath('message', 'Token du planificateur invalide.');
    }

    public function test_webhook_is_fire_and_forget(): void
    {
        Process::fake();

        $this->getJson('/schedule/run?token=test-token')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('queued', true);

        Process::assertRan(fn (PendingProcess $process) => str_contains((string) $process->command ?? '', 'schedule:run'));

        $this->assertDatabaseHas('audit_logs', [
            'action_type' => 'SYSTEM',
        ]);
    }

    public function test_webhook_is_disabled_when_config_off(): void
    {
        config(['schedule.enabled' => false]);

        $this->getJson('/schedule/run?token=test-token')
            ->assertStatus(403)
            ->assertJsonPath('message', 'Planificateur webhook désactivé.');
    }
}
