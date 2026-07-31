<?php

namespace Tests\Feature\Api;

use App\Models\BuilderActivityLogV5;
use App\Models\BuilderPageV5;
use App\Models\V5User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BuilderActivityV5Test extends TestCase
{
    use RefreshDatabase;

    protected V5User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = V5User::create([
            'email' => 'activity@test.com',
            'name' => 'Activity',
            'role' => 'it',
            'password' => '',
            'has_password' => false,
        ]);
        $this->actingAs($this->user, 'v5_users');
    }

    public function test_unauthenticated_returns_401(): void
    {
        $this->app['auth']->guard('v5_users')->logout();

        $this->postJson('/api/v5-activity', ['action' => 'page.view'])->assertStatus(401);
    }

    public function test_store_captures_event_with_server_stamped_identity(): void
    {
        $page = BuilderPageV5::factory()->create(['name' => 'P']);

        $response = $this->postJson('/api/v5-activity', [
            'action' => 'widget.config',
            'page_id' => $page->id,
            'page_slug' => $page->slug,
            'page_name' => $page->name,
            'widget_id' => 'abc123',
            'widget_type' => 'kpi',
            'kpi_code' => 'KPI_1',
            'detail' => ['keys' => ['label']],
        ]);

        $response->assertStatus(200)->assertJson(['ok' => true]);

        $this->assertDatabaseHas('builder_activity_logs_v5', [
            'user_id' => $this->user->id,
            'page_id' => $page->id,
            'action' => 'widget.config',
            'widget_type' => 'kpi',
            'kpi_code' => 'KPI_1',
        ]);

        $log = BuilderActivityLogV5::first();
        $this->assertEquals(['keys' => ['label']], $log->detail);
        $this->assertNotNull($log->created_at);
    }

    public function test_index_filters_and_paginates(): void
    {
        BuilderActivityLogV5::create([
            'user_id' => $this->user->id,
            'action' => 'page.create',
            'page_slug' => 'page-a',
            'ip_address' => '127.0.0.1',
            'created_at' => now(),
        ]);
        BuilderActivityLogV5::create([
            'user_id' => $this->user->id,
            'action' => 'page.view',
            'page_slug' => 'page-b',
            'ip_address' => '127.0.0.1',
            'created_at' => now(),
        ]);

        $response = $this->getJson('/api/v5-activity?action=page.view');

        $response->assertStatus(200);
        $this->assertEquals(1, $response['total']);
        $this->assertEquals('page.view', $response['data'][0]['action']);
    }
}
