<?php

namespace Tests\Smoke;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ImageServerSmokeTest extends TestCase
{
    public function test_known_page4_image_serves_200(): void
    {
        $admin = User::where('email', 'superadmin@novationcity.com')->first();

        $this->actingAs($admin)
            ->get('/api/builder-pages/4/images/7V1qPBb1Eacctcb0ifuictIHN5azYYFmOH6taYgs.png')
            ->assertOk()
            ->assertHeader('content-type', 'image/png');
    }

    public function test_every_imported_layout_image_url_serves_200(): void
    {
        $admin = User::where('email', 'superadmin@novationcity.com')->first();
        $this->actingAs($admin);

        $pages = DB::table('builder_pages')->whereNotNull('layout')->get();
        $this->assertNotEmpty($pages);

        $urls = [];
        foreach ($pages as $page) {
            preg_match_all(
                '#api/builder-pages/[0-9]+/images/[a-z0-9_-]+\.(?:png|jpe?g|gif|webp)#i',
                str_replace('\\/', '/', $page->layout),
                $matches
            );
            foreach ($matches[0] as $url) {
                $urls[$url] = true;
            }
        }

        $this->assertNotEmpty($urls);

        foreach (array_keys($urls) as $url) {
            $this->get('/'.$url)->assertOk();
        }
    }

    public function test_measures_and_datasets_endpoints_serve_imported_data(): void
    {
        $admin = User::where('email', 'superadmin@novationcity.com')->first();
        $this->actingAs($admin);

        $measures = $this->getJson('/api/measures')->assertOk()->json('measures');
        $this->assertNotEmpty($measures);
        $this->assertContains('BR GTD', array_column($measures, 'name'));

        $datasets = $this->getJson('/api/endpoint-datasets')->assertOk()->json('datasets');
        $this->assertNotEmpty($datasets);
        $this->assertTrue(
            collect($datasets)->contains(fn ($d) => $d['slug'] === 'api/data/q/colis_total_3var')
        );
    }
}