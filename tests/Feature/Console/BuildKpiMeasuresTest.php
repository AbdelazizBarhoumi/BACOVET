<?php

namespace Tests\Feature\Console;

use App\Models\DataMapping;
use App\Models\MeasureLibraryV6;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BuildKpiMeasuresTest extends TestCase
{
    use RefreshDatabase;

    private function seedKpi(string $kpi, string $name, array $modules, array $variables, ?array $formula, array $target = []): void
    {
        foreach ($variables as $i => $variable) {
            DataMapping::create(array_merge([
                'kpi' => $kpi,
                'name' => $i === 0 ? $name : $name.' (2)',
                'variable' => $variable['variable'],
                'endpoint' => $variable['endpoint'] ?? null,
                'variable_type' => $variable['variable_type'] ?? 'Direct',
                'variable_key' => $variable['variable_key'] ?? null,
                'is_filtered' => false,
                'filter_key' => null,
                'filter_value' => null,
                'has_function' => $variable['has_function'] ?? false,
                'fn' => $variable['fn'] ?? 'Latest',
                'modules' => $modules,
                'formula' => $i === 0 ? $formula : null,
                'cible_operator' => $target['operator'] ?? null,
                'cible_value' => $target['value'] ?? null,
                'cible_is_percentage' => $target['is_percentage'] ?? false,
            ]));
        }
    }

    public function test_generates_measure_from_formula_kpi(): void
    {
        $this->seedKpi(
            'F-REQ-313',
            'Taux de fiabilité stock accessoires',
            ['logistics'],
            [
                ['variable' => 'Quantité physique', 'variable_key' => 'Qtte'],
                ['variable' => 'Quantité système', 'variable_key' => 'qtteReservee'],
            ],
            ['items' => [
                ['type' => 'variable', 'label' => 'Quantité physique'],
                ['type' => 'operator', 'op' => '/'],
                ['type' => 'variable', 'label' => 'Quantité système'],
                ['type' => 'operator', 'op' => '*'],
                ['type' => 'number', 'value' => 100],
            ]],
            ['operator' => '>', 'value' => '99.50', 'is_percentage' => true],
        );

        $this->artisan('kpi:build-measures')->assertSuccessful();

        $measure = MeasureLibraryV6::where('name', 'Taux de fiabilité stock accessoires')->first();
        $this->assertNotNull($measure);
        $this->assertSame('SUM(Qtte)/SUM(qtteReservee)*100', $measure->expression);
        $this->assertSame('logistics', $measure->category);
        $this->assertSame('F-REQ-313 — cible > 99.50%', $measure->description);
    }

    public function test_single_variable_kpi_without_formula_uses_first_key(): void
    {
        $this->seedKpi(
            'F-REQ-205',
            'WIP par chaine',
            ['production'],
            [
                ['variable' => 'Quantité engagement par chaîne', 'variable_key' => 'WIP_Chaine'],
                ['variable' => 'Quantité sortie par chaîne'],
            ],
            null,
        );

        $this->artisan('kpi:build-measures')->assertSuccessful();

        $measure = MeasureLibraryV6::where('name', 'WIP par chaine')->first();
        $this->assertNotNull($measure);
        $this->assertSame('SUM(WIP_Chaine)', $measure->expression);
    }

    public function test_keyless_variable_measure_is_skipped(): void
    {
        $this->seedKpi(
            'F-REQ-350',
            'RFT (RIGHT FIRST TIME)',
            ['development'],
            [
                ['variable' => 'Nombre de modèles validés de premier coup'],
                ['variable' => 'Total des modèles envoyés'],
            ],
            ['items' => [
                ['type' => 'variable', 'label' => 'Nombre de modèles validés de premier coup'],
                ['type' => 'operator', 'op' => '/'],
                ['type' => 'variable', 'label' => 'Total des modèles envoyés'],
            ]],
        );

        $this->artisan('kpi:build-measures')
            ->expectsOutputToContain('has no variable_key')
            ->expectsOutputToContain('SKIPPED F-REQ-350')
            ->assertSuccessful();

        $this->assertDatabaseCount('measures_library_v6', 0);
    }

    public function test_aggregation_functions_map_to_dax(): void
    {
        $this->seedKpi(
            'F-REQ-201',
            'Efficience par OPERATEUR',
            ['production'],
            [
                ['variable' => 'Minutes produites', 'variable_key' => 'MinuteProduite', 'has_function' => true, 'fn' => 'Sum'],
                ['variable' => 'Minutes présence', 'variable_key' => 'TempsPresence_Min', 'has_function' => true, 'fn' => 'Average'],
            ],
            ['items' => [
                ['type' => 'variable', 'label' => 'Minutes produites'],
                ['type' => 'operator', 'op' => '/'],
                ['type' => 'variable', 'label' => 'Minutes présence'],
            ]],
        );

        $this->artisan('kpi:build-measures')->assertSuccessful();

        $measure = MeasureLibraryV6::where('name', 'Efficience par OPERATEUR')->first();
        $this->assertNotNull($measure);
        $this->assertSame('SUM(MinuteProduite)/AVERAGE(TempsPresence_Min)', $measure->expression);
    }

    public function test_category_override_and_kpi_filter(): void
    {
        $this->seedKpi('F-REQ-102', 'BR GTD', ['production'], [
            ['variable' => 'Rejets', 'variable_key' => 'Total_rejetes'],
            ['variable' => 'Colis', 'variable_key' => 'Total_colis'],
        ], null);
        $this->seedKpi('F-REQ-103', 'BR GTD bis', ['production'], [
            ['variable' => 'Rejets', 'variable_key' => 'Total_rejetes'],
            ['variable' => 'Colis annulés', 'variable_key' => 'Colis_annules'],
        ], null);

        $this->artisan('kpi:build-measures', ['--kpi' => ['F-REQ-102'], '--category' => 'custom'])
            ->assertSuccessful();

        $this->assertDatabaseCount('measures_library_v6', 1);
        $measure = MeasureLibraryV6::first();
        $this->assertSame('custom', $measure->category);
    }

    public function test_full_sync_removes_stale_measures(): void
    {
        MeasureLibraryV6::create([
            'name' => 'Stale measure',
            'expression' => 'SUM(X)',
            'category' => 'stale',
        ]);

        $this->seedKpi('F-REQ-102', 'BR GTD', ['production'], [
            ['variable' => 'Rejets', 'variable_key' => 'Total_rejetes'],
            ['variable' => 'Colis', 'variable_key' => 'Total_colis'],
        ], null);

        $this->artisan('kpi:build-measures')->assertSuccessful();

        $this->assertDatabaseCount('measures_library_v6', 1);
        $this->assertNull(MeasureLibraryV6::where('name', 'Stale measure')->first());
    }

    public function test_no_wipe_keeps_existing_measures(): void
    {
        MeasureLibraryV6::create([
            'name' => 'Stale measure',
            'expression' => 'SUM(X)',
            'category' => 'stale',
        ]);

        $this->seedKpi('F-REQ-102', 'BR GTD', ['production'], [
            ['variable' => 'Rejets', 'variable_key' => 'Total_rejetes'],
            ['variable' => 'Colis', 'variable_key' => 'Total_colis'],
        ], null);

        $this->artisan('kpi:build-measures', ['--no-wipe' => true])->assertSuccessful();

        $this->assertDatabaseCount('measures_library_v6', 2);
        $this->assertNotNull(MeasureLibraryV6::where('name', 'Stale measure')->first());
    }

    public function test_dry_run_writes_nothing(): void
    {
        $this->seedKpi('F-REQ-102', 'BR GTD', ['production'], [
            ['variable' => 'Rejets', 'variable_key' => 'Total_rejetes'],
            ['variable' => 'Colis', 'variable_key' => 'Total_colis'],
        ], null);

        $this->artisan('kpi:build-measures', ['--dry-run' => true])
            ->expectsOutputToContain('Would generate')
            ->assertSuccessful();

        $this->assertDatabaseCount('measures_library_v6', 0);
    }

    public function test_incomplete_formula_dangling_operator_is_trimmed(): void
    {
        $this->seedKpi(
            'F-REQ-326',
            'Taux de commandes livrées à temps tissu',
            ['logistics'],
            [
                ['variable' => 'Transfert coupe', 'variable_key' => 'NbOF_Livres_Total'],
                ['variable' => 'Transfert coupe Jemmel'],
            ],
            ['items' => [
                ['type' => 'variable', 'label' => 'Transfert coupe'],
                ['type' => 'operator', 'op' => '+'],
            ]],
        );

        $this->artisan('kpi:build-measures')->assertSuccessful();

        $measure = MeasureLibraryV6::where('name', 'Taux de commandes livrées à temps tissu')->first();
        $this->assertNotNull($measure);
        $this->assertSame('SUM(NbOF_Livres_Total)', $measure->expression);
    }
}
