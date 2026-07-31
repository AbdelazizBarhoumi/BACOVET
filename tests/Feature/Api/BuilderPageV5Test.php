<?php

namespace Tests\Feature\Api;

use App\Models\BuilderPageV5;
use App\Models\V5User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BuilderPageV5Test extends TestCase
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

        $this->getJson('/api/v5/builder-pages')->assertStatus(401);
    }

    public function test_index_lists_pages(): void
    {
        BuilderPageV5::factory()->create(['name' => 'Page A']);
        BuilderPageV5::factory()->create(['name' => 'Page B']);

        $response = $this->getJson('/api/v5/builder-pages');

        $response->assertStatus(200);
        $this->assertCount(2, $response->json());
    }

    public function test_store_creates_page_and_logs_activity(): void
    {
        $response = $this->postJson('/api/v5/builder-pages', ['name' => 'Nouvelle page']);

        $response->assertStatus(201);
        $this->assertEquals('Nouvelle page', $response['page']['name']);
        $this->assertDatabaseHas('builder_pages_v5', ['name' => 'Nouvelle page']);
        $this->assertDatabaseHas('builder_activity_logs_v5', [
            'user_id' => $this->user->id,
            'page_slug' => $response['page']['slug'],
            'action' => 'page.create',
        ]);
    }

    public function test_show_returns_page_by_slug(): void
    {
        $page = BuilderPageV5::factory()->create(['slug' => 'ma-page', 'name' => 'Ma Page']);

        $response = $this->getJson("/api/v5/builder-pages/{$page->slug}");

        $response->assertStatus(200);
        $this->assertEquals('Ma Page', $response['name']);
    }

    public function test_update_renames_and_saves_layout(): void
    {
        $page = BuilderPageV5::factory()->create(['name' => 'Old']);

        $response = $this->putJson("/api/v5/builder-pages/{$page->id}", [
            'name' => 'Renamed',
            'layout' => ['version' => 1, 'widgets' => []],
        ]);

        $response->assertStatus(200);
        $this->assertEquals('Renamed', $response['page']['name']);
        $this->assertDatabaseHas('builder_pages_v5', ['id' => $page->id, 'name' => 'Renamed']);
        $this->assertDatabaseHas('builder_activity_logs_v5', ['action' => 'layout.save']);
    }

    public function test_destroy_deletes_page(): void
    {
        $page = BuilderPageV5::factory()->create();

        $response = $this->deleteJson("/api/v5/builder-pages/{$page->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('builder_pages_v5', ['id' => $page->id]);
        $this->assertDatabaseHas('builder_activity_logs_v5', ['action' => 'page.delete']);
    }

    public function test_duplicate_copies_page(): void
    {
        $page = BuilderPageV5::factory()->create(['name' => 'Source', 'layout' => ['version' => 1, 'widgets' => []]]);

        $response = $this->postJson("/api/v5/builder-pages/{$page->id}/duplicate");

        $response->assertStatus(201);
        $this->assertEquals('Source (copie)', $response['page']['name']);
        $this->assertDatabaseHas('builder_pages_v5', ['name' => 'Source (copie)']);
    }
}
