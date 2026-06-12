<?php

namespace App\Services;

class KpiComputeService
{
    public function computeRft(?int $ok, ?int $produced): ?float
    {
        if (! $produced || $produced === 0) {
            return null;
        }
        $pct = ($ok / $produced) * 100;
        if ($pct > 100) {
            return null;
        } // anomaly guard

        return round($pct, 1);
    }

    public function rftStatus(?float $pct): string
    {
        if ($pct === null) {
            return 'grey';
        }
        if ($pct >= 98) {
            return 'green';
        }
        if ($pct >= 95) {
            return 'orange';
        }

        return 'red';
    }

    public function brStatus(?float $pct): string
    {
        if ($pct === null) {
            return 'grey';
        }
        if ($pct <= 4) {
            return 'green';
        }
        if ($pct <= 5) {
            return 'orange';
        }

        return 'red';
    }
}
