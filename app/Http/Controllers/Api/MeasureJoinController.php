<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BuilderActivityLog;
use App\Models\MeasureJoin;
use App\Support\PageAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MeasureJoinController extends Controller
{
    public function index(): JsonResponse
    {
        $joins = MeasureJoin::query()
            ->orderBy('table_a')
            ->orderBy('table_b')
            ->get();

        return response()->json(['joins' => $joins]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'table_a' => 'required|string|max:255',
            'column_a' => 'required|string|max:255',
            'table_b' => 'required|string|max:255',
            'column_b' => 'required|string|max:255',
            'trim_compare' => 'nullable|boolean',
        ]);

        $trim = $validated['trim_compare'] ?? true;
        $join = MeasureJoin::create([
            'table_a' => trim($validated['table_a']),
            'column_a' => trim($validated['column_a']),
            'table_b' => trim($validated['table_b']),
            'column_b' => trim($validated['column_b']),
            'trim_compare' => $trim,
            'user_id' => PageAccess::resolveUser()?->id,
        ]);

        $this->logActivity('join.create', $join);

        return response()->json([
            'message' => 'Join created.',
            'join' => $join,
        ], 201);
    }

    public function destroy(string $id): JsonResponse
    {
        $join = MeasureJoin::find($id);

        if (! $join) {
            return response()->json(['message' => 'Join not found'], 404);
        }

        $this->logActivity('join.delete', $join, $join->getOriginal());
        $join->delete();

        return response()->json(['message' => 'Join deleted.']);
    }

    private function logActivity(
        string $action,
        MeasureJoin $join,
        array $before = [],
    ): void {
        BuilderActivityLog::create([
            'user_id' => PageAccess::resolveUser()?->id,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'action' => $action,
            'detail' => [
                'join_id' => $join->id,
                'table_a' => $join->table_a,
                'column_a' => $join->column_a,
                'table_b' => $join->table_b,
                'column_b' => $join->column_b,
                'trim_compare' => $join->trim_compare,
                'before' => $before,
            ],
            'created_at' => now(),
        ]);
    }
}