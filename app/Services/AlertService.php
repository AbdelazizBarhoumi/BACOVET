<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class AlertService
{
    public function __construct(
        private KpiComputeService $kpi,
    ) {}

    public function generateQualityAlerts(): array
    {
        $today = Carbon::today();
        $year = $today->year;
        $alerts = [];

        // RFT Ce Jour
        $piecesOkJour = DB::table('pieces_ok_jour')->where('date', $today)->first();
        $piecesProduiteJour = DB::table('pieces_produites_jour')->where('date', $today)->first();
        $rftJour = $this->kpi->computeRft(
            $piecesOkJour?->first_pass_today,
            $piecesProduiteJour?->produced_today
        );

        if ($rftJour !== null) {
            if ($rftJour < 95) {
                $alerts[] = [
                    'type' => 'RFT CRITIQUE',
                    'level' => 'red',
                    'message' => "RFT Ce Jour: {$rftJour}% — En dessous de 95%",
                ];
            } elseif ($rftJour < 98) {
                $alerts[] = [
                    'type' => 'RFT EN BAISSE',
                    'level' => 'orange',
                    'message' => "RFT Ce Jour: {$rftJour}% — Sous la cible de 98%",
                ];
            }
        }

        // BR per chain
        $brByChain = DB::table('check_pass_qte')
            ->whereDate('log_date', $today)
            ->groupBy('shortname')
            ->select('shortname', DB::raw('AVG(defect_pct) as avg_defect_pct'))
            ->get();

        foreach ($brByChain as $row) {
            $pct = round($row->avg_defect_pct, 1);
            $chain = $row->shortname;
            if ($row->avg_defect_pct > 5) {
                $alerts[] = [
                    'type' => "{$chain} — Taux de rejet élevé",
                    'level' => 'red',
                    'message' => "BR {$chain}: {$pct}% — Dépassement du seuil 5%",
                ];
            } elseif ($row->avg_defect_pct > 4) {
                $alerts[] = [
                    'type' => "{$chain} — Taux de rejet en vigilance",
                    'level' => 'orange',
                    'message' => "BR {$chain}: {$pct}% — Approche du seuil 5%",
                ];
            }
        }

        // BR Bundling (if active)
        $bundlingActive = DB::table('rejets_inspection_paquet')
            ->where('is_active', true)
            ->exists();

        if ($bundlingActive) {
            $bundlingRow = DB::table('rejets_inspection_paquet')
                ->where('period', 'jour')
                ->orderByDesc('date')
                ->first();

            if ($bundlingRow && $bundlingRow->bundle_inspected > 0) {
                $brBundling = round(($bundlingRow->bundle_reject / $bundlingRow->bundle_inspected) * 100, 1);
                if ($brBundling > 5) {
                    $alerts[] = [
                        'type' => 'BR BUNDLING CRITIQUE',
                        'level' => 'red',
                        'message' => "BR Bundling: {$brBundling}% — Dépassement du seuil",
                    ];
                } elseif ($brBundling > 4) {
                    $alerts[] = [
                        'type' => 'BR BUNDLING VIGILANCE',
                        'level' => 'orange',
                        'message' => "BR Bundling: {$brBundling}% — Approche du seuil",
                    ];
                }
            }
        }

        if (empty($alerts)) {
            $alerts[] = [
                'type' => 'TOUS LES KPIs OK',
                'level' => 'green',
                'message' => 'Aucune alerte — Tous les indicateurs sont dans les objectifs',
            ];
        }

        return array_slice($alerts, 0, 10);
    }

    public function generateProductionAlerts(): array
    {
        $today = Carbon::today();
        $alerts = [];

        // Global efficiency
        $avgEff = DB::table('efficience_chaine')
            ->whereDate('date', $today)
            ->avg('efficience_pct');

        if ($avgEff !== null) {
            if ($avgEff < 70) {
                $alerts[] = [
                    'type' => 'EFFICIENCE CRITIQUE',
                    'level' => 'red',
                    'message' => 'Efficience moyenne: '.round($avgEff, 1).'% — Seuil 70% non atteint',
                ];
            } elseif ($avgEff < 85) {
                $alerts[] = [
                    'type' => 'EFFICIENCE EN BAISSE',
                    'level' => 'orange',
                    'message' => 'Efficience moyenne: '.round($avgEff, 1)."% — Sous l'objectif de 85%",
                ];
            }
        }

        // Lost time per chain
        $lostTimeByChain = DB::table('lost_time')
            ->whereDate('date', $today)
            ->groupBy('chaine')
            ->select('chaine', DB::raw('SUM(minutes_perdues) as total_minutes'))
            ->get();

        foreach ($lostTimeByChain as $row) {
            if ($row->total_minutes > 30) {
                $alerts[] = [
                    'type' => "{$row->chaine} — Arrêt prolongé",
                    'level' => 'red',
                    'message' => "Temps perdu: {$row->total_minutes} min — Dépassement critique du seuil 30 min",
                ];
            } elseif ($row->total_minutes > 10) {
                $alerts[] = [
                    'type' => "{$row->chaine} — Arrêt suspect",
                    'level' => 'orange',
                    'message' => "Temps perdu: {$row->total_minutes} min — Vigilance au-dessus de 10 min",
                ];
            }
        }

        return array_slice($alerts, 0, 10);
    }
}
