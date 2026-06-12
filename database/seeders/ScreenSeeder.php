<?php

namespace Database\Seeders;

use App\Models\Screen;
use Illuminate\Database\Seeder;

class ScreenSeeder extends Seeder
{
    public function run(): void
    {
        $screens = [
            ['name' => 'Atelier 1', 'status' => 'online', 'assigned_page' => 'production_confection'],
            ['name' => 'Atelier 2', 'status' => 'online', 'assigned_page' => 'production_confection'],
            ['name' => 'Coupe', 'status' => 'online', 'assigned_page' => 'production_coupe'],
            ['name' => 'Sérigraphie', 'status' => 'offline', 'assigned_page' => 'production_serigraphie'],
            ['name' => 'Qualité', 'status' => 'online', 'assigned_page' => 'quality'],
            ['name' => 'Logistique', 'status' => 'online', 'assigned_page' => 'logistics'],
        ];

        foreach ($screens as $screen) {
            Screen::updateOrCreate(['name' => $screen['name']], $screen);
        }
    }
}
