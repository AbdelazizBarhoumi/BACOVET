<?php

namespace Tests\Feature\Api;

use App\Models\BuilderPageV5;
use App\Models\V5User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class BuilderPageV5ImageUploadTest extends TestCase
{
    use RefreshDatabase;

    protected V5User $user;

    /** Minimal valid 1x1 transparent PNG (no GD extension required). */
    private const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC';

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
        Storage::fake('public');
    }

    private function pngFile(string $name = 'logo.png'): UploadedFile
    {
        return UploadedFile::fake()->createWithContent(
            $name,
            base64_decode(self::PNG)
        );
    }

    public function test_unauthenticated_upload_returns_401(): void
    {
        $this->app['auth']->guard('v5_users')->logout();
        $page = BuilderPageV5::factory()->create();

        $this->postJson("/api/v5/builder-pages/{$page->id}/images", [
            'image' => $this->pngFile(),
        ])->assertStatus(401);
    }

    public function test_upload_stores_image_and_returns_url(): void
    {
        $page = BuilderPageV5::factory()->create();

        $response = $this->postJson("/api/v5/builder-pages/{$page->id}/images", [
            'image' => $this->pngFile(),
        ]);

        $response->assertStatus(200);
        $response->assertJsonStructure(['url']);

        $url = $response->json('url');
        $this->assertStringContainsString("/api/v5/builder-pages/{$page->id}/images/", $url);

        $disk = Storage::disk('public');
        $files = $disk->allFiles('v5-images/'.$page->id);
        $this->assertCount(1, $files);
        $this->assertTrue($disk->exists($files[0]));

        $filename = basename($files[0]);
        $this->getJson("/api/v5/builder-pages/{$page->id}/images/{$filename}")
            ->assertStatus(200);
    }

    public function test_invalid_mime_is_rejected(): void
    {
        $page = BuilderPageV5::factory()->create();

        $this->postJson("/api/v5/builder-pages/{$page->id}/images", [
            'image' => UploadedFile::fake()->createWithContent('notes.txt', 'plain text'),
        ])->assertStatus(422);

        $this->assertEmpty(Storage::disk('public')->allFiles('v5-images/'.$page->id));
    }

    public function test_upload_for_missing_page_returns_404(): void
    {
        $this->postJson('/api/v5/builder-pages/9999/images', [
            'image' => $this->pngFile(),
        ])->assertStatus(404);
    }

    public function test_traversal_filename_is_rejected(): void
    {
        $page = BuilderPageV5::factory()->create();

        $this->getJson("/api/v5/builder-pages/{$page->id}/images/..%2F..%2Fsecret.png")
            ->assertStatus(404);
    }

    public function test_missing_image_file_returns_404(): void
    {
        $page = BuilderPageV5::factory()->create();

        $this->getJson("/api/v5/builder-pages/{$page->id}/images/missing.png")
            ->assertStatus(404);
    }
}
