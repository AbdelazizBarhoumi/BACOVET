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

        // F-REQ-216: Taux d'Archivage — from "Base suivi production" (Blocker B-05)
        $archivage = ['value' => null, 'blocker' => 'B-05', 'target' => 85, 'frequency' => 'Journalier'];

        // F-REQ-217: Taux de Fiabilité des Données — compute from taging_reel
        $taggingQuery = DB::table('taging_reel')
            ->whereDate('date', $today);
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

        // F-REQ-218: Respect Temps Estimé — manual KPI
        $f218 = ManualKpiValue::where('kpi_key', 'f_req_218')->first();

        // F-REQ-219: Temps Acceptés 1ère Version — manual KPI
        $f219 = ManualKpiValue::where('kpi_key', 'f_req_219')->first();

        return response()->json([
            'f_req_216' => $archivage,
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
                'value' => $f218?->value,
                'numerator' => $f218?->numerator,
                'denominator' => $f218?->denominator,
                'target' => 90,
                'frequency' => 'Au démarrage',
                'updated_at' => $f218?->updated_at?->toISOString(),
            ],
            'f_req_219' => [
                'value' => $f219?->value,
                'numerator' => $f219?->numerator,
                'denominator' => $f219?->denominator,
                'target' => 80,
                'frequency' => 'Déchiffrage',
                'updated_at' => $f219?->updated_at?->toISOString(),
            ],
            'synced_at' => DB::table('taging_reel')
                ->orderByDesc('synced_at')
                ->value('synced_at'),
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
        $today = Carbon::today();
        $chaine = request()->query('chaine');

        // F-REQ-217
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

        $f218 = ManualKpiValue::where('kpi_key', 'f_req_218')->first();
        $f219 = ManualKpiValue::where('kpi_key', 'f_req_219')->first();

        return [
            [
                'id' => 'F-REQ-216',
                'indicateur' => "Taux d'archivage suivi paquets",
                'valeur' => null,
                'cible' => '85%',
                'frequence' => 'Journalier',
                'blocker' => 'B-05',
            ],
            [
                'id' => 'F-REQ-217',
                'indicateur' => 'Taux fiabilité données système',
                'valeur' => $fiabilite !== null ? $fiabilite.'%' : '—',
                'cible' => '95%',
                'frequence' => 'Journalier',
                'status' => $fiabilite !== null
                    ? ($fiabilite >= 95 ? 'green' : ($fiabilite >= 90 ? 'orange' : 'red'))
                    : 'grey',
            ],
            [
                'id' => 'F-REQ-218',
                'indicateur' => 'Respect temps estimé',
                'valeur' => $f218?->value !== null ? $f218->value.'%' : '—',
                'cible' => '90%',
                'frequence' => 'Au démarrage',
                'status' => $f218?->value !== null
                    ? ($f218->value >= 90 ? 'green' : ($f218->value >= 85 ? 'orange' : 'red'))
                    : 'grey',
            ],
            [
                'id' => 'F-REQ-219',
                'indicateur' => 'Temps acceptés 1ère version',
                'valeur' => $f219?->value !== null ? $f219->value.'%' : '—',
                'cible' => '≥80%',
                'frequence' => 'Déchiffrage',
                'status' => $f219?->value !== null
                    ? ($f219->value >= 80 ? 'green' : ($f219->value >= 70 ? 'orange' : 'red'))
                    : 'grey',
            ],
        ];
    }
}
