<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\KpiComputeService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class QualityController extends Controller
{
    public function __construct(
        private KpiComputeService $kpi,
    ) {}

    /**
     * All 17 KPI cards in one call
     */
    public function kpis(Request $request): JsonResponse
    {
        $today = Carbon::today();
        $year = $today->year;

        // RFT Ce Jour
        $piecesOkJour = DB::table('pieces_ok_jour')->whereDate('date', $today)->first();
        $piecesProduiteJour = DB::table('pieces_produites_jour')->whereDate('date', $today)->first();
        $rftJour = $this->kpi->computeRft(
            $piecesOkJour?->first_pass_today,
            $piecesProduiteJour?->produced_today
        );

        // RFT Année
        $piecesOkAnnee = DB::table('pieces_ok_annee')->where('year', $year)->first();
        $piecesProduiteAnnee = DB::table('pieces_produites_annee')->where('year', $year)->first();
        $rftAnnee = $this->kpi->computeRft(
            $piecesOkAnnee?->first_pass_year,
            $piecesProduiteAnnee?->produced_year
        );

        // BR Bundling
        $brBundlingJour = $this->computeBrBundling('jour', $today);
        $brBundlingAnnee = $this->computeBrBundling('annee', $today);

        // BR GTD — F-REQ-102/103 from DIVA (packets_rejetes + colis_total_var)
        $brGtdJour = $this->computeBrGtdJour($today);
        $brGtdAnnee = $this->computeBrGtdAnnee($year);

        // BR Commande (DDA) — F-REQ-101 from sync_drive_inspection_commande
        $brCgl = $this->computeDriveBrDda('sync_drive_inspection_commande', $year);

        // Bundling active check
        $bundlingActive = DB::table('rejets_inspection_paquet')
            ->where('period', 'jour')
            ->value('is_active');
        $bundlingBlocker = $bundlingActive === false ? 'B-01: Novacity bundling queries inactive' : null;

        // BR IN (inspection colis) — no data source yet (DRIVE)
        $brInJour = null;
        $brInDda = null;

        // Per-table synced_at
        $syncedAt = function (string $table) {
            return DB::table($table)->orderByDesc('synced_at')->value('synced_at');
        };

        return response()->json([
            'br_commande' => [
                'value' => $brCgl['value'],
                'status' => $brCgl['status'],
                'source' => 'sync_drive_inspection_commande (inactive)',
                'synced_at' => $syncedAt('sync_drive_inspection_commande'),
            ],

            'br_gtd_jour' => [
                'value' => $brGtdJour,
                'status' => $this->kpi->brStatus($brGtdJour),
                'source' => 'DIVA (packets_rejetes + colis_total_var)',
                'synced_at' => $syncedAt('packets_rejetes'),
            ],

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
                'synced_at' => $syncedAt('pieces_ok_jour'),
            ],

            'br_bundling_jour' => [
                'value' => $brBundlingJour,
                'status' => $this->kpi->brStatus($brBundlingJour),
                'blocker' => $bundlingBlocker,
                'synced_at' => $syncedAt('rejets_inspection_paquet'),
            ],

            'br_gtd_annee' => [
                'value' => $brGtdAnnee,
                'status' => $this->kpi->brStatus($brGtdAnnee),
                'source' => 'DIVA (packets_rejetes + colis_total_var)',
                'synced_at' => $syncedAt('packets_rejetes'),
            ],

            'rft_annee' => [
                'value' => $rftAnnee,
                'status' => $this->kpi->rftStatus($rftAnnee),
                'raw' => [
                    'first_pass' => $piecesOkAnnee?->first_pass_year,
                    'produced' => $piecesProduiteAnnee?->produced_year,
                ],
                'synced_at' => $syncedAt('pieces_ok_annee'),
            ],

            'br_bundling_annee' => [
                'value' => $brBundlingAnnee,
                'status' => $this->kpi->brStatus($brBundlingAnnee),
                'blocker' => $bundlingBlocker,
                'synced_at' => $syncedAt('rejets_inspection_paquet'),
            ],

            'br_print' => array_merge($this->computeDriveBr('sync_drive_br_print', $today), ['synced_at' => $syncedAt('sync_drive_br_print')]),
            'br_print_dda' => array_merge($this->computeDriveBrDda('sync_drive_br_print', $year), ['synced_at' => $syncedAt('sync_drive_br_print')]),
            'br_care_label_jour' => array_merge($this->computeDriveBr('sync_drive_br_care_label', $today), ['synced_at' => $syncedAt('sync_drive_br_care_label')]),
            'br_care_label_dda' => array_merge($this->computeDriveBrDda('sync_drive_br_care_label', $year), ['synced_at' => $syncedAt('sync_drive_br_care_label')]),
            'br_accessoires_jour' => array_merge($this->computeDriveBr('sync_drive_br_accessoires', $today), ['synced_at' => $syncedAt('sync_drive_br_accessoires')]),
            'br_accessoires_dda' => array_merge($this->computeDriveBrDda('sync_drive_br_accessoires', $year), ['synced_at' => $syncedAt('sync_drive_br_accessoires')]),
            'br_compo_jour' => array_merge($this->computeDriveBr('sync_drive_br_compo', $today), ['synced_at' => $syncedAt('sync_drive_br_compo')]),
            'br_compo_dda' => array_merge($this->computeDriveBrDda('sync_drive_br_compo', $year), ['synced_at' => $syncedAt('sync_drive_br_compo')]),

            'br_in_jour' => [
                'value' => $brInJour,
                'status' => 'grey',
                'source' => 'DRIVE (inactive)',
                'synced_at' => null,
            ],

            'br_in_dda' => [
                'value' => $brInDda,
                'status' => 'grey',
                'source' => 'DRIVE (inactive)',
                'synced_at' => null,
            ],

            'synced_at' => $syncedAt('pieces_ok_jour'),
        ]);
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

        $teams = $chainData->map(function ($row) use ($globalRft, $globalRftOk) {
            $defectPct = $row->avg_defect_pct;

            // CDC formula: score = (BR × 5) + (BR_IN × 3) + (BR_GTD × 3) + (RFT × 1)
            $br_gtd_ok = $defectPct <= 5;
            // BR Commande (F-REQ-101) — data absent from API → always false
            $br_ok = false;
            // BR IN Inspection Colis (F-REQ-120) — DRIVE source, not connected → always false
            $br_in_ok = false;
            // RFT — global value, applied uniformly to all chains
            $rft_ok = $globalRftOk;

            $score = ($br_ok ? 5 : 0) + ($br_in_ok ? 3 : 0) + ($br_gtd_ok ? 3 : 0) + ($rft_ok ? 1 : 0);
            $maxScore = 12;
            $partialScore = ! $br_ok || ! $br_in_ok;

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
                'partial_score' => $partialScore,
            ];
        })
            ->values()
            ->sort(fn ($a, $b) => $b['score'] <=> $a['score'] ?: $a['defect_pct'] <=> $b['defect_pct'])
            ->values();

        return response()->json([
            'best' => $teams->take(3)->values(),
            'worst' => $teams->reverse()->take(3)->values(),
            'is_partial' => false,
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

    /**
     * F-REQ-116: Pareto Defects RFT (jour en cours)
     * Default filter: OpNo in OP93, OP100, OP102 (per CDC spec)
     */
    public function paretoRft(Request $request): JsonResponse
    {
        $today = Carbon::today();
        $ops = $request->input('ops');

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

    /**
     * F-REQ-117: Pareto Defects Inspection Colis (BR IN + BR GTD)
     * Combines qcm_defect_trx (AQL inspection) + packets_rejetes (RFID/GTD colis)
     */
    public function paretoInspection(Request $request): JsonResponse
    {
        $today = Carbon::today();

        // AQL inspection defects from qcm_defect_trx
        $aqlItems = DB::table('qcm_defect_trx')
            ->whereDate('log_date', $today)
            ->groupBy('item_id')
            ->selectRaw("'AQL: ' || item_id as label, COUNT(*) as value")
            ->get();

        // RFID/GTD colis rejections from packets_rejetes
        $rfidItems = DB::table('packets_rejetes')
            ->whereDate('date_rejet', $today)
            ->groupBy('motif')
            ->selectRaw("'RFID: ' || motif as label, SUM(qtte) as value")
            ->get();

        // Combine both sources
        $items = $aqlItems->concat($rfidItems)
            ->sortByDesc('value')
            ->values();

        return response()->json(['data' => $this->buildPareto($items, 'label', 'value')]);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function computeDriveBr(string $table, Carbon $today): array
    {
        $row = DB::table($table)->whereDate('date', $today)->first();

        if (! $row) {
            $row = DB::table($table)->orderByDesc('date')->first();
            if (! $row || $row->nb_inspections == 0) {
                return ['value' => null, 'status' => 'grey', 'source' => $table];
            }
            $br = round(($row->nb_rejets / $row->nb_inspections) * 100, 1);

            return [
                'value' => $br,
                'status' => $this->kpi->brStatus($br),
                'source' => $table.' (stale: '.$row->date.')',
            ];
        }

        if ($row->nb_inspections == 0) {
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

    private function computeBrBundling(string $period, ?Carbon $today = null): ?float
    {
        if ($period === 'annee' && $today) {
            $row = DB::table('rejets_inspection_paquet')
                ->where('period', $period)
                ->whereYear('date', $today->year)
                ->selectRaw('SUM(bundle_reject) as total_reject, SUM(bundle_inspected) as total_inspected')
                ->first();

            if (! $row || $row->total_inspected == 0) {
                return null;
            }

            return round(($row->total_reject / $row->total_inspected) * 100, 1);
        }

        $row = DB::table('rejets_inspection_paquet')
            ->where('period', $period)
            ->when($today, fn ($q) => $q->whereDate('date', $today))
            ->orderByDesc('date')
            ->first();

        if (! $row || $row->bundle_inspected == 0) {
            return null;
        }

        return round(($row->bundle_reject / $row->bundle_inspected) * 100, 1);
    }

    /**
     * F-REQ-102: BR GTD (jour) — DIVA
     * Formula: SUM(packets_rejetes.qtte) / SUM(colis_total_var.total_colis) × 100
     */
    private function computeBrGtdJour(Carbon $today): ?float
    {
        $rejets = DB::table('packets_rejetes')
            ->whereDate('date_rejet', $today)
            ->value(DB::raw('COALESCE(SUM(qtte), 0)'));

        $colis = DB::table('colis_total_var')
            ->value(DB::raw('COALESCE(SUM(total_colis), 0)'));

        if ($colis == 0) {
            return null;
        }

        return round(($rejets / $colis) * 100, 1);
    }

    /**
     * F-REQ-103: BR GTD DDA (annuel) — DIVA
     * Formula: SUM(packets_rejetes.qtte) / SUM(colis_total_var.total_colis) × 100
     */
    private function computeBrGtdAnnee(int $year): ?float
    {
        $rejets = DB::table('packets_rejetes')
            ->whereYear('date_rejet', $year)
            ->value(DB::raw('COALESCE(SUM(qtte), 0)'));

        $colis = DB::table('colis_total_var')
            ->value(DB::raw('COALESCE(SUM(total_colis), 0)'));

        if ($colis == 0) {
            return null;
        }

        return round(($rejets / $colis) * 100, 1);
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
