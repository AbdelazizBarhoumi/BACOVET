<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ManualKpiValue;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class MethodesController extends Controller
{
    public function kpis(): JsonResponse
    {
        $today = Carbon::today();
        $chaine = request()->query('chaine');

        // F-REQ-216: Taux d'Archivage — from sync_gpro_suivi_paquets
        $suiviData = DB::table('sync_gpro_suivi_paquets')->get();
        $totalSold = $suiviData->where('est_solde', true)->count();
        $archived = $suiviData->where('est_solde', true)->where('est_archive', true)->count();
        $archivagePct = $totalSold > 0 ? round(($archived / $totalSold) * 100, 1) : null;
        $archivageStatus = $archivagePct !== null ? ($archivagePct >= 85 ? 'green' : ($archivagePct >= 70 ? 'orange' : 'red')) : 'grey';

        // F-REQ-217: Taux de Fiabilité des Données — from taging_reel
        $taggingQuery = DB::table('taging_reel')->whereDate('date', $today);
        if ($chaine && $chaine !== 'TOUS') {
            $taggingQuery->where('chaine', $chaine);
        }
        $taggingRows = $taggingQuery->get();

        $fiabilite = null;
        if ($taggingRows->isNotEmpty()) {
            $avgAbsEcart = $taggingRows->avg(fn ($r) => abs($r->ecart_pct ?? 0));
            $fiabilite = round(100 - $avgAbsEcart, 1);
        }

        $fiabiliteStatus = match (true) {
            $fiabilite === null => 'grey',
            $fiabilite >= 95 => 'green',
            $fiabilite >= 90 => 'orange',
            default => 'red',
        };

        // F-REQ-218: Respect Temps Estimé — from sync_drive_cotation
        $cotationData = DB::table('sync_drive_cotation')->get();
        $totalCotation = $cotationData->count();
        $respected = $cotationData->filter(fn ($r) => $r->temps_cotation_min <= $r->temps_production_min)->count();
        $respectPct = $totalCotation > 0 ? round(($respected / $totalCotation) * 100, 1) : null;
        $respectStatus = $respectPct !== null ? ($respectPct >= 90 ? 'green' : ($respectPct >= 80 ? 'orange' : 'red')) : 'grey';

        // F-REQ-219: Temps Acceptés 1ère Version — from sync_drive_gammes
        $gammesData = DB::table('sync_drive_gammes')->get();
        $totalGammes = $gammesData->sum('nb_gammes_total');
        $accepted = $gammesData->sum('nb_gammes_acceptees_v1');
        $acceptPct = $totalGammes > 0 ? round(($accepted / $totalGammes) * 100, 1) : null;
        $acceptStatus = $acceptPct !== null ? ($acceptPct >= 80 ? 'green' : ($acceptPct >= 70 ? 'orange' : 'red')) : 'grey';

        // Synced at — latest from any source
        $syncedAt = collect([
            DB::table('sync_gpro_suivi_paquets')->orderByDesc('synced_at')->value('synced_at'),
            DB::table('taging_reel')->orderByDesc('synced_at')->value('synced_at'),
            DB::table('sync_drive_cotation')->orderByDesc('synced_at')->value('synced_at'),
            DB::table('sync_drive_gammes')->orderByDesc('synced_at')->value('synced_at'),
        ])->filter()->max();

        return response()->json([
            'f_req_216' => [
                'value' => $archivagePct,
                'status' => $archivageStatus,
                'target' => 85,
                'frequency' => 'Journalier',
                'source' => 'sync_gpro_suivi_paquets',
                'numerator' => $archived,
                'denominator' => $totalSold,
            ],
            'f_req_217' => [
                'value' => $fiabilite,
                'status' => $fiabiliteStatus,
                'target' => 95,
                'frequency' => 'Journalier',
                'is_proxy' => true,
                'proxy_note' => "Proxy intérimaire : écart tagging théorique vs réel (taging_reel). Comparaison GPRO ↔ Base suivi production en attente (B-05).",
                'raw' => [
                    'avg_abs_ecart' => $taggingRows->isNotEmpty()
                        ? round($taggingRows->avg(fn ($r) => abs($r->ecart_pct ?? 0)), 2)
                        : null,
                    'rows_count' => $taggingRows->count(),
                ],
            ],
            'f_req_218' => [
                'value' => $respectPct,
                'status' => $respectStatus,
                'target' => 90,
                'frequency' => 'Au démarrage',
                'source' => 'sync_drive_cotation',
                'numerator' => $respected,
                'denominator' => $totalCotation,
            ],
            'f_req_219' => [
                'value' => $acceptPct,
                'status' => $acceptStatus,
                'target' => 80,
                'frequency' => 'Déchiffrage',
                'source' => 'sync_drive_gammes',
                'numerator' => $accepted,
                'denominator' => $totalGammes,
            ],
            'synced_at' => $syncedAt,
        ]);
    }

    public function taggingChart(): JsonResponse
    {
        $today = Carbon::today();
        $chaine = request()->query('chaine');

        $query = DB::table('taging_reel')
            ->whereDate('date', $today);
        if ($chaine && $chaine !== 'TOUS') {
            $query->where('chaine', $chaine);
        }
        $data = $query
            ->orderBy('chaine')
            ->orderBy('shift')
            ->get()
            ->map(fn ($row) => [
                'chaine' => $row->chaine,
                'shift' => $row->shift,
                'tag_theorique' => $row->tag_theorique,
                'tag_reel' => $row->tag_reel,
                'ecart_pct' => round($row->ecart_pct ?? 0, 2),
                'status' => match (true) {
                    abs($row->ecart_pct ?? 0) <= 2 => 'green',
                    abs($row->ecart_pct ?? 0) <= 5 => 'orange',
                    default => 'red',
                },
            ]);

        return response()->json(['data' => $data]);
    }

    public function detailTable(): JsonResponse
    {
        $kpis = $this->getKpiSummary();

        return response()->json(['data' => $kpis]);
    }

    private function getKpiSummary(): array
    {
        // F-REQ-216 — from sync_gpro_suivi_paquets
        $suiviData = DB::table('sync_gpro_suivi_paquets')->get();
        $totalSold = $suiviData->where('est_solde', true)->count();
        $archived = $suiviData->where('est_solde', true)->where('est_archive', true)->count();
        $archivagePct = $totalSold > 0 ? round(($archived / $totalSold) * 100, 1) : null;

        // F-REQ-217 — from taging_reel
        $today = Carbon::today();
        $taggingRows = DB::table('taging_reel')->whereDate('date', $today)->get();
        $fiabilite = null;
        if ($taggingRows->isNotEmpty()) {
            $avgAbsEcart = $taggingRows->avg(fn ($r) => abs($r->ecart_pct ?? 0));
            $fiabilite = round(100 - $avgAbsEcart, 1);
        }

        // F-REQ-218 — from sync_drive_cotation
        $cotationData = DB::table('sync_drive_cotation')->get();
        $totalCotation = $cotationData->count();
        $respected = $cotationData->filter(fn ($r) => $r->temps_cotation_min <= $r->temps_production_min)->count();
        $respectPct = $totalCotation > 0 ? round(($respected / $totalCotation) * 100, 1) : null;

        // F-REQ-219 — from sync_drive_gammes
        $gammesData = DB::table('sync_drive_gammes')->get();
        $totalGammes = $gammesData->sum('nb_gammes_total');
        $accepted = $gammesData->sum('nb_gammes_acceptees_v1');
        $acceptPct = $totalGammes > 0 ? round(($accepted / $totalGammes) * 100, 1) : null;

        return [
            [
                'id' => 'F-REQ-216',
                'indicateur' => "Taux d'archivage suivi paquets",
                'valeur' => $archivagePct !== null ? $archivagePct.'%' : '—',
                'cible' => '85%',
                'frequence' => 'Journalier',
                'status' => $archivagePct !== null ? ($archivagePct >= 85 ? 'green' : ($archivagePct >= 70 ? 'orange' : 'red')) : 'grey',
            ],
            [
                'id' => 'F-REQ-217',
                'indicateur' => 'Taux fiabilité données système',
                'valeur' => $fiabilite !== null ? $fiabilite.'%' : '—',
                'cible' => '95%',
                'frequence' => 'Journalier',
                'status' => $fiabilite !== null ? ($fiabilite >= 95 ? 'green' : ($fiabilite >= 90 ? 'orange' : 'red')) : 'grey',
            ],
            [
                'id' => 'F-REQ-218',
                'indicateur' => 'Respect temps estimé',
                'valeur' => $respectPct !== null ? $respectPct.'%' : '—',
                'cible' => '90%',
                'frequence' => 'Au démarrage',
                'status' => $respectPct !== null ? ($respectPct >= 90 ? 'green' : ($respectPct >= 80 ? 'orange' : 'red')) : 'grey',
            ],
            [
                'id' => 'F-REQ-219',
                'indicateur' => 'Temps acceptés 1ère version',
                'valeur' => $acceptPct !== null ? $acceptPct.'%' : '—',
                'cible' => '≥80%',
                'frequence' => 'Déchiffrage',
                'status' => $acceptPct !== null ? ($acceptPct >= 80 ? 'green' : ($acceptPct >= 70 ? 'orange' : 'red')) : 'grey',
            ],
        ];
    }

    // ── Detail Endpoints ─────────────────────────────────────────────────────

    public function archivageDetail(): JsonResponse
    {
        $data = DB::table('sync_gpro_suivi_paquets')
            ->select('of_numero', 'est_solde', 'est_archive')
            ->get();

        return response()->json(['data' => $data]);
    }

    public function respectTempsDetail(): JsonResponse
    {
        $data = DB::table('sync_drive_cotation')
            ->select('article', 'temps_cotation_min', 'temps_production_min')
            ->get()
            ->map(fn ($r) => [
                'article' => $r->article,
                'temps_cotation' => $r->temps_cotation_min,
                'temps_production' => $r->temps_production_min,
                'difference' => round($r->temps_production_min - $r->temps_cotation_min, 2),
                'est_respecte' => $r->temps_cotation_min <= $r->temps_production_min,
            ]);

        return response()->json(['data' => $data]);
    }

    public function tempsAcceptesDetail(): JsonResponse
    {
        $data = DB::table('sync_drive_gammes')
            ->get()
            ->map(fn ($r) => [
                'article' => $r->article,
                'nb_gammes_total' => $r->nb_gammes_total,
                'nb_acceptees_v1' => $r->nb_gammes_acceptees_v1,
                'taux_pct' => $r->nb_gammes_total > 0 ? round(($r->nb_gammes_acceptees_v1 / $r->nb_gammes_total) * 100, 1) : null,
            ]);

        return response()->json(['data' => $data]);
    }
}
