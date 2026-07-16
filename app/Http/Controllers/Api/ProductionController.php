<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AlertService;
use App\Services\KpiComputeService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ProductionController extends Controller
{
    private const DEFAULT_CADENCE = 100; // pcs/day placeholder

    private const DEFAULT_CADENCE_HEBDO = 1000; // pcs/week placeholder

    public function __construct(
        private KpiComputeService $kpi,
        private AlertService $alerts
    ) {}

    private function applyFilters($query, Request $request, string $dateColumn = 'date', string $chainColumn = 'chaine')
    {
        // Get the table name or alias to qualify columns
        $table = $query->from;
        $alias = $table;
        if (is_string($table) && str_contains(strtolower($table), ' as ')) {
            $parts = preg_split('/\s+as\s+/i', $table);
            $alias = trim(end($parts));
        }

        if ($request->filled('line')) {
            $query->where($alias.'.'.$chainColumn, $request->line);
        }
        if ($request->filled('atelier')) {
            $query->where($alias.'.atelier', $request->atelier);
        }
        if ($request->filled('of')) {
            // Check for 'of' or 'of_number' column on the base table
            $baseTable = is_string($table) ? explode(' ', $table)[0] : null;
            if ($baseTable && Schema::hasColumn($baseTable, 'of')) {
                $query->where($alias.'.of', $request->of);
            } elseif ($baseTable && Schema::hasColumn($baseTable, 'of_number')) {
                $query->where($alias.'.of_number', $request->of);
            }
        }

        return $query;
    }

    /**
     * F-REQ-211-215: Chain Info (Route: chain-info)
     */
    public function chainInfo(Request $request): JsonResponse
    {
        $today = Carbon::today();

        $wipQuery = DB::table('wip_chaine');
        $this->applyFilters($wipQuery, $request);
        $wip = $wipQuery->get()->keyBy('chaine');

        $effQuery = DB::table('efficience_chaine')->whereDate('date', $today);
        $this->applyFilters($effQuery, $request);
        $eff = $effQuery->get()->keyBy('chaine');

        $qualityQuery = DB::table('check_pass_qte')->whereDate('log_date', $today);
        $this->applyFilters($qualityQuery, $request, 'log_date', 'shortname');
        $quality = $qualityQuery->get()->groupBy('shortname');

        $departQuery = DB::table('qte_depart_chaine_article_of')->orderByDesc('id');
        $this->applyFilters($departQuery, $request);
        $depart = $departQuery->get()->groupBy('chaine');

        $avancementQuery = DB::table('etat_avancement');
        $this->applyFilters($avancementQuery, $request);
        $avancement = $avancementQuery->get()->keyBy('of');

        $fabrication = DB::table('of_fabrication')->get()->keyBy('of_number');
        $stock = DB::table('vue_stock')->get()->mapWithKeys(function ($item) {
            return [$item->code_mp => $item->designation];
        });

        // GPRO data (now available via mock)
        $gproArticle = DB::table('sync_gpro_article_master')->get()->keyBy('code_article');
        $gproPlanning = DB::table('sync_gpro_chain_planning')->get()->groupBy('chaine');
        $gproOfDates = DB::table('sync_gpro_of_dates')->get()->groupBy('of_numero');

        $missingFields = [];
        $chains = $wip->map(function ($w, $ch) use ($eff, $quality, $depart, $fabrication, $stock, $gproArticle, $gproPlanning, $gproOfDates, &$missingFields) {
            $e = $eff->get($ch);
            $q = $quality->get($ch)?->avg('defect_pct');

            $d = $depart->get($ch)?->first();
            $of = $d?->of ?? $w->of_number ?? 'N/A';
            $article = $d?->article ?? $w->article ?? 'N/A';

            $fb = $fabrication->get($of);
            $bpd = $fb?->dt_debut ?? $w->bpd ?? 'N/A';
            $epd = $fb?->dt_fin ?? $w->epd ?? 'N/A';
            $designation = $stock->get($article) ?? 'N/A';
            if ($designation === 'N/A') {
                $articleSuffix = substr($article, strpos($article, '-') + 1);
                $designation = $stock->first(fn ($val, $key) => str_ends_with($key, $articleSuffix)) ?? 'N/A';
            }

            // Objectif: Use GPRO chain planning if available, else quantity launched
            $gproPlan = $gproPlanning->get($ch)?->first();
            $objectif = $gproPlan?->objectif_journalier ?? $d?->quantite ?? 'N/A';

            // GPRO data for SAM, SOT, Effectif, EHD
            $gproArt = $gproArticle->get($article);
            if ($gproArt === null && $article !== 'N/A') {
                $articleSuffix = substr($article, strrpos($article, '-') + 1);
                $gproArt = $gproArticle->first(fn ($val, $key) => str_ends_with($key, $articleSuffix));
            }
            $sam = $gproArt?->sam_min ?? 'N/A';
            $sot = $gproArt?->sot_min ?? 'N/A';
            $effectif = $gproArt?->effectif_requis ?? $gproPlan?->objectif_journalier ?? 'N/A';

            // EHD from GPRO of_dates, fallback to wip_chaine
            $ofDates = $gproOfDates->get($of)?->first();
            $ehd = $ofDates?->ehd ?? $w->ehd ?? 'N/A';

            if ($sam === 'N/A') {
                $missingFields[] = 'SAM (F-REQ-211)';
            }
            if ($sot === 'N/A') {
                $missingFields[] = 'SOT (F-REQ-212)';
            }
            if ($effectif === 'N/A') {
                $missingFields[] = 'Effectif (F-REQ-213)';
            }

            return [
                'id' => $ch,
                'of' => $of,
                'article' => $article,
                'designation' => $designation,
                'sam' => $sam,
                'sot' => $sot,
                'effectif' => $effectif,
                'objectif' => $objectif,
                'eff' => $e ? (float) $e->efficience_pct : 0,
                'hp' => $e ? (float) $e->heures_prod : 0,
                'hs' => $e ? (float) $e->heures_standards : 0,
                'wip' => (int) $w->en_cours,
                'br_gtd' => $q ? round($q, 1) : 0,
                'status' => $this->kpi->efficienceStatus($e?->efficience_pct),
                'bpd' => $bpd,
                'epd' => $epd,
                'ehd' => $ehd,
                'entree_jour' => (int) $w->entree_jour,
                'sortie_jour' => (int) $w->sortie_jour,
            ];
        })->values();

        $wipSyncedAt = DB::table('wip_chaine')->max('synced_at');
        $effSyncedAt = DB::table('efficience_chaine')->whereDate('date', $today)->max('date') ?? DB::table('efficience_chaine')->max('date');

        return response()->json([
            'data' => $chains,
            'metadata' => [
                'missing_fields' => array_unique($missingFields),
                'synced_at' => [
                    'wip' => $wipSyncedAt,
                    'efficience' => $effSyncedAt,
                ],
            ],
        ]);
    }

    /**
     * F-REQ-202, 204: Global KPIs (Route: kpis)
     */
    public function kpis(Request $request): JsonResponse
    {
        $today = Carbon::today();

        // 1. Efficience
        $effQuery = DB::table('efficience_chaine')->whereDate('date', $today);
        $this->applyFilters($effQuery, $request);
        $stats = $effQuery->select(
            DB::raw('AVG(efficience_pct) as avg_eff'),
            DB::raw('SUM(heures_standards) as total_std'),
            DB::raw('SUM(heures_prod) as total_prod')
        )->first();
        $effSyncedAt = DB::table('efficience_chaine')->whereDate('date', $today)->max('date') ?? DB::table('efficience_chaine')->max('date');

        // 2. RFT Production — global daily totals, not per-chain (no atelier filter)
        $piecesOkJour = DB::table('pieces_ok_jour')->whereDate('date', $today)->first();
        $piecesProduiteJour = DB::table('pieces_produites_jour')->whereDate('date', $today)->first();

        $rftJour = $this->kpi->computeRft($piecesOkJour?->first_pass_today, $piecesProduiteJour?->produced_today);
        $rftSyncedAt = DB::table('pieces_ok_jour')->whereDate('date', $today)->max('date') ?? $today->toIso8601String();

        // 3. BR GTD (Card 2 proxy)
        $brGtdJour = $this->computeBrGtdJour($today, $request);
        $brGtdSyncedAt = DB::table('check_pass_qte')->whereDate('log_date', $today)->max('log_date');

        // 4. BR Bundling — global daily total, no per-chain filter
        $bundlingRow = DB::table('rejets_inspection_paquet')
            ->whereDate('date', $today)
            ->where('period', 'jour')
            ->first();
        $brBundling = null;
        $brBundlingActive = $bundlingRow && isset($bundlingRow->is_active) ? (bool) $bundlingRow->is_active : false;
        if ($bundlingRow && $bundlingRow->bundle_inspected > 0) {
            $brBundling = round(($bundlingRow->bundle_reject / $bundlingRow->bundle_inspected) * 100, 1);
        }
        $bundlingSyncedAt = $bundlingRow?->date;

        // 5. OWE — compute from efficacy * SOT / SAM (if GPRO data available)
        $oweValue = null;
        $oweStatus = 'grey';
        $oweProxy = false;
        if ($stats->avg_eff) {
            $currentOfs = DB::table('qte_depart_chaine_article_of')
                ->select('article')->distinct()->pluck('article');

            $gproQuery = DB::table('sync_gpro_article_master')
                ->where('sam_min', '>', 0);
            if ($currentOfs->isNotEmpty()) {
                $gproQuery->whereIn('code_article', $currentOfs);
            }
            $gproArts = $gproQuery->get();

            if ($gproArts->isNotEmpty()) {
                $avgSam = $gproArts->avg('sam_min');
                $avgSot = $gproArts->avg('sot_min');
                if ($avgSam > 0) {
                    $oweValue = round(($stats->avg_eff * $avgSot) / $avgSam, 1);
                    $oweStatus = $this->kpi->oweStatus($oweValue);
                    $oweProxy = true;
                }
            }
        }
        $oweSyncedAt = $effSyncedAt;

        $wipQuery = DB::table('wip_chaine');
        $this->applyFilters($wipQuery, $request);
        $totalWip = (int) $wipQuery->sum('en_cours');
        $wipSyncedAt = DB::table('wip_chaine')->max('synced_at');

        $lostQuery = DB::table('lost_time')->whereDate('date', $today);
        $this->applyFilters($lostQuery, $request);
        $totalLost = (int) $lostQuery->sum('minutes_perdues');
        $lostSyncedAt = DB::table('lost_time')->whereDate('date', $today)->max('date');

        return response()->json([
            'avg_efficience' => [
                'value' => $stats->avg_eff ? round($stats->avg_eff, 1) : 0,
                'status' => $this->kpi->efficienceStatus($stats->avg_eff),
                'target' => '≥ 85%',
                'synced_at' => $effSyncedAt,
            ],
            'avg_owe' => [
                'value' => $oweValue,
                'status' => $oweStatus,
                'target' => '≥ 70%',
                'synced_at' => $oweSyncedAt,
                'partial_data' => $oweProxy,
            ],
            'rft_production' => [
                'value' => $rftJour,
                'status' => $this->kpi->rftStatus($rftJour),
                'target' => '≥ 98%',
                'synced_at' => $rftSyncedAt,
            ],
            'total_wip' => [
                'value' => $totalWip,
                'status' => $this->kpi->wipStatus($totalWip, self::DEFAULT_CADENCE * 10),
                'target' => '≤ ½ cadence',
                'synced_at' => $wipSyncedAt,
            ],
            'total_lost_time' => [
                'value' => $totalLost,
                'status' => $this->kpi->lostTimeStatus($totalLost),
                'target' => '< 10 min',
                'synced_at' => $lostSyncedAt,
            ],
            'br_gtd' => [
                'value' => $brGtdJour,
                'status' => $this->kpi->brStatus($brGtdJour),
                'target' => '≤ 5%',
                'synced_at' => $brGtdSyncedAt,
            ],
            'br_bundling' => [
                'value' => $brBundling,
                'status' => $brBundlingActive ? ($brBundling !== null ? $this->kpi->brStatus($brBundling) : 'grey') : 'inactive',
                'target' => '≤ 5%',
                'source_active' => $brBundlingActive,
                'synced_at' => $bundlingSyncedAt,
            ],
            'br_print' => [
                'value' => $this->computeBrPrint($today),
                'status' => $this->kpi->brStatus($this->computeBrPrint($today)),
                'target' => '≤ 5%',
                'synced_at' => $this->getBrPrintSyncedAt($today),
                'stale' => ! DB::table('sync_drive_br_print')->whereDate('date', $today)->exists(),
            ],
        ]);
    }

    private function computeBrGtdJour(Carbon $today, Request $request): ?float
    {
        $query = DB::table('check_pass_qte')
            ->whereDate('log_date', $today);
        $this->applyFilters($query, $request, 'log_date', 'shortname');

        $row = $query->selectRaw('AVG(defect_pct) as avg_defect_pct')
            ->first();

        return $row && $row->avg_defect_pct !== null ? round($row->avg_defect_pct, 1) : null;
    }

    private function computeBrPrint(Carbon $today): ?float
    {
        $row = DB::table('sync_drive_br_print')
            ->whereDate('date', $today)
            ->first();

        if (! $row || $row->nb_inspections == 0) {
            // Fallback: use latest available data (Rule 7)
            $row = DB::table('sync_drive_br_print')
                ->orderByDesc('date')
                ->first();
        }

        if (! $row || $row->nb_inspections == 0) {
            return null;
        }

        return round(($row->nb_rejets / $row->nb_inspections) * 100, 1);
    }

    private function getBrPrintSyncedAt(Carbon $today): ?string
    {
        $row = DB::table('sync_drive_br_print')
            ->whereDate('date', $today)
            ->select('date', 'synced_at')
            ->first();

        if (! $row) {
            // Fallback: use latest available data (Rule 7)
            $row = DB::table('sync_drive_br_print')
                ->orderByDesc('date')
                ->select('date', 'synced_at')
                ->first();
        }

        return $row?->synced_at ? Carbon::parse($row->synced_at)->toIso8601String() : null;
    }

    /**
     * Route: efficience-gauges
     */
    public function efficienceGauges(Request $request): JsonResponse
    {
        $today = Carbon::today();
        $query = DB::table('efficience_chaine')->whereDate('date', $today);
        $this->applyFilters($query, $request);

        return response()->json(['data' => $query->select('chaine', 'efficience_pct')->get()]);
    }

    /**
     * Route: wip-gauges (F-REQ-205)
     */
    public function wipGauges(Request $request): JsonResponse
    {
        $query = DB::table('wip_chaine');
        $this->applyFilters($query, $request);

        $target = self::DEFAULT_CADENCE / 2;

        return response()->json([
            'data' => $query->select('chaine', 'en_cours')->get()->map(fn ($r) => [
                'chaine' => $r->chaine,
                'wip' => $target > 0 ? round(((int) $r->en_cours / $target) * 100, 1) : 0,
                'raw_wip' => (int) $r->en_cours,
                'target' => $target,
            ]),
        ]);
    }

    /**
     * Route: stoppage-timeline
     */
    public function stoppageTimeline(Request $request): JsonResponse
    {
        $today = Carbon::today();
        $query = DB::table('lost_time')->whereDate('date', $today);
        $this->applyFilters($query, $request);

        return response()->json([
            'data' => $query->get()->map(fn ($r, $i) => [
                'chaine' => $r->chaine,
                'motif' => $r->motif,
                'duration' => $r->minutes_perdues / 60, // in hours for timeline
                'start' => 8 + ($i * 0.5), // pseudo-start time for visual spacing
            ]),
        ]);
    }

    /**
     * Route: of-donuts (F-REQ-305)
     */
    public function ofDonuts(Request $request): JsonResponse
    {
        $query = DB::table('etat_avancement');
        $this->applyFilters($query, $request);

        $data = $query->select(
            'of',
            DB::raw('CASE WHEN departage > 0 THEN CAST(embalage AS FLOAT) / departage * 100 ELSE 0 END as pct'),
            DB::raw('CASE WHEN departage > 0 AND embalage >= departage * 0.8 THEN "termine" WHEN departage > 0 AND embalage >= departage * 0.4 THEN "en_cours" ELSE "retard" END as statut')
        )
            ->limit(8)
            ->get()->map(fn ($r) => [
                'of' => $r->of,
                'pct' => round((float) $r->pct, 1),
                'statut' => $r->statut,
            ]);

        return response()->json(['data' => $data]);
    }

    /**
     * F-REQ-203: Route: efficience-trend
     */
    public function efficienceTrend(Request $request): JsonResponse
    {
        $startOfMonth = Carbon::now()->startOfMonth();

        $query = DB::table('qte_produit_individuel_jour as q')
            ->leftJoin('minutes_presence as p', function ($join) {
                $join->on('q.employee_id', '=', 'p.employee_id')
                    ->on('q.date', '=', 'p.date');
            })
            ->leftJoin('temps_operation as t', function ($join) {
                $join->on('q.poste', '=', 't.operation_code');
            })
            ->whereDate('q.date', '>=', $startOfMonth);

        $this->applyFilters($query, $request, 'q.date', 'q.chaine');

        $data = $query->select(
            'q.date',
            DB::raw('SUM(q.quantite * IFNULL(t.temps_reel_s, 0) / 60) as total_prod'),
            DB::raw('SUM(IFNULL(p.minutes_presence, q.minutes_presence)) as total_pres')
        )
            ->groupBy('q.date')
            ->orderBy('q.date')
            ->get()
            ->map(fn ($row) => [
                'jour' => substr($row->date, 5),
                'eff' => $row->total_pres > 0 ? round(($row->total_prod / $row->total_pres) * 100, 1) : 0,
            ]);

        return response()->json(['data' => $data]);
    }

    /**
     * F-REQ-210: Route: top-operators
     * Fixed: Use minutes_produites directly and join with minutes_presence table.
     */
    /**
     * F-REQ-210: Route: top-operators
     * Formula: (Qté produite indiv × Temps d'opération) / Minutes présence × 100
     */
    public function topOperators(Request $request): JsonResponse
    {
        $today = Carbon::today();
        $limit = $request->query('all') ? 1000 : 10;

        $query = DB::table('qte_produit_individuel_jour as q')
            ->leftJoin('minutes_presence as p', function ($join) {
                $join->on('q.employee_id', '=', 'p.employee_id')
                    ->on('q.date', '=', 'p.date');
            })
            ->leftJoin('temps_operation as t', function ($join) {
                $join->on('q.poste', '=', 't.operation_code');
            })
            ->whereDate('q.date', $today);

        $this->applyFilters($query, $request, 'q.date', 'q.chaine');

        $data = $query->select(
            'q.employee_id as nom',
            'q.chaine',
            DB::raw('SUM(q.quantite * IFNULL(t.temps_reel_s, 0) / 60) as min_std'),
            DB::raw('SUM(IFNULL(p.minutes_presence, q.minutes_presence)) as min_pres'),
            DB::raw('SUM(t.temps_reel_s) as total_temps_op')
        )
            ->groupBy('q.employee_id', 'q.chaine')
            ->having('min_pres', '>', 0)
            ->orderByDesc('min_std')
            ->limit($limit)->get()
            ->map(fn ($r) => [
                'nom' => $r->nom,
                'chaine' => $r->chaine,
                'eff' => $r->total_temps_op > 0
                    ? round(($r->min_std * $r->total_temps_op / 60 / $r->min_pres) * 100, 1)
                    : round(($r->min_std / $r->min_pres) * 100, 1),
                'min_std' => round($r->min_std, 1),
                'min_pres' => round($r->min_pres, 1),
            ]);

        return response()->json(['data' => $data]);
    }

    /**
     * F-REQ-206: Route: wip
     * Flux Coupe & Engagement (Trend)
     * Engagement date is derived from of_fabrication.DtDebut when qte_engagement.date is null,
     * because Novacity's qte_engagement query does not include a date column (B-02).
     */
    public function wip(Request $request): JsonResponse
    {
        $start = Carbon::now()->subDays(30);

        // Engagement: derive date from of_fabrication.DtDebut when qte_engagement.date is null.
        // NOTE: applyFilters() not used here — see B-02 mitigation. The effective date is a
        // COALESCE expression, so line/atelier filters are applied manually below.
        $engQuery = DB::table('qte_engagement as qe')
            ->leftJoin('of_fabrication as of', 'qe.of', '=', 'of.of_number')
            ->select(
                DB::raw('COALESCE(qe.date, DATE(of.dt_debut)) as date'),
                DB::raw('SUM(qe.quantite_engagee) as engagement')
            );
        if ($request->filled('line')) {
            $engQuery->where('qe.chaine', $request->line);
        }
        if ($request->filled('atelier')) {
            $engQuery->where('qe.atelier', $request->atelier);
        }
        $eng = $engQuery->where(DB::raw('COALESCE(qe.date, DATE(of.dt_debut))'), '>=', $start)
            ->groupBy(DB::raw('COALESCE(qe.date, DATE(of.dt_debut))'))
            ->get()->keyBy('date');

        $coupeQuery = DB::table('sortie_coupe');
        $this->applyFilters($coupeQuery, $request);
        $coupe = $coupeQuery->where('date', '>=', $start)
            ->select('date', DB::raw('SUM(quantite_coupee) as sortie'))
            ->groupBy('date')->get()->keyBy('date');

        $dates = $eng->keys()->merge($coupe->keys())->unique()->sort();

        $data = $dates->map(function ($date) use ($eng, $coupe) {
            $e = $eng->get($date);
            $c = $coupe->get($date);

            return [
                'date' => substr($date, 5), // MM-DD
                'engagement' => (int) ($e?->engagement ?? 0),
                'sortie' => (int) ($c?->sortie ?? 0),
                'wip' => max(0, (int) ($e?->engagement ?? 0) - (int) ($c?->sortie ?? 0)),
            ];
        })->values();

        return response()->json(['data' => $data]);
    }

    /**
     * F-REQ-304: Route: so-progress
     */
    public function soProgress(Request $request): JsonResponse
    {
        $query = DB::table('etat_avancement');
        $this->applyFilters($query, $request);

        $data = $query->select('chaine', DB::raw('SUM(embalage) as realise'), DB::raw('SUM(departage) as prevue'))
            ->groupBy('chaine')->get()
            ->map(fn ($r) => [
                'chaine' => $r->chaine,
                'realise' => (int) $r->realise,
                'restant' => max(0, (int) $r->prevue - (int) $r->realise),
            ]);

        return response()->json(['data' => $data]);
    }

    /**
     * F-REQ-201: Breakdown for Efficience par Opérateur / Efficience Chaîne
     */
    public function breakdown(Request $request, $kpiKey): JsonResponse
    {
        $today = Carbon::today();

        if ($kpiKey === 'efficience_operateur') {
            $query = DB::table('qte_produit_individuel_jour as q')
                ->leftJoin('minutes_presence as p', function ($join) {
                    $join->on('q.employee_id', '=', 'p.employee_id')
                        ->on('q.date', '=', 'p.date');
                })
                ->leftJoin('temps_operation as t', function ($join) {
                    $join->on('q.poste', '=', 't.operation_code');
                })
                ->whereDate('q.date', $today);

            $this->applyFilters($query, $request, 'q.date', 'q.chaine');

            $data = $query->select(
                'q.employee_id as employe',
                'q.chaine',
                DB::raw('SUM(q.quantite * IFNULL(t.temps_reel_s, 0) / 60) as min_std'),
                DB::raw('SUM(IFNULL(p.minutes_presence, q.minutes_presence)) as min_pres')
            )
                ->groupBy('q.employee_id', 'q.chaine')
                ->having('min_pres', '>', 0)
                ->orderByDesc('min_std')
                ->get()
                ->map(fn ($r) => [
                    'employe' => $r->employe,
                    'chaine' => $r->chaine,
                    'value' => round(($r->min_std / $r->min_pres) * 100, 1),
                    'min_std' => round($r->min_std, 1),
                    'min_pres' => round($r->min_pres, 1),
                ]);

            return response()->json([
                'kpi_key' => $kpiKey,
                'period' => 'jour',
                'rows' => $data,
                'synced_at' => now()->toIso8601String(),
            ]);
        }

        if ($kpiKey === 'efficience_chaine') {
            $query = DB::table('efficience_chaine')
                ->whereDate('date', $today);
            $this->applyFilters($query, $request);

            $data = $query->select('chaine', 'efficience_pct as value')
                ->get()
                ->map(fn ($r) => [
                    'chaine' => $r->chaine,
                    'value' => (float) $r->value,
                    'status' => $this->kpi->efficienceStatus($r->value),
                    'ecart' => round($r->value - 85, 1),
                ]);

            return response()->json([
                'kpi_key' => $kpiKey,
                'period' => 'jour',
                'rows' => $data,
                'synced_at' => now()->toIso8601String(),
            ]);
        }

        // ── F-REQ-204: OWE per chain ──────────────────────────────────────
        if ($kpiKey === 'owe_chaine') {
            $query = DB::table('efficience_chaine')
                ->whereDate('date', $today);
            $this->applyFilters($query, $request);

            $currentOfs = DB::table('qte_depart_chaine_article_of')
                ->select('article')->distinct()->pluck('article');

            $gproQuery = DB::table('sync_gpro_article_master')
                ->where('sam_min', '>', 0);
            if ($currentOfs->isNotEmpty()) {
                $gproQuery->whereIn('code_article', $currentOfs);
            }
            $gproArts = $gproQuery->get()->keyBy('code_article');
            $avgSam = $gproArts->avg('sam_min');
            $avgSot = $gproArts->avg('sot_min');

            $data = $query->select('chaine', 'efficience_pct')
                ->get()
                ->map(function ($r) use ($avgSam, $avgSot) {
                    $owe = ($avgSam > 0) ? round(($r->efficience_pct * $avgSot) / $avgSam, 1) : null;

                    return [
                        'chaine' => $r->chaine,
                        'value' => $owe,
                        'status' => $owe !== null ? $this->kpi->oweStatus($owe) : 'grey',
                        'ecart' => $owe !== null ? round($owe - 70, 1) : null,
                    ];
                });

            return response()->json([
                'kpi_key' => $kpiKey,
                'period' => 'jour',
                'rows' => $data,
                'synced_at' => now()->toIso8601String(),
            ]);
        }

        // ── F-REQ-205: WIP per chain ──────────────────────────────────────
        if ($kpiKey === 'wip_chaine') {
            $query = DB::table('wip_chaine');
            $this->applyFilters($query, $request);

            $target = self::DEFAULT_CADENCE / 2;

            $data = $query->select('chaine', 'en_cours')
                ->get()
                ->map(function ($r) use ($target) {
                    $wip = (int) $r->en_cours;
                    $status = $this->kpi->wipStatus($wip, $target);

                    return [
                        'chaine' => $r->chaine,
                        'value' => $wip,
                        'status' => $status,
                        'ecart' => $wip - $target,
                    ];
                });

            return response()->json([
                'kpi_key' => $kpiKey,
                'period' => 'jour',
                'rows' => $data,
                'synced_at' => now()->toIso8601String(),
            ]);
        }

        // ── F-REQ-207: Arrêts non planifiés (timeline) ────────────────────
        if ($kpiKey === 'arrets_non_planifies') {
            $query = DB::table('lost_time')->whereDate('date', $today);
            $this->applyFilters($query, $request);

            $data = $query->get()->map(fn ($r, $i) => [
                'chaine' => $r->chaine,
                'motif' => $r->motif,
                'duration' => $r->minutes_perdues / 60,
                'start' => 8 + ($i * 0.5),
                'minutes_perdues' => (int) $r->minutes_perdues,
            ]);

            return response()->json([
                'kpi_key' => $kpiKey,
                'period' => 'jour',
                'rows' => $data,
                'synced_at' => now()->toIso8601String(),
            ]);
        }

        // ── F-REQ-102: BR GTD ────────────────────────────────────────────
        if ($kpiKey === 'br_gtd') {
            $query = DB::table('check_pass_qte')
                ->whereDate('log_date', $today);
            $this->applyFilters($query, $request, 'log_date', 'shortname');

            $data = $query->select('shortname as chaine', 'defect_pct as value')
                ->get()
                ->map(fn ($r) => [
                    'chaine' => $r->chaine,
                    'value' => round((float) $r->value, 1),
                    'status' => $this->kpi->brStatus($r->value),
                    'ecart' => round((float) $r->value - 5, 1),
                ]);

            return response()->json([
                'kpi_key' => $kpiKey,
                'period' => 'jour',
                'rows' => $data,
                'synced_at' => now()->toIso8601String(),
            ]);
        }

        // ── F-REQ-106: BR Bundling ────────────────────────────────────────
        if ($kpiKey === 'br_bundling') {
            $query = DB::table('rejets_inspection_paquet')
                ->whereDate('date', $today)
                ->where('period', 'jour');
            $this->applyFilters($query, $request);

            $row = $query->first();
            $br = null;
            if ($row && $row->bundle_inspected > 0) {
                $br = round(($row->bundle_reject / $row->bundle_inspected) * 100, 1);
            }

            $isActive = $row && isset($row->is_active) ? (bool) $row->is_active : false;

            return response()->json([
                'kpi_key' => $kpiKey,
                'period' => 'jour',
                'rows' => [[
                    'chaine' => 'Global',
                    'value' => $br,
                    'status' => $isActive ? ($br !== null ? $this->kpi->brStatus($br) : 'grey') : 'inactive',
                    'ecart' => $br !== null ? round($br - 5, 1) : null,
                ]],
                'source_active' => $isActive,
                'synced_at' => now()->toIso8601String(),
            ]);
        }

        // ── F-REQ-108: BR Print ───────────────────────────────────────────
        if ($kpiKey === 'br_print') {
            $row = DB::table('sync_drive_br_print')
                ->whereDate('date', $today)
                ->first();

            $br = null;
            if ($row && $row->nb_inspections > 0) {
                $br = round(($row->nb_rejets / $row->nb_inspections) * 100, 1);
            }

            return response()->json([
                'kpi_key' => $kpiKey,
                'period' => 'jour',
                'rows' => [[
                    'chaine' => 'Global',
                    'value' => $br,
                    'status' => $br !== null ? $this->kpi->brStatus($br) : 'grey',
                    'ecart' => $br !== null ? round($br - 5, 1) : null,
                ]],
                'synced_at' => $row?->synced_at ? Carbon::parse($row->synced_at)->toIso8601String() : null,
            ]);
        }

        // ── F-REQ-104: RFT Production ─────────────────────────────────────
        if ($kpiKey === 'rft_production') {
            $piecesOk = DB::table('pieces_ok_jour')->whereDate('date', $today)->first();
            $piecesProd = DB::table('pieces_produites_jour')->whereDate('date', $today)->first();
            $rft = $this->kpi->computeRft($piecesOk?->first_pass_today, $piecesProd?->produced_today);

            return response()->json([
                'kpi_key' => $kpiKey,
                'period' => 'jour',
                'rows' => [[
                    'chaine' => 'Global',
                    'value' => $rft,
                    'status' => $this->kpi->rftStatus($rft),
                    'ecart' => $rft !== null ? round($rft - 98, 1) : null,
                ]],
                'synced_at' => now()->toIso8601String(),
            ]);
        }

        // ── F-REQ-216: Taux Archivage per chain ──────────────────────────
        if ($kpiKey === 'taux_archivage') {
            $rows = DB::table('sync_gpro_suivi_paquets')
                ->where('est_solde', true)
                ->get();

            $grouped = $rows->groupBy('chaine');

            $data = $grouped->map(function ($items, $ch) {
                $total = $items->count();
                $archived = $items->where('est_archive', true)->count();
                $pct = $total > 0 ? round(($archived / $total) * 100, 1) : null;

                return [
                    'chaine' => $ch,
                    'value' => $pct,
                    'status' => $this->kpi->tauxArchivageStatus($pct),
                    'ecart' => $pct !== null ? round($pct - 85, 1) : null,
                ];
            })->values();

            if ($data->isEmpty()) {
                $total = $rows->count();
                $archived = $rows->where('est_archive', true)->count();
                $pct = $total > 0 ? round(($archived / $total) * 100, 1) : null;
                $data = collect([[
                    'chaine' => 'Global',
                    'value' => $pct,
                    'status' => $this->kpi->tauxArchivageStatus($pct),
                    'ecart' => $pct !== null ? round($pct - 85, 1) : null,
                ]]);
            }

            return response()->json([
                'kpi_key' => $kpiKey,
                'period' => 'jour',
                'rows' => $data,
                'synced_at' => now()->toIso8601String(),
            ]);
        }

        // ── F-REQ-218: Respect Temps Estimé per chain ────────────────────
        if ($kpiKey === 'respect_temps_estime') {
            $rows = DB::table('sync_drive_cotation')->get();

            $grouped = $rows->groupBy(fn ($r) => $r->chaine ?? 'Global');

            $data = $grouped->map(function ($items, $ch) {
                $total = $items->count();
                $respected = $items->filter(fn ($r) => $r->temps_cotation_min <= $r->temps_production_min)->count();
                $pct = $total > 0 ? round(($respected / $total) * 100, 1) : null;

                return [
                    'chaine' => $ch,
                    'value' => $pct,
                    'status' => $this->kpi->respectTempsEstimeStatus($pct),
                    'ecart' => $pct !== null ? round($pct - 90, 1) : null,
                ];
            })->values();

            if ($data->isEmpty()) {
                $total = $rows->count();
                $respected = $rows->filter(fn ($r) => $r->temps_cotation_min <= $r->temps_production_min)->count();
                $pct = $total > 0 ? round(($respected / $total) * 100, 1) : null;
                $data = collect([[
                    'chaine' => 'Global',
                    'value' => $pct,
                    'status' => $this->kpi->respectTempsEstimeStatus($pct),
                    'ecart' => $pct !== null ? round($pct - 90, 1) : null,
                ]]);
            }

            return response()->json([
                'kpi_key' => $kpiKey,
                'period' => 'jour',
                'rows' => $data,
                'synced_at' => now()->toIso8601String(),
            ]);
        }

        // ── F-REQ-219: Temps Acceptés per chain ──────────────────────────
        if ($kpiKey === 'temps_acceptes') {
            $rows = DB::table('sync_drive_gammes')->get();

            $grouped = $rows->groupBy(fn ($r) => $r->chaine ?? 'Global');

            $data = $grouped->map(function ($items, $ch) {
                $total = $items->sum('nb_gammes_total');
                $accepted = $items->sum('nb_gammes_acceptees_v1');
                $pct = $total > 0 ? round(($accepted / $total) * 100, 1) : null;

                return [
                    'chaine' => $ch,
                    'value' => $pct,
                    'status' => $this->kpi->tempsAcceptesStatus($pct),
                    'ecart' => $pct !== null ? round($pct - 80, 1) : null,
                ];
            })->values();

            if ($data->isEmpty()) {
                $total = $rows->sum('nb_gammes_total');
                $accepted = $rows->sum('nb_gammes_acceptees_v1');
                $pct = $total > 0 ? round(($accepted / $total) * 100, 1) : null;
                $data = collect([[
                    'chaine' => 'Global',
                    'value' => $pct,
                    'status' => $this->kpi->tempsAcceptesStatus($pct),
                    'ecart' => $pct !== null ? round($pct - 80, 1) : null,
                ]]);
            }

            return response()->json([
                'kpi_key' => $kpiKey,
                'period' => 'jour',
                'rows' => $data,
                'synced_at' => now()->toIso8601String(),
            ]);
        }

        return response()->json([
            'kpi_key' => $kpiKey,
            'rows' => [],
            'message' => "Breakdown for {$kpiKey} not yet implemented",
        ]);
    }

    /**
     * F-REQ: Route: inline-endline
     * Inline vs Endline comparison chart. Falls back to vw_defects (§2.9) when
     * inline_vs_endline_comparison has no quantity column (B-03).
     */
    public function inlineEndline(Request $request): JsonResponse
    {
        $today = Carbon::today();

        $rows = DB::table('inline_vs_endline_comparison')
            ->whereDate('log_date', $today)
            ->get();

        if ($rows->isEmpty()) {
            $latestDate = DB::table('inline_vs_endline_comparison')
                ->max('log_date');
            if ($latestDate) {
                $rows = DB::table('inline_vs_endline_comparison')
                    ->whereDate('log_date', $latestDate)
                    ->get();
            }
        }

        // Fallback: vw_defects has qty column; inline_vs_endline_comparison does not
        if ($rows->isEmpty()) {
            $defectQuery = DB::table('vw_defects');
            if ($request->filled('line')) {
                $defectQuery->where('prod_group', $request->line);
            }
            $defects = $defectQuery->whereDate('log_date', $today)
                ->select('prod_group as chaine', 'op_no as opera', DB::raw('SUM(qty) as count'))
                ->groupBy('prod_group', 'op_no')
                ->get();

            if ($defects->isEmpty()) {
                $latestDefectDate = DB::table('vw_defects')->max('log_date');
                if ($latestDefectDate) {
                    $defects = DB::table('vw_defects')
                        ->whereDate('log_date', $latestDefectDate)
                        ->select('prod_group as chaine', 'op_no as opera', DB::raw('SUM(qty) as count'))
                        ->groupBy('prod_group', 'op_no')
                        ->get();
                }
            }

            return response()->json([
                'data' => $defects->values(),
                'source' => 'vw_defects',
            ]);
        }

        $data = $rows->map(fn ($r) => [
            'chaine' => $r->shortname,
            'opera' => $r->opera,
            'count' => (int) ($r->count ?? 1),
        ])->values();

        return response()->json(['data' => $data, 'source' => 'inline_vs_endline_comparison']);
    }

    // ── COUPE ────────────────────────────────────────────────────────────

    /**
     * F-REQ-311: Route: coupe/coverage
     */
    public function coupeCoverage(Request $request): JsonResponse
    {
        $today = Carbon::today();

        $qteQuery = DB::table('sortie_coupe')->whereDate('date', $today);
        $this->applyFilters($qteQuery, $request);
        $qteCoupee = $qteQuery->sum('quantite_coupee');

        $engQuery = DB::table('qte_engagement')->whereDate('date', $today);
        $this->applyFilters($engQuery, $request);
        $qteEngagee = $engQuery->sum('quantite_engagee');

        $delta = $qteEngagee - $qteCoupee;
        $jours = self::DEFAULT_CADENCE_HEBDO > 0 ? round($delta / self::DEFAULT_CADENCE_HEBDO, 1) : 0;

        return response()->json([
            'value' => $jours,
            'unit' => 'jours',
            'delta_pcs' => (int) $delta,
            'status' => $jours >= 0 ? 'green' : 'red',
        ]);
    }

    /**
     * F-REQ-310: Route: coupe/chain-coverage
     * Formula: (Qté engagé - Qté planifié) / cadence moyenne
     */
    public function coupeChainCoverage(Request $request): JsonResponse
    {
        $engQuery = DB::table('qte_engagement');
        $this->applyFilters($engQuery, $request);
        $eng = $engQuery->select('chaine', DB::raw('SUM(quantite_engagee) as qte'))->groupBy('chaine')->get()->keyBy('chaine');

        $planQuery = DB::table('qte_depart_chaine_article_of');
        $this->applyFilters($planQuery, $request);
        $plan = $planQuery->select('chaine', DB::raw('SUM(quantite) as qte'))->groupBy('chaine')->get()->keyBy('chaine');

        $gproPlanning = DB::table('sync_gpro_chain_planning')
            ->get()
            ->groupBy('chaine');

        $allChains = $eng->keys()->merge($plan->keys())->unique();

        $data = $allChains->map(function ($ch) use ($eng, $plan, $gproPlanning) {
            $engQte = (int) ($eng->get($ch)?->qte ?? 0);
            $planQte = (int) ($plan->get($ch)?->qte ?? 0);

            $gproPlan = $gproPlanning->get($ch)?->first();
            $cadence = $gproPlan?->cadence_hebdo ?? self::DEFAULT_CADENCE_HEBDO;

            $diff = max(0, $engQte - $planQte);
            $jours = $cadence > 0 ? round($diff / $cadence, 1) : 0;

            return [
                'chaine' => $ch,
                'value' => $jours,
                'engagement' => $engQte,
                'planifie' => $planQte,
            ];
        })->values();

        return response()->json([
            'value' => round($data->sum('value'), 1),
            'unit' => 'jours',
            'breakdown' => $data,
        ]);
    }

    /**
     * F-REQ-217: Route: coupe/tagging
     */
    public function coupeTagging(Request $request): JsonResponse
    {
        $query = DB::table('taging_reel')->whereDate('date', Carbon::today());
        $this->applyFilters($query, $request);

        return response()->json(['data' => $query->get()]);
    }

    /**
     * Route: coupe/ofs
     */
    public function coupeOfs(Request $request): JsonResponse
    {
        $query = DB::table('of_fabrication')->whereNull('dt_fin');
        $this->applyFilters($query, $request, 'dt_debut', 'chaine'); // of_fabrication might not have chaine, applyFilters handles it

        return response()->json(['data' => $query->get()]);
    }

    /**
     * F-REQ-208 / 209: Route: coupe/departage
     * Refactored to join with minutes_presence and support flexible poste filtering.
     */
    public function coupeDepartage(Request $request): JsonResponse
    {
        $poste = $request->query('poste', '221');
        // Support both numeric and OP prefix
        $posteId = str_contains($poste, 'OP') ? $poste : 'OP'.$poste;
        $posteAlt = str_replace('OP', '', $poste);

        $query = DB::table('qte_produit_individuel_jour as q')
            ->leftJoin('minutes_presence as p', function ($join) {
                $join->on('q.employee_id', '=', 'p.employee_id')
                    ->on('q.date', '=', 'p.date');
            })
            ->leftJoin('temps_operation as t', function ($join) {
                $join->on('q.poste', '=', 't.operation_code');
            })
            ->whereDate('q.date', Carbon::today())
            ->where(function ($q) use ($posteId, $posteAlt) {
                $q->where('q.poste', $posteId)
                    ->orWhere('q.poste', $posteAlt)
                    ->orWhereNull('q.poste');
            });

        $this->applyFilters($query, $request, 'q.date', 'q.chaine');

        $data = $query->select(
            'q.employee_id as employe',
            DB::raw('SUM(q.quantite * IFNULL(t.temps_reel_s, 0) / 60) as min_prod'),
            DB::raw('SUM(IFNULL(p.minutes_presence, q.minutes_presence)) as min_pres')
        )
            ->groupBy('q.employee_id')
            ->get()
            ->map(fn ($r) => [
                'employe' => $r->employe,
                'eff' => $r->min_pres > 0 ? round(($r->min_prod / $r->min_pres) * 100, 1) : 0,
                'min_prod' => round($r->min_prod, 1),
                'min_pres' => round($r->min_pres, 1),
            ]);

        return response()->json(['data' => $data]);
    }

    // ── SÉRIGRAPHIE ──────────────────────────────────────────────────────

    /**
     * F-REQ-309: Route: serigraphie/coverage
     */
    public function serigraphieCoverage(Request $request): JsonResponse
    {
        $today = Carbon::today();

        $entreeQuery = DB::table('qte_entree_serigraphie')->whereDate('date', $today);
        $this->applyFilters($entreeQuery, $request);
        $qteEntree = $entreeQuery->sum('quantite');

        $sortieQuery = DB::table('sortie_serigraphie')->whereDate('date', $today);
        $this->applyFilters($sortieQuery, $request);
        $qteSortie = $sortieQuery->sum('quantite');

        $seri = $qteEntree - $qteSortie;

        return response()->json([
            'value' => (int) $seri,
            'status' => $this->kpi->couvertureStatus($seri, self::DEFAULT_CADENCE_HEBDO),
            'target' => '> cadence hebdo',
        ]);
    }

    public function serigraphieFlux(Request $request): JsonResponse
    {
        $today = Carbon::today();

        $entrees = DB::table('qte_entree_serigraphie')->whereDate('date', $today);
        $this->applyFilters($entrees, $request);
        $entrees = $entrees->get();

        $sorties = DB::table('sortie_serigraphie')->whereDate('date', $today);
        $this->applyFilters($sorties, $request);
        $sorties = $sorties->get();

        $data = [];
        foreach ($entrees as $e) {
            $key = ($e->article ?? 'N/A').'|'.($e->couleur ?? 'N/A');
            $data[$key] = [
                'article' => $e->article,
                'couleur' => $e->couleur,
                'entree' => $e->quantite,
                'sortie' => 0,
            ];
        }
        foreach ($sorties as $s) {
            $key = ($s->article ?? 'N/A').'|'.($s->couleur ?? 'N/A');
            if (isset($data[$key])) {
                $data[$key]['sortie'] = $s->quantite;
            } else {
                $data[$key] = [
                    'article' => $s->article,
                    'couleur' => $s->couleur,
                    'entree' => 0,
                    'sortie' => $s->quantite,
                ];
            }
        }

        return response()->json(['data' => array_values($data)]);
    }

    /**
     * F-REQ-303: Route: coupe/qte-departage
     */
    public function coupeQteDepartage(Request $request): JsonResponse
    {
        $query = DB::table('qte_depart_chaine_article_of');
        $this->applyFilters($query, $request);

        $data = $query->select('of', 'article', DB::raw('SUM(quantite) as quantite'))
            ->groupBy('of', 'article')
            ->get();

        return response()->json(['data' => $data]);
    }

    public function serigraphieRejets(Request $request): JsonResponse
    {
        $query = DB::table('packets_rejetes')->whereDate('date_rejet', Carbon::today());
        $this->applyFilters($query, $request, 'date_rejet');

        return response()->json(['data' => $query->get()]);
    }

    public function alerts(Request $request): JsonResponse
    {
        return response()->json(['alerts' => $this->alerts->generateProductionAlerts()]);
    }

    // ── Methods KPIs (F-REQ-216, 218, 219) ─────────────────────────────────

    public function tauxArchivage(): JsonResponse
    {
        $total = DB::table('sync_gpro_suivi_paquets')->where('est_solde', true)->count();
        $archive = DB::table('sync_gpro_suivi_paquets')
            ->where('est_solde', true)->where('est_archive', true)->count();
        $pct = $total > 0 ? round(($archive / $total) * 100, 1) : null;

        return response()->json([
            'value' => $pct,
            'target' => 85,
            'total' => $total,
            'archived' => $archive,
            'status' => $this->kpi->tauxArchivageStatus($pct),
        ]);
    }

    public function respectTempsEstime(): JsonResponse
    {
        $rows = DB::table('sync_drive_cotation')->get();
        $total = $rows->count();
        $respected = $rows->filter(fn ($r) => $r->temps_cotation_min <= $r->temps_production_min)->count();
        $pct = $total > 0 ? round(($respected / $total) * 100, 1) : null;

        return response()->json([
            'value' => $pct,
            'target' => 90,
            'total' => $total,
            'respected' => $respected,
            'status' => $this->kpi->respectTempsEstimeStatus($pct),
        ]);
    }

    public function tauxTempsAcceptes(): JsonResponse
    {
        $rows = DB::table('sync_drive_gammes')->get();
        $totalGammes = $rows->sum('nb_gammes_total');
        $accepted = $rows->sum('nb_gammes_acceptees_v1');
        $pct = $totalGammes > 0 ? round(($accepted / $totalGammes) * 100, 1) : null;

        return response()->json([
            'value' => $pct,
            'target' => 80,
            'total' => $totalGammes,
            'accepted' => $accepted,
            'status' => $this->kpi->tempsAcceptesStatus($pct),
        ]);
    }

    /**
     * Route: order-tracking — OF tracking data for OrderTrackingTable
     */
    public function orderTracking(Request $request): JsonResponse
    {
        $today = Carbon::today();
        $year = $today->year;

        $avancementQuery = DB::table('etat_avancement');
        $this->applyFilters($avancementQuery, $request);
        $avancements = $avancementQuery->where('statut', '!=', 'termine')->get();

        if ($avancements->isEmpty()) {
            return response()->json(['data' => []]);
        }

        $ofNumbers = $avancements->pluck('of')->filter()->values()->toArray();

        $fabrication = DB::table('of_fabrication')
            ->whereIn('of_number', $ofNumbers)
            ->get()
            ->keyBy('of_number');

        $effToday = DB::table('efficience_chaine')
            ->whereDate('date', $today)
            ->get()
            ->keyBy('chaine');

        $effYesterday = DB::table('efficience_chaine')
            ->whereDate('date', $today->copy()->subDay())
            ->get()
            ->keyBy('chaine');

        $qualityToday = DB::table('check_pass_qte')
            ->whereDate('log_date', $today)
            ->get()
            ->groupBy('shortname');

        $wip = DB::table('wip_chaine')->get()->keyBy('chaine');

        $depart = DB::table('qte_depart_chaine_article_of')
            ->whereIn('of', $ofNumbers)
            ->orderByDesc('id')
            ->get()
            ->groupBy('of');

        $stock = DB::table('vue_stock')->get()->mapWithKeys(fn ($item) => [$item->code_mp => $item->designation]);

        $gproArticle = DB::table('sync_gpro_article_master')->get()->keyBy('code_article');
        $gproPlanning = DB::table('sync_gpro_chain_planning')->get()->groupBy('chaine');
        $gproOfDates = DB::table('sync_gpro_of_dates')
            ->whereIn('of_numero', $ofNumbers)
            ->get()
            ->groupBy('of_numero');

        $data = $avancements->map(function ($av) use ($fabrication, $effToday, $effYesterday, $qualityToday, $wip, $depart, $stock, $gproArticle, $gproPlanning, $gproOfDates) {
            $of = $av->of;
            $chaine = $av->chaine;
            $qtePrevue = (int) ($av->departage ?? 0);
            $qteRealisee = (int) ($av->embalage ?? 0);
            $avancementPct = $qtePrevue > 0 ? round(($qteRealisee / $qtePrevue) * 100, 2) : 0;

            $fb = $fabrication->get($of);
            $bpd = $fb?->dt_debut ?? 'N/A';
            $epd = $fb?->dt_fin ?? 'N/A';

            $ofDates = $gproOfDates->get($of)?->first();
            $ehd = $ofDates?->ehd ?? 'N/A';

            $effE = $effToday->get($chaine);
            $effPrior = $effYesterday->get($chaine);
            $effTodayPct = $effE ? (float) $effE->efficience_pct : 0;
            $effPriorPct = $effPrior ? (float) $effPrior->efficience_pct : $effTodayPct;

            $owePrior = $effPrior ? ($effPrior->heures_standards > 0 ? round(($effPrior->heures_prod / $effPrior->heures_standards) * 100, 1) : $effPriorPct) : $effPriorPct;

            $d = $depart->get($of)?->first();
            $article = $d?->article ?? 'N/A';
            $designation = $stock->get($article) ?? 'N/A';
            if ($designation === 'N/A' && $article !== 'N/A') {
                $articleSuffix = substr($article, strrpos($article, '-') + 1);
                $designation = $stock->first(fn ($val, $key) => str_ends_with($key, $articleSuffix)) ?? 'N/A';
            }

            $gproArt = $gproArticle->get($article);
            $sam = $gproArt ? (float) $gproArt->sam_min : 0;
            $effectif = $gproArt ? (int) $gproArt->effectif_requis : 0;

            $gproPlan = $gproPlanning->get($chaine)?->first();
            $objectif = $gproPlan ? (int) $gproPlan->objectif_journalier : $qtePrevue;

            $brGtd = $qualityToday->get($chaine)?->avg('defect_pct');
            $gtdStatus = $brGtd !== null ? ($brGtd <= 4 ? 'OK' : ($brGtd <= 5 ? 'VIGILANCE' : 'CRITIQUE')) : 'N/A';

            $amObjective = $sam > 0 && $effectif > 0 ? round($sam * $effectif, 0) : 0;
            $soObjective = $objectif;
            $gapSamSo = $amObjective > 0 ? round((($amObjective - $soObjective) / $amObjective) * 100, 1) : 0;

            $cumulEff = $effTodayPct;
            $cumulQty = $qteRealisee;
            $cumulRestant = max(0, $qtePrevue - $qteRealisee);
            $qtySC1 = $qtePrevue * 2;
            $qtySAM = $sam > 0 ? round($sam * $qtePrevue / 60, 0) : 0;

            $wipRow = $wip->get($chaine);
            $entreeJour = $wipRow ? (int) $wipRow->entree_jour : 0;
            $sortieJour = $wipRow ? (int) $wipRow->sortie_jour : 0;

            return [
                'orderId' => $of,
                'designation' => $designation,
                'priorEff' => round($effPriorPct, 1),
                'priorOwe' => round($owePrior, 1),
                'stages' => [
                    ['label' => 'CIP', 'pct' => min(100, round($qtePrevue > 0 ? ($qteRealisee / $qtePrevue) * 100 : 0, 0))],
                    ['label' => 'MP-1', 'pct' => min(100, round($qtePrevue > 0 ? ($qteRealisee / $qtePrevue) * 96 : 0, 0))],
                    ['label' => 'SC1', 'pct' => min(100, round($qtePrevue > 0 ? ($qteRealisee / $qtePrevue) * 85 : 0, 0))],
                    ['label' => 'SAM', 'pct' => min(100, round($qtePrevue > 0 ? ($qteRealisee / $qtePrevue) * 4 : 0, 0))],
                ],
                'overallPct' => $avancementPct,
                'actual' => $effectif,
                'planned' => $effectif,
                'qtyOrdered' => $qtePrevue,
                'qtySC1' => $qtySC1,
                'qtySAM' => $qtySAM,
                'bpd' => $bpd !== 'N/A' ? date('d/m/Y', strtotime($bpd)) : 'N/A',
                'epd' => $epd !== 'N/A' ? date('d/m/Y', strtotime($epd)) : 'N/A',
                'ehd' => $ehd !== 'N/A' ? date('d/m/Y', strtotime($ehd)) : 'N/A',
                'gtd' => $gtdStatus,
                'amObjective' => $amObjective,
                'soObjective' => $soObjective,
                'gapSamSo' => $gapSamSo,
                'dailyTarget' => $objectif,
                'qteDemandee' => $objectif,
                'qteRealiseeHeure' => $entreeJour,
                'cumulEff' => round($cumulEff, 1),
                'cumulQty' => $cumulQty,
                'cumulRestant' => $cumulRestant,
            ];
        })->values();

        return response()->json(['data' => $data]);
    }

    /**
     * Confection KPIs from kpi_data table
     */
    public function confectionKpis(Request $request): JsonResponse
    {
        $kpiCodes = [
            'F-REQ-102', 'F-REQ-104', 'F-REQ-201', 'F-REQ-202', 'F-REQ-203',
            'F-REQ-204', 'F-REQ-205', 'F-REQ-206', 'F-REQ-207', 'F-REQ-210',
            'F-REQ-211', 'F-REQ-212', 'F-REQ-213', 'F-REQ-214', 'F-REQ-215',
            'F-REQ-301', 'F-REQ-303', 'F-REQ-304', 'F-REQ-305', 'F-REQ-306',
            'F-REQ-307', 'F-REQ-308', 'F-REQ-310', 'F-REQ-312',
        ];

        $rows = \App\Models\KpiData::whereIn('kpi_code', $kpiCodes)->get();

        $kpiMap = [];
        foreach ($rows as $row) {
            $kpiMap[$row->kpi_code][] = [
                'variable_key' => $row->variable_key,
                'value' => $row->computed_data['value'] ?? $row->response_data['extracted'] ?? null,
                'raw' => $row->response_data,
                'last_status' => $row->last_status,
                'last_synced_at' => $row->last_synced_at?->toISOString(),
            ];
        }

        // Map to named fields for the frontend
        $result = [
            'br_gtd' => $this->getKpiValue($kpiMap, 'F-REQ-102'),
            'rft' => $this->getKpiValue($kpiMap, 'F-REQ-104'),
            'efficience_operateur' => $this->getKpiValue($kpiMap, 'F-REQ-201'),
            'efficience_chaine' => $this->getKpiValue($kpiMap, 'F-REQ-202'),
            'efficience_cumulee' => $this->getKpiValue($kpiMap, 'F-REQ-203'),
            'owe' => $this->getKpiValue($kpiMap, 'F-REQ-204'),
            'wip' => $this->getKpiValue($kpiMap, 'F-REQ-205'),
            'wip_optimal' => $this->getKpiValue($kpiMap, 'F-REQ-206'),
            'arrets_non_planifies' => $this->getKpiValue($kpiMap, 'F-REQ-207'),
            'top_operateurs' => $this->getKpiValue($kpiMap, 'F-REQ-210'),
            'sam' => $this->getKpiValue($kpiMap, 'F-REQ-211'),
            'sot' => $this->getKpiValue($kpiMap, 'F-REQ-212'),
            'effectifs' => $this->getKpiValue($kpiMap, 'F-REQ-213'),
            'code_article' => $this->getKpiValue($kpiMap, 'F-REQ-214'),
            'designation_article' => $this->getKpiValue($kpiMap, 'F-REQ-215'),
            'of_confection' => $this->getKpiValue($kpiMap, 'F-REQ-301'),
            'quantite_of' => $this->getKpiValue($kpiMap, 'F-REQ-303'),
            'so_progress' => $this->getKpiValue($kpiMap, 'F-REQ-304'),
            'taux_avancement_of' => $this->getKpiValue($kpiMap, 'F-REQ-305'),
            'bpd' => $this->getKpiValue($kpiMap, 'F-REQ-306'),
            'epd' => $this->getKpiValue($kpiMap, 'F-REQ-307'),
            'ehd' => $this->getKpiValue($kpiMap, 'F-REQ-308'),
            'couverture_chaine' => $this->getKpiValue($kpiMap, 'F-REQ-310'),
            'objectif_chaine' => $this->getKpiValue($kpiMap, 'F-REQ-312'),
        ];

        return response()->json(['data' => $result]);
    }

    /**
     * V2 KPIs: reads metadata from config/data-mappings.php, values from kpi_data table
     */
    public function v2Kpis(Request $request): JsonResponse
    {
        $module = $request->query('module', 'production');

        // 1. Read KPI definitions from config file
        $config = config('data-mappings');
        $kpis = $config[$module]['kpis'] ?? [];

        if (empty($kpis)) {
            return response()->json(['data' => []]);
        }

        // 2. Get kpi_data rows for these KPI codes
        $kpiCodes = array_unique(array_column($kpis, 'kpi'));
        $kpiDataRows = \App\Models\KpiData::whereIn('kpi_code', $kpiCodes)->get();

        // Index kpi_data by kpi_code -> variable_key -> row
        $kpiDataIndex = [];
        foreach ($kpiDataRows as $row) {
            $kpiDataIndex[$row->kpi_code][$row->variable_key] = $row;
        }

        $result = [];
        foreach ($kpis as $kpiDef) {
            $kpiCode = $kpiDef['kpi'];
            $variables = $kpiDef['variables'] ?? [];

            // Process each variable
            $variableValues = [];
            $variableRawArrays = []; // full raw_data per variable
            $rawData = [];
            $latestStatus = 'pending';
            $latestSyncedAt = null;
            $latestValidSyncedAt = null;
            $filterKey = null;
            $filterOptions = null;

            foreach ($variables as $varDef) {
                $varKey = $varDef['variable_key'] ?? null;
                if (empty($varKey)) continue;

                $dataRow = $kpiDataIndex[$kpiCode][$varKey] ?? null;
                if (!$dataRow) continue;

                // Track status and sync times
                if ($latestSyncedAt === null || $dataRow->last_synced_at?->greaterThan($latestSyncedAt)) {
                    $latestStatus = $dataRow->last_status ?? 'pending';
                    $latestSyncedAt = $dataRow->last_synced_at;
                }
                if ($dataRow->last_valid_synced_at && ($latestValidSyncedAt === null || $dataRow->last_valid_synced_at?->greaterThan($latestValidSyncedAt))) {
                    $latestValidSyncedAt = $dataRow->last_valid_synced_at;
                }

                $raw = $dataRow->response_data['raw'] ?? null;
                $isComplex = ($varDef['variable_type'] ?? 'Direct') === 'Complex';

                if ($isComplex && is_array($raw) && !empty($raw)) {
                    $hasFn = !empty($varDef['has_function']);
                    if ($hasFn) {
                        // has_function=true: apply fn to get scalar
                        $fn = $varDef['fn'] ?? 'Latest';
                        $variableValues[$varKey] = $this->applyFunction($raw, $varKey, $fn);
                    } else {
                        // has_function=false/null: store full raw array for row-by-row computation
                        $variableValues[$varKey] = array_column($raw, $varKey);
                    }
                    $variableRawArrays[$varKey] = $raw;
                    $rawData = array_merge($rawData, $raw);

                    // Collect filter options if is_filtered
                    if (!empty($varDef['is_filtered']) && !empty($varDef['filter_key'])) {
                        $filterKey = $varDef['filter_key'];
                        $filterOptions = array_unique(array_column($raw, $filterKey));
                        $filterOptions = array_values(array_filter($filterOptions));
                    }
                } else {
                    // Direct: use computed_data value as-is
                    $val = $dataRow->computed_data['value'] ?? $dataRow->response_data['extracted'] ?? null;
                    $variableValues[$varKey] = $val;
                    if (is_array($raw)) {
                        $rawData = array_merge($rawData, $raw);
                    }
                }
            }

            // Compute value: apply formula if available
            $computedValue = null;
            $formula = $kpiDef['formula'] ?? null;
            if ($formula && isset($formula['items']) && !empty($variableValues)) {
                // Check if any variable is an array (needs row-by-row computation)
                $hasArrayVar = false;
                foreach ($variableValues as $vv) {
                    if (is_array($vv)) { $hasArrayVar = true; break; }
                }

                if ($hasArrayVar && count($variableRawArrays) >= 2) {
                    // Row-by-row: join raw arrays by common key and compute per row
                    $computedValue = $this->computeFormulaRowByRow($formula['items'], $variableRawArrays);
                } else {
                    $computedValue = $this->computeFormula($formula['items'], $variableValues);
                }
            } elseif (!empty($variableValues)) {
                $computedValue = reset($variableValues);
            }

            // Target from config
            $target = $kpiDef['target'] ?? [];
            $targetOp = $target['operator'] ?? null;
            $targetVal = $target['value'] ?? null;
            $targetIsPct = $target['is_percentage'] ?? false;
            $targetReadable = $kpiDef['target_readable'] ?? null;

            // Collect endpoint URLs, check for missing data
            $endpoints = array_unique(array_filter(array_column($variables, 'endpoint')));
            $hasMissingData = false;
            foreach ($variables as $var) {
                if (empty($var['endpoint']) || empty($var['variable_key'])) {
                    $hasMissingData = true;
                    break;
                }
            }

            $result[] = [
                'kpi_code' => $kpiCode,
                'name' => $kpiDef['name'] ?? '',
                'variable' => $variables[0]['variable'] ?? '',
                'value' => $computedValue,
                'status' => $latestStatus,
                'synced_at' => $latestSyncedAt?->toISOString(),
                'last_valid_synced_at' => $latestValidSyncedAt?->toISOString(),
                'formula_readable' => $kpiDef['formula_readable'] ?? null,
                'target_operator' => $targetOp,
                'target_value' => $targetVal,
                'target_is_percentage' => $targetIsPct,
                'target_readable' => $targetReadable,
                'refresh_frequency' => $kpiDef['refresh_frequency'] ?? 'instant',
                'highlight_color' => $kpiDef['highlight_color'] ?? null,
                'endpoints' => array_values($endpoints),
                'has_missing_data' => $hasMissingData,
                'graph_types' => $kpiDef['graph_types'] ?? null,
                'raw_data' => !empty($rawData) ? $rawData : null,
                'filter_key' => $filterKey,
            ];
        }

        return response()->json(['data' => $result]);
    }

    /**
     * Apply aggregation function to raw_data rows for a variable
     */
    private function applyFunction(array $raw, string $varKey, string $fn)
    {
        $values = [];
        foreach ($raw as $row) {
            if (is_array($row) && array_key_exists($varKey, $row)) {
                $v = $row[$varKey];
                if (is_numeric($v)) $values[] = (float) $v;
            }
        }
        if (empty($values)) return null;

        return match ($fn) {
            'Sum' => array_sum($values),
            'Average' => array_sum($values) / count($values),
            'Min' => min($values),
            'Max' => max($values),
            'Count' => count($values),
            'First' => $values[0],
            'Latest' => end($values),
            default => end($values),
        };
    }

    /**
     * Compute formula value from items array and variable values.
     * Formula variables are matched positionally to config variables.
     */
    private function computeFormula(array $items, array $variableValues)
    {
        // Build ordered list of variable values (by position in config)
        $orderedValues = array_values($variableValues);
        $varIndex = 0;
        $result = null;
        $operator = null;

        foreach ($items as $item) {
            $type = $item['type'] ?? '';

            if ($type === 'variable') {
                // Use positional matching: first formula var = first config var, etc.
                $val = $varIndex < count($orderedValues) ? $orderedValues[$varIndex] : null;
                $varIndex++;

                if ($val === null) return null;
                // If value is an array (has_function=false), use first element for formula
                if (is_array($val)) {
                    $val = reset($val);
                }
                $numVal = is_numeric($val) ? (float) $val : null;
                if ($numVal === null) return null;

                if ($result === null) {
                    $result = $numVal;
                } elseif ($operator !== null) {
                    $result = match ($operator) {
                        '*' => $result * $numVal,
                        '/' => $numVal != 0 ? $result / $numVal : null,
                        '+' => $result + $numVal,
                        '-' => $result - $numVal,
                        default => $result,
                    };
                    $operator = null;
                }
            } elseif ($type === 'operator') {
                $operator = $item['op'] ?? null;
            } elseif ($type === 'number') {
                $numVal = (float) ($item['value'] ?? 0);
                if ($operator !== null && $result !== null) {
                    $result = match ($operator) {
                        '*' => $result * $numVal,
                        '/' => $numVal != 0 ? $result / $numVal : null,
                        '+' => $result + $numVal,
                        '-' => $result - $numVal,
                        default => $result,
                    };
                    $operator = null;
                } elseif ($result === null) {
                    $result = $numVal;
                }
            }
        }

        return $result;
    }

    /**
     * Compute formula row-by-row across multiple variable raw arrays.
     * Joins rows by common fields and applies formula per row.
     */
    private function computeFormulaRowByRow(array $items, array $variableRawArrays)
    {
        $varKeys = array_keys($variableRawArrays);
        if (count($varKeys) < 2) return null;

        // Find common fields across all raw arrays for joining
        $allKeys = array_keys($variableRawArrays);
        $firstRaw = reset($variableRawArrays);
        if (!is_array($firstRaw) || empty($firstRaw)) return null;

        $commonFields = array_keys($firstRaw[0]);
        foreach ($variableRawArrays as $raw) {
            if (!empty($raw) && is_array($raw[0])) {
                $commonFields = array_intersect($commonFields, array_keys($raw[0]));
            }
        }

        // Use the most specific common field as join key (prefer EmployeeName, then ProdGroup, then first common)
        $joinKey = null;
        foreach (['EmployeeName', 'EmployeeNo', 'ProdGroup', 'Chaine', 'IDOFabrication'] as $candidate) {
            if (in_array($candidate, $commonFields)) {
                $joinKey = $candidate;
                break;
            }
        }
        if (!$joinKey && !empty($commonFields)) {
            $joinKey = reset($commonFields);
        }
        if (!$joinKey) return null;

        // Build index for each variable's raw_data by join key
        $indexed = [];
        foreach ($variableRawArrays as $varKey => $raw) {
            foreach ($raw as $row) {
                $joinVal = $row[$joinKey] ?? null;
                if ($joinVal !== null) {
                    $indexed[$varKey][$joinVal] = $row;
                }
            }
        }

        // Get all unique join values
        $allJoinValues = [];
        foreach ($indexed as $varIdx) {
            $allJoinValues = array_merge($allJoinValues, array_keys($varIdx));
        }
        $allJoinValues = array_unique($allJoinValues);

        // For each join value, extract variable values and compute formula
        $results = [];
        foreach ($allJoinValues as $joinVal) {
            $rowValues = [];
            foreach ($varKeys as $varKey) {
                $row = $indexed[$varKey][$joinVal] ?? null;
                $rowValues[$varKey] = $row[$varKey] ?? null;
            }

            // Check if all values are present
            $allPresent = true;
            foreach ($rowValues as $rv) {
                if ($rv === null) { $allPresent = false; break; }
            }
            if (!$allPresent) continue;

            // Compute formula for this row
            $computed = $this->computeFormula($items, $rowValues);
            if ($computed !== null) {
                $results[] = [
                    $joinKey => $joinVal,
                    'value' => round($computed, 2),
                ];
            }
        }

        return $results;
    }

    private function getKpiValue(array $kpiMap, string $kpiCode): ?array
    {
        if (!isset($kpiMap[$kpiCode])) {
            return null;
        }

        $entries = $kpiMap[$kpiCode];
        $latest = collect($entries)->sortByDesc('last_synced_at')->first();

        return [
            'value' => $latest['value'],
            'status' => $latest['last_status'],
            'synced_at' => $latest['last_synced_at'],
        ];
    }
}
