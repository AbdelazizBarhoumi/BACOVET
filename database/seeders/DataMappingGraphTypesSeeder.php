<?php

namespace Database\Seeders;

use App\Models\DataMapping;
use Illuminate\Database\Seeder;

class DataMappingGraphTypesSeeder extends Seeder
{
    // F-REQ code => array of graph type labels
    private const GRAPH_TYPE_MAP = [
        'F-REQ-101' => ['Big Number avec couleur'],
        'F-REQ-102' => ['Big Number avec couleur'],
        'F-REQ-103' => ['Line Chart (Courbe)', 'Big Number avec couleur'],
        'F-REQ-104' => ['Big Number avec couleur'],
        'F-REQ-105' => ['Line Chart (Courbe)', 'Big Number avec couleur'],
        'F-REQ-106' => ['Big Number avec couleur'],
        'F-REQ-107' => ['Line Chart (Courbe)', 'Big Number avec couleur'],
        'F-REQ-108' => ['Big Number avec couleur'],
        'F-REQ-109' => ['Line Chart (Courbe)', 'Big Number avec couleur'],
        'F-REQ-110' => ['Big Number avec couleur'],
        'F-REQ-111' => ['Line Chart (Courbe)', 'Big Number avec couleur'],
        'F-REQ-112' => ['Big Number avec couleur'],
        'F-REQ-113' => ['Line Chart (Courbe)', 'Big Number avec couleur'],
        'F-REQ-114' => ['Big Number avec couleur'],
        'F-REQ-115' => ['Line Chart (Courbe)', 'Big Number avec couleur'],
        'F-REQ-116' => ['Pareto Chart (Interactif)'],
        'F-REQ-117' => ['Pareto Chart (Interactif)'],
        'F-REQ-118' => ['Podium ou Top 3 List'],
        'F-REQ-119' => ['Podium ou Top 3 List'],
        'F-REQ-120' => ['Not specified'],
        'F-REQ-121' => ['Not specified'],
        'F-REQ-201' => ['Combo Bar/Line'],
        'F-REQ-202' => ['Gauge Chart (Jauge)'],
        'F-REQ-203' => ['Line Chart (Courbe)'],
        'F-REQ-204' => ['Big Number avec couleur'],
        'F-REQ-205' => ['Gauge Chart (Jauge)'],
        'F-REQ-206' => ['Area Chart (Graph. aires)'],
        'F-REQ-207' => ['Chronologie (Timeline)', 'Big Number avec couleur'],
        'F-REQ-208' => ['Combo Bar/Line'],
        'F-REQ-209' => ['Combo Bar/Line'],
        'F-REQ-210' => ['Horizontal Bar Chart'],
        'F-REQ-211' => ['Big Number avec couleur'],
        'F-REQ-212' => ['Big Number avec couleur'],
        'F-REQ-213' => ['Big Number avec couleur'],
        'F-REQ-214' => ['Big Number avec couleur'],
        'F-REQ-215' => ['Big Number avec couleur'],
        'F-REQ-216' => ['Gauge Chart (Jauge)'],
        'F-REQ-217' => ['Gauge Chart (Jauge)'],
        'F-REQ-218' => ['Big Number avec couleur'],
        'F-REQ-219' => ['Big Number avec couleur'],
        'F-REQ-301' => ['Big Number avec couleur', 'Liste de OF en cours non soldés'],
        'F-REQ-302' => ['Big Number avec couleur', 'Liste de OF en cours non soldés'],
        'F-REQ-303' => ['Big Number avec couleur', 'Liste de OF en cours non soldés'],
        'F-REQ-304' => ['Bar Chart (par chaîne)'],
        'F-REQ-305' => ['Donut Chart (Anneau)'],
        'F-REQ-306' => ['Big Number avec couleur'],
        'F-REQ-307' => ['Big Number avec couleur'],
        'F-REQ-308' => ['Big Number avec couleur'],
        'F-REQ-309' => ['Bar Chart (par chaîne)'],
        'F-REQ-310' => ['Bar Chart (par chaîne)'],
        'F-REQ-311' => ['Big Number avec couleur'],
        'F-REQ-312' => ['Big Number avec couleur'],
        'F-REQ-313' => ['Jauge Radiale'],
        'F-REQ-314' => ['Jauge Radiale'],
        'F-REQ-315' => ['Jauge Radiale'],
        'F-REQ-316' => ['Jauge Radiale'],
        'F-REQ-317' => ['Jauge Radiale'],
        'F-REQ-318' => ['Jauge Radiale'],
        'F-REQ-319' => ['Big Number avec couleur'],
        'F-REQ-320' => ['Big Number avec couleur'],
        'F-REQ-321' => ['Big Number avec couleur'],
        'F-REQ-322' => ['Gauge Chart (Jauge)'],
        'F-REQ-323' => ['Gauge Chart (Jauge)'],
        'F-REQ-324' => ['Gauge Chart (Jauge)'],
        'F-REQ-325' => ['Big Number avec couleur'],
        'F-REQ-326' => ['Big Number avec couleur'],
        'F-REQ-327' => ['Big Number avec couleur'],
        'F-REQ-328' => ['Big Number avec couleur'],
        'F-REQ-329' => ['Big Number avec couleur'],
        'F-REQ-330' => ['Big Number avec couleur'],
        'F-REQ-331' => ['Pie Chart (Secteurs)'],
        'F-REQ-332' => ['Pie Chart (Secteurs)'],
        'F-REQ-333' => ['Pie Chart (Secteurs)'],
        'F-REQ-334' => ['Line Chart (Courbe)'],
        'F-REQ-335' => ['Line Chart (Courbe)'],
        'F-REQ-336' => ['Line Chart (Courbe)'],
        'F-REQ-337' => ['Big Number avec couleur'],
        'F-REQ-350' => ['Big Number avec couleur'],
        'F-REQ-351' => ['Gauge Chart (Jauge)'],
        'F-REQ-352' => ['Line Chart mensuel'],
        'F-REQ-353' => ['Scatter Plot (Nuage)'],
    ];

    public function run(): void
    {
        $updated = 0;
        foreach (self::GRAPH_TYPE_MAP as $kpiCode => $graphTypes) {
            $count = DataMapping::where('kpi', $kpiCode)
                ->whereNull('graph_types')
                ->update(['graph_types' => $graphTypes]);
            $updated += $count;
        }
        $this->command->info("Updated graph_types for {$updated} data_mapping rows.");
    }
}
