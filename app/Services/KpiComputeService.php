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

    public function efficienceStatus(?float $pct): string
    {
        if ($pct === null) {
            return 'grey';
        }
        if ($pct >= 85) {
            return 'green';
        }
        if ($pct >= 70) {
            return 'orange';
        }

        return 'red';
    }

    public function oweStatus(?float $pct): string
    {
        if ($pct === null) {
            return 'grey';
        }
        if ($pct >= 70) {
            return 'green';
        }
        if ($pct >= 60) {
            return 'orange';
        }

        return 'red';
    }

    public function lostTimeStatus(?int $minutes): string
    {
        if ($minutes === null) {
            return 'grey';
        }
        if ($minutes < 10) {
            return 'green';
        }
        if ($minutes <= 30) {
            return 'orange';
        }

        return 'red';
    }

    /**
     * F-REQ-309 — Couverture Sérigraphie Status
     * Target: > cadence hebdomadaire moyenne
     */
    public function couvertureStatus(?float $ratio, float $threshold = 1.0): string
    {
        if ($ratio === null) {
            return 'grey';
        }
        if ($ratio > $threshold) {
            return 'green';
        }
        if ($ratio >= $threshold * 0.5) {
            return 'orange';
        }

        return 'red';
    }

    /**
     * WIP Status (F-REQ-205)
     * Target: ≤ ½ cadence
     */
    public function wipStatus(?int $wip, ?float $cadence): string
    {
        if ($wip === null || $cadence === null || $cadence === 0.0) {
            return 'grey';
        }
        if ($wip <= $cadence * 0.5) {
            return 'green';
        }
        if ($wip <= $cadence) {
            return 'orange';
        }

        return 'red';
    }
}
