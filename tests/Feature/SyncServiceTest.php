<?php

namespace Tests\Feature;

use App\Services\SyncService;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SyncServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_sync_drive_development_handles_empty_dates(): void
    {
        // Setup: Ensure the table exists and structure is as expected for the test
        // This relies on the migration having been run, which RefreshDatabase ensures
        
        $syncService = app(SyncService::class);
        
        // Mock data with an empty date string
        $data = [
            [
                'date' => '2026-06-15',
                'modele' => 'TEST MODEL',
                'statut_validation' => 'OK',
                'date_livraison_prevue' => '2026-06-20',
                'date_livraison_reelle' => '', // This is the problematic empty string
                'nomenclature_valide' => '1',
                'est_reclamation' => '0',
            ]
        ];

        // Manually trigger the sync for this table using the method
        // Since syncTable is private, I'll test via an artisan command if one exists
        // or just directly test the logic if I can inject the data.
        
        // As a shortcut to test the logic directly:
        $this->actingAs(User::factory()->create());
        
        // Trigger the actual sync process
        $this->artisan('sync:drive')->assertExitCode(0);
        
        $count = \DB::table('sync_drive_development')->where('modele', 'TEST MODEL')->count();
        $this->assertTrue($count > 0, "Test data was not inserted, count is: $count");
        
        // Verify the data is in the database, specifically date_livraison_reelle is null
        $this->assertDatabaseHas('sync_drive_development', [
            'modele' => 'TEST MODEL',
            'date_livraison_reelle' => null,
        ]);
    }

    public function test_sync_gpro_consulting_works(): void
    {
        $this->actingAs(User::factory()->create());
        
        // Trigger the GPRO sync process
        $this->artisan('sync:gpro')->assertExitCode(0);
        
        // Verify we have records in one of the tables
        $this->assertTrue(DB::table('sync_gpro_suivi_paquets')->count() > 0, "GPRO suivi_paquets was not synced.");
    }
}
