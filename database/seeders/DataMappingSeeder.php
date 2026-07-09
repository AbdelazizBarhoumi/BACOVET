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

    public function run(): void
    {
        $seedPath = resource_path('js/lib/kpi-rows.ts');
        $content = file_get_contents($seedPath);

        preg_match_all(
            '/"kpi":\s*"([^"]+)".*?"name":\s*"([^"]+)".*?"variable":\s*"([^"]+)"/s',
            $content,
            $matches,
            PREG_SET_ORDER
        );

        foreach ($matches as $m) {
            $kpi = $m[1];
            $modules = self::MODULE_MAP[$kpi] ?? [];

            DataMapping::updateOrCreate(
                ['kpi' => $kpi, 'variable' => $m[3]],
                [
                    'name' => $m[2],
                    'modules' => $modules,
                ]
            );
        }
    }
}
