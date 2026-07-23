<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\KpiData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BuilderKpiController extends Controller
{
    public function index(): JsonResponse
    {
        $config = config('data-mappings', []);
        $kpis = [];

        foreach ($config as $module => $moduleData) {
            $moduleKpis = $moduleData['kpis'] ?? [];
            foreach ($moduleKpis as $kpiDef) {
                $target = $kpiDef['target'] ?? [];
                $kpis[] = [
                    'kpi' => $kpiDef['kpi'],
                    'name' => $kpiDef['name'],
                    'variables' => $kpiDef['variables'] ?? [],
                    'formula' => $kpiDef['formula'] ?? null,
                    'formula_readable' => $kpiDef['formula_readable'] ?? null,
                    'target_operator' => $target['operator'] ?? null,
                    'target_value' => $target['value'] ?? null,
                    'target_is_percentage' => $target['is_percentage'] ?? false,
                    'refresh_frequency' => $kpiDef['refresh_frequency'] ?? 'instant',
                    'module' => $module,
                ];
            }
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
