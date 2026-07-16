<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DataMappingController;
use App\Http\Controllers\Api\DataSnapshotController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\DevelopmentController;
use App\Http\Controllers\Api\FilterController;
use App\Http\Controllers\Api\KpiEndpointController;
use App\Http\Controllers\Api\LogisticsController;
use App\Http\Controllers\Api\MethodesController;
use App\Http\Controllers\Api\NovacityEndpointsController;
use App\Http\Controllers\Api\ProductionController;
use App\Http\Controllers\Api\QualityController;
use App\Http\Controllers\BrowserLogController;
use App\Models\User;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return redirect()->route('login');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', function () {
        return redirect(User::DEFAULT_REDIRECT[auth()->user()->role->slug] ?? '/quality');
    })->name('dashboard');

    Route::get('/quality', fn () => Inertia::render('quality'))->name('quality');
    Route::get('/production', fn () => Inertia::render('production'))->name('production');
    Route::get('/logistics', fn () => Inertia::render('logistics'))->name('logistics');
    Route::get('/developpement', fn () => Inertia::render('development'))->name('development');
    Route::get('/methods', fn () => Inertia::render('methods'))->name('methods');
    Route::get('/admin', fn () => Inertia::render('admin'))->name('admin');
    Route::get('/kpi-endpoints', fn () => Inertia::render('kpi-endpoints'))->name('kpi-endpoints');
});

Route::get('/unauthorized', fn () => Inertia::render('unauthorized'))->name('unauthorized');

Route::get('/v1/{any?}', fn () => view('v1'))->where('any', '.*')->name('v1');

Route::get('/v2/{any?}', fn () => view('v2'))->where('any', '.*')->name('v2');

Route::post('/browser-log', [BrowserLogController::class, 'store']);

// Settings routes — public (used by standalone data page auth)
Route::post('/api/settings', [App\Http\Controllers\Api\SettingController::class, 'store']);
Route::get('/api/settings/{key}', [App\Http\Controllers\Api\SettingController::class, 'show']);

// Novacity proxy — authenticated via data_users guard
Route::prefix('api/novacity')->middleware('auth:data_users')->group(function () {
    Route::get('/{path}', [App\Http\Controllers\Api\NovacityProxyController::class, 'proxy'])
        ->where('path', '.*');
});

require __DIR__.'/settings.php';

// ─── API ROUTES (Migrated to Web) ───────────────────────────────────────────

// ─── PUBLIC ──────────────────────────────────────────────────────────────
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/api/data-auth/login', [App\Http\Controllers\Api\DataAuthController::class, 'login']);
Route::post('/api/data-auth/check', [App\Http\Controllers\Api\DataAuthController::class, 'check']);
Route::post('/api/data-auth/set-password', [App\Http\Controllers\Api\DataAuthController::class, 'setPassword']);
Route::get('/api/data-auth/me', [App\Http\Controllers\Api\DataAuthController::class, 'me']);

// ─── AUTHENTICATED ───────────────────────────────────────────────────────
Route::middleware(['auth', 'active.user', 'audit'])->group(function () {

    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    // ── ADMIN (IT only) ──────────────────────────────────────────────────
    Route::prefix('admin')->middleware('role:it')->group(function () {
        Route::get('/jobs', [AdminController::class, 'listJobs']);
        Route::get('/jobs/{id}/run', [AdminController::class, 'runJob']);

        Route::get('/users', [AdminController::class, 'listUsers']);
        Route::post('/users', [AdminController::class, 'createUser']);
        Route::put('/users/{id}', [AdminController::class, 'updateUser']);
        Route::delete('/users/{id}', [AdminController::class, 'deleteUser']);
        Route::patch('/users/{id}/toggle', [AdminController::class, 'toggleUser']);

        Route::get('/screens', [AdminController::class, 'listScreens']);
        Route::post('/screens', [AdminController::class, 'createScreen']);
        Route::put('/screens/{id}', [AdminController::class, 'updateScreen']);
        Route::delete('/screens/{id}', [AdminController::class, 'deleteScreen']);

        Route::get('/audit-logs', [AdminController::class, 'auditLogs']);
        Route::post('/audit-logs', [AdminController::class, 'createAuditLog']);
        Route::delete('/audit-logs', [AdminController::class, 'clearAuditLogs']);

        Route::get('/sync-config', [AdminController::class, 'getSyncConfig']);
        Route::put('/sync-config/{key}', [AdminController::class, 'updateSyncConfig']);

        Route::get('/kpi-values', [AdminController::class, 'listKpiValues']);
        Route::put('/kpi-values/{key}', [AdminController::class, 'updateKpiValue']);

        Route::get('/pipeline/status', [AdminController::class, 'pipelineStatus']);
        Route::post('/pipeline/sync/{source}', [AdminController::class, 'triggerSync']);
        Route::post('/pipeline/sync-all', [AdminController::class, 'triggerSyncAll']);

        // ── KPI ENDPOINTS ────────────────────────────────────────────────
        Route::get('/kpi-endpoints', [KpiEndpointController::class, 'index']);
        Route::get('/kpi-endpoints/{kpiCode}', [KpiEndpointController::class, 'show']);
        Route::post('/kpi-endpoints/fire', [KpiEndpointController::class, 'fire']);
        Route::post('/kpi-endpoints/fire-all', [KpiEndpointController::class, 'fireAll']);
    });

    // ── DATA SNAPSHOTS ─────────────────────────────────────────────────
    Route::prefix('data-snapshots')->middleware('role:it')->group(function () {
        Route::get('/', [DataSnapshotController::class, 'index']);
        Route::get('/{tableName}', [DataSnapshotController::class, 'show']);
        Route::get('/snapshot/{id}', [DataSnapshotController::class, 'snapshot']);
    });

    // ── QUALITY ──────────────────────────────────────────────────────────
    Route::prefix('quality')
        ->middleware('role:it,direction,resp_production,resp_qualite,methodes')
        ->group(function () {
            Route::get('/kpis', [QualityController::class, 'kpis']);
            Route::get('/defect-chart', [QualityController::class, 'defectChart']);
            Route::get('/qp-teams', [QualityController::class, 'qpTeams']);
            Route::get('/annual-trend', [QualityController::class, 'annualTrend']);
            Route::get('/pareto/rft', [QualityController::class, 'paretoRft']);
            Route::get('/pareto/inspection', [QualityController::class, 'paretoInspection']);
        });

    // ── PRODUCTION ───────────────────────────────────────────────────────
    Route::prefix('production')
        ->middleware('role:it,direction,resp_production,chef_atelier,methodes,planning_coupe')
        ->group(function () {
            Route::get('/chain-info', [ProductionController::class, 'chainInfo']);
            Route::get('/kpis', [ProductionController::class, 'kpis']);
            Route::get('/confection-kpis', [ProductionController::class, 'confectionKpis']);
            Route::get('/v2-kpis', [ProductionController::class, 'v2Kpis']);
            Route::get('/efficience-gauges', [ProductionController::class, 'efficienceGauges']);
            Route::get('/wip-gauges', [ProductionController::class, 'wipGauges']);
            Route::get('/stoppage-timeline', [ProductionController::class, 'stoppageTimeline']);
            Route::get('/of-donuts', [ProductionController::class, 'ofDonuts']);
            Route::get('/efficience-trend', [ProductionController::class, 'efficienceTrend']);
            Route::get('/top-operators', [ProductionController::class, 'topOperators']);
            Route::get('/wip', [ProductionController::class, 'wip']);
            Route::get('/so-progress', [ProductionController::class, 'soProgress']);
            Route::get('/order-tracking', [ProductionController::class, 'orderTracking']);
            Route::get('/breakdown/{kpiKey}', [ProductionController::class, 'breakdown']);
            Route::get('/inline-endline', [ProductionController::class, 'inlineEndline']);
            // Methods KPIs (F-REQ-216, 218, 219)
            Route::get('/taux-archivage', [ProductionController::class, 'tauxArchivage']);
            Route::get('/respect-temps-estime', [ProductionController::class, 'respectTempsEstime']);
            Route::get('/taux-temps-acceptes', [ProductionController::class, 'tauxTempsAcceptes']);
            // Coupe
            Route::get('/coupe/coverage', [ProductionController::class, 'coupeCoverage']);
            Route::get('/coupe/chain-coverage', [ProductionController::class, 'coupeChainCoverage']);
            Route::get('/coupe/tagging', [ProductionController::class, 'coupeTagging']);
            Route::get('/coupe/ofs', [ProductionController::class, 'coupeOfs']);
            Route::get('/coupe/departage', [ProductionController::class, 'coupeDepartage']);
            Route::get('/coupe/qte-departage', [ProductionController::class, 'coupeQteDepartage']);
            // Sérigraphie

            Route::get('/serigraphie/coverage', [ProductionController::class, 'serigraphieCoverage']);
            Route::get('/serigraphie/flux', [ProductionController::class, 'serigraphieFlux']);
            Route::get('/serigraphie/rejets', [ProductionController::class, 'serigraphieRejets']);
        });

    // ── LOGISTICS ────────────────────────────────────────────────────────
    Route::prefix('logistics')
        ->middleware('role:it,direction,methodes,planning_coupe')
        ->group(function () {
            Route::get('/kpis', [LogisticsController::class, 'kpis']);
            Route::get('/stock-kpis', [LogisticsController::class, 'stockKpis']);
            Route::get('/stock-composition', [LogisticsController::class, 'stockComposition']);
            Route::get('/ofs', [LogisticsController::class, 'ofs']);
            Route::get('/stock-reliability', [LogisticsController::class, 'stockReliability']);
        });

    // ── MÉTHODES ─────────────────────────────────────────────────────────
    Route::prefix('methods')
        ->middleware('role:it,direction,methodes')
        ->group(function () {
            Route::get('/kpis', [MethodesController::class, 'kpis']);
            Route::get('/archivage-detail', [MethodesController::class, 'archivageDetail']);
            Route::get('/respect-temps-detail', [MethodesController::class, 'respectTempsDetail']);
            Route::get('/temps-acceptes-detail', [MethodesController::class, 'tempsAcceptesDetail']);
            Route::get('/fiabilite-detail', [MethodesController::class, 'fiabiliteDetail']);
        });

    // ── DEVELOPMENT ──────────────────────────────────────────────────────
    Route::prefix('developpement')
        ->middleware('role:it,direction,methodes')
        ->group(function () {
            Route::get('/kpis', [DevelopmentController::class, 'kpis']);
            Route::get('/trend', [DevelopmentController::class, 'trend']);
            Route::get('/reclamations-scatter', [DevelopmentController::class, 'reclamationsScatter']);
        });

    // ── FILTERS ──────────────────────────────────────────────────────────
    Route::get('/filters/options', [FilterController::class, 'options']);

    // ── HEALTH CHECK ─────────────────────────────────────────────────────
    Route::get('/health', [HealthController::class, 'check']);
});

// ── DATA MAPPINGS (standalone data page auth) ──────────────────────────
Route::prefix('data-mappings')->middleware('auth:data_users')->group(function () {
    Route::get('/', [DataMappingController::class, 'index']);
    Route::post('/', [DataMappingController::class, 'store']);
    Route::put('/{id}', [DataMappingController::class, 'update']);
    Route::delete('/{id}', [DataMappingController::class, 'destroy']);
    Route::post('/batch', [DataMappingController::class, 'batchUpdate']);
    Route::post('/seed', [DataMappingController::class, 'seedFromKpiSeed']);
    Route::get('/audit-logs', [DataMappingController::class, 'auditLogs']);
});

// ── NOVACITY ENDPOINTS (from data.json) ─────────────────────────────────
Route::get('/novacity-endpoints', NovacityEndpointsController::class);
Route::get('/novacity-endpoints/all', [NovacityEndpointsController::class, 'allSamples']);
Route::get('/novacity-endpoints/sample/{slug}', [NovacityEndpointsController::class, 'sample'])->where('slug', '.*');
Route::get('/novacity-config', [NovacityEndpointsController::class, 'config']);
