<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\KpiComputeService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LogisticsController extends Controller
{
    public function __construct(
        private KpiComputeService $kpi
    ) {}

    /**
     * Section A — Delivery Performance KPI cards
     * DOT (F-REQ-335), HOT (F-REQ-336), Respect Planification (F-REQ-337), Lead Time (F-REQ-338)
     */
    public function kpis(Request $request): JsonResponse
    {
        $today = Carbon::today();

        // F-REQ-335 — DOT: from sync_drive_dot_hot (Google Drive "gproplanning/carnet")
        $dotData = DB::table('sync_drive_dot_hot')
            ->where('type', 'DOT')
            ->whereDate('date', $today)
            ->first();
        $dotIsFallback = false;
        if (! $dotData) {
            $dotData = DB::table('sync_drive_dot_hot')
                ->where('type', 'DOT')
                ->orderByDesc('date')
                ->first();
            $dotIsFallback = $dotData !== null;
        }
        $dotPct = null;
        $dotRaw = ['total' => 0, 'livres' => 0];
        if ($dotData && $dotData->qte_commandee > 0) {
            $dotPct = round(($dotData->qte_livree_on_time / $dotData->qte_commandee) * 100, 1);
            $dotRaw = ['total' => $dotData->qte_commandee, 'livres' => $dotData->qte_livree_on_time];
        }
        $dotSyncedAt = $dotData?->date ? Carbon::parse($dotData->date)->toIso8601String() : null;

        // F-REQ-336 — HOT: from sync_drive_dot_hot
        $hotData = DB::table('sync_drive_dot_hot')
            ->where('type', 'HOT')
            ->whereDate('date', $today)
            ->first();
        $hotIsFallback = false;
        if (! $hotData) {
            $hotData = DB::table('sync_drive_dot_hot')
                ->where('type', 'HOT')
                ->orderByDesc('date')
                ->first();
            $hotIsFallback = $hotData !== null;
        }
        $hotPct = null;
        $hotRaw = ['total' => 0, 'livres' => 0];
        if ($hotData && $hotData->qte_commandee > 0) {
            $hotPct = round(($hotData->qte_livree_on_time / $hotData->qte_commandee) * 100, 1);
            $hotRaw = ['total' => $hotData->qte_commandee, 'livres' => $hotData->qte_livree_on_time];
        }
        $hotSyncedAt = $hotData?->date ? Carbon::parse($hotData->date)->toIso8601String() : null;

        // F-REQ-337 — Respect Planification: average per-chain (realise/objectif) × 100
        $gproPlan = DB::table('sync_gpro_chain_planning')->get()->keyBy('chaine');
        $todayProd = DB::table('qte_produite')->whereDate('date', $today)
            ->select('chaine', DB::raw('SUM(quantite) as total_qte'))
            ->groupBy('chaine')->get()->keyBy('chaine');

        $chainsWithObjective = $gproPlan->filter(fn ($p) => ($p->objectif_journalier ?? 0) > 0);
        $perChainPercentages = [];
        $chainsRespecting = 0;
        $chainsTotal = $chainsWithObjective->count();

        foreach ($chainsWithObjective as $ch => $plan) {
            $actual = $todayProd->get($ch)?->total_qte ?? 0;
            $chainPct = round(($actual / $plan->objectif_journalier) * 100, 1);
            $perChainPercentages[] = $chainPct;
            if ($actual >= $plan->objectif_journalier) {
                $chainsRespecting++;
            }
        }
        $respectPlanPct = count($perChainPercentages) > 0
            ? round(array_sum($perChainPercentages) / count($perChainPercentages), 1)
            : null;
        $respectPlanSyncedAt = DB::table('qte_produite')->whereDate('date', $today)->max('synced_at')
            ?? DB::table('sync_gpro_chain_planning')->max('synced_at');

        // F-REQ-338 — Lead Time Global: computed from GPRO of_dates (ehd - bpd)
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
        $leadTimeValue = $leadTime ?? 32;
        $leadTimeStatus = $this->leadTimeStatus($leadTimeValue);
        $leadTimeIsFallback = $leadTime === null;
        $leadTimeNote = $leadTime !== null
            ? 'Moyenne '.number_format($count, 0, ',', ' ').' OFs'
            : 'Constante configurable (pas de données GPRO)';
        $leadTimeSyncedAt = DB::table('sync_gpro_of_dates')->max('synced_at');

        // F-REQ-216 — Taux d'archivage suivi paquets (from sync_gpro_suivi_paquets)
        $totalOfs = DB::table('sync_gpro_suivi_paquets')->where('est_solde', true)->count();
        $archivedOfs = DB::table('sync_gpro_suivi_paquets')
            ->where('est_solde', true)->where('est_archive', true)->count();
        $archivagePct = $totalOfs > 0 ? round(($archivedOfs / $totalOfs) * 100, 1) : null;

        $statusFor = fn ($pct, $target) => $pct === null ? 'grey' : ($pct >= $target ? 'green' : ($pct >= $target - 5 ? 'orange' : 'red'));

        return response()->json([
            'dot' => [
                'value' => $dotPct,
                'status' => $statusFor($dotPct, 95),
                'target' => '≥ 95%',
                'source' => 'sync_drive_dot_hot',
                'is_fallback' => $dotIsFallback,
                'is_stale' => $dotIsFallback,
                'raw' => $dotRaw,
                'synced_at' => $dotSyncedAt,
            ],
            'hot' => [
                'value' => $hotPct,
                'status' => $statusFor($hotPct, 95),
                'target' => '≥ 95%',
                'source' => 'sync_drive_dot_hot (proxy Jemmel)',
                'note' => 'Proxy: transferts via Jemmel. F-REQ-336 requiert main courante.',
                'is_fallback' => $hotIsFallback,
                'is_stale' => $hotIsFallback,
                'raw' => $hotRaw,
                'synced_at' => $hotSyncedAt,
            ],
            'respect_plan' => [
                'value' => $respectPlanPct,
                'status' => $statusFor($respectPlanPct, 95),
                'target' => '≥ 95%',
                'source' => 'sync_gpro_chain_planning + qte_produite',
                'is_fallback' => false,
                'raw' => [
                    'respecting' => $chainsRespecting,
                    'total' => $chainsTotal,
                    'per_chain' => $perChainPercentages,
                ],
                'synced_at' => $respectPlanSyncedAt,
            ],
            'lead_time' => [
                'value' => $leadTimeValue,
                'status' => $leadTimeStatus,
                'unit' => 'j',
                'target' => 32,
                'source' => $leadTimeSource,
                'note' => $leadTimeNote,
                'is_fallback' => $leadTimeIsFallback,
                'is_stale' => false,
                'synced_at' => $leadTimeSyncedAt,
            ],
            'archivage' => [
                'value' => $archivagePct,
                'status' => $this->kpi->tauxArchivageStatus($archivagePct),
                'target' => '≥ 85%',
                'source' => 'sync_gpro_suivi_paquets',
                'is_fallback' => false,
                'raw' => ['total_ofs' => $totalOfs, 'archived_ofs' => $archivedOfs],
                'note' => $archivagePct === null ? 'Aucune donnée archivage disponible' : null,
                'synced_at' => DB::table('sync_gpro_suivi_paquets')->max('synced_at'),
            ],
        ]);
    }

    /**
     * Section B — Stock KPIs: Rotation, Dead-stock, Occupation (per category)
     * Note: stock_moyen, articles_sans_mouvement, quantite_totale_stock,
     *       nombre_rouleaux, capacite_stockage are single-row aggregate tables
     *       without category breakdown. Global values are returned for all categories.
     */
    public function stockKpis(): JsonResponse
    {
        // Taux de rotation (F-REQ-317/318/319) — global (no per-category data)
        $stockMoyenAll = DB::table('stock_moyen')->orderByDesc('synced_at')->first();
        $stockMoyenGlobal = $stockMoyenAll?->stock_moyen ?? 0;
        $rotationNote = 'Données globales — détail par catégorie non disponible depuis l\'API';

        $rotation = [];
        foreach (['accessoires', 'tissu', 'fg'] as $catKey) {
            $rotation[$catKey] = [
                'stock_moyen' => $stockMoyenGlobal,
                'nb_lignes' => $stockMoyenAll?->nb_lignes_stock ?? 0,
                'note' => $rotationNote,
                'synced_at' => $stockMoyenAll?->synced_at,
            ];
        }

        // Taux de stock mort (F-REQ-320/321/322) — global
        $articlesSansMvt = DB::table('articles_sans_mouvement')->orderByDesc('synced_at')->first();
        $qtteStock = DB::table('quantite_totale_stock')->orderByDesc('synced_at')->first();
        $totalStock = $qtteStock?->quantite_totale_stock ?? 0;
        $sansMvt = $articlesSansMvt?->qtte_sans_mvt_365j ?? 0;
        $stockMortPct = $totalStock > 0 ? round(($sansMvt / $totalStock) * 100, 2) : null;

        $stockMort = [];
        foreach (['accessoires', 'tissu', 'fg'] as $catKey) {
            $stockMort[$catKey] = [
                'value' => $stockMortPct,
                'status' => $this->thresholdStatusMax($stockMortPct, 10),
                'nb_articles_sans_mvt' => $articlesSansMvt?->nb_articles_sans_mvt_365j ?? 0,
                'qtte_sans_mvt' => $sansMvt,
                'qtte_totale' => $totalStock,
                'synced_at' => $articlesSansMvt?->synced_at,
            ];
        }

        // Taux d'occupation (F-REQ-323/324/325) — global
        $rouleaux = DB::table('nombre_rouleaux')->orderByDesc('synced_at')->first();
        $capacite = DB::table('capacite_stockage')->orderByDesc('synced_at')->first();
        $nbRouleaux = $rouleaux?->nb_rouleaux ?? 0;
        $totalConteneurs = $capacite?->total_conteneurs ?? 1;
        $conteneursActifs = $capacite?->conteneurs_actifs ?? 0;
        $occupationPct = $totalConteneurs > 0 ? round(($nbRouleaux / $totalConteneurs) * 100, 1) : null;

        $occupation = [];
        foreach (['accessoires', 'tissu', 'fg'] as $catKey) {
            $occupation[$catKey] = [
                'value' => $occupationPct,
                'status' => $this->occupationStatus($occupationPct),
                'target' => '≤ 85%',
                'nb_rouleaux' => $nbRouleaux,
                'conteneurs_actifs' => $conteneursActifs,
                'total_conteneurs' => $capacite?->total_conteneurs ?? 0,
                'synced_at' => $rouleaux?->synced_at,
            ];
        }

        // F-REQ-216 — Taux d'archivage suivi paquets (from sync_gpro_suivi_paquets)
        $totalOfs = DB::table('sync_gpro_suivi_paquets')->where('est_solde', true)->count();
        $archivedOfs = DB::table('sync_gpro_suivi_paquets')
            ->where('est_solde', true)->where('est_archive', true)->count();
        $archivagePct = $totalOfs > 0 ? round(($archivedOfs / $totalOfs) * 100, 1) : null;

        return response()->json([
            'rotation' => $rotation,
            'stock_mort' => $stockMort,
            'occupation' => $occupation,
            'archivage' => [
                'value' => $archivagePct,
                'status' => $this->kpi->tauxArchivageStatus($archivagePct),
                'target' => '≥ 85%',
                'total_ofs' => $totalOfs,
                'archived_ofs' => $archivedOfs,
                'note' => $archivagePct === null ? 'Aucune donnée archivage disponible' : null,
                'synced_at' => DB::table('sync_gpro_suivi_paquets')->max('synced_at'),
            ],
            'synced_at' => $stockMoyenAll?->synced_at,
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
     * Section D — OF & Delivery Status (per category)
     * Note: nombre_ofs_livres and moyenne_date_transfert are aggregate tables
     *       without category breakdown. Global values returned for all categories.
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

        // Nombre OFs livrés — global (F-REQ-326/327/328)
        $ofsLivres = DB::table('nombre_ofs_livres')->orderByDesc('synced_at')->first();
        $totalLivres = $ofsLivres?->nb_of_livres_total ?? 0;
        $transfertTotal = $ofsLivres?->of_avec_transfert_coupe_total ?? 0;
        $livraisonPct = $totalLivres > 0 ? round(($transfertTotal / $totalLivres) * 100, 1) : null;
        $livraisonSyncedAt = $ofsLivres?->synced_at;

        $livraison = [];
        foreach (['accessoires', 'tissu', 'fg'] as $catKey) {
            $livraison[$catKey] = [
                'value' => $livraisonPct,
                'status' => $this->thresholdStatus($livraisonPct, 80),
                'target' => '≥ 80%',
                'total_ofs' => $totalLivres,
                'transfert_total' => $transfertTotal,
                'synced_at' => $livraisonSyncedAt,
            ];
        }

        // Délai moyen — global (F-REQ-329/330/331)
        $moyenneTransfert = DB::table('moyenne_date_transfert')->orderByDesc('synced_at')->first();
        $delaiMoyenValue = $moyenneTransfert?->moyenne_jours ? (float) $moyenneTransfert->moyenne_jours : null;
        $nbOfConsideres = $moyenneTransfert?->nb_of_consideres ?? 0;
        $delaiSyncedAt = $moyenneTransfert?->synced_at;

        $delaiMoyen = [];
        foreach (['accessoires', 'tissu', 'fg'] as $catKey) {
            $delaiMoyen[$catKey] = [
                'value' => $delaiMoyenValue,
                'status' => $this->delaiStatus($delaiMoyenValue),
                'target' => '≤ 1 jour',
                'nb_ofs' => $nbOfConsideres,
                'synced_at' => $delaiSyncedAt,
            ];
        }

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
                    'bpd' => $gpro?->bpd ?? null,
                    'ehd' => $gpro?->ehd ?? null,
                    'epd' => $gpro?->epd ?? $this->computeEpd($o->quantite_prevue, $o->quantite_realisee, $today),
                ];
            })->toArray(),
            'livraison' => $livraison,
            'delai_moyen' => $delaiMoyen,
            'synced_at' => DB::table('etat_avancement')->orderByDesc('synced_at')->value('synced_at'),
        ]);
    }

    /**
     * F-REQ-314/315/316 — Taux de Fiabilité Stock (Accessoires/Tissu/FG)
     * Formula: (Quantité physique / Quantité dans le système) × 100 = (Qtte / qtteReserve) × 100
     */
    public function stockReliability(): JsonResponse
    {
        $allStock = DB::table('diva_stock')->get();

        $totalQtte = $allStock->sum('qtte');
        $totalReserve = $allStock->sum('qtte_reserve');
        $globalReliability = $totalReserve > 0
            ? round(($totalQtte / $totalReserve) * 100, 1)
            : null;
        $globalStatus = $this->reliabilityStatus($globalReliability);

        // Per-category: filter by IDMagasin → category mapping
        // IDMagasin mapping must be provided by BACOVET (Annexe D point 3)
        // Using known mapping: 1=Accessoires, 2=Tissu, 3=FG (placeholder — update with actual mapping)
        $categoryMagasinMap = [
            'accessoires' => [1],     // TODO: confirm with BACOVET
            'tissu' => [2],           // TODO: confirm with BACOVET
            'fg' => [3],              // TODO: confirm with BACOVET
        ];

        $categories = [];
        foreach ($categoryMagasinMap as $catKey => $magasinIds) {
            $catStock = $allStock->filter(fn ($row) => in_array($row->idmagasin, $magasinIds));
            $catQtte = $catStock->sum('qtte');
            $catReserve = $catStock->sum('qtte_reserve');
            $catReliability = $catReserve > 0
                ? round(($catQtte / $catReserve) * 100, 1)
                : null;
            $catStatus = $this->reliabilityStatus($catReliability);

            $categories[$catKey] = [
                'value' => $catReliability,
                'status' => $catStatus,
                'target' => 99.5,
                'note' => $catReliability !== null
                    ? 'Qté physique: '.number_format($catQtte, 0, ',', ' ').' / Qté système: '.number_format($catReserve, 0, ',', ' ')
                    : 'Aucune donnée pour cette catégorie',
            ];
        }

        $syncedAt = DB::table('diva_stock')->orderByDesc('synced_at')->value('synced_at');

        return response()->json([
            'global' => [
                'value' => $globalReliability,
                'status' => $globalStatus,
                'target' => 99.5,
                'note' => 'Global: '.number_format($totalQtte, 0, ',', ' ').' / '.number_format($totalReserve, 0, ',', ' '),
                'synced_at' => $syncedAt,
            ],
            'accessoires' => $categories['accessoires'],
            'tissu' => $categories['tissu'],
            'fg' => $categories['fg'],
            'synced_at' => $syncedAt,
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
        if ($value >= $target - 5) {
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

    private function reliabilityStatus(?float $value): string
    {
        if ($value === null) {
            return 'grey';
        }
        if ($value >= 99.5) {
            return 'green';
        }
        if ($value >= 98) {
            return 'orange';
        }

        return 'red';
    }

    /**
     * F-REQ-307 — EPD (End Production Date)
     * Formula: (quantite_prevue - quantite_realisee) / cadence + today
     */
    private function computeEpd(?float $prevue, ?float $realisee, $today): ?string
    {
        if ($prevue === null || $realisee === null || $prevue <= $realisee) {
            return $today->toDateString();
        }

        $cadence = 100;
        $remaining = $prevue - $realisee;
        $daysNeeded = $remaining / $cadence;

        return $today->copy()->addDays((int) ceil($daysNeeded))->toDateString();
    }
}
