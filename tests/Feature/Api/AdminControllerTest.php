<?php

use App\Models\ManualKpiValue;
use App\Models\User;

it('lists KPI values including updater name without triggering lazy loading', function () {
    // Seed roles and create IT user
    seedRoles();
    $user = actingAsRole('it');

    // Create a KPI with an updater
    $kpi = ManualKpiValue::create([
        'kpi_key' => 'test_kpi',
        'kpi_label' => 'Test KPI',
        'value' => 10,
        'updated_by' => $user->id,
    ]);

    // This should not throw a LazyLoadingViolationException
    $response = $this->get('/admin/kpi-values');

    $response->assertStatus(200);
    $response->assertJsonFragment([
        'kpi_key' => 'test_kpi',
        'updated_by' => $user->name,
    ]);
});
