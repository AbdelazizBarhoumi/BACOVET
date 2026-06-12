<?php

namespace Tests\Feature;

use App\Models\NovacityJob;
use App\Models\Role;
use App\Models\User;
use App\Services\NovacityService;
use App\Services\SyncService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ExternalApiIntegrationTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        // Use the seeded 'it' role
        $role = Role::where('slug', 'it')->first();
        $this->user = User::create([
            'name' => 'Admin Test',
            'matricule' => 'ADM-001',
            'email' => 'admin@test.com',
            'password' => bcrypt('password'),
            'role_id' => $role->id,
            'is_active' => true,
        ]);
    }

    /** @test */
    public function novacity_service_can_fetch_endpoints()
    {
        Http::fake([
            '*/api/data/checkpassqte*' => Http::response([
                'success' => true,
                'data' => [['shortname' => 'Chain A', 'defect_pct' => 2.5]]
            ], 200),
        ]);

        $service = new NovacityService();
        $data = $service->fetchEndpoint('check_pass_qte');

        $this->assertCount(1, $data);
        $this->assertEquals('Chain A', $data[0]['shortname']);
        
        Http::assertSent(function ($request) {
            return $request->hasHeader('x-api-key') &&
                   str_contains($request->url(), '/api/data/checkpassqte');
        });
    }

    /** @test */
    public function novacity_service_can_fetch_custom_queries()
    {
        Http::fake([
            '*/api/data/q/wip_chaine*' => Http::response([
                'success' => true,
                'data' => [['chaine' => 'Line 1', 'en_cours' => 50]]
            ], 200),
        ]);

        $service = new NovacityService();
        $data = $service->fetchQuery('wip_chaine');

        $this->assertCount(1, $data);
        $this->assertEquals('Line 1', $data[0]['chaine']);
    }

    /** @test */
    public function sync_service_correctly_populates_database()
    {
        // Setup a mock job record for status updates
        NovacityJob::create([
            'novacity_job_id' => 1,
            'name' => 'Sync Quality',
            'query_slug' => 'check_pass_qte',
            'is_active' => true
        ]);

        Http::fake([
            '*/api/data/checkpassqte*' => Http::response([
                'success' => true,
                'data' => [['log_date' => '2025-01-01', 'shortname' => 'Chain B', 'defect_pct' => 3.0]]
            ], 200),
            '*/api/data/*' => Http::response(['success' => true, 'data' => []], 200),
            '*/api/data/q/*' => Http::response(['success' => true, 'data' => []], 200),
        ]);

        $syncService = app(SyncService::class);
        $syncService->syncQuality();

        $this->assertDatabaseHas('check_pass_qte', [
            'shortname' => 'Chain B',
            'defect_pct' => 3.0
        ]);

        $job = NovacityJob::where('query_slug', 'check_pass_qte')->first();
        $this->assertEquals('ok', $job->last_status);
        $this->assertEquals(1, $job->records_count);
    }

    /** @test */
    public function admin_can_trigger_external_job_manually()
    {
        NovacityJob::create([
            'novacity_job_id' => 25,
            'name' => 'colis',
            'query_slug' => 'colis_total_3var',
            'source' => 'OTHER',
            'is_active' => true,
        ]);

        Http::fake([
            '*/api/admin/jobs/25/run' => Http::response([
                'success' => true,
                'data' => ['status' => 'started']
            ], 200),
        ]);

        $this->actingAs($this->user)
            ->getJson("/admin/jobs/25/run")
            ->assertStatus(200)
            ->assertJsonFragment(['status' => 'started']);

        Http::assertSent(function ($request) {
            return str_contains($request->url(), '/api/admin/jobs/25/run') &&
                   $request->hasHeader('Authorization', 'Bearer ' . config('novacity.admin_token'));
        });
    }

    /** @test */
    public function admin_can_load_jobs_from_novacity_through_backend()
    {
        Http::fake([
            '*/api/admin/jobs' => Http::response([
                'success' => true,
                'data' => [
                    [
                        'id' => 123,
                        'nom' => 'Sync Quality',
                        'action_ref' => 'check_pass_qte',
                        'source' => 'QCM',
                        'last_status' => 'ok',
                        'last_run' => '2026-06-12T08:00:00.000Z',
                        'last_message' => 'ok',
                        'actif' => true,
                    ],
                ],
            ], 200),
        ]);

        $this->actingAs($this->user)
            ->get('/admin/jobs')
            ->assertOk()
            ->assertJsonFragment([
                'id' => 123,
                'name' => 'Sync Quality',
                'query_slug' => 'check_pass_qte',
                'last_status' => 'ok',
                'is_active' => true,
            ]);

        Http::assertSent(function ($request) {
            return str_contains($request->url(), '/api/admin/jobs') &&
                   $request->hasHeader('Authorization', 'Bearer ' . config('novacity.admin_token'));
        });
    }

    /** @test */
    public function admin_cannot_run_unknown_job()
    {
        $this->actingAs($this->user)
            ->getJson('/admin/jobs/999/run')
            ->assertStatus(422)
            ->assertJsonValidationErrors('job');
    }

    /** @test */
    public function novacity_service_throws_exception_on_api_error()
    {
        Http::fake([
            '*/api/data/*' => Http::response(['success' => false, 'error' => 'Invalid key'], 401),
        ]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage("Novacity API error");

        $service = new NovacityService();
        $service->fetchEndpoint('check_pass_qte');
    }
}
