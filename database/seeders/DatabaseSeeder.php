<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        $this->call([
            RoleSeeder::class,
            UserSeeder::class,
            ScreenSeeder::class,
            NovacityJobSeeder::class,
            ManualKpiSeeder::class,
            SyncSettingSeeder::class,
            DataMappingSeeder::class,
        ]);

        User::updateOrCreate(
            ['email' => 'test@example.com'],
            [
                'name' => 'Test User',
                'matricule' => 'EID001',
                'password' => \Illuminate\Support\Facades\Hash::make('password'),
                'role_id' => \App\Models\Role::where('slug', 'it')->first()?->id ?? 1,
                'is_active' => true,
            ]
        );
    }
}
