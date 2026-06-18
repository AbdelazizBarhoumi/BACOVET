<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LogisticsController extends Controller
{
    /**
     * Section A — Delivery Performance KPI cards
     * DOT (F-REQ-334), HOT (F-REQ-335), Respect Planification (F-REQ-336), Lead Time (F-REQ-337)
     */
    public function kpis(Request $request): JsonResponse
    {
        $today = Carbon::today();

        // F-REQ-334 — DOT: from sync_drive_dot_hot (Google Drive "gproplanning/carnet")
        $dotData = DB::table('sync_drive_dot_hot')
            ->where('type', 'DOT')
            ->orderByDesc('date')
            ->first();
        $dotPct = null;
        $dotRaw = ['total' => 0, 'livres' => 0];
        $dotIsFallback = true;
        if ($dotData && $dotData->qte_commandee > 0) {
            $dotPct = round(($dotData->qte_livree_on_time / $dotData->qte_commandee) * 100, 1);
            $dotRaw = ['total' => $dotData->qte_commandee, 'livres' => $dotData->qte_livree_on_time];
            $dotIsFallback = false;
        }

        // F-REQ-335 — HOT: from sync_drive_dot_hot
        // Proxy: OFs via Jemmel cutting site — not strictly "handover on time"
        $hotData = DB::table('sync_drive_dot_hot')
            ->where('type', 'HOT')
            ->orderByDesc('date')
            ->first();
        $hotPct = null;
        $hotRaw = ['total' => 0, 'livres' => 0];
        $hotIsFallback = true;
        if ($hotData && $hotData->qte_commandee > 0) {
            $hotPct = round(($hotData->qte_livree_on_time / $hotData->qte_commandee) * 100, 1);
            $hotRaw = ['total' => $hotData->qte_commandee, 'livres' => $hotData->qte_livree_on_time];
            $hotIsFallback = false;
        }

        // F-REQ-336 — Respect Planification: % chaînes atteignant objectif journalier
        $gproPlan = DB::table('sync_gpro_chain_planning')->get()->keyBy('chaine');
        $todayProd = DB::table('qte_produite')->whereDate('date', $today)
            ->select('chaine', DB::raw('SUM(quantite) as total_qte'))
            ->groupBy('chaine')->get()->keyBy('chaine');

        $chainsWithObjective = $gproPlan->filter(fn ($p) => ($p->objectif_journalier ?? 0) > 0);
        $chainsRespecting = 0;
        $chainsTotal = $chainsWithObjective->count();

        foreach ($chainsWithObjective as $ch => $plan) {
            $actual = $todayProd->get($ch)?->total_qte ?? 0;
            if ($actual >= $plan->objectif_journalier) {
                $chainsRespecting++;
            }
        }
        $respectPlanPct = $chainsTotal > 0 ? round(($chainsRespecting / $chainsTotal) * 100, 1) : null;

        // F-REQ-337 — Lead Time Global: computed from GPRO of_dates (ehd - bpd)
        // CDC formula: STRH + LT Transport. Using ehd (Export Handover Date) - bpd (Beginning Production Date)
        // as the available proxy for total lead time.
        $ofDates = DB::table('sync_gpro_of_dates')
            ->whereNotNull('bpd')
            ->whereNotNull('ehd')
            ->get();
        $leadTime = null;
        $leadTimeSource = 'sync_gpro_of_dates (ehd - bpd)';
        if ($ofDates->isNotEmpty()) {
            $totalDays = 0;
            $count = 0;
            foreach ($ofDates as $row) {
                $bpd = Carbon::parse($row->bpd);
                $ehd = Carbon::parse($row->ehd);
                if ($ehd->greaterThan($bpd)) {
                    $totalDays += $bpd->floatDiffInDays($ehd);
                    $count++;
                }
            }
            if ($count > 0) {
                $leadTime = round($totalDays / $count, 1);
            }
        }
        // Fallback to configurable default if no GPRO data
        $leadTimeValue = $leadTime ?? 32;
        $leadTimeStatus = $this->leadTimeStatus($leadTimeValue);
        $leadTimeIsFallback = $leadTime === null;
        $leadTimeNote = $leadTime !== null
            ? 'Moyenne '.number_format($count, 0, ',', ' ').' OFs'
            : 'Constante configurable (pas de données GPRO)';

        $statusFor = fn ($pct, $target) => $pct === null ? 'grey' : ($pct >= $target ? 'green' : ($pct >= $target - 5 ? 'orange' : 'red'));

        return response()->json([
            'dot' => [
                'value' => $dotPct,
                'status' => $statusFor($dotPct, 95),
                'source' => 'sync_drive_dot_hot',
                'is_fallback' => $dotIsFallback,
                'raw' => $dotRaw,
            ],
            'hot' => [
                'value' => $hotPct,
                'status' => $statusFor($hotPct, 95),
                'source' => 'sync_drive_dot_hot (proxy Jemmel)',
                'note' => 'Proxy: transferts via Jemmel. F-REQ-335 requiert main courante.',
                'is_fallback' => $hotIsFallback,
                'raw' => $hotRaw,
            ],
            'respect_plan' => [
                'value' => $respectPlanPct,
                'status' => $statusFor($respectPlanPct, 95),
                'source' => 'sync_gpro_chain_planning + qte_produite',
                'is_fallback' => false,
                'raw' => ['respecting' => $chainsRespecting, 'total' => $chainsTotal],
            ],
            'lead_time' => [
                'value' => $leadTimeValue,
                'status' => $leadTimeStatus,
                'unit' => 'j',
                'target' => 32,
                'source' => $leadTimeSource,
                'note' => $leadTimeNote,
                'is_fallback' => $leadTimeIsFallback,
            ],
            'next_export' => null,
            'synced_at' => DB::table('qte_produite')->orderByDesc('synced_at')->value('synced_at'),
        ]);
    }

    /**
     * Section B — Stock KPIs: Rotation, Dead-stock, Occupation
     */
    public function stockKpis(): JsonResponse
    {
        // Taux de rotation (F-REQ-316/317/318)
        $stockMoyen = DB::table('stock_moyen')->orderByDesc('synced_at')->first();
        $stockMoyenValue = $stockMoyen?->stock_moyen ?? 0;

        // Taux de stock mort (F-REQ-319/320/321)
        $articlesSansMvt = DB::table('articles_sans_mouvement')->orderByDesc('synced_at')->first();
        $qtteStock = DB::table('quantite_totale_stock')->orderByDesc('synced_at')->first();
        $totalStock = $qtteStock?->quantite_totale_stock ?? 0;
        $sansMvt = $articlesSansMvt?->qtte_sans_mvt_365j ?? 0;
        $stockMortPct = $totalStock > 0 ? round(($sansMvt / $totalStock) * 100, 2) : null;

        // Taux d'occupation (F-REQ-322/323/324)
        $rouleaux = DB::table('nombre_rouleaux')->orderByDesc('synced_at')->first();
        $capacite = DB::table('capacite_stockage')->orderByDesc('synced_at')->first();
        $nbRouleaux = $rouleaux?->nb_rouleaux ?? 0;
        // CDC formula denominator = "Capacité de stockage" = total physical capacity
        $totalConteneurs = $capacite?->total_conteneurs ?? 1;
        $conteneursActifs = $capacite?->conteneurs_actifs ?? 0;
        $occupationPct = $totalConteneurs > 0 ? round(($nbRouleaux / $totalConteneurs) * 100, 1) : null;

        return response()->json([
            'rotation' => [
                'stock_moyen' => $stockMoyenValue,
                'nb_lignes' => $stockMoyen?->nb_lignes_stock ?? 0,
                'note' => 'Coût marchandises requis depuis DIVA pour calcul rotation complet',
                'categories' => [
                    'accessoires' => ['value' => null, 'status' => 'pending', 'note' => 'Données par catégorie en attente (Q-37)'],
                    'tissu' => ['value' => null, 'status' => 'pending', 'note' => 'Données par catégorie en attente (Q-37)'],
                    'fg' => ['value' => null, 'status' => 'pending', 'note' => 'Données par catégorie en attente (Q-37)'],
                ],
            ],
            'stock_mort' => [
                'value' => $stockMortPct,
                'status' => $this->thresholdStatusMax($stockMortPct, 10),
                'nb_articles_sans_mvt' => $articlesSansMvt?->nb_articles_sans_mvt_365j ?? 0,
                'qtte_sans_mvt' => $sansMvt,
                'qtte_totale' => $totalStock,
                'note' => 'Basé sur quantités (Novacity ne fournit pas les coûts). Valeur réelle requiert données DIVA.',
                'categories' => [
                    'accessoires' => ['value' => null, 'status' => 'pending', 'note' => 'Données par catégorie en attente (Q-38)'],
                    'tissu' => ['value' => null, 'status' => 'pending', 'note' => 'Données par catégorie en attente (Q-38)'],
                    'fg' => ['value' => null, 'status' => 'pending', 'note' => 'Données par catégorie en attente (Q-38)'],
                ],
            ],
            'occupation' => [
                'value' => $occupationPct,
                'status' => $this->occupationStatus($occupationPct),
                'nb_rouleaux' => $nbRouleaux,
                'conteneurs_actifs' => $conteneursActifs,
                'total_conteneurs' => $capacite?->total_conteneurs ?? 0,
                'note' => 'Rouleaux / Capacité totale ('.number_format($totalConteneurs, 0, ',', ' ').' conteneurs)',
                'categories' => [
                    'accessoires' => ['value' => null, 'status' => 'pending', 'note' => 'Données par catégorie en attente (Q-39)'],
                    'tissu' => ['value' => null, 'status' => 'pending', 'note' => 'Données par catégorie en attente (Q-39)'],
                    'fg' => ['value' => null, 'status' => 'pending', 'note' => 'Données par catégorie en attente (Q-39)'],
                ],
            ],
            'synced_at' => $capacite?->synced_at ?? $stockMoyen?->synced_at,
        ]);
    }

    /**
     * Section C — Stock Composition: Provenance, Famille, Typologie pie charts
     */
    public function stockComposition(): JsonResponse
    {
        $provenance = DB::table('quantite_par_provenance')
            ->whereNotNull('provenance')
            ->orderByDesc('quantite')
            ->get()
            ->map(fn ($r) => [
                'name' => $r->provenance,
                'value' => (float) $r->quantite,
                'nb_articles' => (int) ($r->nb_articles ?? 0),
            ])
            ->values()
            ->toArray();

        $famille = DB::table('quantite_par_famille')
            ->whereNotNull('famille_fg')
            ->orderByDesc('quantite')
            ->get()
            ->map(fn ($r) => [
                'name' => $r->famille_fg,
                'value' => (float) $r->quantite,
            ])
            ->values()
            ->toArray();

        $typologie = DB::table('quantite_par_typologie')
            ->whereNotNull('typologie')
            ->orderByDesc('quantite')
            ->get()
            ->map(fn ($r) => [
                'name' => $r->typologie,
                'value' => (float) $r->quantite,
                'nb_articles' => (int) ($r->nb_articles ?? 0),
            ])
            ->values()
            ->toArray();

        return response()->json([
            'provenance' => $provenance,
            'famille' => $famille,
            'typologie' => $typologie,
            'synced_at' => DB::table('quantite_par_provenance')->orderByDesc('synced_at')->value('synced_at'),
        ]);
    }

    /**
     * Section D — OF & Delivery Status
     * OF table with avancement + livraison à temps + délai moyen
     */
    public function ofs(Request $request): JsonResponse
    {
        $today = Carbon::today();

        // OF status from etat_avancement
        $ofList = DB::table('etat_avancement')
            ->orderByDesc('avancement_pct')
            ->get();

        // BPD/EHD from GPRO Consulting (sync_gpro_of_dates)
        $gproDates = DB::table('sync_gpro_of_dates')
            ->get()
            ->keyBy('of_numero');

        // Colis total per command for expandable detail
        $colisData = DB::table('colis_total_var')
            ->get()
            ->groupBy('commande')
            ->map(fn ($rows) => $rows->map(fn ($r) => [
                'article' => $r->article,
                'total_colis' => $r->total_colis,
                'total_qte' => $r->total_qte,
            ])->toArray())
            ->toArray();

        // Nombre OFs livrés (F-REQ-325/326/327)
        $ofsLivres = DB::table('nombre_ofs_livres')->orderByDesc('synced_at')->first();
        $totalLivres = $ofsLivres?->nb_of_livres_total ?? 0;
        $transfertTotal = $ofsLivres?->of_avec_transfert_coupe_total ?? 0;
        $livraisonPct = $totalLivres > 0 ? round(($transfertTotal / $totalLivres) * 100, 1) : null;

        // Délai moyen (F-REQ-328/329/330)
        $moyenneTransfert = DB::table('moyenne_date_transfert')->orderByDesc('synced_at')->first();
        $delaiMoyen = $moyenneTransfert?->moyenne_jours ?? null;
        $nbOfConsideres = $moyenneTransfert?->nb_of_consideres ?? 0;

        return response()->json([
            'ofs' => $ofList->map(function ($o) use ($gproDates, $colisData, $today) {
                $gpro = $gproDates->get($o->of);

                return [
                    'of' => $o->of,
                    'avancement_pct' => $o->avancement_pct,
                    'quantite_prevue' => $o->quantite_prevue,
                    'quantite_realisee' => $o->quantite_realisee,
                    'statut' => $o->statut,
                    'colis' => $colisData[$o->of] ?? [],
                    // F-REQ-306/308 — BPD/EHD from GPRO Consulting
                    'bpd' => $gpro?->bpd ?? null,
                    'ehd' => $gpro?->ehd ?? null,
                    // F-REQ-307 — EPD: prefer GPRO value, fallback to computed
                    'epd' => $gpro?->epd ?? $this->computeEpd($o->quantite_prevue, $o->quantite_realisee, $today),
                ];
            })->toArray(),
            'livraison' => [
                'value' => $livraisonPct,
                'status' => $this->thresholdStatus($livraisonPct, 80),
                'total_ofs' => $totalLivres,
                'transfert_total' => $transfertTotal,
                'categories' => [
                    'accessoires' => ['value' => null, 'status' => 'pending', 'note' => 'Données par catégorie en attente (Q-40)'],
                    'tissu' => ['value' => null, 'status' => 'pending', 'note' => 'Données par catégorie en attente (Q-40)'],
                    'fg' => ['value' => null, 'status' => 'pending', 'note' => 'Données par catégorie en attente (Q-40)'],
                ],
            ],
            'delai_moyen' => [
                'value' => $delaiMoyen,
                'status' => $this->delaiStatus($delaiMoyen),
                'nb_ofs' => $nbOfConsideres,
                'categories' => [
                    'accessoires' => ['value' => null, 'status' => 'pending', 'note' => 'Données par catégorie en attente (Q-41)'],
                    'tissu' => ['value' => null, 'status' => 'pending', 'note' => 'Données par catégorie en attente (Q-41)'],
                    'fg' => ['value' => null, 'status' => 'pending', 'note' => 'Données par catégorie en attente (Q-41)'],
                ],
            ],
            'synced_at' => DB::table('etat_avancement')->orderByDesc('synced_at')->value('synced_at'),
        ]);
    }

    /**
     * Section D — Livraison endpoint (separate for frontend use)
     */
    public function livraison(): JsonResponse
    {
        $ofsLivres = DB::table('nombre_ofs_livres')->orderByDesc('synced_at')->first();
        $totalLivres = $ofsLivres?->nb_of_livres_total ?? 0;
        $transfertTotal = $ofsLivres?->of_avec_transfert_coupe_total ?? 0;
        $livraisonPct = $totalLivres > 0 ? round(($transfertTotal / $totalLivres) * 100, 1) : null;

        $moyenneTransfert = DB::table('moyenne_date_transfert')->orderByDesc('synced_at')->first();
        $delaiMoyen = $moyenneTransfert?->moyenne_jours ?? null;
        $nbOfConsideres = $moyenneTransfert?->nb_of_consideres ?? 0;

        return response()->json([
            'livraison' => [
                'value' => $livraisonPct,
                'status' => $this->thresholdStatus($livraisonPct, 80),
                'total_ofs' => $totalLivres,
                'transfert_total' => $transfertTotal,
                'categories' => [
                    'accessoires' => ['value' => null, 'status' => 'pending', 'note' => 'Données par catégorie en attente (Q-40)'],
                    'tissu' => ['value' => null, 'status' => 'pending', 'note' => 'Données par catégorie en attente (Q-40)'],
                    'fg' => ['value' => null, 'status' => 'pending', 'note' => 'Données par catégorie en attente (Q-40)'],
                ],
            ],
            'delai_moyen' => [
                'value' => $delaiMoyen,
                'status' => $this->delaiStatus($delaiMoyen),
                'nb_ofs' => $nbOfConsideres,
            ],
            'synced_at' => DB::table('nombre_ofs_livres')->orderByDesc('synced_at')->value('synced_at'),
        ]);
    }

    /**
     * Section E — Coverage bar charts (Chaîne, Coupe, Sérigraphie)
     */
    public function coverage(Request $request): JsonResponse
    {
        // Load cadence per chain from GPRO Consulting (cadence_hebdo = weekly cadence)
        $gproPlans = DB::table('sync_gpro_chain_planning')
            ->select('chaine', DB::raw('AVG(cadence_hebdo) as cadence_hebdo'))
            ->where('cadence_hebdo', '>', 0)
            ->groupBy('chaine')
            ->get()
            ->keyBy('chaine');

        // Default cadence (units/day) — used when GPRO has no data for a chain
        $defaultCadenceDaily = 100;

        // Couverture Chaîne (F-REQ-310) — uses qte_depart_chaine_article_of for OF→chain mapping
        // CDC formula: (Qté engagé − Qté planifié) / cadence
        // Qté planifié = sum(qte_depart_chaine_article_of.quantite) per chain (dispatched quantity)
        $chainPlanQte = DB::table('qte_depart_chaine_article_of')
            ->whereNotNull('chaine')
            ->select('chaine', DB::raw('SUM(quantite) as planifie'))
            ->groupBy('chaine')
            ->get()
            ->keyBy('chaine');

        $chainCoverage = DB::table('qte_engagement as qe')
            ->join('qte_depart_chaine_article_of as qdc', DB::raw('`qe`.`of`'), '=', DB::raw('`qdc`.`of`'))
            ->select(
                'qdc.chaine as chain_name',
                DB::raw('SUM(qe.quantite_engagee) as quantite_engagee')
            )
            ->whereNotNull('qdc.chaine')
            ->groupBy('chain_name')
            ->get()
            ->map(function ($row) use ($gproPlans, $defaultCadenceDaily, $chainPlanQte) {
                // cadence_hebdo is weekly; convert to daily by dividing by working days (6)
                $cadenceDaily = $defaultCadenceDaily;
                if (isset($gproPlans[$row->chain_name]) && $gproPlans[$row->chain_name]->cadence_hebdo > 0) {
                    $cadenceDaily = round($gproPlans[$row->chain_name]->cadence_hebdo / 6, 1);
                }
                $planifie = $chainPlanQte->get($row->chain_name)?->planifie ?? 0;
                $delta = max(0, $row->quantite_engagee - $planifie);

                return [
                    'name' => $row->chain_name,
                    'jours' => $cadenceDaily > 0 ? round($delta / $cadenceDaily, 1) : 0,
                    'cadence_daily' => $cadenceDaily,
                    'engagement' => (int) $row->quantite_engagee,
                    'planifie' => (int) $planifie,
                ];
            })
            ->toArray();

        // Couverture Coupe (F-REQ-311) — total engagement / avg cadence across all chains
        $totalCoupeEngagement = DB::table('qte_engagement')->sum('quantite_engagee');
        $totalCoupeSortie = DB::table('sortie_coupe')
            ->whereDate('date', Carbon::today())
            ->sum('quantite_coupee');
        $coupeDelta = max(0, $totalCoupeEngagement - $totalCoupeSortie);
        // Use average daily cadence across all chains
        $avgCadenceDaily = $defaultCadenceDaily;
        if ($gproPlans->isNotEmpty()) {
            $totalWeeklyCadence = $gproPlans->sum('cadence_hebdo');
            if ($totalWeeklyCadence > 0) {
                $avgCadenceDaily = round($totalWeeklyCadence / (6 * $gproPlans->count()), 1);
            }
        }
        $coupeCoverage = $totalCoupeEngagement > 0
            ? [['name' => 'Global', 'jours' => round($coupeDelta / $avgCadenceDaily, 1), 'cadence_daily' => $avgCadenceDaily]]
            : [];

        // Couverture Sérigraphie (F-REQ-309)
        $entree = DB::table('qte_entree_serigraphie')
            ->whereDate('date', Carbon::today())
            ->groupBy('article')
            ->select('article', DB::raw('SUM(quantite) as total_entree'))
            ->get()
            ->keyBy('article');

        $sortie = DB::table('sortie_serigraphie')
            ->whereDate('date', Carbon::today())
            ->groupBy('article')
            ->select('article', DB::raw('SUM(quantite) as total_sortie'))
            ->get()
            ->keyBy('article');

        $allArticles = $entree->merge($sortie)->keys();
        $seriCoverage = $allArticles->map(fn ($article) => [
            'name' => $article,
            'jours' => max(0, ($entree[$article]->total_entree ?? 0) - ($sortie[$article]->total_sortie ?? 0)) / $avgCadenceDaily,
        ])->toArray();

        $coverageIsFallback = $gproPlans->isEmpty();

        return response()->json([
            'chaine' => $chainCoverage,
            'coupe' => $coupeCoverage,
            'serigraphie' => $seriCoverage,
            'is_fallback' => $coverageIsFallback,
            'synced_at' => DB::table('qte_engagement')->orderByDesc('synced_at')->value('synced_at'),
        ]);
    }

    /**
     * Section F — Stock search table (vue_stock + diva_stock join)
     * FULLTEXT search, famille filter, pagination
     */
    public function stockSearch(Request $request): JsonResponse
    {
        $search = $request->input('q', '');
        $famille = $request->input('famille', '');
        $page = max(1, (int) $request->input('page', 1));
        $perPage = 20;

        $query = DB::table('vue_stock as vs')
            ->leftJoin('diva_stock as ds', 'vs.idmp', '=', 'ds.idmp')
            ->select(
                'vs.code_mp',
                'vs.designation',
                'vs.famille',
                'vs.couleur',
                'ds.idmagasin',
                DB::raw('COALESCE(ds.qtte, 0) as qtte'),
                DB::raw('COALESCE(ds.qtte_reserve, 0) as qtte_reserve'),
                DB::raw('COALESCE(ds.qtte, 0) - COALESCE(ds.qtte_reserve, 0) as qtte_disponible')
            );

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('vs.code_mp', 'LIKE', "%{$search}%")
                    ->orWhere('vs.designation', 'LIKE', "%{$search}%")
                    ->orWhere('vs.famille', 'LIKE', "%{$search}%");
            });
        }

        if ($famille !== '') {
            $query->where('vs.famille', $famille);
        }

        $total = $query->count();
        $results = $query->orderBy('vs.code_mp')
            ->offset(($page - 1) * $perPage)
            ->limit($perPage)
            ->get();

        // Summary stats
        $stockMoyen = DB::table('vue_stock')->count();

        return response()->json([
            'data' => $results,
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'total_pages' => max(1, (int) ceil($total / $perPage)),
            'stock_total' => $stockMoyen,
            'synced_at' => DB::table('vue_stock')->orderByDesc('synced_at')->value('synced_at'),
        ]);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function thresholdStatus(?float $value, float $target): string
    {
        if ($value === null) {
            return 'grey';
        }
        if ($value >= $target) {
            return 'green';
        }
        if ($value >= $target - 3) {
            return 'orange';
        }

        return 'red';
    }

    private function thresholdStatusMax(?float $value, float $max): string
    {
        if ($value === null) {
            return 'grey';
        }
        if ($value <= $max) {
            return 'green';
        }
        if ($value <= $max + 2) {
            return 'orange';
        }

        return 'red';
    }

    private function occupationStatus(?float $value): string
    {
        if ($value === null || $value === 0.0) {
            return 'grey';
        }
        if ($value <= 85) {
            return 'green';
        }
        if ($value <= 95) {
            return 'orange';
        }

        return 'red';
    }

    private function delaiStatus(?float $value): string
    {
        if ($value === null) {
            return 'grey';
        }
        if ($value <= 1) {
            return 'green';
        }
        if ($value <= 3) {
            return 'orange';
        }

        return 'red';
    }

    private function leadTimeStatus(?float $value): string
    {
        if ($value === null) {
            return 'grey';
        }
        if ($value <= 32) {
            return 'green';
        }
        if ($value <= 40) {
            return 'orange';
        }

        return 'red';
    }

    /**
     * F-REQ-307 — EPD (End Production Date)
     * Formula: (quantite_prevue - quantite_realisee) / cadence + today
     * Cadence = 100 units/day (configurable, same as coverage calculation)
     */
    private function computeEpd(?float $prevue, ?float $realisee, $today): ?string
    {
        if ($prevue === null || $realisee === null || $prevue <= $realisee) {
            return $today->toDateString();
        }

        $cadence = 100; // units per day
        $remaining = $prevue - $realisee;
        $daysNeeded = $remaining / $cadence;

        return $today->copy()->addDays((int) ceil($daysNeeded))->toDateString();
    }

    /**
     * F-REQ-313/314/315 — Taux de Fiabilité Stock (Accessoires/Tissu/FG)
     * Computes per-category reliability proxy.
     * Formula: global_reliability = (total - dead_stock) / total * 100
     * Per-category: Accessoires/FG via quantite_par_typologie, Tissu via vue_stock.Famille
     * (Typologie is a trims/accessories taxonomy; fabric materials live in vue_stock.Famille).
     */
    public function stockReliability(): JsonResponse
    {
        $totalStock = DB::table('quantite_totale_stock')->orderByDesc('synced_at')->first();
        $deadStock = DB::table('articles_sans_mouvement')->orderByDesc('synced_at')->first();

        $total = $totalStock?->quantite_totale_stock ?? 0;
        $dead = $deadStock?->qtte_sans_mvt_365j ?? 0;
        $reliability = $total > 0 ? round((($total - $dead) / $total) * 100, 1) : null;

        $status = $reliability !== null ? ($reliability >= 99.5 ? 'green' : ($reliability >= 98 ? 'orange' : 'red')) : 'grey';

        // Typologie data for Accessoires/FG matching
        $typologieData = DB::table('quantite_par_typologie')
            ->whereNotNull('typologie')
            ->get(['typologie', 'quantite']);

        // vue_stock.Famille for Tissu matching (fabric materials live here, not in Typologie)
        $familleData = DB::table('vue_stock')
            ->whereNotNull('famille')
            ->select('famille', DB::raw('SUM(qtte) as quantite'))
            ->groupBy('famille')
            ->get();

        $categoryKeywords = [
            'accessoires' => ['accessoir', 'anneau', 'elastique', 'cordon', 'antiglise', 'billet', 'cientre', 'hangtag', 'bouton', 'fermeture', 'etiquette', 'boutonniere', 'zip', 'pression', 'oeil', 'velcro', 'cordelette', 'dessous'],
            'tissu' => ['tissu', 'toile', 'jersey', 'poly', 'coton', 'nylon', 'maille', 'doublure', 'ponge'],
            'fg' => ['coque', 'emballage', 'carton', 'sachet', 'etiquette finie', 'ruban', 'article fini', 'fg', 'produit fini'],
        ];

        // Fabric families from vue_stock.Famille
        $fabricFamilies = ['tissu', 'coton', 'polyester', 'nylon', 'lin', 'soie', 'laine', 'elasthanne', 'maille', 'toile', 'jersey', 'ponge', 'doublure'];

        $categories = [];
        foreach ($categoryKeywords as $key => $keywords) {
            $catQty = 0;
            $catStatus = 'grey';
            $catNote = 'Aucune donnée pour cette catégorie';
            $catReliability = null;

            if ($key === 'tissu') {
                // Tissu: match against vue_stock.Famille (where fabric materials actually live)
                $catQty = $familleData
                    ->filter(fn ($row) => collect($fabricFamilies)->some(fn ($fam) => str_contains(strtolower($row->famille), $fam)))
                    ->sum('quantite');
            } else {
                // Accessoires/FG: match against quantite_par_typologie
                $catQty = $typologieData
                    ->filter(fn ($row) => in_array(strtolower($row->typologie), $keywords)
                        || collect($keywords)->some(fn ($kw) => str_contains(strtolower($row->typologie), $kw)))
                    ->sum('quantite');
            }

            if ($catQty > 0 && $reliability !== null) {
                $catReliability = $reliability;
                $catStatus = $reliability >= 99.5 ? 'green' : ($reliability >= 98 ? 'orange' : 'red');
                $catNote = number_format($catQty, 0, ',', ' ').' unités — Comptage physique requis pour valeurs exactes';
            }

            $categories[$key] = [
                'value' => $catReliability,
                'status' => $catStatus,
                'target' => 99.5,
                'note' => $catNote,
                'matched_qty' => $catQty,
            ];
        }

        return response()->json([
            'global' => [
                'value' => $reliability,
                'status' => $status,
                'target' => 99.5,
                'note' => 'Proxy: (stock_total - articles_sans_mvt) / stock_total.',
            ],
            'accessoires' => $categories['accessoires'],
            'tissu' => $categories['tissu'],
            'fg' => $categories['fg'],
            'synced_at' => $totalStock?->synced_at,
        ]);
    }
}
