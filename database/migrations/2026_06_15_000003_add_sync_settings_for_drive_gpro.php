<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('sync_settings')->insert([
            [
                'key' => 'drive_interval_seconds',
                'value' => 21600,
                'description' => 'Google Drive sync interval (default 6h)',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'gpro_interval_seconds',
                'value' => 300,
                'description' => 'GPRO Consulting sync interval (default 5min)',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    public function down(): void
    {
        DB::table('sync_settings')->whereIn('key', [
            'drive_interval_seconds',
            'gpro_interval_seconds',
        ])->delete();
    }
};
