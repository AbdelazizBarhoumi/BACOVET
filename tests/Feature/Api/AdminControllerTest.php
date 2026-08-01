<?php

namespace Tests\Feature\Api;

use App\Models\ManualKpiValue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Tests\Traits\TestHelpers;

class AdminControllerTest extends TestCase
{
    use RefreshDatabase;
    use TestHelpers;

    public function test_lists_kpi_values_with_updater_without_lazy_loading(): void
    {
        $this->seedRoles();
        $user = $this->actingAsRole('it');

        $kpi = ManualKpiValue::create([
            'kpi_key' => 'test_kpi',
            'kpi_label' => 'Test KPI',
            'value' => 10,
            'updated_by' => $user->id,
        ]);

        $response = $this->get('/admin/kpi-values');

        $response->assertStatus(200);
        $response->assertJsonFragment([
            'kpi_key' => 'test_kpi',
            'updated_by' => $user->name,
        ]);
    }
}
