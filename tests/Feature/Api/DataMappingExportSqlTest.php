<?php

namespace Tests\Feature\Api;

use App\Models\DataMapping;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DataMappingExportSqlTest extends TestCase
{
    use RefreshDatabase;

    public function test_export_sql_returns_valid_download(): void
    {
        DataMapping::create([
            'kpi' => 'F-REQ-001', 'name' => 'Test KPI', 'variable' => 'var1',
            'endpoint' => '/api/test', 'variable_type' => 'Direct',
            'modules' => ['module1'], 'is_filtered' => false, 'has_function' => true,
        ]);

        $response = $this->get('/data-mappings/export-sql');

        $response->assertOk();
        $response->assertHeader('Content-Type', 'application/sql');
        $response->assertHeader(
            'Content-Disposition',
            'attachment; filename="data_mappings_export.sql"'
        );
    }

    public function test_sql_contains_header_comments(): void
    {
        DataMapping::create(['kpi' => 'F-REQ-001', 'variable' => 'v1']);

        $sql = $this->get('/data-mappings/export-sql')->getContent();

        $this->assertStringContainsString('-- BACOVET data_mappings SQL export', $sql);
        $this->assertStringContainsString('-- Generated:', $sql);
        $this->assertStringContainsString('-- Rows: 1', $sql);
    }

    public function test_sql_contains_set_names_utf8mb4(): void
    {
        DataMapping::create(['kpi' => 'F-REQ-001', 'variable' => 'v1']);

        $sql = $this->get('/data-mappings/export-sql')->getContent();

        $this->assertStringContainsString('SET NAMES utf8mb4;', $sql);
    }

    public function test_sql_contains_update_statements(): void
    {
        DataMapping::create([
            'kpi' => 'F-REQ-001', 'name' => 'BR', 'variable' => 'var1',
            'endpoint' => 'api/data/q/test', 'variable_type' => 'Direct',
        ]);

        $sql = $this->get('/data-mappings/export-sql')->getContent();

        $this->assertStringContainsString('UPDATE `data_mappings` SET', $sql);
        $this->assertStringContainsString("`kpi` = 'F-REQ-001'", $sql);
        $this->assertStringContainsString("`variable` = 'var1'", $sql);
        $this->assertStringContainsString("`name` = 'BR'", $sql);
        $this->assertStringContainsString("`endpoint` = 'api/data/q/test'", $sql);
        $this->assertStringContainsString("`variable_type` = 'Direct'", $sql);
    }

    public function test_sql_ends_with_semicolon_per_statement(): void
    {
        DataMapping::create(['kpi' => 'F-REQ-001', 'variable' => 'v1']);
        DataMapping::create(['kpi' => 'F-REQ-002', 'variable' => 'v2']);

        $sql = $this->get('/data-mappings/export-sql')->getContent();

        // Each UPDATE line ends with a semicolon
        $lines = array_filter(explode("\n", $sql), fn ($line) => str_starts_with(trim($line), 'UPDATE'));
        $this->assertCount(2, $lines);
        foreach ($lines as $line) {
            $this->assertStringEndsWith(';', trim($line));
        }
    }

    public function test_rows_ordered_by_kpi_then_id(): void
    {
        DataMapping::create(['kpi' => 'F-REQ-002', 'variable' => 'b']);
        DataMapping::create(['kpi' => 'F-REQ-001', 'variable' => 'a']);
        DataMapping::create(['kpi' => 'F-REQ-002', 'variable' => 'a']);

        $sql = $this->get('/data-mappings/export-sql')->getContent();

        $pos_001 = strpos($sql, "F-REQ-001");
        $pos_002a = strpos($sql, "F-REQ-002");
        // Both F-REQ-002 rows should come after F-REQ-001
        $this->assertGreaterThan($pos_001, $pos_002a);
    }

    public function test_handles_null_values(): void
    {
        DataMapping::create([
            'kpi' => 'F-REQ-001', 'variable' => 'v1',
            'endpoint' => null, 'variable_key' => null,
        ]);

        $sql = $this->get('/data-mappings/export-sql')->getContent();

        $this->assertStringContainsString('`endpoint` = NULL', $sql);
        $this->assertStringContainsString('`variable_key` = NULL', $sql);
    }

    public function test_handles_json_columns(): void
    {
        DataMapping::create([
            'kpi' => 'F-REQ-001', 'variable' => 'v1',
            'modules' => ['quality', 'production'],
            'formula' => ['items' => [['type' => 'variable', 'ref' => 1]]],
            'graph_types' => ['Big Number', 'Gauge Chart'],
        ]);

        $sql = $this->get('/data-mappings/export-sql')->getContent();

        $this->assertStringContainsString('`modules`', $sql);
        $this->assertStringContainsString('quality', $sql);
        $this->assertStringContainsString('production', $sql);
        $this->assertStringContainsString('`formula`', $sql);
        $this->assertStringContainsString('`graph_types`', $sql);
        $this->assertStringContainsString('Big Number', $sql);
    }

    public function test_handles_boolean_columns(): void
    {
        DataMapping::create([
            'kpi' => 'F-REQ-001', 'variable' => 'v1',
            'is_filtered' => true, 'has_function' => false, 'cible_is_percentage' => true,
        ]);

        $sql = $this->get('/data-mappings/export-sql')->getContent();

        $this->assertStringContainsString('`is_filtered` = 1', $sql);
        $this->assertStringContainsString('`has_function` = 0', $sql);
        $this->assertStringContainsString('`cible_is_percentage` = 1', $sql);
    }

    public function test_handles_numeric_column(): void
    {
        DataMapping::create([
            'kpi' => 'F-REQ-001', 'variable' => 'v1',
            'cible_value' => 95.50,
        ]);

        $sql = $this->get('/data-mappings/export-sql')->getContent();

        $this->assertStringContainsString('`cible_value` = 95.5', $sql);
    }

    public function test_empty_table_returns_valid_sql_with_zero_rows(): void
    {
        $sql = $this->get('/data-mappings/export-sql')->getContent();

        $this->assertStringContainsString('-- Rows: 0', $sql);
        $this->assertStringContainsString('SET NAMES utf8mb4;', $sql);
        // No UPDATE statements
        $this->assertStringNotContainsString('UPDATE', $sql);
    }

    public function test_no_auth_required(): void
    {
        // Do not actAs any user — the endpoint is public
        DataMapping::create(['kpi' => 'F-REQ-001', 'variable' => 'v1']);

        $response = $this->get('/data-mappings/export-sql');

        $response->assertOk();
    }

    public function test_escapes_quotes_in_string_values(): void
    {
        DataMapping::create([
            'kpi' => "F-REQ-001", 'variable' => "It's a test",
            'name' => 'BR with "quotes"',
        ]);

        $sql = $this->get('/data-mappings/export-sql')->getContent();

        // addslashes escapes ' and "
        $this->assertStringContainsString("It\\'s a test", $sql);
        $this->assertStringContainsString('BR with \\"quotes\\"', $sql);
    }

    public function test_where_clause_uses_kpi_and_variable(): void
    {
        DataMapping::create(['kpi' => 'F-REQ-001', 'variable' => 'numerator']);
        DataMapping::create(['kpi' => 'F-REQ-001', 'variable' => 'denominator']);

        $sql = $this->get('/data-mappings/export-sql')->getContent();

        $this->assertStringContainsString(
            "WHERE `kpi` = 'F-REQ-001' AND `variable` = 'numerator'",
            $sql
        );
        $this->assertStringContainsString(
            "WHERE `kpi` = 'F-REQ-001' AND `variable` = 'denominator'",
            $sql
        );
    }

    public function test_multiple_rows_produce_multiple_statements(): void
    {
        for ($i = 1; $i <= 5; $i++) {
            DataMapping::create(['kpi' => "F-REQ-{$i}", 'variable' => "var{$i}"]);
        }

        $sql = $this->get('/data-mappings/export-sql')->getContent();

        $this->assertStringContainsString('-- Rows: 5', $sql);
        preg_match_all('/UPDATE `data_mappings`/', $sql, $matches);
        $this->assertCount(5, $matches[0]);
    }
}
