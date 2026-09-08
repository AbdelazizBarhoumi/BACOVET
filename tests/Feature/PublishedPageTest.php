<?php

namespace Tests\Feature;

use App\Models\BuilderPage;
use App\Models\BuilderPageAccess;
use App\Models\BuilderPagePlacement;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PublishedPageTest extends TestCase
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

    private function makePage(User $owner, bool $published = false): BuilderPage
    {
        $page = BuilderPage::create([
            'slug' => 'page-'.uniqid(),
            'name' => 'Page',
            'layout' => null,
            'group_id' => null,
            'sort_order' => 0,
            'owner_user_id' => $owner->id,
            'published' => $published,
        ]);

        BuilderPagePlacement::create([
            'user_id' => $owner->id,
            'page_id' => $page->id,
            'group_id' => null,
            'sort_order' => 0,
        ]);

        return $page;
    }

    public function test_a_published_page_is_viewable_publicly_without_auth(): void
    {
        $owner = $this->userWithRole('resp_production');
        $page = $this->makePage($owner, true);

        $this->get('/pub/'.$page->slug)
            ->assertOk()
            ->assertInertia(fn (Assert $assert) => $assert
                ->component('builder/p/[slug]')
                ->where('pageId', $page->id)
                ->where('isPublic', true)
                ->where('published', true)
                ->where('canEdit', false)
                ->where('canManage', false));
    }

    public function test_an_unpublished_page_returns_404_on_the_public_route(): void
    {
        $owner = $this->userWithRole('resp_production');
        $page = $this->makePage($owner, false);

        $this->get('/pub/'.$page->slug)->assertNotFound();
    }

    public function test_a_missing_slug_returns_404_on_the_public_route(): void
    {
        $this->get('/pub/does-not-exist')->assertNotFound();
    }

    public function test_a_guest_on_the_builder_url_of_a_published_page_is_redirected_to_the_public_route(): void
    {
        $owner = $this->userWithRole('resp_production');
        $page = $this->makePage($owner, true);

        $this->get('/p/'.$page->slug)
            ->assertRedirect('/pub/'.$page->slug);
    }

    public function test_a_guest_on_the_builder_url_of_an_unpublished_page_is_redirected_to_login(): void
    {
        $owner = $this->userWithRole('resp_production');
        $page = $this->makePage($owner, false);

        $this->get('/p/'.$page->slug)
            ->assertRedirect(route('login'));
    }

    public function test_an_authenticated_user_with_view_access_still_gets_the_builder_view(): void
    {
        $owner = $this->userWithRole('resp_production');
        $page = $this->makePage($owner, true);

        $this->actingAs($owner)
            ->get('/p/'.$page->slug)
            ->assertOk()
            ->assertInertia(fn (Assert $assert) => $assert
                ->component('builder/p/[slug]')
                ->where('pageId', $page->id)
                ->where('isPublic', false)
                ->where('published', true));
    }

    public function test_a_user_with_edit_access_can_publish_and_depublish(): void
    {
        $owner = $this->userWithRole('resp_production');
        $editor = $this->userWithRole('chef_atelier');
        $page = $this->makePage($owner, false);

        BuilderPageAccess::create([
            'page_id' => $page->id,
            'user_id' => $editor->id,
            'mode' => 'edit',
        ]);

        $this->actingAs($editor)
            ->putJson("/api/builder-pages/{$page->id}", ['published' => true])
            ->assertOk();

        $this->assertDatabaseHas('builder_pages', ['id' => $page->id, 'published' => 1]);

        $this->actingAs($editor)
            ->putJson("/api/builder-pages/{$page->id}", ['published' => false])
            ->assertOk();

        $this->assertDatabaseHas('builder_pages', ['id' => $page->id, 'published' => 0]);
    }

    public function test_a_view_only_user_cannot_publish(): void
    {
        $owner = $this->userWithRole('resp_production');
        $viewer = $this->userWithRole('resp_qualite');
        $page = $this->makePage($owner, false);

        BuilderPageAccess::create([
            'page_id' => $page->id,
            'user_id' => $viewer->id,
            'mode' => 'view',
        ]);

        $this->actingAs($viewer)
            ->putJson("/api/builder-pages/{$page->id}", ['published' => true])
            ->assertForbidden();

        $this->assertDatabaseHas('builder_pages', ['id' => $page->id, 'published' => 0]);
    }

    public function test_index_exposes_the_published_flag(): void
    {
        $owner = $this->userWithRole('resp_production');
        $this->makePage($owner, true);
        $this->makePage($owner, false);

        $response = $this->actingAs($owner)->getJson('/api/builder-pages');

        $response->assertOk();
        $this->assertContains(true, collect($response->json())->pluck('published')->all());
        $this->assertContains(false, collect($response->json())->pluck('published')->all());
    }

    public function test_a_published_pages_image_is_served_without_auth(): void
    {
        Storage::fake('public');

        $owner = $this->userWithRole('resp_production');
        $page = $this->makePage($owner, true);

        $path = 'builder-images/'.$page->id.'/logo.png';
        Storage::disk('public')->put($path, base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
        ));

        $this->get("/api/builder-pages/{$page->id}/images/logo.png")
            ->assertOk()
            ->assertHeader('content-type', 'image/png');
    }

    public function test_an_unpublished_pages_image_is_not_public(): void
    {
        Storage::fake('public');

        $owner = $this->userWithRole('resp_production');
        $page = $this->makePage($owner, false);

        $path = 'builder-images/'.$page->id.'/logo.png';
        Storage::disk('public')->put($path, 'not-an-image');

        $this->get("/api/builder-pages/{$page->id}/images/logo.png")
            ->assertForbidden();
    }

    public function test_uploaded_image_url_hits_the_public_route(): void
    {
        Storage::fake('public');

        $owner = $this->userWithRole('resp_production');
        $page = $this->makePage($owner, true);

        $response = $this->actingAs($owner)
            ->post("/api/builder-pages/{$page->id}/images", [
                'image' => UploadedFile::fake()->create('logo.png', 10, 'image/png'),
            ])
            ->assertOk()
            ->assertJsonStructure(['url']);

        $url = $response->json('url');
        $this->assertMatchesRegularExpression(
            "#^(https?://[^/]+)?/api/builder-pages/{$page->id}/images/[a-zA-Z0-9_-]+\.png$#",
            $url,
        );
    }
}
