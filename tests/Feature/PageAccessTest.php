<?php

namespace Tests\Feature;

use App\Models\BuilderPage;
use App\Models\BuilderPageAccess;
use App\Models\BuilderPageGroup;
use App\Models\BuilderPagePlacement;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class PageAccessTest extends TestCase
{
    use RefreshDatabase;

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

    private function makePage(User $owner, ?int $groupId = null, string $name = 'Page'): BuilderPage
    {
        $page = BuilderPage::create([
            'slug' => Str::slug($name).'-'.uniqid(),
            'name' => $name,
            'layout' => null,
            'group_id' => $groupId,
            'sort_order' => 0,
            'owner_user_id' => $owner->id,
        ]);

        BuilderPagePlacement::create([
            'user_id' => $owner->id,
            'page_id' => $page->id,
            'group_id' => $groupId,
            'sort_order' => 0,
        ]);

        return $page;
    }

    private function makeGroup(User $owner, string $name = 'Groupe'): BuilderPageGroup
    {
        return BuilderPageGroup::create([
            'name' => $name,
            'slug' => Str::slug($name).'-'.uniqid(),
            'sort_order' => 0,
            'owner_user_id' => $owner->id,
        ]);
    }

    private function share(BuilderPage $page, User $user, string $mode): void
    {
        BuilderPageAccess::create([
            'page_id' => $page->id,
            'user_id' => $user->id,
            'mode' => $mode,
        ]);
    }

    public function test_a_shared_page_shows_ungrouped_until_the_viewer_pins_it_into_one_of_their_groups(): void
    {
        $owner = $this->userWithRole('resp_production');
        $viewer = $this->userWithRole('resp_qualite');
        $viewerGroup = $this->makeGroup($viewer, 'Vue perso');
        $page = $this->makePage($owner, null, 'Tableau de bord');
        $this->share($page, $viewer, 'view');

        $response = $this->actingAs($viewer)->getJson('/api/builder-page-groups');
        $response->assertOk();
        $this->assertContains($page->id, collect($response->json('ungrouped'))->pluck('id')->all());
        $this->assertEmpty(
            collect($response->json('groups'))->firstWhere('id', $viewerGroup->id)['pages']
        );

        $this->actingAs($viewer)
            ->putJson('/api/builder-page-groups/assign-page', [
                'page_id' => $page->id,
                'group_id' => $viewerGroup->id,
            ])
            ->assertOk();

        $response = $this->actingAs($viewer)->getJson('/api/builder-page-groups');
        $response->assertOk();
        $this->assertNotContains($page->id, collect($response->json('ungrouped'))->pluck('id')->all());
        $grouped = collect($response->json('groups'))->firstWhere('id', $viewerGroup->id);
        $this->assertNotNull($grouped);
        $this->assertContains($page->id, collect($grouped['pages'])->pluck('id')->all());

        // The owner's own organisation is untouched.
        $ownerView = $this->actingAs($owner)->getJson('/api/builder-page-groups');
        $this->assertContains($page->id, collect($ownerView->json('ungrouped'))->pluck('id')->all());
    }

    public function test_reordering_pages_in_the_sidebar_is_per_user(): void
    {
        $uA = $this->userWithRole('resp_production');
        $uB = $this->userWithRole('resp_qualite');
        $pA = $this->makePage($uA);
        $pB = $this->makePage($uB);
        $this->share($pA, $uB, 'view');
        $this->share($pB, $uA, 'view');

        $this->actingAs($uA)
            ->putJson('/api/builder-page-groups/reorder-pages', [
                'pages' => [
                    ['id' => $pA->id, 'sort_order' => 0],
                    ['id' => $pB->id, 'sort_order' => 1],
                ],
            ])
            ->assertOk();

        $this->actingAs($uB)
            ->putJson('/api/builder-page-groups/reorder-pages', [
                'pages' => [
                    ['id' => $pB->id, 'sort_order' => 0],
                    ['id' => $pA->id, 'sort_order' => 1],
                ],
            ])
            ->assertOk();
        $viewA = $this->actingAs($uA)->getJson('/api/builder-page-groups');
        $this->assertSame([$pA->id, $pB->id], collect($viewA->json('ungrouped'))->pluck('id')->values()->all());

        $viewB = $this->actingAs($uB)->getJson('/api/builder-page-groups');
        $this->assertSame([$pB->id, $pA->id], collect($viewB->json('ungrouped'))->pluck('id')->values()->all());
    }

    public function test_shared_editor_and_viewer_can_duplicate_a_page(): void
    {
        $owner = $this->userWithRole('resp_production');
        $editor = $this->userWithRole('chef_atelier');
        $viewer = $this->userWithRole('resp_qualite');
        $page = $this->makePage($owner, null, 'page source');
        $this->share($page, $editor, 'edit');
        $this->share($page, $viewer, 'view');

        $this->actingAs($editor)->postJson("/api/builder-pages/{$page->id}/duplicate")
            ->assertCreated()
            ->assertJsonPath('page.owner_user_id', $editor->id);

        $this->actingAs($viewer)->postJson("/api/builder-pages/{$page->id}/duplicate")
            ->assertCreated()
            ->assertJsonPath('page.owner_user_id', $viewer->id);
    }

    public function test_only_the_owner_or_an_admin_can_delete_a_page(): void
    {
        $owner = $this->userWithRole('resp_production');
        $editor = $this->userWithRole('chef_atelier');
        $page = $this->makePage($owner);
        $this->share($page, $editor, 'edit');

        $this->actingAs($editor)->deleteJson("/api/builder-pages/{$page->id}")->assertForbidden();
        $this->actingAs($owner)->deleteJson("/api/builder-pages/{$page->id}")->assertOk();

        $this->assertDatabaseMissing('builder_pages', ['id' => $page->id]);
        $this->assertDatabaseMissing('builder_page_access', ['page_id' => $page->id]);
    }

    public function test_an_admin_can_delete_a_page_owned_by_someone_else(): void
    {
        $owner = $this->userWithRole('resp_production');
        $admin = $this->userWithRole('it');
        $page = $this->makePage($owner);

        $this->actingAs($admin)->deleteJson("/api/builder-pages/{$page->id}")->assertOk();
        $this->assertDatabaseMissing('builder_pages', ['id' => $page->id]);
    }

    public function test_group_management_is_scoped_to_the_owner_and_admins(): void
    {
        $uA = $this->userWithRole('resp_production');
        $uB = $this->userWithRole('resp_qualite');
        $group = $this->makeGroup($uA, 'groupe A');

        $this->actingAs($uB)->putJson("/api/builder-page-groups/{$group->id}", ['name' => 'hacké'])->assertForbidden();
        $this->actingAs($uB)->deleteJson("/api/builder-page-groups/{$group->id}")->assertForbidden();

        $this->actingAs($uA)->putJson("/api/builder-page-groups/{$group->id}", ['name' => 'renommé'])->assertOk();
        $this->actingAs($uA)->deleteJson("/api/builder-page-groups/{$group->id}")->assertOk();

        $this->assertDatabaseMissing('builder_page_groups', ['id' => $group->id]);
    }

    public function test_deleting_a_group_keeps_its_pages_ungrouped(): void
    {
        $uA = $this->userWithRole('resp_production');
        $group = $this->makeGroup($uA, 'grouping');
        $page = $this->makePage($uA, $group->id, 'pagina');

        $this->actingAs($uA)->deleteJson("/api/builder-page-groups/{$group->id}")->assertOk();

        $this->assertNull(BuilderPagePlacement::where('page_id', $page->id)->first()->group_id);
    }

    public function test_only_own_groups_are_visible_in_the_sidebar_even_for_admins(): void
    {
        $uA = $this->userWithRole('resp_production');
        $uB = $this->userWithRole('resp_qualite');
        $admin = $this->userWithRole('it');
        $groupA = $this->makeGroup($uA, 'group perso A');
        $page = $this->makePage($uA, $groupA->id, 'page A');

        $viewB = $this->actingAs($uB)->getJson('/api/builder-page-groups');
        $this->assertNotContains($groupA->id, collect($viewB->json('groups'))->pluck('id')->all());

        // The admin sees every page (the page from group A shows up) but only
        // their own groups.
        $viewAdmin = $this->actingAs($admin)->getJson('/api/builder-page-groups');
        $this->assertNotContains($groupA->id, collect($viewAdmin->json('groups'))->pluck('id')->all());
        $this->assertContains($page->id, collect($viewAdmin->json('ungrouped'))->pluck('id')->all());
    }

    public function test_assigning_a_page_to_a_group_requires_view_access_to_that_page(): void
    {
        $owner = $this->userWithRole('resp_production');
        $stranger = $this->userWithRole('resp_qualite');
        $group = $this->makeGroup($stranger, 'mes');
        $page = $this->makePage($owner);

        $this->actingAs($stranger)
            ->putJson('/api/builder-page-groups/assign-page', [
                'page_id' => $page->id,
                'group_id' => $group->id,
            ])
            ->assertForbidden();
    }

    public function test_anyone_can_create_their_own_group(): void
    {
        $user = $this->userWithRole('resp_qualite');

        $response = $this->actingAs($user)
            ->postJson('/api/builder-page-groups', ['name' => 'Mes KPI'])
            ->assertCreated();

        $this->assertSame($user->id, $response->json('group.owner_user_id'));
    }
}
