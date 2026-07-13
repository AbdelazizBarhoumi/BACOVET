<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DataMapping;
use App\Models\DataMappingAuditLog;
use App\Services\DataMappingAuditor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DataMappingController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(DataMapping::orderBy('id')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'kpi' => 'required|string|max:50',
            'name' => 'nullable|string|max:255',
            'variable' => 'nullable|string|max:255',
            'endpoint' => 'nullable|string|max:255',
            'variable_type' => 'nullable|in:Direct,Complex',
            'variable_key' => 'nullable|string|max:500',
            'is_filtered' => 'nullable|boolean',
            'filter_key' => 'nullable|string|max:255',
            'filter_value' => 'nullable|string|max:255',
            'has_function' => 'nullable|boolean',
            'fn' => 'nullable|string|in:Latest,First,Sum,Average,Min,Max,Count',
            'modules' => 'nullable|array',
            'modules.*' => 'string',
            'formula' => 'nullable|array',
            'highlight_color' => 'nullable|string|max:20',
            'cible_operator' => 'nullable|string|max:5',
            'cible_value' => 'nullable|numeric',
            'cible_is_percentage' => 'nullable|boolean',
            'refresh_frequency' => 'nullable|string|in:instant,daily,weekly,monthly,yearly',
        ]);

        // Coerce null to '' for columns with NOT NULL default
        if (array_key_exists('name', $validated) && $validated['name'] === null) {
            $validated['name'] = '';
        }
        if (array_key_exists('variable', $validated) && $validated['variable'] === null) {
            $validated['variable'] = '';
        }

        $validated['user_id'] = $request->user()?->id;

        $mapping = DataMapping::create($validated);

        $auditor = new DataMappingAuditor($request->user()?->id);
        $auditor->recordCreated($mapping);

        return response()->json(['message' => 'Mapping created.', 'mapping' => $mapping], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $mapping = DataMapping::findOrFail($id);

        $validated = $request->validate([
            'kpi' => 'sometimes|string|max:50',
            'name' => 'nullable|string|max:255',
            'variable' => 'nullable|string|max:255',
            'endpoint' => 'nullable|string|max:255',
            'variable_type' => 'nullable|in:Direct,Complex',
            'variable_key' => 'nullable|string|max:500',
            'is_filtered' => 'nullable|boolean',
            'filter_key' => 'nullable|string|max:255',
            'filter_value' => 'nullable|string|max:255',
            'has_function' => 'nullable|boolean',
            'fn' => 'nullable|string|in:Latest,First,Sum,Average,Min,Max,Count',
            'modules' => 'nullable|array',
            'modules.*' => 'string',
            'formula' => 'nullable|array',
            'highlight_color' => 'nullable|string|max:20',
            'cible_operator' => 'nullable|string|max:5',
            'cible_value' => 'nullable|numeric',
            'cible_is_percentage' => 'nullable|boolean',
            'refresh_frequency' => 'nullable|string|in:instant,daily,weekly,monthly,yearly',
        ]);

        $old = $mapping->only(DataMappingAuditor::AUDITABLE_FIELDS);
        $mapping->update($validated);
        $new = $mapping->only(DataMappingAuditor::AUDITABLE_FIELDS);

        $auditor = new DataMappingAuditor($request->user()?->id);
        $auditor->recordUpdated($mapping, $old, $new);

        // Sync modules across all rows with same KPI
        if (isset($validated['modules'])) {
            DataMapping::where('kpi', $mapping->kpi)
                ->where('id', '!=', $mapping->id)
                ->update(['modules' => $validated['modules']]);
        }

        return response()->json(['message' => 'Mapping updated.', 'mapping' => $mapping]);
    }

    public function destroy(int $id): JsonResponse
    {
        $mapping = DataMapping::findOrFail($id);

        $auditor = new DataMappingAuditor(request()->user()?->id);
        $auditor->recordDeleted($mapping);

        $mapping->delete();

        return response()->json(['message' => 'Mapping deleted.']);
    }

    public function batchUpdate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'mappings' => 'required|array',
            'mappings.*.id' => 'required|integer|exists:data_mappings,id',
            'mappings.*.kpi' => 'sometimes|string|max:50',
            'mappings.*.name' => 'nullable|string|max:255',
            'mappings.*.variable' => 'nullable|string|max:255',
            'mappings.*.endpoint' => 'nullable|string|max:255',
            'mappings.*.variable_type' => 'nullable|in:Direct,Complex',
            'mappings.*.variable_key' => 'nullable|string|max:500',
            'mappings.*.is_filtered' => 'nullable|boolean',
            'mappings.*.filter_key' => 'nullable|string|max:255',
            'mappings.*.filter_value' => 'nullable|string|max:255',
            'mappings.*.has_function' => 'nullable|boolean',
            'mappings.*.fn' => 'nullable|string|in:Latest,First,Sum,Average,Min,Max,Count',
            'mappings.*.modules' => 'sometimes|array',
            'mappings.*.modules.*' => 'string',
            'mappings.*.formula' => 'nullable|array',
            'mappings.*.highlight_color' => 'nullable|string|max:20',
            'mappings.*.cible_operator' => 'nullable|string|max:5',
            'mappings.*.cible_value' => 'nullable|numeric',
            'mappings.*.cible_is_percentage' => 'nullable|boolean',
            'mappings.*.refresh_frequency' => 'nullable|string|in:instant,daily,weekly,monthly,yearly',
        ]);

        $auditor = new DataMappingAuditor($request->user()?->id);

        foreach ($validated['mappings'] as $item) {
            $id = $item['id'];
            unset($item['id']);

            // Coerce null to '' for columns with NOT NULL default
            if (array_key_exists('name', $item) && $item['name'] === null) {
                $item['name'] = '';
            }
            if (array_key_exists('variable', $item) && $item['variable'] === null) {
                $item['variable'] = '';
            }

            $row = DataMapping::find($id);
            if ($row) {
                $old = $row->only(DataMappingAuditor::AUDITABLE_FIELDS);
                $row->update($item);
                $new = $row->only(DataMappingAuditor::AUDITABLE_FIELDS);
                $auditor->recordUpdated($row, $old, $new);
            }
        }

        // Sync modules across same-KPI rows: any KPI that had modules changed gets synced
        $changedKpis = collect($validated['mappings'])
            ->filter(fn ($item) => isset($item['modules']))
            ->map(fn ($item) => DataMapping::find($item['id'])->kpi ?? null)
            ->filter()
            ->unique();

        foreach ($changedKpis as $kpi) {
            $latestModules = DataMapping::where('kpi', $kpi)->value('modules');
            DataMapping::where('kpi', $kpi)->update(['modules' => $latestModules]);
        }

        return response()->json(['message' => 'Mappings updated.']);
    }

    public function seedFromKpiSeed(Request $request): JsonResponse
    {
        if (DataMapping::count() > 0) {
            return response()->json(['message' => 'Table already seeded.', 'count' => DataMapping::count()]);
        }

        $seedPath = resource_path('js/lib/kpi-rows.ts');
        $seedJson = $request->input('seeds', []);

        if (empty($seedJson)) {
            // Parse the seed from the TS file
            $content = file_get_contents($seedPath);
            preg_match_all('/"kpi":\s*"([^"]+)".*?"name":\s*"([^"]+)".*?"variable":\s*"([^"]+)"/s', $content, $matches, PREG_SET_ORDER);
            foreach ($matches as $m) {
                $seedJson[] = ['kpi' => $m[1], 'name' => $m[2], 'variable' => $m[3]];
            }
        }

        $userId = $request->user()?->id;
        $created = 0;

        foreach ($seedJson as $i => $s) {
            DataMapping::create([
                'kpi' => $s['kpi'] ?? 'F-REQ-XXX',
                'name' => $s['name'] ?? '',
                'variable' => $s['variable'] ?? '',
                'cible_operator' => $s['cible_operator'] ?? '=',
                'cible_value' => $s['cible_value'] ?? null,
                'cible_is_percentage' => $s['cible_is_percentage'] ?? false,
                'refresh_frequency' => $s['refresh_frequency'] ?? 'instant',
                'user_id' => $userId,
            ]);
            $created++;
        }

        return response()->json(['message' => "Seeded {$created} mappings.", 'count' => $created]);
    }

    public function auditLogs(Request $request): JsonResponse
    {
        $query = DataMappingAuditLog::orderByDesc('created_at');

        if ($kpi = $request->input('kpi')) {
            $query->where('kpi', $kpi);
        }
        if ($action = $request->input('action')) {
            $query->where('action', $action);
        }

        $perPage = min((int) $request->input('per_page', 25), 100);
        $logs = $query->paginate($perPage);

        // Manually resolve user names from both data_users and users tables
        $userIds = $logs->pluck('user_id')->filter()->unique()->values();
        $userMap = [];

        if ($userIds->isNotEmpty()) {
            $dataUsers = \App\Models\DataUser::whereIn('id', $userIds)->get()->keyBy('id');
            $mainUsers = \App\Models\User::whereIn('id', $userIds)->get()->keyBy('id');
            foreach ($userIds as $uid) {
                $userMap[$uid] = $dataUsers->get($uid) ?? $mainUsers->get($uid);
            }
        }

        $logs->getCollection()->transform(function ($log) use ($userMap) {
            $log->user = $log->user_id ? ($userMap[$log->user_id] ?? null) : null;
            return $log;
        });

        return response()->json($logs);
    }
}
