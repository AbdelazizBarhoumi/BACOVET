<?php

namespace Tests\Feature\Api;

use App\Models\BuilderPageV4;
use App\Models\V4User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BuilderPageV4Test extends TestCase
{
    use RefreshDatabase;

    protected V4User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = V4User::create([
            'email' => 'builder@test.com',
            'name' => 'Builder',
            'role' => 'it',
            'password' => '',
            'has_password' => false,
        ]);
        $this->actingAs($this->user, 'v4_users');
    }

    public function test_unauthenticated_returns_401(): void
    {
        $this->app['auth']->guard('v4_users')->logout();

        $this->getJson('/api/v4/builder-pages')->assertStatus(401);
    }

    public function test_index_lists_pages(): void
    {
        BuilderPageV4::factory()->create(['name' => 'Page A']);
        BuilderPageV4::factory()->create(['name' => 'Page B']);

        $response = $this->getJson('/api/v4/builder-pages');

        $response->assertStatus(200);
        $this->assertCount(2, $response->json());
    }

    public function test_store_creates_page(): void
    {
        $response = $this->postJson('/api/v4/builder-pages', ['name' => 'Nouvelle page']);

        $response->assertStatus(201);
        $this->assertEquals('Nouvelle page', $response['page']['name']);
        $this->assertDatabaseHas('builder_pages_v4', ['name' => 'Nouvelle page']);
    }

    public function test_show_returns_page_by_slug(): void
    {
        $page = BuilderPageV4::factory()->create(['slug' => 'ma-page', 'name' => 'Ma Page']);

        $response = $this->getJson("/api/v4/builder-pages/{$page->slug}");

        $response->assertStatus(200);
        $this->assertEquals('Ma Page', $response['name']);
    }

    public function test_update_renames_and_saves_layout(): void
    {
        $page = BuilderPageV4::factory()->create(['name' => 'Old']);

        $response = $this->putJson("/api/v4/builder-pages/{$page->id}", [
            'name' => 'Renamed',
            'layout' => ['version' => 1, 'widgets' => []],
        ]);

        $response->assertStatus(200);
        $this->assertEquals('Renamed', $response['page']['name']);
        $this->assertDatabaseHas('builder_pages_v4', ['id' => $page->id, 'name' => 'Renamed']);
    }

    public function test_destroy_deletes_page(): void
    {
        $page = BuilderPageV4::factory()->create();

        $response = $this->deleteJson("/api/v4/builder-pages/{$page->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('builder_pages_v4', ['id' => $page->id]);
    }

    public function test_duplicate_copies_page(): void
    {
        $page = BuilderPageV4::factory()->create(['name' => 'Source', 'layout' => ['version' => 1, 'widgets' => []]]);

        $response = $this->postJson("/api/v4/builder-pages/{$page->id}/duplicate");

        $response->assertStatus(201);
        $this->assertEquals('Source (copie)', $response['page']['name']);
        $this->assertDatabaseHas('builder_pages_v4', ['name' => 'Source (copie)']);
    }
}
