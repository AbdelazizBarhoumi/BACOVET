<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class MethodesController extends Controller
{
    public function kpis(): JsonResponse
    {
        $today = Carbon::today();
        $chaine = request()->query('chaine');
        $ofFilter = request()->query('of');

        // F-REQ-216: Taux d'Archivage — from sync_gpro_suivi_paquets
        $suiviQuery = DB::table('sync_gpro_suivi_paquets');
        if ($ofFilter && $ofFilter !== 'TOUS') {
            $suiviQuery->where('of_numero', $ofFilter);
        }
        $suiviData = $suiviQuery->get();
        $totalSold = $suiviData->where('est_solde', true)->count();
        $archived = $suiviData->where('est_solde', true)->where('est_archive', true)->count();
        $archivagePct = $totalSold > 0 ? round(($archived / $totalSold) * 100, 1) : null;
        $archivageStatus = $archivagePct !== null ? ($archivagePct >= 85 ? 'green' : ($archivagePct >= 70 ? 'orange' : 'red')) : 'grey';

        // F-REQ-217: Taux de Fiabilité des Données — compare tag_reel (taging_reel) with sortie_jour (wip_chaine)
        $taggingQuery = DB::table('taging_reel')->whereDate('date', $today);
        if ($chaine && $chaine !== 'TOUS') {
            $taggingQuery->where('chaine', $chaine);
        }
        $taggingRows = $taggingQuery->get();

        $fiabilite = null;
        if ($taggingRows->isNotEmpty()) {
            $wipData = DB::table('wip_chaine')->get()->keyBy('chaine');

            $ecarts = $taggingRows->map(function ($row) use ($wipData) {
                $sortieJour = $wipData->get($row->chaine)?->sortie_jour ?? 0;
                $tagReel = $row->tag_reel ?? 0;
                $denominator = max($sortieJour, 1);

                return abs($tagReel - $sortieJour) / $denominator * 100;
            });

            $fiabilite = round(100 - $ecarts->avg(), 1);
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
        $respected = $cotationData->filter(fn ($r) => $r->temps_production_min <= $r->temps_cotation_min)->count();
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
                'source' => 'taging_reel + wip_chaine',
                'raw' => [
                    'rows_count' => $taggingRows->count(),
                ],
            ],
            'f_req_218' => [
                'value' => $respectPct,
                'status' => $respectStatus,
                'target' => 90,
                'frequency' => 'Journalier',
                'source' => 'sync_drive_cotation',
                'numerator' => $respected,
                'denominator' => $totalCotation,
            ],
            'f_req_219' => [
                'value' => $acceptPct,
                'status' => $acceptStatus,
                'target' => 80,
                'frequency' => 'Hebdomadaire',
                'source' => 'sync_drive_gammes',
                'numerator' => $accepted,
                'denominator' => $totalGammes,
            ],
            'synced_at' => $syncedAt,
        ]);
    }

    // ── Detail Endpoints ─────────────────────────────────────────────────────

    public function archivageDetail(): JsonResponse
    {
        $ofFilter = request()->query('of');
        $query = DB::table('sync_gpro_suivi_paquets')
            ->select('of_numero', 'est_solde', 'est_archive');
        if ($ofFilter && $ofFilter !== 'TOUS') {
            $query->where('of_numero', $ofFilter);
        }
        $data = $query->get();

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
                'est_respecte' => $r->temps_production_min <= $r->temps_cotation_min,
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

    public function fiabiliteDetail(): JsonResponse
    {
        $today = Carbon::today();
        $chaine = request()->query('chaine');

        $taggingQuery = DB::table('taging_reel')->whereDate('date', $today);
        if ($chaine && $chaine !== 'TOUS') {
            $taggingQuery->where('chaine', $chaine);
        }
        $wipData = DB::table('wip_chaine')->get()->keyBy('chaine');

        $data = $taggingQuery
            ->orderBy('chaine')
            ->orderBy('shift')
            ->get()
            ->map(function ($row) use ($wipData) {
                $sortieJour = $wipData->get($row->chaine)?->sortie_jour ?? 0;
                $tagReel = $row->tag_reel ?? 0;
                $ecartAbs = abs($tagReel - $sortieJour);
                $denominator = max($sortieJour, 1);
                $ecartPct = round($ecartAbs / $denominator * 100, 2);

                return [
                    'chaine' => $row->chaine,
                    'shift' => $row->shift,
                    'tag_reel' => $tagReel,
                    'sortie_jour' => $sortieJour,
                    'ecart_abs' => $ecartAbs,
                    'ecart_pct' => $ecartPct,
                    'status' => match (true) {
                        $ecartPct <= 2 => 'green',
                        $ecartPct <= 5 => 'orange',
                        default => 'red',
                    },
                ];
            });

        return response()->json(['data' => $data]);
    }
}
