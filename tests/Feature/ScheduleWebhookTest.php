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
        Process::fake([
            '* --version' => Process::result("PHP 8.2.99 (cli) (built: test suite)\nCopyright (c) The PHP Group"),
            '*' => Process::result(''),
        ]);

        $this->getJson('/schedule/run?token=test-token')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('queued', true);

        Process::assertRan(fn (PendingProcess $process) => str_contains((string) $process->command ?? '', 'schedule:run'));

        $this->assertDatabaseHas('audit_logs', [
            'action_type' => 'SYSTEM',
        ]);
    }

    public function test_webhook_falls_back_to_synchronous_run_when_no_shell_exists(): void
    {
        $dataFile = storage_path('framework/testing/schedule-webhook-data.json');

        @mkdir(dirname($dataFile), 0755, true);

        config([
            'novacity.data_file' => 'framework/testing/schedule-webhook-data.json',
            'novacity.base_url' => 'https://api.primary.test',
        ]);

        app(\App\Services\EndpointDatasetRegistry::class)->forgetCache();

        file_put_contents($dataFile, json_encode([[
            'id' => 'ep-1',
            'name' => 'a',
            'method' => 'GET',
            'endpoint' => 'https://api.primary.test/api/data/a',
            'status' => 200,
            'response' => ['success' => true, 'data' => []],
        ]], JSON_PRETTY_PRINT));

        // Every subprocess fails: no PHP CLI is discoverable on this host
        // (jailed php-fpm). The webhook must sync in-request instead.
        Process::fake(['*' => Process::result('', '', 1)]);

        \Illuminate\Support\Facades\Http::fake([
            'https://api.primary.test/*' => \Illuminate\Support\Facades\Http::response(
                ['success' => true, 'data' => [['a' => 1]]],
                200,
            ),
        ]);

        $this->getJson('/schedule/run?token=test-token')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('mode', 'sync')
            ->assertJsonPath('exit_code', 0);

        $this->assertDatabaseHas('endpoint_datasets', [
            'slug' => 'api/data/a',
            'last_status' => 'ok',
        ]);

        @unlink($dataFile);
    }

    public function test_webhook_is_disabled_when_config_off(): void
    {
        config(['schedule.enabled' => false]);

        $this->getJson('/schedule/run?token=test-token')
            ->assertStatus(403)
            ->assertJsonPath('message', 'Planificateur webhook désactivé.');
    }
}
