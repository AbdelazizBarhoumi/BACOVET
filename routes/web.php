<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DevelopmentController;
use App\Http\Controllers\Api\FilterController;
use App\Http\Controllers\Api\LogisticsController;
use App\Http\Controllers\Api\MethodesController;
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
    Route::get('/development', fn () => Inertia::render('development'))->name('development');
    Route::get('/methods', fn () => Inertia::render('methods'))->name('methods');
    Route::get('/admin', fn () => Inertia::render('admin'))->name('admin');
});

Route::get('/unauthorized', fn () => Inertia::render('unauthorized'))->name('unauthorized');

Route::post('/browser-log', [BrowserLogController::class, 'store']);

Route::middleware(['auth', 'active.user'])->prefix('api/novacity')->group(function () {
    Route::get('/{path}', [App\Http\Controllers\Api\NovacityProxyController::class, 'proxy'])
        ->where('path', '.*');
});

require __DIR__.'/settings.php';

// ─── API ROUTES (Migrated to Web) ───────────────────────────────────────────

// ─── PUBLIC ──────────────────────────────────────────────────────────────
Route::post('/auth/login', [AuthController::class, 'login']);

// Screen heartbeat (public, no auth)
Route::post('/screens/{code}/ping', [AdminController::class, 'screenPing']);
Route::get('/screens/{code}/config', [AdminController::class, 'screenConfig']);

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
        Route::get('/audit-logs/export', [AdminController::class, 'exportAuditLogs']);

        Route::get('/sync-config', [AdminController::class, 'getSyncConfig']);
        Route::put('/sync-config/{key}', [AdminController::class, 'updateSyncConfig']);

        Route::get('/kpi-values', [AdminController::class, 'listKpiValues']);
        Route::put('/kpi-values/{key}', [AdminController::class, 'updateKpiValue']);

        // Pipeline supervision
        Route::get('/pipeline/status', [AdminController::class, 'pipelineStatus']);
        Route::get('/pipeline/logs', [AdminController::class, 'pipelineLogs']);
        Route::post('/pipeline/sync/{source}', [AdminController::class, 'triggerSync']);
        Route::post('/pipeline/sync-all', [AdminController::class, 'triggerSyncAll']);

        // User management additions
        Route::post('/users/{id}/reset-password', [AdminController::class, 'resetPassword']);
        Route::get('/users/{id}/sessions', [AdminController::class, 'userSessions']);

        // Lead Time Config
        Route::get('/lt-config', [AdminController::class, 'ltConfig']);
        Route::post('/lt-config', [AdminController::class, 'createLtConfig']);
        Route::put('/lt-config/{id}', [AdminController::class, 'updateLtConfig']);
        Route::delete('/lt-config/{id}', [AdminController::class, 'deleteLtConfig']);
    });

    // ── QUALITY ──────────────────────────────────────────────────────────
    Route::prefix('quality')
        ->middleware('role:it,direction,resp_production,resp_qualite,methodes')
        ->group(function () {
            Route::get('/kpis', [QualityController::class, 'kpis']);
            Route::get('/br-chart', [QualityController::class, 'brChart']);
            Route::get('/defect-chart', [QualityController::class, 'defectChart']);
            Route::get('/qp-teams', [QualityController::class, 'qpTeams']);
            Route::get('/alerts', [QualityController::class, 'alerts']);
            Route::get('/annual-trend', [QualityController::class, 'annualTrend']);
            Route::get('/pareto/rft', [QualityController::class, 'paretoRft']);
            Route::get('/pareto/inspection', [QualityController::class, 'paretoInspection']);
            Route::get('/pareto/fg', [QualityController::class, 'paretoFg']);
        });

    // ── PRODUCTION ───────────────────────────────────────────────────────
    Route::prefix('production')
        ->middleware('role:it,direction,resp_production,chef_atelier,methodes,coupe')
        ->group(function () {
            Route::get('/chain-info', [ProductionController::class, 'chainInfo']);
            Route::get('/kpis', [ProductionController::class, 'kpis']);
            Route::get('/efficience-gauges', [ProductionController::class, 'efficienceGauges']);
            Route::get('/wip-gauges', [ProductionController::class, 'wipGauges']);
            Route::get('/stoppage-timeline', [ProductionController::class, 'stoppageTimeline']);
            Route::get('/of-donuts', [ProductionController::class, 'ofDonuts']);
            Route::get('/efficience-trend', [ProductionController::class, 'efficienceTrend']);
            Route::get('/top-operators', [ProductionController::class, 'topOperators']);
            Route::get('/wip', [ProductionController::class, 'wip']);
            Route::get('/so-progress', [ProductionController::class, 'soProgress']);
            Route::get('/breakdown/{kpiKey}', [ProductionController::class, 'breakdown']);
            Route::get('/inline-endline', [ProductionController::class, 'inlineEndline']);
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
            // Methods KPIs
            Route::get('/taux-archivage', [ProductionController::class, 'tauxArchivage']);
            Route::get('/respect-temps-estime', [ProductionController::class, 'respectTempsEstime']);
            Route::get('/taux-temps-acceptes', [ProductionController::class, 'tauxTempsAcceptes']);
        });

    // ── LOGISTICS ────────────────────────────────────────────────────────
    Route::prefix('logistics')
        ->middleware('role:it,direction,methodes,coupe')
        ->group(function () {
            Route::get('/kpis', [LogisticsController::class, 'kpis']);
            Route::get('/stock-kpis', [LogisticsController::class, 'stockKpis']);
            Route::get('/stock-composition', [LogisticsController::class, 'stockComposition']);
            Route::get('/ofs', [LogisticsController::class, 'ofs']);
            Route::get('/livraison', [LogisticsController::class, 'livraison']);
            Route::get('/coverage', [LogisticsController::class, 'coverage']);
            Route::get('/stock-search', [LogisticsController::class, 'stockSearch']);
            Route::get('/stock-reliability', [LogisticsController::class, 'stockReliability']);
            Route::get('/dot-hot-trend', [LogisticsController::class, 'dotHotTrend']);
        });

    // ── MÉTHODES ─────────────────────────────────────────────────────────
    Route::prefix('methods')
        ->middleware('role:it,direction,methodes')
        ->group(function () {
            Route::get('/kpis', [MethodesController::class, 'kpis']);
            Route::get('/tagging-chart', [MethodesController::class, 'taggingChart']);
            Route::get('/detail-table', [MethodesController::class, 'detailTable']);
            Route::get('/archivage-detail', [MethodesController::class, 'archivageDetail']);
            Route::get('/respect-temps-detail', [MethodesController::class, 'respectTempsDetail']);
            Route::get('/temps-acceptes-detail', [MethodesController::class, 'tempsAcceptesDetail']);
        });

    // ── DEVELOPMENT ──────────────────────────────────────────────────────
    Route::prefix('development')
        ->middleware('role:it,direction,methodes')
        ->group(function () {
            Route::get('/kpis', [DevelopmentController::class, 'kpis']);
            Route::get('/trend', [DevelopmentController::class, 'trend']);
            Route::get('/lead-time', [DevelopmentController::class, 'leadTimeDev']);
            Route::get('/trend-rft', [DevelopmentController::class, 'trendRft']);
            Route::get('/trend-livraison', [DevelopmentController::class, 'trendLivraison']);
        });

    // ── FILTERS ──────────────────────────────────────────────────────────
    Route::get('/filters/options', [FilterController::class, 'options']);
});
