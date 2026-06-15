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
     * strictly aligned with CDC — returns N/A for missing GPRO consulting fields.
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

        $missingFields = [];
        $chains = $wip->map(function ($w, $ch) use ($eff, $quality, $depart, $fabrication, $stock, &$missingFields) {
            $e = $eff->get($ch);
            $q = $quality->get($ch)?->avg('defect_pct');

            $d = $depart->get($ch)?->first();
            $of = $d?->of ?? $w->of_number ?? 'N/A';
            $article = $d?->article ?? $w->article ?? 'N/A';

            $fb = $fabrication->get($of);
            $bpd = $fb?->dt_debut ?? $w->bpd ?? 'N/A';
            $epd = $fb?->dt_fin ?? $w->epd ?? 'N/A';

            // Resolve Designation via stock table (Novacity source)
            $designation = $stock->get($article) ?? 'N/A';
            if ($designation === 'N/A') {
                $articleSuffix = substr($article, strpos($article, '-') + 1);
                $designation = $stock->first(fn ($val, $key) => str_ends_with($key, $articleSuffix)) ?? 'N/A';
            }

            // Objectif: Use quantity launched on this chain from qte_depart_chaine_article_of
            $objectif = $d?->quantite ?? 'N/A';

            // CDC strict: these fields require GPRO consulting which is NOT in current API
            $sam = 'N/A';
            $sot = 'N/A';
            $effectif = 'N/A';
            $ehd = 'N/A';

            $missingFields[] = 'SAM (F-REQ-211)';
            $missingFields[] = 'SOT (F-REQ-212)';
            $missingFields[] = 'Effectif (F-REQ-213)';

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

        return response()->json([
            'data' => $chains,
            'metadata' => [
                'missing_fields' => array_unique($missingFields),
                'note' => 'Note de conformité CDC — État des données : '.
                          '1. SAM (211), SOT (212), Effectif (213) et EHD (308) : source GPRO Consulting (B-04) non connectée. '.
                          '2. Designation (215) récupérée via vue_stock (§2.3). '.
                          '3. Objectif (312) basé sur quantité lancée via qte_depart_chaine (§3.13) — source réelle = GPRO. '.
                          '4. minutes_presence (§3.7) et minutes_produites (§3.8) sont des endpoints séparés — sync manquant. '.
                          '5. OWE (204) bloqué par absence de SAM (B-04 GPRO Consulting).',
                'cdc_traceability' => [
                    'sam' => ['id' => 'F-REQ-211', 'label' => 'SAM', 'blocker' => 'Source GPRO Consulting manquante'],
                    'sot' => ['id' => 'F-REQ-212', 'label' => 'SOT', 'blocker' => 'Source GPRO Consulting manquante'],
                    'effectif' => ['id' => 'F-REQ-213', 'label' => 'Effectifs', 'blocker' => 'Source GPRO Consulting manquante'],
                    'ehd' => ['id' => 'F-REQ-308', 'label' => 'EHD', 'blocker' => 'Source GPRO Consulting manquante'],
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

        // 2. RFT Production
        // Note: pieces_ok_jour and pieces_produites_jour don't have chaine/atelier usually,
        // but we apply filters just in case they are expanded later.
        $piecesOkQuery = DB::table('pieces_ok_jour')->whereDate('date', $today);
        $this->applyFilters($piecesOkQuery, $request);
        $piecesOkJour = $piecesOkQuery->first();

        $piecesProdQuery = DB::table('pieces_produites_jour')->whereDate('date', $today);
        $this->applyFilters($piecesProdQuery, $request);
        $piecesProduiteJour = $piecesProdQuery->first();

        $rftJour = $this->kpi->computeRft($piecesOkJour?->first_pass_today, $piecesProduiteJour?->produced_today);

        // 3. BR GTD (Card 2 proxy)
        $brGtdJour = $this->computeBrGtdJour($today, $request);

        // 4. BR Bundling
        $bundlingQuery = DB::table('rejets_inspection_paquet')
            ->whereDate('date', $today)
            ->where('period', 'jour');
        $this->applyFilters($bundlingQuery, $request);
        $bundlingRow = $bundlingQuery->first();
        $brBundling = null;
        if ($bundlingRow && $bundlingRow->bundle_inspected > 0) {
            $brBundling = round(($bundlingRow->bundle_reject / $bundlingRow->bundle_inspected) * 100, 1);
        }

        // 5. OWE (N/A)
        $oweValue = 'N/A';

        $wipQuery = DB::table('wip_chaine');
        $this->applyFilters($wipQuery, $request);
        $totalWip = (int) $wipQuery->sum('en_cours');

        $lostQuery = DB::table('lost_time')->whereDate('date', $today);
        $this->applyFilters($lostQuery, $request);
        $totalLost = (int) $lostQuery->sum('minutes_perdues');

        return response()->json([
            'avg_efficience' => [
                'value' => $stats->avg_eff ? round($stats->avg_eff, 1) : 0,
                'status' => $this->kpi->efficienceStatus($stats->avg_eff),
                'target' => '≥ 85%',
            ],
            'avg_owe' => [
                'value' => null,
                'status' => 'blocked',
                'target' => '≥ 70%',
            ],
            'rft_production' => [
                'value' => $rftJour,
                'status' => $this->kpi->rftStatus($rftJour),
                'target' => '≥ 98%',
            ],
            'total_wip' => [
                'value' => $totalWip,
                'status' => $this->kpi->wipStatus($totalWip, self::DEFAULT_CADENCE * 10),
                'target' => '≤ ½ cadence',
            ],
            'total_lost_time' => [
                'value' => $totalLost,
                'status' => $this->kpi->lostTimeStatus($totalLost),
                'target' => '< 10 min',
            ],
            'br_gtd' => [
                'value' => $brGtdJour,
                'status' => $this->kpi->brStatus($brGtdJour),
                'target' => '≤ 5%',
            ],
            'br_bundling' => [
                'value' => $brBundling,
                'status' => $brBundling !== null ? $this->kpi->brStatus($brBundling) : 'grey',
                'target' => '≤ 5%',
            ],
            'br_print' => [
                'value' => null,
                'status' => 'pending',
                'target' => '≤ 5%',
            ],
            'metadata' => [
                'note' => 'Statut des KPI Qualité : BR Print en attente de connecteur Google Drive.',
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
            DB::raw('CASE WHEN quantite_prevue > 0 THEN CAST(quantite_realisee AS FLOAT) / quantite_prevue * 100 ELSE avancement_pct END as pct'),
            'statut'
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

        $prodQuery = DB::table('minutes_produites')->where('date', '>=', $startOfMonth);
        $this->applyFilters($prodQuery, $request);
        $prod = $prodQuery->select('date', DB::raw('SUM(minutes_produites) as total_prod'))
            ->groupBy('date')->get()->keyBy('date');

        $presQuery = DB::table('minutes_presence')->where('date', '>=', $startOfMonth);
        $this->applyFilters($presQuery, $request);
        $pres = $presQuery->select('date', DB::raw('SUM(minutes_presence) as total_pres'))
            ->groupBy('date')->get()->keyBy('date');

        $data = $prod->keys()->merge($pres->keys())->unique()->sort()->map(function ($date) use ($prod, $pres) {
            $p = $prod->get($date);
            $presVal = $pres->get($date);

            return [
                'jour' => substr($date, 5),
                'eff' => $presVal && $presVal->total_pres > 0 ? round((($p?->total_prod ?? 0) / $presVal->total_pres) * 100, 1) : 0,
            ];
        })->values();

        return response()->json(['data' => $data]);
    }

    /**
     * F-REQ-210: Route: top-operators
     * Fixed: Use minutes_produites directly and join with minutes_presence table.
     */
    /**
     * F-REQ-210: Route: top-operators
     * Use minutes_produites and join with minutes_presence table for accurate efficiency.
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
            ->whereDate('q.date', $today);

        $this->applyFilters($query, $request, 'q.date', 'q.chaine');

        $data = $query->select(
            'q.employee_id as nom',
            'q.chaine',
            DB::raw('SUM(q.minutes_produites) as min_std'),
            DB::raw('SUM(IFNULL(p.minutes_presence, q.minutes_presence)) as min_pres')
        )
            ->groupBy('q.employee_id', 'q.chaine')
            ->having('min_pres', '>', 0)
            ->orderByDesc('min_std')
            ->limit($limit)->get()
            ->map(fn ($r) => [
                'nom' => $r->nom,
                'chaine' => $r->chaine,
                'eff' => round(($r->min_std / $r->min_pres) * 100, 1),
                'min_std' => round($r->min_std, 1),
                'min_pres' => round($r->min_pres, 1),
            ]);

        return response()->json(['data' => $data]);
    }

    /**
     * F-REQ-206: Route: wip
     * Flux Coupe & Engagement (Trend)
     */
    public function wip(Request $request): JsonResponse
    {
        $start = Carbon::now()->subDays(30);

        $engQuery = DB::table('qte_engagement');
        $this->applyFilters($engQuery, $request);
        $eng = $engQuery->where('date', '>=', $start)
            ->select('date', DB::raw('SUM(quantite_engagee) as engagement'))
            ->groupBy('date')->get()->keyBy('date');

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
                'wip' => max(0, (int) ($c?->sortie ?? 0) - (int) ($e?->engagement ?? 0)),
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

        $data = $query->select('chaine', DB::raw('SUM(quantite_realisee) as realise'), DB::raw('SUM(quantite_prevue) as prevue'))
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
                ->whereDate('q.date', $today);

            $this->applyFilters($query, $request, 'q.date', 'q.chaine');

            $data = $query->select(
                'q.employee_id as employe',
                'q.chaine',
                DB::raw('SUM(q.minutes_produites) as min_std'),
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
                    'ecart' => round($r->value - 85, 1), // 85% target
                ]);

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

    public function inlineEndline(Request $request): JsonResponse
    {
        $data = DB::table('inline_vs_endline_comparison')->whereDate('log_date', Carbon::today())->get();

        return response()->json(['data' => $data]);
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

        $delta = $qteCoupee - $qteEngagee;
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

        $data = $eng->map(function ($e, $ch) use ($plan) {
            $p = $plan->get($ch)?->qte ?? 0;
            $cadence = 100; // Placeholder cadence (pcs/day)

            $diff = max(0, $e->qte - $p);
            $jours = $cadence > 0 ? round($diff / $cadence, 1) : 0;

            return [
                'chaine' => $ch,
                'value' => $jours,
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
            ->whereDate('q.date', Carbon::today())
            ->where(function ($q) use ($posteId, $posteAlt) {
                $q->where('q.poste', $posteId)
                    ->orWhere('q.poste', $posteAlt);
            });

        $this->applyFilters($query, $request, 'q.date', 'q.chaine');

        $data = $query->select(
            'q.employee_id as employe',
            DB::raw('SUM(q.minutes_produites) as min_prod'),
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

        return response()->json(['data' => $query->get(), 'metadata' => ['br_print_note' => 'F-REQ-108: BR Print (Google Drive) sync pending.']]);
    }

    public function alerts(Request $request): JsonResponse
    {
        return response()->json(['alerts' => $this->alerts->generateProductionAlerts()]);
    }
}
