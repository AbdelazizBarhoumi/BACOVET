<?php

namespace Database\Seeders;

use App\Models\BuilderPage;
use Illuminate\Database\Seeder;

class BuilderPageSeeder extends Seeder
{
    private const PAGES = [
        'development'           => 'Développement',
        'logistics'             => 'Logistique',
        'methodes'              => 'Méthodes',
        'production'            => 'Production',
        'production:confection' => 'Production Confection',
        'production:coupe'      => 'Production Coupe',
        'production:flux'       => 'Production Flux',
        'quality'               => 'Qualité',
    ];

    // Map data-mappings graph_types to builder WidgetType
    private const GRAPH_TYPE_MAP = [
        'Big Number avec couleur'            => 'kpi',
        'Gauge Chart (Jauge)'                => 'gauge',
        'Jauge Radiale'                      => 'gauge',
        'Line Chart (Courbe)'                => 'line',
        'Line Chart mensuel'                 => 'line',
        'Scatter Plot (Nuage)'               => 'sparkline',
        'Pie Chart (Secteurs)'               => 'pie',
        'Donut Chart (Anneau)'               => 'donut',
        'Combo Bar/Line'                     => 'combo',
        'Bar Chart (par chaîne)'             => 'bar',
        'Horizontal Bar Chart'               => 'bar',
        'Area Chart (Graph. aires)'          => 'area',
        'Chronologie (Timeline)'             => 'sparkline',
        'Radar Chart'                        => 'radar',
        'Table'                              => 'table',
        'Liste de OF en cours non soldés'    => 'table',
    ];

    // Default sizes from builder store.tsx
    private const DEFAULT_SIZE = [
        'kpi'       => ['w' => 3,  'h' => 3],
        'gauge'     => ['w' => 3,  'h' => 4],
        'sparkline' => ['w' => 3,  'h' => 2],
        'line'      => ['w' => 6,  'h' => 4],
        'bar'       => ['w' => 6,  'h' => 4],
        'donut'     => ['w' => 3,  'h' => 4],
        'pie'       => ['w' => 4,  'h' => 4],
        'combo'     => ['w' => 8,  'h' => 5],
        'area'      => ['w' => 6,  'h' => 4],
        'table'     => ['w' => 6,  'h' => 5],
        'radar'     => ['w' => 5,  'h' => 5],
    ];

    public function run(): void
    {
        $mappings = config('data-mappings');

        foreach (self::PAGES as $slug => $name) {
            if (!isset($mappings[$slug])) {
                continue;
            }

            $kpis = $mappings[$slug]['kpis'] ?? [];
            $widgets = $this->buildLayout($kpis, $name);

            BuilderPage::updateOrCreate(
                ['slug' => $slug],
                ['name' => $name, 'layout' => $widgets]
            );
        }
    }

    private function buildLayout(array $kpis, string $pageTitle): array
    {
        $widgets = [];
        $y = 0;

        // Title widget
        $widgets[] = [
            'id'     => $this->uid(),
            'type'   => 'text',
            'x'      => 0,
            'y'      => $y,
            'w'      => 24,
            'h'      => 1,
            'config' => [
                'label'     => $pageTitle,
                'text'      => $pageTitle,
                'fontSize'  => 20,
                'fontWeight'=> 800,
                'align'     => 'left',
                'fg'        => 'var(--foreground)',
                'radius'    => 4,
                'padding'   => 8,
            ],
        ];
        $y += 2;

        // Group KPIs by unique code (data-mappings may repeat KPI codes across pages)
        $seen = [];
        foreach ($kpis as $kpi) {
            $code = $kpi['kpi'];
            if (isset($seen[$code])) {
                continue;
            }
            $seen[$code] = true;

            $graphType = $kpi['graph_types'][0] ?? null;
            $widgetType = self::GRAPH_TYPE_MAP[$graphType] ?? 'kpi';
            $size = self::DEFAULT_SIZE[$widgetType] ?? ['w' => 6, 'h' => 4];

            $target = $kpi['target'] ?? null;
            $targetValue = $target['value'] ?? null;
            $isPercentage = $target['is_percentage'] ?? false;

            $widgets[] = [
                'id'     => $this->uid(),
                'type'   => $widgetType,
                'x'      => 0,
                'y'      => $y,
                'w'      => $size['w'],
                'h'      => $size['h'],
                'config' => [
                    'kpiCode'    => $code,
                    'label'      => $kpi['name'],
                    'unit'       => $isPercentage ? '%' : '',
                    'decimals'   => 1,
                    'target'     => $targetValue,
                    'accent'     => '#22c55e',
                    'showTarget' => true,
                    'showLabel'  => true,
                    'shadow'     => 'sm',
                    'radius'     => 8,
                    'padding'    => 8,
                ],
            ];

            $y += $size['h'] + 1;
        }

        return ['version' => 1, 'widgets' => $widgets];
    }

    private function uid(): string
    {
        return substr(bin2hex(random_bytes(4)), 0, 7);
    }
}
