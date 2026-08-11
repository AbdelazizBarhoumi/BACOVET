<?php

namespace Tests\Feature;

use App\Models\EndpointDataset;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EndpointDatasetsFallbackTest extends TestCase
{
    use RefreshDatabase;

    private function userWithRole(): User
    {
        $role = Role::updateOrCreate(
            ['slug' => 'admin'],
            ['name' => 'Admin', 'slug' => 'admin'],
        );

        return User::factory()->create([
            'role_id' => $role->id,
            'is_active' => true,
        ]);
    }

    public function test_datasets_fall_back_to_data_json_rows_when_the_db_never_synced(): void
    {
        $user = $this->userWithRole();

        $response = $this->actingAs($user)->getJson('/api/endpoint-datasets');

        $response->assertOk()
            ->assertJsonStructure(['datasets' => ['*' => ['slug', 'name', 'sample_data', 'row_count']]]);

        $bySlug = collect($response->json('datasets'))->keyBy('slug');

        $expected = [
            'api/data/q/wip_chaine' => 34,
            'api/data/q/taging_reel' => 100,
            'api/data/codestyle' => 100,
            'api/data/itemtrxenq' => 100,
        ];

        foreach ($expected as $slug => $count) {
            $this->assertTrue($bySlug->has($slug), "{$slug} missing from /api/endpoint-datasets");

            $dataset = $bySlug[$slug];

            $this->assertIsArray($dataset['sample_data']);
            $this->assertCount($count, $dataset['sample_data']);
            $this->assertSame($count, $dataset['row_count']);
        }
    }

    public function test_live_synced_rows_win_over_the_data_json_snapshot(): void
    {
        $user = $this->userWithRole();

        EndpointDataset::updateOrCreate(
            ['slug' => 'api/data/q/wip_chaine'],
            [
                'name' => 'wip_chaine',
                'method' => 'GET',
                'label' => null,
                'object' => null,
                'object_type' => null,
                'source' => 'SDT',
                'columns' => [
                    ['name' => 'ProdGroup', 'type' => 'text'],
                    ['name' => 'WIP_Chaine', 'type' => 'number'],
                ],
                'sample_data' => [['ProdGroup' => 'LIVE', 'WIP_Chaine' => 5]],
                'row_count' => 1,
                'last_status' => 'ok',
            ],
        );

        $dataset = collect(
            $this->actingAs($user)->json('GET', '/api/endpoint-datasets')->json('datasets'),
        )->firstWhere('slug', 'api/data/q/wip_chaine');

        $this->assertSame([['ProdGroup' => 'LIVE', 'WIP_Chaine' => 5]], $dataset['sample_data']);
        $this->assertSame(1, $dataset['row_count']);
    }
}
