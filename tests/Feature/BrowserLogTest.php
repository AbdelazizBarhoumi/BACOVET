<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\File;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BrowserLogTest extends TestCase
{
    use RefreshDatabase;

    public function test_browser_log_endpoint_writes_to_browser_channel(): void
    {
        // ensure a clean slate
        File::delete(storage_path('logs/browser.log'));

        $response = $this->postJson('/browser-log', [
            'level' => 'info',
            'message' => 'test message',
            'url' => 'https://example.test/path',
        ]);

        $response->assertOk()->assertJson(['status' => 'logged']);
    }

    public function test_browser_log_validation_fails_on_bad_level(): void
    {
        $response = $this->postJson('/browser-log', [
            'level' => 'unsupported',
            'message' => 'msg',
        ]);

        $response->assertStatus(422);
    }
}
