<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AlertService;
use App\Services\KpiComputeService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class QualityController extends Controller
{
    public function __construct(
        private KpiComputeService $kpi,
        private AlertService $alerts
    ) {}

    /**
     * All 8 KPI cards in one call
     */
    public function kpis(Request $request): JsonResponse
    {
        $today = Carbon::today();
        $year = $today->year;

        // Card 3 — RFT Ce Jour
        $piecesOkJour = DB::table('pieces_ok_jour')->where('date', $today)->first();
        $piecesProduiteJour = DB::table('pieces_produites_jour')->where('date', $today)->first();
        $rftJour = $this->kpi->computeRft(
            $piecesOkJour?->first_pass_today,
            $piecesProduiteJour?->produced_today
        );

        // Card 6 — RFT Année
        $piecesOkAnnee = DB::table('pieces_ok_annee')->where('year', $year)->first();
        $piecesProduiteAnnee = DB::table('pieces_produites_annee')->where('year', $year)->first();
        $rftAnnee = $this->kpi->computeRft(
            $piecesOkAnnee?->first_pass_year,
            $piecesProduiteAnnee?->produced_year
        );

        // Cards 4 & 7 — BR Bundling (B-01: check if active)
        $bundlingActive = DB::table('novacity_sync_jobs')
            ->where('query_slug', 'like', '%inspection_paquet%')
            ->where('is_active', true)
            ->exists();

        $brBundlingJour = $bundlingActive ? $this->computeBrBundling('jour') : null;
        $brBundlingAnnee = $bundlingActive ? $this->computeBrBundling('annee') : null;

        return response()->json([
            // Cards 1, 2, 5 — B-02 DIVA (not yet available)
            'br_cgl' => ['value' => null, 'status' => 'pending', 'blocker' => 'B-02'],
            'br_gtd_jour' => ['value' => null, 'status' => 'pending', 'blocker' => 'B-02'],
            'br_gtd_annee' => ['value' => null, 'status' => 'pending', 'blocker' => 'B-02'],

            // Card 3 — RFT Ce Jour
            'rft_jour' => [
                'value' => $rftJour,
                'status' => $this->kpi->rftStatus($rftJour),
                'raw' => [
                    'first_pass' => $piecesOkJour?->first_pass_today,
                    'produced' => $piecesProduiteJour?->produced_today,
                ],
            ],

            // Card 4 — BR Bundling Ce Jour
            'br_bundling_jour' => [
                'value' => $brBundlingJour,
                'status' => $bundlingActive ? $this->kpi->brStatus($brBundlingJour) : 'inactive',
                'blocker' => $bundlingActive ? null : 'B-01',
            ],

            // Card 6 — RFT Année
            'rft_annee' => [
                'value' => $rftAnnee,
                'status' => $this->kpi->rftStatus($rftAnnee),
                'raw' => [
                    'first_pass' => $piecesOkAnnee?->first_pass_year,
                    'produced' => $piecesProduiteAnnee?->produced_year,
                ],
            ],

            // Card 7 — BR Bundling Année
            'br_bundling_annee' => [
                'value' => $brBundlingAnnee,
                'status' => $bundlingActive ? $this->kpi->brStatus($brBundlingAnnee) : 'inactive',
                'blocker' => $bundlingActive ? null : 'B-01',
            ],

            // Card 8 — BR Print (Google Drive — Sprint 7)
            'br_print' => ['value' => null, 'status' => 'pending', 'source' => 'google_drive'],

            // Sync metadata
            'synced_at' => DB::table('pieces_ok_jour')
                ->orderByDesc('synced_at')
                ->value('synced_at'),
        ]);
    }

    public function brChart(Request $request): JsonResponse
    {
        $today = Carbon::today();

        $data = DB::table('check_pass_qte')
            ->where('log_date', $today)
            ->groupBy('shortname')
            ->select('shortname', DB::raw('AVG(defect_pct) as avg_defect_pct'))
            ->get()
            ->map(fn ($row) => [
                'chain' => $row->shortname,
                'defect_pct' => round($row->avg_defect_pct, 2),
                'status' => $this->kpi->brStatus($row->avg_defect_pct),
            ]);

        return response()->json(['data' => $data, 'target' => 5]);
    }

    public function defectChart(Request $request): JsonResponse
    {
        $today = Carbon::today();

        $data = DB::table('vw_defects')
            ->where('log_date', $today)
            ->groupBy('op_no')
            ->select('op_no', DB::raw('SUM(qty) as total_qty'))
            ->orderByDesc('total_qty')
            ->limit(8)
            ->get();

        return response()->json(['data' => $data]);
    }

    public function qpTeams(Request $request): JsonResponse
    {
        $today = Carbon::today();

        // RFT per chain (available from GPRO)
        $rftPerChain = DB::table('check_pass_qte')
            ->where('log_date', $today)
            ->groupBy('shortname')
            ->select('shortname', DB::raw('AVG(defect_pct) as avg_defect_pct'))
            ->get()
            ->keyBy('shortname');

        $teams = $rftPerChain->map(function ($row) {
            $rftPct = 100 - $row->avg_defect_pct;
            $rft_ok = $rftPct >= 98;
            // B-01/B-02 not available yet — score partial
            $score = ($rft_ok ? 1 : 0);

            return [
                'chain' => $row->shortname,
                'score' => $score,
                'max_score' => 1, // partial (full max=12 when B-01/B-02 resolved)
                'rft_ok' => $rft_ok,
                'rft_pct' => round($rftPct, 1),
                'br_in_ok' => null, // B-01
                'br_gtd_ok' => null, // B-02
                'br_ok' => null, // B-02
                'partial_score' => true,
            ];
        })
            ->values()
            ->sortByDesc('score')
            ->values();

        return response()->json([
            'best' => $teams->take(3)->values(),
            'worst' => $teams->reverse()->take(3)->values(),
            'is_partial' => true,
            'missing_blockers' => ['B-01', 'B-02'],
        ]);
    }

    public function alerts(Request $request): JsonResponse
    {
        return response()->json([
            'alerts' => $this->alerts->generateQualityAlerts(),
        ]);
    }

    public function annualTrend(Request $request): JsonResponse
    {
        $data = DB::table('efficience_chaine')
            ->selectRaw("DATE_FORMAT(date, '%Y-%m') as month, AVG(efficience_pct) as avg_eff")
            ->groupBy('month')
            ->orderBy('month')
            ->get();

        return response()->json(['data' => $data]);
    }

    public function paretoRft(Request $request): JsonResponse
    {
        $today = Carbon::today();

        $items = DB::table('vw_defects')
            ->where('log_date', $today)
            ->groupBy('op_no')
            ->select('op_no', DB::raw('SUM(qty) as total'))
            ->orderByDesc('total')
            ->get();

        return response()->json(['data' => $this->buildPareto($items, 'op_no', 'total')]);
    }

    public function paretoInspection(Request $request): JsonResponse
    {
        $today = Carbon::today();

        $items = DB::table('qcm_defect_trx')
            ->where('log_date', $today)
            ->groupBy('item_id')
            ->select('item_id', DB::raw('SUM(occurrence_count) as total'))
            ->orderByDesc('total')
            ->get();

        return response()->json(['data' => $this->buildPareto($items, 'item_id', 'total')]);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function computeBrBundling(string $period): ?float
    {
        $row = DB::table('rejets_inspection_paquet')
            ->where('period', $period)
            ->orderByDesc('date')
            ->first();
        if (! $row || $row->bundle_inspected === 0) {
            return null;
        }

        return round(($row->bundle_reject / $row->bundle_inspected) * 100, 1);
    }

    private function buildPareto($items, string $labelKey, string $valueKey): array
    {
        $total = $items->sum($valueKey);
        $cumulative = 0;

        return $items->map(function ($item) use ($labelKey, $valueKey, $total, &$cumulative) {
            $cumulative += $item->$valueKey;

            return [
                'label' => $item->$labelKey,
                'value' => $item->$valueKey,
                'cumulative' => $total > 0 ? round(($cumulative / $total) * 100, 1) : 0,
            ];
        })->toArray();
    }
}
