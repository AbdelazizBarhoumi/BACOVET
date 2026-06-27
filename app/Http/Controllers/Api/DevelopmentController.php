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

        $devData = DB::table('sync_drive_development')->get();
        $computed = $this->computeDevKpis($devData);

        $kpis = [];
        $globalSyncedAt = DB::table('sync_drive_development')->orderByDesc('synced_at')->value('synced_at')
            ?? ManualKpiValue::max('updated_at');

        foreach ($keys as $key => $meta) {
            // Use computed value if available, else fall back to manual
            $manualRecord = ManualKpiValue::where('kpi_key', $key)->first();
            $value = $computed[$key] ?? $manualRecord?->value;
            $numerator = $computed[$key.'_numerator'] ?? $manualRecord?->numerator;
            $denominator = $computed[$key.'_denominator'] ?? $manualRecord?->denominator;
            $source = $computed ? 'sync_drive_development' : 'manual_kpi_values';
            $kpiSyncedAt = $source === 'sync_drive_development' ? $globalSyncedAt : $manualRecord?->updated_at?->toISOString();

            $status = 'grey';
            if ($value !== null) {
                if ($meta['target_kind'] === 'min') {
                    $status = $value >= $meta['target'] ? 'green'
                        : ($value >= $meta['target'] - 3 ? 'orange' : 'red');
                } else {
                    $status = $value < $meta['target'] ? 'green'
                        : ($value <= $meta['target'] + 1 ? 'orange' : 'red');
                }
            }

            $isStale = false;
            if ($kpiSyncedAt) {
                $ageDays = Carbon::parse($kpiSyncedAt)->diffInDays(Carbon::now());
                $isStale = $ageDays > 7;
            }

            $kpis[$key] = [
                'value' => $value,
                'numerator' => $numerator,
                'denominator' => $denominator,
                'target' => $meta['target'],
                'target_kind' => $meta['target_kind'],
                'frequency' => $meta['frequency'],
                'status' => $status,
                'source' => $source,
                'synced_at' => $kpiSyncedAt,
                'is_stale' => $isStale,
                'updated_at' => $manualRecord?->updated_at?->toISOString(),
            ];
        }

        return response()->json([
            'kpis' => $kpis,
            'synced_at' => $globalSyncedAt,
        ]);
    }

    private function computeDevKpis($devData): array
    {
        $total = $devData->count();
        if ($total === 0) {
            return [];
        }

        // F-REQ-350 — RFT: statut_validation = 'OK'
        $rftOk = $devData->where('statut_validation', 'OK')->count();

        // F-REQ-351 — Respect Livraison: date_livraison_reelle <= date_livraison_prevue
        $delivered = $devData->filter(fn ($r) => $r->date_livraison_reelle !== null && $r->date_livraison_prevue !== null);
        $onTime = $delivered->filter(fn ($r) => $r->date_livraison_reelle <= $r->date_livraison_prevue);

        // F-REQ-352 — Fiabilité Nomenclature: nomenclature_valide = 1
        $nomenOk = $devData->where('nomenclature_valide', 1)->count();

        // F-REQ-353 — Réclamations: est_reclamation = 1
        $reclamations = $devData->where('est_reclamation', 1)->count();

        return [
            'dev_rft' => $total > 0 ? round(($rftOk / $total) * 100, 1) : null,
            'dev_rft_numerator' => $rftOk,
            'dev_rft_denominator' => $total,
            'dev_livraison' => $delivered->count() > 0 ? round(($onTime->count() / $delivered->count()) * 100, 1) : null,
            'dev_livraison_numerator' => $onTime->count(),
            'dev_livraison_denominator' => $delivered->count(),
            'dev_nomenclature' => $total > 0 ? round(($nomenOk / $total) * 100, 1) : null,
            'dev_nomenclature_numerator' => $nomenOk,
            'dev_nomenclature_denominator' => $total,
            'dev_reclamations' => $total > 0 ? round(($reclamations / $total) * 100, 1) : null,
            'dev_reclamations_numerator' => $reclamations,
            'dev_reclamations_denominator' => $total,
        ];
    }

    public function trend(): JsonResponse
    {
        // Try sync_drive_development first, fallback to manual_kpi_history
        $query = DB::table('sync_drive_development')
            ->whereNotNull('date');

        $driveData = $query
            ->selectRaw("DATE_FORMAT(date, '%Y-%m') as mois")
            ->selectRaw('COUNT(CASE WHEN nomenclature_valide = 1 THEN 1 END) as ok_count')
            ->selectRaw('COUNT(*) as total')
            ->groupBy('mois')
            ->orderBy('mois')
            ->get();

        if ($driveData->isNotEmpty()) {
            $data = $driveData->map(fn ($r) => [
                'mois' => Carbon::parse($r->mois.'-01')->format('M'),
                'valeur' => $r->total > 0 ? round(($r->ok_count / $r->total) * 100, 1) : null,
            ])->toArray();

            return response()->json(['data' => $data]);
        }

        // Fallback to manual history
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

    public function reclamationsScatter(): JsonResponse
    {
        $query = DB::table('sync_drive_development')
            ->whereNotNull('date')
            ->selectRaw("DATE_FORMAT(date, '%Y-%m') as mois")
            ->selectRaw('modele')
            ->selectRaw("COUNT(CASE WHEN est_reclamation = 1 THEN 1 END) as reclamations")
            ->selectRaw('COUNT(*) as total')
            ->groupBy('mois', 'modele')
            ->orderBy('mois');

        $data = $query->get()
            ->map(fn ($r) => [
                'mois' => Carbon::parse($r->mois.'-01')->format('M'),
                'modele' => $r->modele,
                'valeur' => $r->total > 0 ? round(($r->reclamations / $r->total) * 100, 1) : 0,
                'reclamations' => $r->reclamations,
                'total' => $r->total,
            ])
            ->toArray();

        return response()->json(['data' => $data]);
    }
}
