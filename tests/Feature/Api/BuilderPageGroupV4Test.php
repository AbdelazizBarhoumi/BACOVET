<?php

namespace Tests\Feature\Api;

use App\Models\BuilderPageGroupV4;
use App\Models\BuilderPageV4;
use App\Models\V4User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BuilderPageGroupV4Test extends TestCase
{
    use RefreshDatabase;

    protected V4User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = V4User::create([
            'email' => 'group@test.com',
            'name' => 'Groups',
            'role' => 'it',
            'password' => '',
            'has_password' => false,
        ]);
        $this->actingAs($this->user, 'v4_users');
    }

    public function test_index_returns_groups_and_ungrouped(): void
    {
        $group = BuilderPageGroupV4::factory()->create(['name' => 'TestGroup']);
        $page = BuilderPageV4::factory()->create(['name' => 'PageInGroup', 'group_id' => $group->id]);
        $ungrouped = BuilderPageV4::factory()->create(['name' => 'Ungrouped', 'group_id' => null]);

        $response = $this->getJson('/api/v4/builder-page-groups');

        $response->assertStatus(200);
        $this->assertCount(1, $response['groups']);
        $this->assertEquals('TestGroup', $response['groups'][0]['name']);
        $this->assertCount(1, $response['groups'][0]['pages']);
        $this->assertEquals('PageInGroup', $response['groups'][0]['pages'][0]['name']);
        $this->assertCount(1, $response['ungrouped']);
        $this->assertEquals('Ungrouped', $response['ungrouped'][0]['name']);
    }

    public function test_store_creates_group(): void
    {
        $response = $this->postJson('/api/v4/builder-page-groups', ['name' => 'New Group']);

        $response->assertStatus(201);
        $this->assertEquals('New Group', $response['group']['name']);
        $this->assertDatabaseHas('builder_page_groups_v4', ['name' => 'New Group']);
    }

    public function test_update_renames_group(): void
    {
        $group = BuilderPageGroupV4::factory()->create(['name' => 'Old']);

        $response = $this->putJson("/api/v4/builder-page-groups/{$group->id}", ['name' => 'Renamed']);

        $response->assertStatus(200);
        $this->assertEquals('Renamed', $response['group']['name']);
    }

    public function test_destroy_moves_pages_to_ungrouped(): void
    {
        $group = BuilderPageGroupV4::factory()->create();
        $page = BuilderPageV4::factory()->create(['group_id' => $group->id]);

        $response = $this->deleteJson("/api/v4/builder-page-groups/{$group->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('builder_page_groups_v4', ['id' => $group->id]);
        $this->assertDatabaseHas('builder_pages_v4', ['id' => $page->id, 'group_id' => null]);
    }

    public function test_assign_page_to_group(): void
    {
        $group = BuilderPageGroupV4::factory()->create();
        $page = BuilderPageV4::factory()->create(['group_id' => null]);

        $response = $this->putJson('/api/v4/builder-page-groups/assign-page', [
            'page_id' => $page->id,
            'group_id' => $group->id,
        ]);

        $response->assertStatus(200);
        $this->assertEquals($group->id, $response['page']['group_id']);
    }

    public function test_reorder_pages(): void
    {
        $page1 = BuilderPageV4::factory()->create(['sort_order' => 1]);
        $page2 = BuilderPageV4::factory()->create(['sort_order' => 2]);

        $response = $this->putJson('/api/v4/builder-page-groups/reorder-pages', [
            'pages' => [
                ['id' => $page1->id, 'sort_order' => 2],
                ['id' => $page2->id, 'sort_order' => 1],
            ],
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('builder_pages_v4', ['id' => $page1->id, 'sort_order' => 2]);
        $this->assertDatabaseHas('builder_pages_v4', ['id' => $page2->id, 'sort_order' => 1]);
    }

    public function test_reorder_groups(): void
    {
        $group1 = BuilderPageGroupV4::factory()->create(['sort_order' => 1]);
        $group2 = BuilderPageGroupV4::factory()->create(['sort_order' => 2]);

        $response = $this->putJson('/api/v4/builder-page-groups/reorder-groups', [
            'groups' => [
                ['id' => $group1->id, 'sort_order' => 2],
                ['id' => $group2->id, 'sort_order' => 1],
            ],
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('builder_page_groups_v4', ['id' => $group1->id, 'sort_order' => 2]);
        $this->assertDatabaseHas('builder_page_groups_v4', ['id' => $group2->id, 'sort_order' => 1]);
    }
}
