<?php

namespace Tests\Feature\Api;

use App\Models\BuilderPage;
use App\Models\BuilderPageGroup;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BuilderPageGroupTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_returns_groups_and_ungrouped(): void
    {
        $group = BuilderPageGroup::factory()->create(['name' => 'TestGroup']);
        $page = BuilderPage::factory()->create(['name' => 'PageInGroup', 'group_id' => $group->id]);
        $ungrouped = BuilderPage::factory()->create(['name' => 'Ungrouped', 'group_id' => null]);

        $response = $this->getJson('/api/builder-page-groups');

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
        $response = $this->postJson('/api/builder-page-groups', ['name' => 'New Group']);

        $response->assertStatus(201);
        $this->assertEquals('New Group', $response['group']['name']);
        $this->assertDatabaseHas('builder_page_groups', ['name' => 'New Group']);
    }

    public function test_update_renames_group(): void
    {
        $group = BuilderPageGroup::factory()->create(['name' => 'Old']);

        $response = $this->putJson("/api/builder-page-groups/{$group->id}", ['name' => 'Renamed']);

        $response->assertStatus(200);
        $this->assertEquals('Renamed', $response['group']['name']);
    }

    public function test_destroy_moves_pages_to_ungrouped(): void
    {
        $group = BuilderPageGroup::factory()->create();
        $page = BuilderPage::factory()->create(['group_id' => $group->id]);

        $response = $this->deleteJson("/api/builder-page-groups/{$group->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('builder_page_groups', ['id' => $group->id]);
        $this->assertDatabaseHas('builder_pages', ['id' => $page->id, 'group_id' => null]);
    }

    public function test_assign_page_to_group(): void
    {
        $group = BuilderPageGroup::factory()->create();
        $page = BuilderPage::factory()->create(['group_id' => null]);

        $response = $this->putJson('/api/builder-page-groups/assign-page', [
            'page_id' => $page->id,
            'group_id' => $group->id,
        ]);

        $response->assertStatus(200);
        $this->assertEquals($group->id, $response['page']['group_id']);
    }

    public function test_assign_page_removes_from_group(): void
    {
        $group = BuilderPageGroup::factory()->create();
        $page = BuilderPage::factory()->create(['group_id' => $group->id]);

        $response = $this->putJson('/api/builder-page-groups/assign-page', [
            'page_id' => $page->id,
            'group_id' => null,
        ]);

        $response->assertStatus(200);
        $this->assertNull($response['page']['group_id']);
    }

    public function test_reorder_pages(): void
    {
        $page1 = BuilderPage::factory()->create(['sort_order' => 1]);
        $page2 = BuilderPage::factory()->create(['sort_order' => 2]);

        $response = $this->putJson('/api/builder-page-groups/reorder-pages', [
            'pages' => [
                ['id' => $page1->id, 'sort_order' => 2],
                ['id' => $page2->id, 'sort_order' => 1],
            ],
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('builder_pages', ['id' => $page1->id, 'sort_order' => 2]);
        $this->assertDatabaseHas('builder_pages', ['id' => $page2->id, 'sort_order' => 1]);
    }

    public function test_reorder_groups(): void
    {
        $group1 = BuilderPageGroup::factory()->create(['sort_order' => 1]);
        $group2 = BuilderPageGroup::factory()->create(['sort_order' => 2]);

        $response = $this->putJson('/api/builder-page-groups/reorder-groups', [
            'groups' => [
                ['id' => $group1->id, 'sort_order' => 2],
                ['id' => $group2->id, 'sort_order' => 1],
            ],
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('builder_page_groups', ['id' => $group1->id, 'sort_order' => 2]);
        $this->assertDatabaseHas('builder_page_groups', ['id' => $group2->id, 'sort_order' => 1]);
    }
}
