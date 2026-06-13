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
}
