<?php

namespace Database\Seeders;

use App\Models\NovacityJob;
use Illuminate\Database\Seeder;

class NovacityJobSeeder extends Seeder
{
    public function run(): void
    {
        $jobs = [
            [
                'novacity_job_id' => 1,
                'name' => 'ERP DIVA - Stock',
                'query_slug' => 'diva_stock',
                'source' => 'DIVA',
                'last_status' => 'ok',
                'is_active' => true,
            ],
            [
                'novacity_job_id' => 2,
                'name' => 'GPRO-PROD - Efficience',
                'query_slug' => 'efficience_chaine',
                'source' => 'GPRO',
                'last_status' => 'ok',
                'is_active' => true,
            ],
            [
                'novacity_job_id' => 3,
                'name' => 'Google Drive - Plan Planning',
                'query_slug' => 'google_drive_planning',
                'source' => 'GOOGLE_DRIVE',
                'last_status' => 'ok',
                'is_active' => true,
            ],
            [
                'novacity_job_id' => 4,
                'name' => 'Novacity API - Quality Sync',
                'query_slug' => 'quality_sync',
                'source' => 'OTHER',
                'last_status' => 'ok',
                'is_active' => true,
            ],
        ];

        foreach ($jobs as $job) {
            NovacityJob::updateOrCreate(['novacity_job_id' => $job['novacity_job_id']], $job);
        }
    }
}
