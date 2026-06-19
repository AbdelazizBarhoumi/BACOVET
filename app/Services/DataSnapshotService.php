<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class DataSnapshotService
{
    /**
     * Snapshot a single table — stores all current rows as JSON.
     */
    public function snapshotTable(string $tableName): bool
    {
        if (! config('sync.history_enabled')) {
            return false;
        }

        if (! Schema::hasTable($tableName)) {
            return false;
        }

        try {
            $rows = DB::table($tableName)->get();

            if ($rows->isEmpty()) {
                return false;
            }

            DB::table('data_snapshots')->insert([
                'table_name' => $tableName,
                'snapshot_at' => now(),
                'row_count' => $rows->count(),
                'data' => $rows->toJson(),
            ]);

            return true;
        } catch (\Throwable $e) {
            Log::error("DataSnapshotService [{$tableName}]: {$e->getMessage()}");

            return false;
        }
    }

    /**
     * Snapshot multiple tables at once.
     */
    public function snapshotTables(array $tableNames): array
    {
        $results = [];
        foreach ($tableNames as $tableName) {
            $results[$tableName] = $this->snapshotTable($tableName);
        }

        return $results;
    }

    /**
     * Get snapshots for a table, optionally filtered by date range.
     */
    public function getSnapshots(string $tableName, ?string $from = null, ?string $to = null, int $limit = 30): array
    {
        $query = DB::table('data_snapshots')
            ->where('table_name', $tableName)
            ->orderByDesc('snapshot_at');

        if ($from) {
            $query->where('snapshot_at', '>=', $from);
        }
        if ($to) {
            $query->where('snapshot_at', '<=', $to.' 23:59:59');
        }

        return $query->limit($limit)->get()->toArray();
    }

    /**
     * Get a single snapshot by ID.
     */
    public function getSnapshot(int $id): ?object
    {
        return DB::table('data_snapshots')->find($id);
    }

    /**
     * List all tables that have been snapshotted.
     */
    public function listTables(): array
    {
        return DB::table('data_snapshots')
            ->select('table_name', DB::raw('COUNT(*) as snapshot_count'), DB::raw('MAX(snapshot_at) as last_snapshot'))
            ->groupBy('table_name')
            ->orderBy('table_name')
            ->get()
            ->toArray();
    }
}
