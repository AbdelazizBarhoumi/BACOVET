<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\NovacityEndpointsController;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EndpointEnabledFilterTest extends TestCase
{
    use RefreshDatabase;

    private string $dataFile;

    private string $disabledRootsFile;

    protected function setUp(): void
    {
        parent::setUp();

        $this->dataFile = storage_path('framework/testing/endpoint-enabled-filter-data.json');
        $this->disabledRootsFile = storage_path('framework/testing/endpoint-disabled-roots.json');

        @mkdir(dirname($this->dataFile), 0755, true);

        config([
            'novacity.data_file' => 'framework/testing/endpoint-enabled-filter-data.json',
        ]);

        NovacityEndpointsController::flushCache();
    }

    protected function tearDown(): void
    {
        @unlink($this->dataFile);
        @unlink($this->disabledRootsFile);
        NovacityEndpointsController::flushCache();
        parent::tearDown();
    }

    private function userWithRole(string $slug): User
    {
        $role = Role::updateOrCreate(
            ['slug' => $slug],
            ['name' => $slug, 'slug' => $slug],
        );

        return User::factory()->create([
            'role_id' => $role->id,
            'is_active' => true,
        ]);
    }

    private function item(string $id, string $name, string $endpoint, bool $disabled = false): array
    {
        return [
            'id' => $id,
            'name' => $name,
            'method' => 'GET',
            'endpoint' => $endpoint,
            'status' => 200,
            'disabled' => $disabled,
            'response' => ['success' => true, 'data' => []],
        ];
    }

    private function writeData(array $items): void
    {
        file_put_contents($this->dataFile, json_encode($items, JSON_PRETTY_PRINT));
    }

    private function list(string $query): array
    {
        return $this->actingAs($this->userWithRole('it'))
            ->getJson('/novacity-endpoints/list'.$query)
            ->assertOk()
            ->json();
    }

    public function test_list_defaults_to_enabled_only_endpoints(): void
    {
        $this->writeData([
            $this->item('ep-1', 'a', 'https://api.test/api/data/a'),
            $this->item('ep-2', 'b', 'https://api.test/api/data/b', true),
        ]);

        $json = $this->list('');

        $this->assertSame(['ep-1'], collect($json['items'])->pluck('id')->all());
        $this->assertSame(1, $json['total']);
    }

    public function test_enabled_filter_returns_each_polarity(): void
    {
        $this->writeData([
            $this->item('ep-1', 'a', 'https://api.test/api/data/a'),
            $this->item('ep-2', 'b', 'https://api.test/api/data/b', true),
        ]);

        $disabledOnly = $this->list('?enabled=0');
        $this->assertSame(['ep-2'], collect($disabledOnly['items'])->pluck('id')->all());

        $all = $this->list('?enabled=all');
        $this->assertSame(['ep-1', 'ep-2'], collect($all['items'])->pluck('id')->all());
    }

    public function test_stats_only_count_enabled_endpoints(): void
    {
        $this->writeData([
            $this->item('ep-1', 'a', 'https://api.test/api/data/a'),
            $this->item('ep-2', 'b', 'https://api.test/api/data/b', true),
        ]);

        $json = $this->list('?enabled=all');

        $this->assertSame(1, $json['stats']['total']);
        $this->assertSame(1, $json['stats']['by_method']['GET']);
        $this->assertArrayNotHasKey('api.test', $json['stats']['by_root']);

        // Stats stay enabled-only even when the list shows the disabled set.
        $disabledOnly = $this->list('?enabled=0');
        $this->assertSame(1, $disabledOnly['stats']['total']);
    }

    public function test_stats_exclude_items_under_a_disabled_root(): void
    {
        $this->writeData([
            $this->item('ep-1', 'a', 'https://api.test/api/data/a'),
            $this->item('ep-2', 'b', 'https://api.test/api/data/b'),
        ]);

        $this->actingAs($this->userWithRole('it'))
            ->postJson('/novacity-endpoints/roots/toggle', [
                'root' => 'https://api.test',
                'disabled' => true,
            ])
            ->assertOk();

        $json = $this->list('?enabled=all');

        $this->assertSame(0, $json['stats']['total']);
        $this->assertSame(['ep-1', 'ep-2'], collect($json['items'])->pluck('id')->all());

        // The default view (enabled only) hides everything under the disabled root.
        $default = $this->list('');
        $this->assertSame([], $default['items']);
        $this->assertSame(0, $default['total']);
    }

    public function test_health_stats_expose_enabled_totals(): void
    {
        $this->writeData([
            $this->item('ep-1', 'a', 'https://api.test/api/data/a'),
            $this->item('ep-2', 'b', 'https://api.test/api/data/b', true),
            $this->item('ep-3', 'c', 'https://api.other/api/data/c'),
        ]);

        $json = $this->actingAs($this->userWithRole('it'))
            ->getJson('/novacity-endpoints/health')
            ->assertOk()
            ->json('stats');

        $this->assertSame(2, $json['total']);
        $this->assertSame(2, $json['by_method']['GET']);
        $this->assertArrayNotHasKey('api.test', $json['by_root']);
        $this->assertSame(1, $json['by_root']['https://api.other']);
    }
}
