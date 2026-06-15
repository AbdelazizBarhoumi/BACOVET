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

        // Respect Planification — BLOCKED: F-REQ-312 (objectif par chaîne) missing
        // Cannot compute correctly without per-chain daily objectives
        // Previous formula was wrong: summed ALL chains/shifts against a single constant
        $respectPlan = null;

        // Lead Time — configurable constant (STRH + LT Transport)
        $leadTime = 32; // jours

        return response()->json([
            // F-REQ-334 — DOT: GPRO Planning not connected (B-04) → grey placeholder
            'dot' => [
                'value' => null,
                'status' => 'pending',
                'source' => 'GPRO Planning',
                'blocker' => 'B-04',
                'note' => 'Données GPRO Planning en attente de connexion',
            ],
            // F-REQ-335 — HOT: GPRO Planning not connected (B-04) → grey placeholder
            'hot' => [
                'value' => null,
                'status' => 'pending',
                'source' => 'GPRO Planning',
                'blocker' => 'B-04',
                'note' => 'Données GPRO Planning en attente de connexion',
            ],
            // F-REQ-336 — Respect Planification: PENDING — F-REQ-312 (objectif par chaîne) not available
            'respect_plan' => [
                'value' => null,
                'status' => 'pending',
                'source' => 'GPRO Consulting',
                'blocker' => 'B-04',
                'note' => 'Objectif journalier par chaîne requis (F-REQ-312) — sans cette donnée, le calcul par chaîne est impossible. L\'ancienne formule globale (qtéToday/1000) produisait des résultats erronés (ex: 33598%).',
            ],
            // F-REQ-337 — Lead Time Global: configurable constant
            'lead_time' => [
                'value' => $leadTime,
                'status' => 'green',
                'unit' => 'j',
                'source' => 'Configurable',
                'note' => 'STRH + LT Transport — constante configurable',
            ],
            // Export alert: no live data source → placeholder
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
        $conteneursActifs = $capacite?->conteneurs_actifs ?? 1;
        // parseInt coercion is done in SyncService (stored as INT in MySQL)
        $occupationPct = $conteneursActifs > 0 ? round(($nbRouleaux / $conteneursActifs) * 100, 1) : null;

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
            ->get(['provenance as name', 'quantite as value', 'nb_articles'])
            ->toArray();

        $famille = DB::table('quantite_par_famille')
            ->whereNotNull('famille_fg')
            ->orderByDesc('quantite')
            ->get(['famille_fg as name', 'quantite as value'])
            ->toArray();

        $typologie = DB::table('quantite_par_typologie')
            ->whereNotNull('typologie')
            ->orderByDesc('quantite')
            ->get(['typologie as name', 'quantite as value', 'nb_articles'])
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
        // parseFloat coercion is done in SyncService (stored as DECIMAL in MySQL)
        $delaiMoyen = $moyenneTransfert?->moyenne_jours ?? null;
        $nbOfConsideres = $moyenneTransfert?->nb_of_consideres ?? 0;

        return response()->json([
            'ofs' => $ofList->map(fn ($o) => [
                'of' => $o->of,
                'avancement_pct' => $o->avancement_pct,
                'quantite_prevue' => $o->quantite_prevue,
                'quantite_realisee' => $o->quantite_realisee,
                'statut' => $o->statut,
                'colis' => $colisData[$o->of] ?? [],
                // F-REQ-306/308 — BPD/EHD placeholders (B-04 blocked)
                'bpd' => null, // Beginning Production Date — GPRO Consulting
                'ehd' => null, // Export Handover Date — GPRO Consulting
                // F-REQ-307 — EPD: computed from available data
                'epd' => $this->computeEpd($o->quantite_prevue, $o->quantite_realisee, $today),
            ])->toArray(),
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
        // Couverture Chaîne (F-REQ-310) — uses qte_depart_chaine_article_of for OF→chain mapping
        // qte_engagement and etat_avancement do NOT have chaine column (Novacity limitation)
        $chainCoverage = DB::table('qte_engagement as qe')
            ->join('qte_depart_chaine_article_of as qdc', 'qe.of', '=', 'qdc.of')
            ->select(
                'qdc.chaine as chain_name',
                DB::raw('SUM(qe.quantite_engagee) as quantite_engagee')
            )
            ->whereNotNull('qdc.chaine')
            ->groupBy('chain_name')
            ->get()
            ->map(fn ($row) => [
                'name' => $row->chain_name,
                'jours' => round($row->quantite_engagee / 100, 1),
            ])
            ->toArray();

        // Couverture Coupe (F-REQ-311) — single value: total engagement / cadence hebdo
        $totalCoupeEngagement = DB::table('qte_engagement')->sum('quantite_engagee');
        $totalCoupeSortie = DB::table('sortie_coupe')
            ->whereDate('date', Carbon::today())
            ->sum('quantite_coupee');
        $coupeCoverage = $totalCoupeEngagement > 0
            ? [['name' => 'Global', 'jours' => round(($totalCoupeEngagement - $totalCoupeSortie) / 100, 1)]]
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
            'jours' => max(0, ($entree[$article]->total_entree ?? 0) - ($sortie[$article]->total_sortie ?? 0)) / 100,
        ])->toArray();

        return response()->json([
            'chaine' => $chainCoverage,
            'coupe' => $coupeCoverage,
            'serigraphie' => $seriCoverage,
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
     * Requires DIVA + DRIVE integration — placeholder until Sprint 7
     */
    public function stockReliability(): JsonResponse
    {
        return response()->json([
            'accessoires' => [
                'value' => null,
                'status' => 'pending',
                'target' => 99.5,
                'note' => 'Intégration DRIVE requise pour comptages physiques',
                'blocker' => 'Sprint 7 — DRIVE integration',
            ],
            'tissu' => [
                'value' => null,
                'status' => 'pending',
                'target' => 99.5,
                'note' => 'Intégration DRIVE requise pour comptages physiques',
                'blocker' => 'Sprint 7 — DRIVE integration',
            ],
            'fg' => [
                'value' => null,
                'status' => 'pending',
                'target' => 99.5,
                'note' => 'Intégration DRIVE requise pour comptages physiques',
                'blocker' => 'Sprint 7 — DRIVE integration',
            ],
            'synced_at' => null,
        ]);
    }
}
