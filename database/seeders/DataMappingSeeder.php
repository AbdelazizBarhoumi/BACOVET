<?php

namespace Database\Seeders;

use App\Models\DataMapping;
use Illuminate\Database\Seeder;

class DataMappingSeeder extends Seeder
{
    // KPI → modules mapping (from user-provided data)
    private const MODULE_MAP = [
        'F-REQ-101' => ['quality'],
        'F-REQ-102' => ['production', 'production:confection', 'quality'],
        'F-REQ-103' => ['quality'],
        'F-REQ-104' => ['production', 'production:confection', 'production:flux', 'quality'],
        'F-REQ-105' => ['quality'],
        'F-REQ-106' => ['production', 'production:coupe', 'quality'],
        'F-REQ-107' => ['quality'],
        'F-REQ-108' => ['production', 'production:coupe', 'production:flux', 'quality'],
        'F-REQ-109' => ['quality'],
        'F-REQ-110' => ['quality'],
        'F-REQ-111' => ['quality'],
        'F-REQ-112' => ['quality'],
        'F-REQ-113' => ['quality'],
        'F-REQ-114' => ['quality'],
        'F-REQ-115' => ['quality'],
        'F-REQ-116' => ['quality'],
        'F-REQ-117' => ['quality'],
        'F-REQ-118' => ['quality'],
        'F-REQ-119' => ['quality'],
        'F-REQ-120' => ['quality'],
        'F-REQ-121' => ['quality'],
        'F-REQ-201' => ['production', 'production:confection'],
        'F-REQ-202' => ['production', 'production:confection'],
        'F-REQ-203' => ['production', 'production:confection'],
        'F-REQ-204' => ['production', 'production:confection'],
        'F-REQ-205' => ['production', 'production:confection', 'production:flux'],
        'F-REQ-206' => ['production', 'production:confection', 'production:flux'],
        'F-REQ-207' => ['production', 'production:confection', 'production:coupe', 'production:flux'],
        'F-REQ-208' => ['production', 'production:coupe'],
        'F-REQ-209' => ['production', 'production:coupe'],
        'F-REQ-210' => ['production', 'production:confection', 'production:coupe', 'production:flux'],
        'F-REQ-211' => ['production', 'production:confection'],
        'F-REQ-212' => ['production', 'production:confection'],
        'F-REQ-213' => ['production', 'production:confection'],
        'F-REQ-214' => ['production', 'production:confection'],
        'F-REQ-215' => ['production', 'production:confection', 'production:coupe', 'production:flux'],
        'F-REQ-216' => ['methodes', 'logistics'],
        'F-REQ-217' => ['methodes'],
        'F-REQ-218' => ['methodes'],
        'F-REQ-219' => ['methodes'],
        'F-REQ-301' => ['production', 'production:confection', 'production:coupe', 'production:flux'],
        'F-REQ-302' => ['production', 'production:coupe'],
        'F-REQ-303' => ['production', 'production:confection', 'production:coupe', 'production:flux'],
        'F-REQ-304' => ['production', 'production:confection', 'production:coupe', 'production:flux'],
        'F-REQ-305' => ['production', 'production:confection', 'production:coupe', 'production:flux'],
        'F-REQ-306' => ['production', 'production:confection', 'production:coupe', 'production:flux'],
        'F-REQ-307' => ['production', 'production:confection', 'production:coupe', 'production:flux'],
        'F-REQ-308' => ['production', 'production:confection', 'production:coupe', 'production:flux'],
        'F-REQ-309' => ['production', 'production:flux'],
        'F-REQ-310' => ['production', 'production:confection'],
        'F-REQ-311' => ['production', 'production:coupe'],
        'F-REQ-312' => ['production', 'production:confection', 'production:coupe', 'production:flux'],
        'F-REQ-313' => ['logistics'],
        'F-REQ-314' => ['logistics'],
        'F-REQ-315' => ['logistics'],
        'F-REQ-316' => ['logistics'],
        'F-REQ-317' => ['logistics'],
        'F-REQ-318' => ['logistics'],
        'F-REQ-319' => ['logistics'],
        'F-REQ-320' => ['logistics'],
        'F-REQ-321' => ['logistics'],
        'F-REQ-322' => ['logistics'],
        'F-REQ-323' => ['logistics'],
        'F-REQ-324' => ['logistics'],
        'F-REQ-325' => ['logistics'],
        'F-REQ-326' => ['logistics'],
        'F-REQ-327' => ['logistics'],
        'F-REQ-328' => ['logistics'],
        'F-REQ-329' => ['logistics'],
        'F-REQ-330' => ['logistics'],
        'F-REQ-331' => ['logistics'],
        'F-REQ-332' => ['logistics'],
        'F-REQ-333' => ['logistics'],
        'F-REQ-334' => ['logistics'],
        'F-REQ-335' => ['logistics'],
        'F-REQ-336' => ['logistics'],
        'F-REQ-337' => ['logistics'],
        'F-REQ-350' => ['development'],
        'F-REQ-351' => ['development'],
        'F-REQ-352' => ['development'],
        'F-REQ-353' => ['development'],
    ];

    // KPI → formula mapping (variable indices within the KPI group)
    // Index 0 = first variable, 1 = second variable, etc.
    // Formula: items array with type 'variable' (ref by index), 'operator', or 'number'
    private const FORMULA_MAP = [
        // Quality - Taux de rebut
        'F-REQ-101' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '/'], ['type' => 'variable', 'ref' => 1], ['type' => 'operator', 'op' => '*'], ['type' => 'number', 'value' => 100]]],
        'F-REQ-102' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '/'], ['type' => 'variable', 'ref' => 1], ['type' => 'operator', 'op' => '*'], ['type' => 'number', 'value' => 100]]],
        'F-REQ-103' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '/'], ['type' => 'variable', 'ref' => 1], ['type' => 'operator', 'op' => '*'], ['type' => 'number', 'value' => 100]]],
        'F-REQ-104' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '/'], ['type' => 'variable', 'ref' => 1], ['type' => 'operator', 'op' => '*'], ['type' => 'number', 'value' => 100]]],
        'F-REQ-105' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '/'], ['type' => 'variable', 'ref' => 1], ['type' => 'operator', 'op' => '*'], ['type' => 'number', 'value' => 100]]],
        'F-REQ-106' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '/'], ['type' => 'variable', 'ref' => 1], ['type' => 'operator', 'op' => '*'], ['type' => 'number', 'value' => 100]]],
        'F-REQ-107' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '/'], ['type' => 'variable', 'ref' => 1], ['type' => 'operator', 'op' => '*'], ['type' => 'number', 'value' => 100]]],
        'F-REQ-108' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '/'], ['type' => 'variable', 'ref' => 1], ['type' => 'operator', 'op' => '*'], ['type' => 'number', 'value' => 100]]],
        'F-REQ-109' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '/'], ['type' => 'variable', 'ref' => 1], ['type' => 'operator', 'op' => '*'], ['type' => 'number', 'value' => 100]]],
        'F-REQ-110' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '/'], ['type' => 'variable', 'ref' => 1], ['type' => 'operator', 'op' => '*'], ['type' => 'number', 'value' => 100]]],
        'F-REQ-111' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '/'], ['type' => 'variable', 'ref' => 1], ['type' => 'operator', 'op' => '*'], ['type' => 'number', 'value' => 100]]],
        'F-REQ-112' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '/'], ['type' => 'variable', 'ref' => 1], ['type' => 'operator', 'op' => '*'], ['type' => 'number', 'value' => 100]]],
        'F-REQ-113' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '/'], ['type' => 'variable', 'ref' => 1], ['type' => 'operator', 'op' => '*'], ['type' => 'number', 'value' => 100]]],
        'F-REQ-114' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '/'], ['type' => 'variable', 'ref' => 1], ['type' => 'operator', 'op' => '*'], ['type' => 'number', 'value' => 100]]],
        'F-REQ-115' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '/'], ['type' => 'variable', 'ref' => 1], ['type' => 'operator', 'op' => '*'], ['type' => 'number', 'value' => 100]]],
        'F-REQ-120' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '/'], ['type' => 'variable', 'ref' => 1], ['type' => 'operator', 'op' => '*'], ['type' => 'number', 'value' => 100]]],
        'F-REQ-121' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '/'], ['type' => 'variable', 'ref' => 1], ['type' => 'operator', 'op' => '*'], ['type' => 'number', 'value' => 100]]],

        // Production - Efficience
        'F-REQ-201' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '/'], ['type' => 'variable', 'ref' => 1], ['type' => 'operator', 'op' => '*'], ['type' => 'number', 'value' => 100]]],
        'F-REQ-202' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '*'], ['type' => 'variable', 'ref' => 1], ['type' => 'operator', 'op' => '/'], ['type' => 'variable', 'ref' => 2], ['type' => 'operator', 'op' => '*'], ['type' => 'variable', 'ref' => 3], ['type' => 'operator', 'op' => '*'], ['type' => 'number', 'value' => 100]]],
        'F-REQ-203' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '/'], ['type' => 'variable', 'ref' => 1], ['type' => 'operator', 'op' => '*'], ['type' => 'number', 'value' => 100]]],
        'F-REQ-204' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '*'], ['type' => 'variable', 'ref' => 1], ['type' => 'operator', 'op' => '/'], ['type' => 'variable', 'ref' => 2], ['type' => 'operator', 'op' => '*'], ['type' => 'variable', 'ref' => 3], ['type' => 'operator', 'op' => '*'], ['type' => 'number', 'value' => 100]]],
        'F-REQ-208' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '/'], ['type' => 'variable', 'ref' => 1], ['type' => 'operator', 'op' => '*'], ['type' => 'number', 'value' => 100]]],
        'F-REQ-209' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '/'], ['type' => 'variable', 'ref' => 1], ['type' => 'operator', 'op' => '*'], ['type' => 'number', 'value' => 100]]],
        'F-REQ-210' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '*'], ['type' => 'variable', 'ref' => 1], ['type' => 'operator', 'op' => '/'], ['type' => 'variable', 'ref' => 2], ['type' => 'operator', 'op' => '*'], ['type' => 'number', 'value' => 100]]],

        // Méthodes
        'F-REQ-216' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '/'], ['type' => 'variable', 'ref' => 1], ['type' => 'operator', 'op' => '*'], ['type' => 'number', 'value' => 100]]],
        'F-REQ-219' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '/'], ['type' => 'variable', 'ref' => 1], ['type' => 'operator', 'op' => '*'], ['type' => 'number', 'value' => 100]]],

        // Production - Avancement
        'F-REQ-305' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '/'], ['type' => 'variable', 'ref' => 1], ['type' => 'operator', 'op' => '*'], ['type' => 'number', 'value' => 100]]],

        // Logistique - Fiabilité stock
        'F-REQ-313' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '/'], ['type' => 'variable', 'ref' => 1], ['type' => 'operator', 'op' => '*'], ['type' => 'number', 'value' => 100]]],
        'F-REQ-314' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '/'], ['type' => 'variable', 'ref' => 1], ['type' => 'operator', 'op' => '*'], ['type' => 'number', 'value' => 100]]],
        'F-REQ-315' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '/'], ['type' => 'variable', 'ref' => 1], ['type' => 'operator', 'op' => '*'], ['type' => 'number', 'value' => 100]]],

        // Logistique - Rotation stock
        'F-REQ-316' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '/'], ['type' => 'variable', 'ref' => 1]]],
        'F-REQ-317' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '/'], ['type' => 'variable', 'ref' => 1]]],
        'F-REQ-318' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '/'], ['type' => 'variable', 'ref' => 1]]],

        // Logistique - Stock mort
        'F-REQ-319' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '/'], ['type' => 'variable', 'ref' => 1], ['type' => 'operator', 'op' => '*'], ['type' => 'number', 'value' => 100]]],
        'F-REQ-320' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '/'], ['type' => 'variable', 'ref' => 1], ['type' => 'operator', 'op' => '*'], ['type' => 'number', 'value' => 100]]],
        'F-REQ-321' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '/'], ['type' => 'variable', 'ref' => 1], ['type' => 'operator', 'op' => '*'], ['type' => 'number', 'value' => 100]]],

        // Logistique - Occupation stock
        'F-REQ-322' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '/'], ['type' => 'variable', 'ref' => 1], ['type' => 'operator', 'op' => '*'], ['type' => 'number', 'value' => 100]]],
        'F-REQ-323' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '/'], ['type' => 'variable', 'ref' => 1], ['type' => 'operator', 'op' => '*'], ['type' => 'number', 'value' => 100]]],
        'F-REQ-324' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '/'], ['type' => 'variable', 'ref' => 1], ['type' => 'operator', 'op' => '*'], ['type' => 'number', 'value' => 100]]],

        // Logistique - Valeur stock
        'F-REQ-331' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '/'], ['type' => 'variable', 'ref' => 1], ['type' => 'operator', 'op' => '*'], ['type' => 'number', 'value' => 100]]],
        'F-REQ-332' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '/'], ['type' => 'variable', 'ref' => 1], ['type' => 'operator', 'op' => '*'], ['type' => 'number', 'value' => 100]]],
        'F-REQ-333' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '/'], ['type' => 'variable', 'ref' => 1], ['type' => 'operator', 'op' => '*'], ['type' => 'number', 'value' => 100]]],

        // Logistique - Livraison
        'F-REQ-334' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '/'], ['type' => 'variable', 'ref' => 1], ['type' => 'operator', 'op' => '*'], ['type' => 'number', 'value' => 100]]],
        'F-REQ-335' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '/'], ['type' => 'variable', 'ref' => 1], ['type' => 'operator', 'op' => '*'], ['type' => 'number', 'value' => 100]]],
        'F-REQ-336' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '/'], ['type' => 'variable', 'ref' => 1]]],

        // Logistique - Lead Time
        'F-REQ-337' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '+'], ['type' => 'variable', 'ref' => 1]]],

        // Développement
        'F-REQ-350' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '/'], ['type' => 'variable', 'ref' => 1]]],
        'F-REQ-351' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '/'], ['type' => 'variable', 'ref' => 1]]],
        'F-REQ-352' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '/'], ['type' => 'variable', 'ref' => 1]]],
        'F-REQ-353' => ['items' => [['type' => 'variable', 'ref' => 0], ['type' => 'operator', 'op' => '/'], ['type' => 'variable', 'ref' => 1]]],
    ];

    public function run(): void
    {
        $seedPath = resource_path('js/lib/kpi-rows.ts');
        $content = file_get_contents($seedPath);

        // Extract all seed entries with their fields
        preg_match_all(
            '/\{\s*"kpi":\s*"([^"]+)",\s*"name":\s*"([^"]+)",\s*"variable":\s*"([^"]+)"(?:,\s*"cible_operator":\s*"([^"]*)")?(?:,\s*"cible_value":\s*([0-9.]+|null))?(?:,\s*"cible_is_percentage":\s*(true|false))?(?:,\s*"refresh_frequency":\s*"([^"]*)")?\s*\}/s',
            $content,
            $matches,
            PREG_SET_ORDER
        );

        // Track first row ID for each KPI (for formula assignment)
        $kpiFirstRowIds = [];

        foreach ($matches as $m) {
            $kpi = $m[1];
            $modules = self::MODULE_MAP[$kpi] ?? [];

            $row = DataMapping::updateOrCreate(
                ['kpi' => $kpi, 'variable' => $m[3]],
                [
                    'name' => $m[2],
                    'modules' => $modules,
                    'cible_operator' => $m[4] ?? '=',
                    'cible_value' => $m[5] === 'null' ? null : ($m[5] ? (float) $m[5] : null),
                    'cible_is_percentage' => $m[6] === 'true',
                    'refresh_frequency' => $m[7] ?? 'instant',
                ]
            );

            // Track first row for each KPI
            if (!isset($kpiFirstRowIds[$kpi])) {
                $kpiFirstRowIds[$kpi] = $row->id;
            }
        }

        // Now assign formulas to the first row of each KPI group
        foreach (self::FORMULA_MAP as $kpi => $formulaDef) {
            if (!isset($kpiFirstRowIds[$kpi])) {
                continue;
            }

            $firstRowId = $kpiFirstRowIds[$kpi];

            // Get all rows for this KPI to resolve variable references
            $kpiRows = DataMapping::where('kpi', $kpi)->orderBy('id')->get();
            $kpiRowIds = $kpiRows->pluck('id')->toArray();

            // Resolve formula variable references to actual row IDs
            $resolvedItems = [];
            foreach ($formulaDef['items'] as $item) {
                $resolvedItem = $item;
                if ($item['type'] === 'variable' && isset($item['ref'])) {
                    // ref is the index within the KPI group
                    $resolvedItem['ref'] = $kpiRowIds[$item['ref']] ?? $kpiRowIds[0];
                    $resolvedItem['label'] = $kpiRows[$item['ref']]->variable ?? '';
                }
                $resolvedItems[] = $resolvedItem;
            }

            DataMapping::where('id', $firstRowId)->update([
                'formula' => ['items' => $resolvedItems],
            ]);
        }
    }
}
