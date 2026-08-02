<?php

namespace Tests\Feature\Console;

use App\Models\DataMapping;
use App\Models\MeasureLibraryV6;
use App\Models\MeasureV5;
use App\Services\EndpointDatasetRegistry;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BuildKpiMeasuresV5Test extends TestCase
{
    use RefreshDatabase;

    private const FIXTURE = 'app/public/data.kpi-v5.test.json';

    protected function setUp(): void
    {
        parent::setUp();

        config(['novacity.data_file' => self::FIXTURE]);
        $this->writeFixture();
        app(EndpointDatasetRegistry::class)->forgetCache();
    }

    protected function tearDown(): void
    {
        @unlink(storage_path(self::FIXTURE));

        parent::tearDown();
    }

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

    private function writeFixture(): void
    {
        $path = storage_path(self::FIXTURE);
        if (! is_dir(dirname($path))) {
            mkdir(dirname($path), 0777, true);
        }
        file_put_contents($path, json_encode([
            [
                'name' => 'LostTimeTrx (SDT)',
                'method' => 'GET',
                'endpoint' => 'http://novacity/api/data/losttimetrx',
                'response' => [
                    'label' => 'LostTimeTrx',
                    'object' => 'vwLostTimeTrx',
                    'columns' => ['LogDate', 'LostTime'],
                    'data' => [['LogDate' => '2024-01-01', 'LostTime' => 5]],
                ],
            ],
            [
                'name' => 'LostType (SDT)',
                'method' => 'GET',
                'endpoint' => 'http://novacity/api/data/losttype',
                'response' => [
                    'label' => 'LostType',
                    'object' => 'vwLostType',
                    'columns' => ['LostTypeDesc'],
                    'data' => [['LostTypeDesc' => 'Maintenance']],
                ],
            ],
        ], JSON_THROW_ON_ERROR));
    }

    public function test_generates_qualified_measure_from_formula_kpi_into_v5(): void
    {
        $this->seedKpi(
            'F-REQ-207',
            'arrêts non planifiés',
            ['production'],
            [
                ['variable' => "Temps d'arrêt", 'variable_key' => 'LostTime', 'endpoint' => 'api/data/losttimetrx'],
                ['variable' => "Motif d'arrêt", 'variable_key' => 'LostTypeDesc', 'endpoint' => 'api/data/losttype'],
            ],
            ['items' => [
                ['type' => 'variable', 'label' => "Temps d'arrêt"],
                ['type' => 'operator', 'op' => '/'],
                ['type' => 'variable', 'label' => "Motif d'arrêt"],
            ]],
        );

        $this->artisan('kpi:build-measures', ['--target' => 'v5'])->assertSuccessful();

        $measure = MeasureV5::where('name', 'arrêts non planifiés')->firstOrFail();
        $this->assertSame('SUM(LostTimeTrx[LostTime])/SUM(LostType[LostTypeDesc])', $measure->expression);
    }

    public function test_single_variable_kpi_qualifies_first_variable_in_v5(): void
    {
        $this->seedKpi(
            'F-REQ-207',
            'arrêts non planifiés',
            ['production'],
            [
                ['variable' => "Temps d'arrêt", 'variable_key' => 'LostTime', 'endpoint' => 'api/data/losttimetrx'],
                ['variable' => "Motif d'arrêt", 'variable_key' => 'LostTypeDesc', 'endpoint' => 'api/data/losttype'],
            ],
            null,
        );

        $this->artisan('kpi:build-measures', ['--target' => 'v5'])->assertSuccessful();

        $measure = MeasureV5::where('name', 'arrêts non planifiés')->firstOrFail();
        $this->assertSame('SUM(LostTimeTrx[LostTime])', $measure->expression);
    }

    public function test_v6_target_keeps_bare_columns(): void
    {
        $this->seedKpi(
            'F-REQ-207',
            'arrêts non planifiés',
            ['production'],
            [
                ['variable' => "Temps d'arrêt", 'variable_key' => 'LostTime', 'endpoint' => 'api/data/losttimetrx'],
            ],
            null,
        );

        $this->artisan('kpi:build-measures', ['--target' => 'v6'])->assertSuccessful();

        $measure = MeasureLibraryV6::where('name', 'arrêts non planifiés')->firstOrFail();
        $this->assertSame('SUM(LostTime)', $measure->expression);
        $this->assertDatabaseCount('measures_v5', 0);
    }

    public function test_unresolvable_endpoint_falls_back_to_bare_column(): void
    {
        $this->seedKpi(
            'F-REQ-999',
            'KPI inconnu',
            ['production'],
            [
                ['variable' => 'Temps', 'variable_key' => 'Temps', 'endpoint' => 'api/data/does_not_exist'],
            ],
            null,
        );

        $this->artisan('kpi:build-measures', ['--target' => 'v5'])
            ->expectsOutputToContain('not resolvable to a V5 table')
            ->assertSuccessful();

        $measure = MeasureV5::where('name', 'KPI inconnu')->firstOrFail();
        $this->assertSame('SUM(Temps)', $measure->expression);
    }

    public function test_v5_target_only_wipes_measures_v5(): void
    {
        MeasureV5::create(['name' => 'Stale v5', 'expression' => 'SUM(X)']);
        MeasureLibraryV6::create(['name' => 'Keep v6', 'expression' => 'SUM(Y)']);

        $this->seedKpi('F-REQ-207', 'arrêts non planifiés', ['production'], [
            ['variable' => "Temps d'arrêt", 'variable_key' => 'LostTime', 'endpoint' => 'api/data/losttimetrx'],
        ], null);

        $this->artisan('kpi:build-measures', ['--target' => 'v5'])->assertSuccessful();

        $this->assertDatabaseCount('measures_v5', 1);
        $this->assertNull(MeasureV5::where('name', 'Stale v5')->first());
        $this->assertNotNull(MeasureV5::where('name', 'arrêts non planifiés')->first());
        $this->assertNotNull(MeasureLibraryV6::where('name', 'Keep v6')->first());
    }

    public function test_v5_dry_run_writes_nothing(): void
    {
        $this->seedKpi('F-REQ-207', 'arrêts non planifiés', ['production'], [
            ['variable' => "Temps d'arrêt", 'variable_key' => 'LostTime', 'endpoint' => 'api/data/losttimetrx'],
        ], null);

        $this->artisan('kpi:build-measures', ['--target' => 'v5', '--dry-run' => true])
            ->expectsOutputToContain('Would generate')
            ->assertSuccessful();

        $this->assertDatabaseCount('measures_v5', 0);
    }
}
