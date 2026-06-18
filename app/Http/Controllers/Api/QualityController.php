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
     * All 16 KPI cards in one call
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
        $brBundlingJour = $this->computeBrBundling('jour');
        $brBundlingAnnee = $this->computeBrBundling('annee');

        // Cards 1, 2, 5 — BR GTD computed from check_pass_qte as proxy for DIVA
        $brGtdJour = $this->computeBrGtdJour($today);
        $brGtdAnnee = $this->computeBrGtdAnnee($year);

        // Card 1 — BR CGL (DDA) — F-REQ-101 from sync_drive_inspection_commande
        $brCgl = $this->computeDriveBrDda('sync_drive_inspection_commande', $year);

        // Bundling active check
        $bundlingActive = DB::table('rejets_inspection_paquet')
            ->where('period', 'jour')
            ->value('is_active');
        $bundlingBlocker = $bundlingActive === false ? 'B-01: Novacity bundling queries inactive' : null;

        return response()->json([
            // Card 1 — BR CGL (DDA) — F-REQ-101
            'br_cgl' => $brCgl,

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
                'blocker' => $piecesOkJour && $piecesOkJour->date !== $today->toDateString()
                    ? 'RFT data stale — last update: '.$piecesOkJour->date
                    : null,
                'raw' => [
                    'first_pass' => $piecesOkJour?->first_pass_today,
                    'produced' => $piecesProduiteJour?->produced_today,
                ],
            ],

            // Card 4 — BR Bundling Ce Jour
            'br_bundling_jour' => [
                'value' => $brBundlingJour,
                'status' => $this->kpi->brStatus($brBundlingJour),
                'blocker' => $bundlingBlocker,
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
                'status' => $this->kpi->brStatus($brBundlingAnnee),
                'blocker' => $bundlingBlocker,
            ],

            // Card 8 — BR Print (Google Drive)
            'br_print' => $this->computeDriveBr('sync_drive_br_print', $today),

            // Cards 9-15 — Google Drive sourced
            'br_print_dda' => $this->computeDriveBrDda('sync_drive_br_print', $year),
            'br_care_label_jour' => $this->computeDriveBr('sync_drive_br_care_label', $today),
            'br_care_label_dda' => $this->computeDriveBrDda('sync_drive_br_care_label', $year),
            'br_accessoires_jour' => $this->computeDriveBr('sync_drive_br_accessoires', $today),
            'br_accessoires_dda' => $this->computeDriveBrDda('sync_drive_br_accessoires', $year),
            'br_compo_jour' => $this->computeDriveBr('sync_drive_br_compo', $today),
            'br_compo_dda' => $this->computeDriveBrDda('sync_drive_br_compo', $year),

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

        // Bundling stage — from rejets_inspection_paquet
        $brBundling = null;
        $row = DB::table('rejets_inspection_paquet')->where('period', 'jour')->orderByDesc('date')->first();
        if ($row && $row->bundle_inspected > 0) {
            $brBundling = round(($row->bundle_reject / $row->bundle_inspected) * 100, 1);
        }

        // Build stages array — CDC inspection stages
        $printBr = $this->computeDriveBr('sync_drive_br_print', $today);
        $accessoiresBr = $this->computeDriveBr('sync_drive_br_accessoires', $today);
        $compoBr = $this->computeDriveBr('sync_drive_br_compo', $today);
        $inspectionCmdBr = $this->computeDriveBr('sync_drive_inspection_commande', $today);

        $stages = [
            ['stage' => 'CGL', 'defect_pct' => $inspectionCmdBr['value'], 'status' => $inspectionCmdBr['status'], 'source' => 'sync_drive_inspection_commande'],
            ['stage' => 'AQL', 'defect_pct' => $aqlRow?->avg_defect_pct ? round($aqlRow->avg_defect_pct, 2) : null, 'status' => $aqlRow?->avg_defect_pct ? $this->kpi->brStatus($aqlRow->avg_defect_pct) : 'grey', 'source' => 'check_pass_qte'],
            ['stage' => 'Bundling', 'defect_pct' => $brBundling, 'status' => $brBundling !== null ? $this->kpi->brStatus($brBundling) : 'grey', 'source' => 'rejets_inspection_paquet'],
            ['stage' => 'Print', 'defect_pct' => $printBr['value'], 'status' => $printBr['status'], 'source' => 'sync_drive_br_print'],
            ['stage' => 'Accessoires', 'defect_pct' => $accessoiresBr['value'], 'status' => $accessoiresBr['status'], 'source' => 'sync_drive_br_accessoires'],
            ['stage' => 'Composants', 'defect_pct' => $compoBr['value'], 'status' => $compoBr['status'], 'source' => 'sync_drive_br_compo'],
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

        // Compute bundling BR
        $brBundlingJour = null;
        $bundlingRow = DB::table('rejets_inspection_paquet')
            ->where('period', 'jour')
            ->orderByDesc('date')
            ->first();
        if ($bundlingRow && $bundlingRow->bundle_inspected > 0) {
            $brBundlingJour = ($bundlingRow->bundle_reject / $bundlingRow->bundle_inspected) * 100;
        }

        $teams = $chainData->map(function ($row) use ($globalRft, $globalRftOk, $brBundlingJour) {
            $defectPct = $row->avg_defect_pct;

            // CDC formula: score = (br_ok * 5) + (br_in_ok * 3) + (br_gtd_ok * 3) + (rft_ok * 1)
            $br_gtd_ok = $defectPct <= 5;
            // BR CGL (DIVA) — not available → always 0 (weight 5 unavailable)
            $br_ok = false;
            // BR Bundling
            $br_in_ok = $brBundlingJour !== null && $brBundlingJour <= 5;
            // RFT — global value, applied uniformly to all chains
            $rft_ok = $globalRftOk;

            $score = ($br_ok ? 5 : 0) + ($br_in_ok ? 3 : 0) + ($br_gtd_ok ? 3 : 0) + ($rft_ok ? 1 : 0);
            // Max achievable: 0 (br_ok unavailable) + 3 + 3 + 1 = 7
            $maxScore = ($br_ok ? 5 : 0) + 3 + 3 + 1;

            return [
                'chain' => $row->shortname,
                'score' => $score,
                'max_score' => $maxScore,
                'rft_ok' => $rft_ok,
                'rft_pct' => $globalRft,
                'br_in_ok' => $br_in_ok,
                'br_gtd_ok' => $br_gtd_ok,
                'br_ok' => $br_ok,
                'defect_pct' => round($defectPct, 2),
                'partial_score' => ! $br_ok,
            ];
        })
            ->values()
            ->sortByDesc('score')
            ->sort(fn ($a, $b) => $a['score'] === $b['score'] ? $a['defect_pct'] <=> $b['defect_pct'] : 0)
            ->values();

        return response()->json([
            'best' => $teams->take(3)->values(),
            'worst' => $teams->reverse()->take(3)->values(),
            'is_partial' => false,
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

        // BR Bundling trend: monthly reject rate from rejets_inspection_paquet (jour rows)
        // Note: is_active filter excludes inactive placeholder rows (B-01) that would pollute the monthly aggregate.
        // Daily reads in kpis()/brChart()/qpTeams() don't need this filter — they guard with bundle_inspected > 0.
        $brBundlingTrend = DB::table('rejets_inspection_paquet')
            ->where('period', 'jour')
            ->whereYear('date', $year)
            ->where('is_active', true)
            ->selectRaw("DATE_FORMAT(date, '%Y-%m') as month")
            ->selectRaw('SUM(bundle_reject) as total_reject')
            ->selectRaw('SUM(bundle_inspected) as total_inspected')
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->map(fn ($row) => [
                'month' => $row->month,
                'br_bundling' => $row->total_inspected > 0
                    ? round(($row->total_reject / $row->total_inspected) * 100, 1)
                    : null,
            ]);

        // Merge by month
        $months = $rftTrend->pluck('month')
            ->merge($brGtdTrend->pluck('month'))
            ->merge($brBundlingTrend->pluck('month'))
            ->unique()->sort()->values();
        $rftByMonth = $rftTrend->keyBy('month');
        $brByMonth = $brGtdTrend->keyBy('month');
        $brBundlingByMonth = $brBundlingTrend->keyBy('month');

        // Drive-sourced monthly trends
        $driveTables = [
            'br_print' => 'sync_drive_br_print',
            'br_care_label' => 'sync_drive_br_care_label',
            'br_accessoires' => 'sync_drive_br_accessoires',
            'br_compo' => 'sync_drive_br_compo',
        ];

        $driveTrends = [];
        foreach ($driveTables as $key => $table) {
            $trend = DB::table($table)
                ->whereYear('date', $year)
                ->selectRaw("DATE_FORMAT(date, '%Y-%m') as month")
                ->selectRaw('SUM(nb_rejets) as total_rejets')
                ->selectRaw('SUM(nb_inspections) as total_inspections')
                ->groupBy('month')
                ->orderBy('month')
                ->get()
                ->map(fn ($row) => [
                    'month' => $row->month,
                    'value' => $row->total_inspections > 0
                        ? round(($row->total_rejets / $row->total_inspections) * 100, 1)
                        : null,
                ]);
            $driveTrends[$key] = $trend->keyBy('month');
            $months = $months->merge($trend->pluck('month'))->unique()->sort()->values();
        }

        $data = $months->map(function ($month) use ($rftByMonth, $brByMonth, $brBundlingByMonth, $driveTrends) {
            $row = [
                'month' => $month,
                'rft' => $rftByMonth[$month]['rft'] ?? null,
                'br_gtd' => $brByMonth[$month]['br_gtd'] ?? null,
                'br_bundling' => $brBundlingByMonth[$month]['br_bundling'] ?? null,
            ];
            foreach ($driveTrends as $key => $byMonth) {
                $row[$key] = $byMonth[$month]['value'] ?? null;
            }

            return $row;
        })->values();

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

    public function paretoFg(Request $request): JsonResponse
    {
        $today = Carbon::today();

        // From packets_rejetes (DIVA)
        $packets = DB::table('packets_rejetes')
            ->whereDate('date_rejet', $today)
            ->groupBy('motif')
            ->select('motif as label', DB::raw('SUM(qtte) as value'))
            ->get();

        // From inspection_commande (Drive)
        $inspection = DB::table('sync_drive_inspection_commande')
            ->whereDate('date', $today)
            ->selectRaw("'Inspection Commande' as label, nb_rejets as value")
            ->first();

        $items = $packets;
        if ($inspection && $inspection->value > 0) {
            $items = $items->push($inspection);
        }
        $items = $items->sortByDesc('value')->values();

        return response()->json(['data' => $this->buildPareto($items, 'label', 'value')]);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function computeDriveBr(string $table, Carbon $today): array
    {
        $row = DB::table($table)->whereDate('date', $today)->first();

        if (! $row || $row->nb_inspections == 0) {
            return ['value' => null, 'status' => 'grey', 'source' => $table];
        }

        $br = round(($row->nb_rejets / $row->nb_inspections) * 100, 1);

        return [
            'value' => $br,
            'status' => $this->kpi->brStatus($br),
            'source' => $table,
        ];
    }

    private function computeDriveBrDda(string $table, int $year): array
    {
        $row = DB::table($table)
            ->whereYear('date', $year)
            ->selectRaw('SUM(nb_rejets) as total_rejets, SUM(nb_inspections) as total_inspections')
            ->first();

        if (! $row || $row->total_inspections == 0) {
            return ['value' => null, 'status' => 'grey', 'source' => $table];
        }

        $br = round(($row->total_rejets / $row->total_inspections) * 100, 1);

        return [
            'value' => $br,
            'status' => $this->kpi->brStatus($br),
            'source' => $table,
        ];
    }

    private function computeBrBundling(string $period): ?float
    {
        $row = DB::table('rejets_inspection_paquet')
            ->where('period', $period)
            ->orderByDesc('date')
            ->first();

        if (! $row || $row->bundle_inspected == 0) {
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
