<?php

/**
 * Quality Page E2E Verification Script
 *
 * Run: php tests/quality_e2e_check.php
 * On the machine with MySQL access.
 */

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Force remote MySQL before Laravel bootstrap
$_ENV['DB_HOST'] = '192.168.50.1';
$_ENV['DB_CONNECTION'] = 'mysql';
$_ENV['DB_DATABASE'] = 'bacovet';

// Load Laravel
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// Ensure connection picks up the override
DB::purge('mysql');

$today = now()->toDateString();
$year = now()->year;

echo "========================================\n";
echo "  QUALITY PAGE E2E VERIFICATION\n";
echo "  Today: {$today} | Year: {$year}\n";
echo "========================================\n\n";

$tables = [
    'sync_drive_br_print' => ['date_col' => 'date',       'spec' => 'F-REQ-108 BR Print jour'],
    'sync_drive_br_care_label' => ['date_col' => 'date',       'spec' => 'F-REQ-110 BR Care Label jour'],
    'sync_drive_br_accessoires' => ['date_col' => 'date',       'spec' => 'F-REQ-112 BR Accessoires jour'],
    'sync_drive_br_compo' => ['date_col' => 'date',       'spec' => 'F-REQ-114 BR Compo jour'],
    'sync_drive_inspection_commande' => ['date_col' => 'date',     'spec' => 'F-REQ-101 BR Commande'],
    'packets_rejetes' => ['date_col' => 'date_rejet', 'spec' => 'F-REQ-102 BR GTD numerateur'],
    'colis_total_var' => ['date_col' => null,         'spec' => 'F-REQ-102 BR GTD denominateur'],
    'check_pass_qte' => ['date_col' => 'log_date',   'spec' => 'QP Teams per-chain BR GTD'],
    'pieces_ok_jour' => ['date_col' => 'date',       'spec' => 'F-REQ-104 RFT numerateur'],
    'pieces_produites_jour' => ['date_col' => 'date',       'spec' => 'F-REQ-104 RFT denominateur'],
    'pieces_ok_annee' => ['date_col' => null,         'spec' => 'F-REQ-105 RFT DDA numerateur'],
    'pieces_produites_annee' => ['date_col' => null,         'spec' => 'F-REQ-105 RFT DDA denominateur'],
    'rejets_inspection_paquet' => ['date_col' => 'date',       'spec' => 'F-REQ-106/107 BR Bundling'],
    'vw_defects' => ['date_col' => 'log_date',   'spec' => 'F-REQ-116 Pareto RFT'],
    'qcm_defect_trx' => ['date_col' => 'log_date',   'spec' => 'F-REQ-117 Pareto Inspection'],
];

$issues = [];

foreach ($tables as $table => $config) {
    $exists = Schema::hasTable($table);

    if (! $exists) {
        echo "✗ [{$table}] TABLE DOES NOT EXIST\n";
        $issues[] = "{$table}: table missing";
        echo "\n";

        continue;
    }

    $totalRows = DB::table($table)->count();
    $dateCol = $config['date_col'];

    $line = "  [{$table}] rows={$totalRows}";
    if ($dateCol) {
        $latestDate = DB::table($table)->orderByDesc($dateCol)->value($dateCol);
        $todayRows = DB::table($table)->whereDate($dateCol, $today)->count();
        $yearRows = DB::table($table)->whereYear($dateCol, $year)->count();
        $line .= ", latest={$latestDate}, today={$todayRows}, year={$yearRows}";
    }
    echo $line."\n";

    if ($totalRows == 0) {
        $issues[] = "{$table}: EMPTY ({$config['spec']})";
    } elseif ($dateCol) {
        $latestDate = DB::table($table)->orderByDesc($dateCol)->value($dateCol);
        if ($latestDate && $latestDate !== $today) {
            $issues[] = "{$table}: latest date is {$latestDate}, not today ({$config['spec']})";
        }
    }

    // Show sample
    $sample = DB::table($table)->limit(2)->get();
    if ($sample->isNotEmpty()) {
        echo '  Sample: '.json_encode((array) $sample->first())."\n";
    }
    echo "\n";
}

// ── Calculation checks ─────────────────────────────────────────────────

echo "========================================\n";
echo "  CALCULATION VERIFICATION\n";
echo "========================================\n\n";

// BR Print
$brPrint = DB::table('sync_drive_br_print')->whereDate('date', $today)->first();
if ($brPrint && $brPrint->nb_inspections > 0) {
    $br = round(($brPrint->nb_rejets / $brPrint->nb_inspections) * 100, 1);
    echo "  [BR Print] rejets={$brPrint->nb_rejets}, inspections={$brPrint->nb_inspections} => BR={$br}%\n";
} else {
    echo "  [BR Print] NO DATA for today\n";
    $issues[] = 'BR Print: no data for today';
}

// BR Care Label
$brCl = DB::table('sync_drive_br_care_label')->whereDate('date', $today)->first();
if ($brCl && $brCl->nb_inspections > 0) {
    $br = round(($brCl->nb_rejets / $brCl->nb_inspections) * 100, 1);
    echo "  [BR Care Label] rejets={$brCl->nb_rejets}, inspections={$brCl->nb_inspections} => BR={$br}%\n";
} else {
    echo "  [BR Care Label] NO DATA for today\n";
    $issues[] = 'BR Care Label: no data for today';
}

// BR Accessoires
$brAcc = DB::table('sync_drive_br_accessoires')->whereDate('date', $today)->first();
if ($brAcc && $brAcc->nb_inspections > 0) {
    $br = round(($brAcc->nb_rejets / $brAcc->nb_inspections) * 100, 1);
    echo "  [BR Accessoires] rejets={$brAcc->nb_rejets}, inspections={$brAcc->nb_inspections} => BR={$br}%\n";
} else {
    echo "  [BR Accessoires] NO DATA for today\n";
    $issues[] = 'BR Accessoires: no data for today';
}

// BR Compo
$brComp = DB::table('sync_drive_br_compo')->whereDate('date', $today)->first();
if ($brComp && $brComp->nb_inspections > 0) {
    $br = round(($brComp->nb_rejets / $brComp->nb_inspections) * 100, 1);
    echo "  [BR Compo] rejets={$brComp->nb_rejets}, inspections={$brComp->nb_inspections} => BR={$br}%\n";
} else {
    echo "  [BR Compo] NO DATA for today\n";
    $issues[] = 'BR Compo: no data for today';
}

// BR Commande
$brCmd = DB::table('sync_drive_inspection_commande')->whereYear('date', $year)
    ->selectRaw('SUM(nb_rejets) as r, SUM(nb_inspections) as i')->first();
if ($brCmd && $brCmd->i > 0) {
    $br = round(($brCmd->r / $brCmd->i) * 100, 1);
    echo "  [BR Commande DDA] rejets={$brCmd->r}, inspections={$brCmd->i} => BR={$br}%\n";
} else {
    echo "  [BR Commande DDA] NO DATA for year\n";
}

// BR GTD
$rejets = DB::table('packets_rejetes')->whereDate('date_rejet', $today)->sum('qtte');
$colis = DB::table('colis_total_var')->sum('total_colis');
if ($colis > 0) {
    $br = round(($rejets / $colis) * 100, 1);
    echo "  [BR GTD] rejets_today={$rejets}, total_colis={$colis} => BR={$br}%\n";
} else {
    echo "  [BR GTD] total_colis=0\n";
    $issues[] = 'BR GTD: colis_total_var has no data';
}

// RFT
$ok = DB::table('pieces_ok_jour')->whereDate('date', $today)->value('first_pass_today');
$produced = DB::table('pieces_produites_jour')->whereDate('date', $today)->value('produced_today');
if ($ok && $produced && $produced > 0) {
    $rft = round(($ok / $produced) * 100, 1);
    echo "  [RFT] first_pass={$ok}, produced={$produced} => RFT={$rft}%\n";
    if ($rft > 100) {
        echo "    ⚠ ANOMALY: RFT > 100%\n";
        $issues[] = 'RFT: value > 100% (anomaly)';
    }
} else {
    echo "  [RFT] NO DATA for today\n";
}

// BR Bundling
$jour = DB::table('rejets_inspection_paquet')->where('period', 'jour')->first();
if ($jour) {
    if ($jour->bundle_inspected > 0) {
        $br = round(($jour->bundle_reject / $jour->bundle_inspected) * 100, 1);
        echo "  [BR Bundling] reject={$jour->bundle_reject}, inspected={$jour->bundle_inspected} => BR={$br}%, active={$jour->is_active}\n";
    } else {
        echo "  [BR Bundling] bundle_inspected=0, active={$jour->is_active}\n";
    }
} else {
    echo "  [BR Bundling] NO DATA\n";
}

// QP Teams
$chains = DB::table('check_pass_qte')->whereDate('log_date', $today)->groupBy('shortname')
    ->select('shortname', DB::raw('AVG(defect_pct) as avg_defect'))->get();
echo "\n  [QP Teams] chains today: ".$chains->count()."\n";
foreach ($chains as $c) {
    echo "    {$c->shortname}: avg_defect_pct={$c->avg_defect}\n";
}

// ── Summary ─────────────────────────────────────────────────────────────

echo "\n========================================\n";
echo "  SUMMARY\n";
echo "========================================\n\n";

if (empty($issues)) {
    echo "  ✓ All checks passed\n";
} else {
    echo '  ✗ '.count($issues)." issue(s) found:\n";
    foreach ($issues as $issue) {
        echo "    - {$issue}\n";
    }
}

echo "\nDone.\n";
