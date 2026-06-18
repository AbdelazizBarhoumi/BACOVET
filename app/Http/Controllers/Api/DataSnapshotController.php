<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\DataSnapshotService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DataSnapshotController extends Controller
{
    public function __construct(
        private DataSnapshotService $snapshots
    ) {}

    /**
     * List all tables that have been snapshotted.
     */
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => $this->snapshots->listTables(),
        ]);
    }

    /**
     * Get snapshots for a specific table.
     */
    public function show(Request $request, string $tableName): JsonResponse
    {
        $from = $request->input('from');
        $to = $request->input('to');
        $limit = (int) $request->input('limit', 30);

        $snapshots = $this->snapshots->getSnapshots($tableName, $from, $to, $limit);

        return response()->json([
            'data' => $snapshots,
        ]);
    }

    /**
     * Get a single snapshot by ID.
     */
    public function snapshot(int $id): JsonResponse
    {
        $snapshot = $this->snapshots->getSnapshot($id);

        if (! $snapshot) {
            return response()->json(['error' => 'Snapshot not found'], 404);
        }

        return response()->json([
            'data' => $snapshot,
        ]);
    }
}
