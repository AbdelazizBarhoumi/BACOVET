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
        $piecesOkJour = DB::table('pieces_ok_jour')->whereDate('date', $today)->first();
        $piecesProduiteJour = DB::table('pieces_produites_jour')->whereDate('date', $today)->first();
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

        // Cards 4 & 7 — BR Bundling
        $bundlingActive = DB::table('rejets_inspection_paquet')
            ->where('is_active', true)
            ->exists();

        $brBundlingJour = $bundlingActive ? $this->computeBrBundling('jour') : null;
        $brBundlingAnnee = $bundlingActive ? $this->computeBrBundling('annee') : null;

        // Cards 1, 2, 5 — BR GTD computed from check_pass_qte as proxy for DIVA
        $brGtdJour = $this->computeBrGtdJour($today);
        $brGtdAnnee = $this->computeBrGtdAnnee($year);

        return response()->json([
            // Card 1 — BR CGL (DDA) — DIVA source, no endpoint available → pending
            'br_cgl' => ['value' => null, 'status' => 'pending', 'blocker' => 'B-02', 'source' => 'DIVA'],

            // Card 2 — BR GTD Ce Jour — computed from check_pass_qte (proxy for DIVA)
            'br_gtd_jour' => [
                'value' => $brGtdJour,
                'status' => $this->kpi->brStatus($brGtdJour),
                'source' => 'check_pass_qte (proxy DIVA)',
            ],

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

            // Card 5 — BR GTD DDA (Année) — computed from check_pass_qte
            'br_gtd_annee' => [
                'value' => $brGtdAnnee,
                'status' => $this->kpi->brStatus($brGtdAnnee),
                'source' => 'check_pass_qte (proxy DIVA)',
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

            // Cards 9-15 — Google Drive sourced (Sprint 7)
            'br_print_dda' => ['value' => null, 'status' => 'pending', 'source' => 'google_drive'],
            'br_care_label_jour' => ['value' => null, 'status' => 'pending', 'source' => 'google_drive'],
            'br_care_label_dda' => ['value' => null, 'status' => 'pending', 'source' => 'google_drive'],
            'br_accessoires_jour' => ['value' => null, 'status' => 'pending', 'source' => 'google_drive'],
            'br_accessoires_dda' => ['value' => null, 'status' => 'pending', 'source' => 'google_drive'],
            'br_compo_jour' => ['value' => null, 'status' => 'pending', 'source' => 'google_drive'],
            'br_compo_dda' => ['value' => null, 'status' => 'pending', 'source' => 'google_drive'],

            // Sync metadata
            'synced_at' => DB::table('pieces_ok_jour')
                ->orderByDesc('synced_at')
                ->value('synced_at'),
        ]);
    }

    public function brChart(Request $request): JsonResponse
    {
        $today = Carbon::today();
        $year = $today->year;

        // AQL stage — from check_pass_qte (end-of-line inspection)
        $aqlRow = DB::table('check_pass_qte')
            ->whereDate('log_date', $today)
            ->when($request->input('ligne'), fn ($q, $ligne) => $q->where('shortname', $ligne))
            ->selectRaw('AVG(defect_pct) as avg_defect_pct')
            ->first();

        // Bundling stage — from rejets_inspection_paquet (B-01)
        $bundlingActive = DB::table('rejets_inspection_paquet')->where('is_active', true)->exists();
        $brBundling = null;
        if ($bundlingActive) {
            $row = DB::table('rejets_inspection_paquet')->where('period', 'jour')->orderByDesc('date')->first();
            if ($row && $row->bundle_inspected > 0) {
                $brBundling = round(($row->bundle_reject / $row->bundle_inspected) * 100, 1);
            }
        }

        // Build stages array — CDC inspection stages
        $stages = [
            ['stage' => 'CGL', 'defect_pct' => null, 'status' => 'pending', 'blocker' => 'B-02', 'source' => 'DIVA'],
            ['stage' => 'AQL', 'defect_pct' => $aqlRow?->avg_defect_pct ? round($aqlRow->avg_defect_pct, 2) : null, 'status' => $aqlRow?->avg_defect_pct ? $this->kpi->brStatus($aqlRow->avg_defect_pct) : 'grey', 'source' => 'check_pass_qte'],
            ['stage' => 'Bundling', 'defect_pct' => $brBundling, 'status' => $bundlingActive ? ($brBundling !== null ? $this->kpi->brStatus($brBundling) : 'grey') : 'inactive', 'blocker' => $bundlingActive ? null : 'B-01', 'source' => 'rejets_inspection_paquet'],
            ['stage' => 'Print', 'defect_pct' => null, 'status' => 'pending', 'source' => 'Google Drive'],
            ['stage' => 'Accessoires', 'defect_pct' => null, 'status' => 'pending', 'source' => 'Google Drive'],
            ['stage' => 'Composants', 'defect_pct' => null, 'status' => 'pending', 'source' => 'Google Drive'],
        ];

        return response()->json(['data' => $stages, 'target' => 5]);
    }

    public function defectChart(Request $request): JsonResponse
    {
        $today = Carbon::today();

        $data = DB::table('vw_defects')
            ->whereDate('log_date', $today)
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

        // Per-chain BR GTD data from check_pass_qte
        $chainData = DB::table('check_pass_qte')
            ->whereDate('log_date', $today)
            ->when($request->input('ligne'), fn ($q, $ligne) => $q->where('shortname', $ligne))
            ->groupBy('shortname')
            ->select('shortname', DB::raw('AVG(defect_pct) as avg_defect_pct'))
            ->get()
            ->keyBy('shortname');

        // Global RFT — pieces_ok_jour + pieces_produites_jour (not per-chain)
        $piecesOkJour = DB::table('pieces_ok_jour')->whereDate('date', $today)->first();
        $piecesProduiteJour = DB::table('pieces_produites_jour')->whereDate('date', $today)->first();
        $globalRft = $this->kpi->computeRft(
            $piecesOkJour?->first_pass_today,
            $piecesProduiteJour?->produced_today
        );
        $globalRftOk = $globalRft !== null && $globalRft >= 98;

        // Check if bundling is active (B-01)
        $bundlingActive = DB::table('rejets_inspection_paquet')
            ->where('is_active', true)
            ->exists();

        // Compute bundling BR if available
        $brBundlingJour = null;
        if ($bundlingActive) {
            $bundlingRow = DB::table('rejets_inspection_paquet')
                ->where('period', 'jour')
                ->orderByDesc('date')
                ->first();
            if ($bundlingRow && $bundlingRow->bundle_inspected > 0) {
                $brBundlingJour = ($bundlingRow->bundle_reject / $bundlingRow->bundle_inspected) * 100;
            }
        }

        $teams = $chainData->map(function ($row) use ($globalRft, $globalRftOk, $brBundlingJour, $bundlingActive) {
            $defectPct = $row->avg_defect_pct;

            // CDC formula: score = (br_ok * 5) + (br_in_ok * 3) + (br_gtd_ok * 3) + (rft_ok * 1)
            $br_gtd_ok = $defectPct <= 5;
            // BR CGL (DIVA) — not available → always 0
            $br_ok = false;
            // BR Bundling (B-01) — available only if active
            $br_in_ok = $bundlingActive && $brBundlingJour !== null && $brBundlingJour <= 5;
            // RFT — global value, applied uniformly to all chains (no per-chain RFT available)
            $rft_ok = $globalRftOk;

            $score = ($br_ok ? 5 : 0) + ($br_in_ok ? 3 : 0) + ($br_gtd_ok ? 3 : 0) + ($rft_ok ? 1 : 0);

            // Tiebreaker: lower defect_pct = better (used when scores are equal)
            return [
                'chain' => $row->shortname,
                'score' => $score,
                'max_score' => $bundlingActive ? 7 : 4,
                'rft_ok' => $rft_ok,
                'rft_pct' => $globalRft,
                'br_in_ok' => $bundlingActive ? $br_in_ok : null,
                'br_gtd_ok' => $br_gtd_ok,
                'br_ok' => false,
                'defect_pct' => round($defectPct, 2),
                'partial_score' => true,
            ];
        })
            ->values()
            ->sortByDesc('score')
            ->sort(fn ($a, $b) => $a['score'] === $b['score'] ? $a['defect_pct'] <=> $b['defect_pct'] : 0)
            ->values();

        return response()->json([
            'best' => $teams->take(3)->values(),
            'worst' => $teams->reverse()->take(3)->values(),
            'is_partial' => true,
            'missing_blockers' => ['B-02'],
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
        $year = Carbon::now()->year;

        // RFT trend: monthly RFT from pieces_ok_jour + pieces_produites_jour
        $rftTrend = DB::table('pieces_ok_jour as j1')
            ->join('pieces_produites_jour as j2', 'j1.date', '=', 'j2.date')
            ->whereYear('j1.date', $year)
            ->selectRaw("DATE_FORMAT(j1.date, '%Y-%m') as month")
            ->selectRaw('SUM(j1.first_pass_today) as total_ok')
            ->selectRaw('SUM(j2.produced_today) as total_produced')
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->map(fn ($row) => [
                'month' => $row->month,
                'rft' => $row->total_produced > 0
                    ? round(($row->total_ok / $row->total_produced) * 100, 1)
                    : null,
            ]);

        // BR GTD trend: monthly avg defect_pct from check_pass_qte
        $brGtdTrend = DB::table('check_pass_qte')
            ->whereYear('log_date', $year)
            ->selectRaw("DATE_FORMAT(log_date, '%Y-%m') as month")
            ->selectRaw('AVG(defect_pct) as avg_defect_pct')
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->map(fn ($row) => [
                'month' => $row->month,
                'br_gtd' => round($row->avg_defect_pct, 1),
            ]);

        // Merge by month
        $months = $rftTrend->pluck('month')->merge($brGtdTrend->pluck('month'))->unique()->sort()->values();
        $rftByMonth = $rftTrend->keyBy('month');
        $brByMonth = $brGtdTrend->keyBy('month');

        $data = $months->map(fn ($month) => [
            'month' => $month,
            'rft' => $rftByMonth[$month]['rft'] ?? null,
            'br_gtd' => $brByMonth[$month]['br_gtd'] ?? null,
        ])->values();

        return response()->json(['data' => $data]);
    }

    public function paretoRft(Request $request): JsonResponse
    {
        $today = Carbon::today();
        $ops = $request->input('ops'); // optional: comma-separated op_no values (e.g. "93,100,102")

        $query = DB::table('vw_defects')
            ->whereDate('log_date', $today);

        if ($ops) {
            $opList = array_map('trim', explode(',', $ops));
            $query->whereIn('op_no', $opList);
        }

        $items = $query->groupBy('op_no')
            ->select('op_no', DB::raw('SUM(qty) as total'))
            ->orderByDesc('total')
            ->get();

        return response()->json(['data' => $this->buildPareto($items, 'op_no', 'total')]);
    }

    public function paretoInspection(Request $request): JsonResponse
    {
        $today = Carbon::today();

        $items = DB::table('qcm_defect_trx')
            ->whereDate('log_date', $today)
            ->groupBy('item_id')
            ->select('item_id', DB::raw('COUNT(*) as total'))
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

        if (! $row || ! $row->is_active || $row->bundle_inspected === null || $row->bundle_inspected === 0) {
            return null;
        }

        return round(($row->bundle_reject / $row->bundle_inspected) * 100, 1);
    }

    /**
     * BR GTD Ce Jour — average defect_pct from check_pass_qte for today (proxy for DIVA)
     */
    private function computeBrGtdJour(Carbon $today): ?float
    {
        $row = DB::table('check_pass_qte')
            ->whereDate('log_date', $today)
            ->selectRaw('AVG(defect_pct) as avg_defect_pct')
            ->first();

        if (! $row || $row->avg_defect_pct === null) {
            return null;
        }

        return round($row->avg_defect_pct, 1);
    }

    /**
     * BR GTD DDA (Année) — average defect_pct from check_pass_qte for the year (proxy for DIVA)
     */
    private function computeBrGtdAnnee(int $year): ?float
    {
        $row = DB::table('check_pass_qte')
            ->whereYear('log_date', $year)
            ->selectRaw('AVG(defect_pct) as avg_defect_pct')
            ->first();

        if (! $row || $row->avg_defect_pct === null) {
            return null;
        }

        return round($row->avg_defect_pct, 1);
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
