<?php

namespace Database\Seeders;

use App\Models\SyncSetting;
use Illuminate\Database\Seeder;

class SyncSettingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $settings = [
            ['key' => 'quality_interval_seconds',    'value' => '60',  'description' => 'Intervalle sync Qualité'],
            ['key' => 'production_interval_seconds', 'value' => '60',  'description' => 'Intervalle sync Production'],
            ['key' => 'logistics_interval_seconds',  'value' => '300', 'description' => 'Intervalle sync Logistique'],
        ];

        foreach ($settings as $setting) {
            SyncSetting::updateOrCreate(['key' => $setting['key']], $setting);
        }
    }
}
