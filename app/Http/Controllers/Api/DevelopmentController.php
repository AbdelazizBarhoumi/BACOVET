<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ManualKpiValue;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DevelopmentController extends Controller
{
    public function kpis(): JsonResponse
    {
        $keys = [
            'dev_rft' => ['target' => 95, 'target_kind' => 'min', 'frequency' => 'Mensuel'],
            'dev_livraison' => ['target' => 95, 'target_kind' => 'min', 'frequency' => 'Mensuel'],
            'dev_nomenclature' => ['target' => 98, 'target_kind' => 'min', 'frequency' => 'Mensuel'],
            'dev_reclamations' => ['target' => 2,  'target_kind' => 'max', 'frequency' => 'Mensuel'],
        ];

        $kpis = [];

        foreach ($keys as $key => $meta) {
            $record = ManualKpiValue::where('kpi_key', $key)->first();
            $value = $record?->value;

            $status = 'grey';
            if ($value !== null) {
                if ($meta['target_kind'] === 'min') {
                    $status = $value >= $meta['target'] ? 'green'
                        : ($value >= $meta['target'] - 3 ? 'orange' : 'red');
                } else {
                    $status = $value <= $meta['target'] - 1 ? 'green'
                        : ($value <= $meta['target'] ? 'orange' : 'red');
                }
            }

            $kpis[$key] = [
                'value' => $value,
                'numerator' => $record?->numerator,
                'denominator' => $record?->denominator,
                'target' => $meta['target'],
                'target_kind' => $meta['target_kind'],
                'frequency' => $meta['frequency'],
                'status' => $status,
                'updated_at' => $record?->updated_at?->toISOString(),
            ];
        }

        return response()->json([
            'kpis' => $kpis,
            'synced_at' => ManualKpiValue::max('updated_at'),
        ]);
    }

    public function trend(): JsonResponse
    {
        $history = DB::table('manual_kpi_history')
            ->where('kpi_key', 'dev_nomenclature')
            ->orderByDesc('year')
            ->orderByDesc('month')
            ->limit(12)
            ->get()
            ->reverse()
            ->values();

        $data = $history->map(fn ($row) => [
            'mois' => Carbon::createFromDate($row->year, $row->month, 1)->format('M'),
            'valeur' => round($row->value, 1),
        ])->toArray();

        return response()->json(['data' => $data]);
    }
}
