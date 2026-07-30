<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DataMapping;
use App\Models\KpiData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BuilderKpiController extends Controller
{
    public function index(): JsonResponse
    {
        $rows = DataMapping::orderBy('kpi')->orderBy('id')->get();
        $kpis = [];
        $grouped = $rows->groupBy('kpi');

        foreach ($grouped as $kpiCode => $kpiRows) {
            $first = $kpiRows->first();

            $kpis[] = [
                'kpi' => $kpiCode,
                'name' => $first->name,
                'variables' => $kpiRows->map(fn ($r) => array_filter([
                    'variable' => $r->variable,
                    'endpoint' => $r->endpoint,
                    'variable_type' => $r->variable_type,
                    'variable_key' => $r->variable_key,
                    'is_filtered' => $r->is_filtered,
                    'filter_key' => $r->filter_key,
                    'filter_value' => $r->filter_value,
                    'has_function' => $r->has_function,
                    'fn' => $r->fn,
                ], fn ($v) => $v !== null))->values(),
                'formula' => $first->formula,
                'formula_readable' => null,
                'target_operator' => $first->cible_operator,
                'target_value' => $first->cible_value,
                'target_is_percentage' => $first->cible_is_percentage ?? false,
                'refresh_frequency' => $first->refresh_frequency ?? 'instant',
                'module' => (is_array($first->modules) && count($first->modules) > 0) ? $first->modules[0] : null,
            ];
        }

        return response()->json($kpis);
    }

    public function data(Request $request): JsonResponse
    {
        $codes = $request->input('codes');
        if (is_string($codes)) {
            $codes = array_map('trim', explode(',', $codes));
        }
        if (empty($codes) || !is_array($codes)) {
            return response()->json([]);
        }

        $results = [];

        $rows = KpiData::whereIn('kpi_code', $codes)
            ->whereNotNull('computed_result')
            ->select('kpi_code', 'computed_result')
            ->get();

        foreach ($rows as $row) {
            $cr = $row->computed_result;
            if (!isset($results[$row->kpi_code])) {
                $results[$row->kpi_code] = [
                    'scalar_value' => $cr['scalar_value'] ?? null,
                    'status' => $cr['status'] ?? 'grey',
                    'mapped_rows' => $cr['mapped_rows'] ?? null,
                    'filter_options' => $cr['filter_options'] ?? [],
                    'computed_at' => $cr['computed_at'] ?? null,
                ];
            }
        }

        foreach ($codes as $code) {
            if (!isset($results[$code])) {
                $results[$code] = [
                    'scalar_value' => null,
                    'status' => 'grey',
                    'mapped_rows' => null,
                    'filter_options' => [],
                    'computed_at' => null,
                ];
            }
        }

        $response = response()->json($results);
        $response->headers->set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        $response->headers->set('Pragma', 'no-cache');
        $response->headers->set('Expires', '0');
        return $response;
    }
}
