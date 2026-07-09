<?php

namespace Tests\Feature\Api;

use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * E2E verification test for Quality page — runs against real MySQL.
 *
 * Usage:
 *   php artisan test --filter=QualityE2ETest
 *
 * NOTE: phpunit.xml forces SQLite by default. To test against real MySQL,
 * either:
 *   1. Temporarily set DB_CONNECTION=mysql in phpunit.xml
 *   2. Or run: php artisan test --filter=QualityE2ETest --env=local
 */
class QualityE2ETest extends TestCase
{
    protected $user;

    protected bool $isMysql = false;

    protected function setUp(): void
    {
        parent::setUp();

        $driver = config('database.default');
        $this->isMysql = ($driver === 'mysql');

        if (! $this->isMysql) {
            echo "\n⚠  Database driver is '{$driver}' — some tests will be skipped.\n";
            echo "   To test against real MySQL, set DB_CONNECTION=mysql in phpunit.xml\n\n";

            return;
        }

        $role = Role::firstOrCreate(['slug' => 'it'], ['name' => 'IT']);
        $this->user = User::firstOrCreate(
            ['email' => 'quality-test@bacovet.local'],
            ['name' => 'Quality Test', 'password' => bcrypt('password'), 'role_id' => $role->id, 'email_verified_at' => now()]
        );
    }

    private function requireMysql(): void
    {
        if (! $this->isMysql) {
            $this->markTestSkipped('Requires MySQL connection');
        }
    }

    // ── DRIVE table checks ───────────────────────────────────────────────

    public function test_drive_br_print_has_data()
    {
        $this->requireMysql();

        $count = DB::table('sync_drive_br_print')->count();
        $latest = DB::table('sync_drive_br_print')->orderByDesc('date')->value('date');
        $today = now()->toDateString();

        echo "\n[sync_drive_br_print] rows={$count}, latest_date={$latest}, today={$today}\n";

        if ($count > 0) {
            $sample = DB::table('sync_drive_br_print')->orderByDesc('date')->first();
            echo "  Sample: date={$sample->date}, nb_inspections={$sample->nb_inspections}, nb_rejets={$sample->nb_rejets}\n";
        }

        $this->assertGreaterThan(0, $count, 'sync_drive_br_print is empty — sync may not have run');
        $this->assertEquals($today, $latest, 'sync_drive_br_print latest date is not today');
    }

    public function test_drive_br_care_label_has_data()
    {
        $this->requireMysql();

        $count = DB::table('sync_drive_br_care_label')->count();
        $latest = DB::table('sync_drive_br_care_label')->orderByDesc('date')->value('date');
        $today = now()->toDateString();

        echo "\n[sync_drive_br_care_label] rows={$count}, latest_date={$latest}, today={$today}\n";

        if ($count > 0) {
            $sample = DB::table('sync_drive_br_care_label')->orderByDesc('date')->first();
            echo "  Sample: date={$sample->date}, nb_inspections={$sample->nb_inspections}, nb_rejets={$sample->nb_rejets}\n";
        }

        $this->assertGreaterThan(0, $count, 'sync_drive_br_care_label is empty');
        $this->assertEquals($today, $latest, 'sync_drive_br_care_label latest date is not today');
    }

    public function test_drive_br_accessoires_has_data()
    {
        $this->requireMysql();

        $count = DB::table('sync_drive_br_accessoires')->count();
        $latest = DB::table('sync_drive_br_accessoires')->orderByDesc('date')->value('date');
        $today = now()->toDateString();

        echo "\n[sync_drive_br_accessoires] rows={$count}, latest_date={$latest}, today={$today}\n";

        if ($count > 0) {
            $sample = DB::table('sync_drive_br_accessoires')->orderByDesc('date')->first();
            echo "  Sample: date={$sample->date}, nb_inspections={$sample->nb_inspections}, nb_rejets={$sample->nb_rejets}\n";
        }

        $this->assertGreaterThan(0, $count, 'sync_drive_br_accessoires is empty');
        $this->assertEquals($today, $latest, 'sync_drive_br_accessoires latest date is not today');
    }

    public function test_drive_br_compo_has_data()
    {
        $this->requireMysql();

        $count = DB::table('sync_drive_br_compo')->count();
        $latest = DB::table('sync_drive_br_compo')->orderByDesc('date')->value('date');
        $today = now()->toDateString();

        echo "\n[sync_drive_br_compo] rows={$count}, latest_date={$latest}, today={$today}\n";

        if ($count > 0) {
            $sample = DB::table('sync_drive_br_compo')->orderByDesc('date')->first();
            echo "  Sample: date={$sample->date}, nb_inspections={$sample->nb_inspections}, nb_rejets={$sample->nb_rejets}\n";
        }

        $this->assertGreaterThan(0, $count, 'sync_drive_br_compo is empty');
        $this->assertEquals($today, $latest, 'sync_drive_br_compo latest date is not today');
    }

    public function test_drive_inspection_commande_has_data()
    {
        $this->requireMysql();

        $count = DB::table('sync_drive_inspection_commande')->count();
        $latest = DB::table('sync_drive_inspection_commande')->orderByDesc('date')->value('date');
        $year = now()->year;

        echo "\n[sync_drive_inspection_commande] rows={$count}, latest_date={$latest}, year={$year}\n";

        if ($count > 0) {
            $yearRows = DB::table('sync_drive_inspection_commande')->whereYear('date', $year)->count();
            echo "  Rows in current year: {$yearRows}\n";
            $sample = DB::table('sync_drive_inspection_commande')->orderByDesc('date')->first();
            echo "  Sample: date={$sample->date}, nb_inspections={$sample->nb_inspections}, nb_rejets={$sample->nb_rejets}\n";
        }

        $this->assertGreaterThan(0, $count, 'sync_drive_inspection_commande is empty');
    }

    // ── Quality source tables ────────────────────────────────────────────

    public function test_packets_rejetes_has_data()
    {
        $this->requireMysql();

        $count = DB::table('packets_rejetes')->count();
        $today = now()->toDateString();
        $todayCount = DB::table('packets_rejetes')->whereDate('date_rejet', $today)->count();
        $yearCount = DB::table('packets_rejetes')->whereYear('date_rejet', now()->year)->count();

        echo "\n[packets_rejetes] total_rows={$count}, today_rows={$todayCount}, year_rows={$yearCount}\n";

        if ($todayCount > 0) {
            $sum = DB::table('packets_rejetes')->whereDate('date_rejet', $today)->sum('qtte');
            echo "  Today SUM(qtte)={$sum}\n";
        }

        $this->assertGreaterThan(0, $count, 'packets_rejetes is empty');
    }

    public function test_colis_total_var_has_data()
    {
        $this->requireMysql();

        $count = DB::table('colis_total_var')->count();
        $totalColis = DB::table('colis_total_var')->sum('total_colis');

        echo "\n[colis_total_var] total_rows={$count}, SUM(total_colis)={$totalColis}\n";

        if ($count > 0) {
            $sample = DB::table('colis_total_var')->first();
            echo "  Sample: commande={$sample->commande}, of={$sample->of}, total_colis={$sample->total_colis}\n";
        }

        $this->assertGreaterThan(0, $count, 'colis_total_var is empty');
    }

    public function test_check_pass_qte_has_data()
    {
        $this->requireMysql();

        $count = DB::table('check_pass_qte')->count();
        $today = now()->toDateString();
        $todayCount = DB::table('check_pass_qte')->whereDate('log_date', $today)->count();

        echo "\n[check_pass_qte] total_rows={$count}, today_rows={$todayCount}\n";

        if ($todayCount > 0) {
            $avg = DB::table('check_pass_qte')->whereDate('log_date', $today)->avg('defect_pct');
            echo "  Today AVG(defect_pct)={$avg}\n";
            $chains = DB::table('check_pass_qte')->whereDate('log_date', $today)->distinct('shortname')->pluck('shortname');
            echo '  Today chains: '.$chains->implode(', ')."\n";
        }

        $this->assertGreaterThan(0, $count, 'check_pass_qte is empty');
    }

    public function test_pieces_ok_jour_has_data()
    {
        $this->requireMysql();

        $count = DB::table('pieces_ok_jour')->count();
        $today = now()->toDateString();
        $row = DB::table('pieces_ok_jour')->whereDate('date', $today)->first();

        echo "\n[pieces_ok_jour] total_rows={$count}\n";

        if ($row) {
            echo "  Today: first_pass_today={$row->first_pass_today}, date={$row->date}\n";
        } else {
            $latest = DB::table('pieces_ok_jour')->orderByDesc('date')->first();
            echo "  No row for today. Latest: date={$latest->date}, first_pass_today={$latest->first_pass_today}\n";
        }

        $this->assertGreaterThan(0, $count, 'pieces_ok_jour is empty');
    }

    public function test_pieces_produites_jour_has_data()
    {
        $this->requireMysql();

        $count = DB::table('pieces_produites_jour')->count();
        $today = now()->toDateString();
        $row = DB::table('pieces_produites_jour')->whereDate('date', $today)->first();

        echo "\n[pieces_produites_jour] total_rows={$count}\n";

        if ($row) {
            echo "  Today: produced_today={$row->produced_today}, date={$row->date}\n";
        } else {
            $latest = DB::table('pieces_produites_jour')->orderByDesc('date')->first();
            echo "  No row for today. Latest: date={$latest->date}, produced_today={$latest->produced_today}\n";
        }

        $this->assertGreaterThan(0, $count, 'pieces_produites_jour is empty');
    }

    public function test_rejets_inspection_paquet_has_data()
    {
        $this->requireMysql();

        $count = DB::table('rejets_inspection_paquet')->count();
        $jour = DB::table('rejets_inspection_paquet')->where('period', 'jour')->first();
        $annee = DB::table('rejets_inspection_paquet')->where('period', 'annee')->first();

        echo "\n[rejets_inspection_paquet] total_rows={$count}\n";

        if ($jour) {
            echo "  Jour: date={$jour->date}, reject={$jour->bundle_reject}, inspected={$jour->bundle_inspected}, is_active={$jour->is_active}\n";
        }
        if ($annee) {
            echo "  Annee: date={$annee->date}, reject={$annee->bundle_reject}, inspected={$annee->bundle_inspected}, is_active={$annee->is_active}\n";
        }

        $this->assertGreaterThan(0, $count, 'rejets_inspection_paquet is empty');
    }

    // ── Calculation verification ─────────────────────────────────────────

    public function test_br_print_calculation()
    {
        $this->requireMysql();

        $today = now()->toDateString();
        $row = DB::table('sync_drive_br_print')->whereDate('date', $today)->first();

        if (! $row) {
            $this->markTestSkipped('No data for today in sync_drive_br_print');
        }

        $expectedBr = $row->nb_inspections > 0
            ? round(($row->nb_rejets / $row->nb_inspections) * 100, 1)
            : null;

        echo "\n[BR Print] nb_rejets={$row->nb_rejets}, nb_inspections={$row->nb_inspections}, computed_BR={$expectedBr}\n";

        if ($expectedBr !== null) {
            $this->assertIsFloat($expectedBr);
            $this->assertGreaterThanOrEqual(0, $expectedBr);
        }
    }

    public function test_br_gtd_calculation()
    {
        $this->requireMysql();

        $today = now()->toDateString();
        $rejets = DB::table('packets_rejetes')->whereDate('date_rejet', $today)->sum('qtte');
        $colis = DB::table('colis_total_var')->sum('total_colis');

        $expectedBr = $colis > 0
            ? round(($rejets / $colis) * 100, 1)
            : null;

        echo "\n[BR GTD] rejets_today={$rejets}, total_colis={$colis}, computed_BR={$expectedBr}\n";

        if ($expectedBr !== null) {
            $this->assertIsFloat($expectedBr);
            $this->assertGreaterThanOrEqual(0, $expectedBr);
        }
    }

    public function test_rft_calculation()
    {
        $this->requireMysql();

        $today = now()->toDateString();
        $ok = DB::table('pieces_ok_jour')->whereDate('date', $today)->value('first_pass_today');
        $produced = DB::table('pieces_produites_jour')->whereDate('date', $today)->value('produced_today');

        $expectedRft = ($ok && $produced && $produced > 0)
            ? round(($ok / $produced) * 100, 1)
            : null;

        echo "\n[RFT] first_pass_today={$ok}, produced_today={$produced}, computed_RFT={$expectedRft}\n";

        if ($expectedRft !== null) {
            $this->assertIsFloat($expectedRft);
            $this->assertGreaterThanOrEqual(0, $expectedRft);
            $this->assertLessThanOrEqual(100, $expectedRft, 'RFT > 100% is anomalous');
        }
    }

    // ── Full API endpoint tests ──────────────────────────────────────────

    public function test_quality_kpis_endpoint()
    {
        $this->requireMysql();

        $response = $this->actingAs($this->user)->getJson('/quality/kpis');

        $response->assertStatus(200);

        $data = $response->json();

        echo "\n=== Quality KPIs Endpoint Response ===\n";

        $kpiKeys = [
            'br_commande', 'br_gtd_jour', 'rft_jour', 'br_bundling_jour',
            'br_gtd_annee', 'rft_annee', 'br_bundling_annee',
            'br_print', 'br_print_dda',
            'br_care_label_jour', 'br_care_label_dda',
            'br_accessoires_jour', 'br_accessoires_dda',
            'br_compo_jour', 'br_compo_dda',
            'br_in_jour', 'br_in_dda',
        ];

        foreach ($kpiKeys as $key) {
            $kpi = $data[$key] ?? null;
            $value = $kpi['value'] ?? 'MISSING';
            $status = $kpi['status'] ?? 'MISSING';
            $source = $kpi['source'] ?? '';
            $blocker = $kpi['blocker'] ?? '';

            $line = "  {$key}: value={$value}, status={$status}";
            if ($source) {
                $line .= ", source={$source}";
            }
            if ($blocker) {
                $line .= ", BLOCKER={$blocker}";
            }
            echo $line."\n";
        }

        echo "\nsynced_at: ".($data['synced_at'] ?? 'null')."\n";

        foreach ($kpiKeys as $key) {
            $this->assertArrayHasKey($key, $data, "Missing key: {$key}");
        }
    }

    public function test_qp_teams_endpoint()
    {
        $this->requireMysql();

        $response = $this->actingAs($this->user)->getJson('/quality/qp-teams');

        $response->assertStatus(200);

        $data = $response->json();

        echo "\n=== QP Teams Endpoint Response ===\n";
        echo "Best teams:\n";
        foreach ($data['best'] ?? [] as $team) {
            echo "  {$team['chain']}: score={$team['score']}/{$team['max_score']}, defect_pct={$team['defect_pct']}\n";
        }
        echo "Worst teams:\n";
        foreach ($data['worst'] ?? [] as $team) {
            echo "  {$team['chain']}: score={$team['score']}/{$team['max_score']}, defect_pct={$team['defect_pct']}\n";
        }

        $this->assertArrayHasKey('best', $data);
        $this->assertArrayHasKey('worst', $data);
    }

    public function test_annual_trend_endpoint()
    {
        $this->requireMysql();

        $response = $this->actingAs($this->user)->getJson('/quality/annual-trend');

        $response->assertStatus(200);

        $data = $response->json();

        echo "\n=== Annual Trend Endpoint Response ===\n";
        echo 'Months: '.count($data['data'] ?? [])."\n";
        foreach ($data['data'] ?? [] as $row) {
            echo "  {$row['month']}: rft={$row['rft']}, br_gtd={$row['br_gtd']}, br_bundling={$row['br_bundling']}, br_print={$row['br_print']}, br_care_label={$row['br_care_label']}, br_accessoires={$row['br_accessoires']}, br_compo={$row['br_compo']}\n";
        }

        $this->assertArrayHasKey('data', $data);
    }

    public function test_pareto_rft_endpoint()
    {
        $this->requireMysql();

        $response = $this->actingAs($this->user)->getJson('/quality/pareto/rft');

        $response->assertStatus(200);

        $data = $response->json();

        echo "\n=== Pareto RFT Endpoint Response ===\n";
        echo 'Items: '.count($data['data'] ?? [])."\n";
        foreach ($data['data'] ?? [] as $item) {
            echo "  {$item['label']}: value={$item['value']}, cumulative={$item['cumulative']}%\n";
        }

        $this->assertArrayHasKey('data', $data);
    }

    public function test_pareto_inspection_endpoint()
    {
        $this->requireMysql();

        $response = $this->actingAs($this->user)->getJson('/quality/pareto/inspection');

        $response->assertStatus(200);

        $data = $response->json();

        echo "\n=== Pareto Inspection Endpoint Response ===\n";
        echo 'Items: '.count($data['data'] ?? [])."\n";
        foreach ($data['data'] ?? [] as $item) {
            echo "  {$item['label']}: value={$item['value']}, cumulative={$item['cumulative']}%\n";
        }

        $this->assertArrayHasKey('data', $data);
    }

    // ── Full diagnostic dump ─────────────────────────────────────────────

    public function test_diagnostic_dump_all_quality_tables()
    {
        $this->requireMysql();

        $today = now()->toDateString();
        $year = now()->year;

        $tables = [
            'sync_drive_br_print' => ['date_col' => 'date'],
            'sync_drive_br_care_label' => ['date_col' => 'date'],
            'sync_drive_br_accessoires' => ['date_col' => 'date'],
            'sync_drive_br_compo' => ['date_col' => 'date'],
            'sync_drive_inspection_commande' => ['date_col' => 'date'],
            'packets_rejetes' => ['date_col' => 'date_rejet'],
            'colis_total_var' => ['date_col' => null],
            'check_pass_qte' => ['date_col' => 'log_date'],
            'pieces_ok_jour' => ['date_col' => 'date'],
            'pieces_produites_jour' => ['date_col' => 'date'],
            'pieces_ok_annee' => ['date_col' => null],
            'pieces_produites_annee' => ['date_col' => null],
            'rejets_inspection_paquet' => ['date_col' => 'date'],
            'vw_defects' => ['date_col' => 'log_date'],
            'qcm_defect_trx' => ['date_col' => 'log_date'],
        ];

        echo "\n========== DIAGNOSTIC DUMP ==========\n";
        echo "Today: {$today}, Year: {$year}\n\n";

        foreach ($tables as $table => $config) {
            $exists = Schema::hasTable($table);
            if (! $exists) {
                echo "[{$table}] TABLE DOES NOT EXIST\n\n";

                continue;
            }

            $totalRows = DB::table($table)->count();
            $dateCol = $config['date_col'];

            echo "[{$table}] total_rows={$totalRows}";

            if ($dateCol) {
                $latestDate = DB::table($table)->orderByDesc($dateCol)->value($dateCol);
                $todayRows = DB::table($table)->whereDate($dateCol, $today)->count();
                $yearRows = DB::table($table)->whereYear($dateCol, $year)->count();
                echo ", latest={$latestDate}, today_rows={$todayRows}, year_rows={$yearRows}";
            }

            echo "\n";

            $sample = DB::table($table)->limit(3)->get();
            if ($sample->isNotEmpty()) {
                echo '  Columns: '.implode(', ', array_keys((array) $sample->first()))."\n";
                foreach ($sample as $row) {
                    echo '  -> '.json_encode((array) $row)."\n";
                }
            } else {
                echo "  (empty table)\n";
            }
            echo "\n";
        }

        echo "========== END DIAGNOSTIC ==========\n";

        $this->assertTrue(true);
    }
}
