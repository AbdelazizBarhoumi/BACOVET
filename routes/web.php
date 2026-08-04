<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BuilderActivityController;
use App\Http\Controllers\Api\BuilderActivityV5Controller;
use App\Http\Controllers\Api\BuilderKpiController;
use App\Http\Controllers\Api\BuilderPageController;
use App\Http\Controllers\Api\BuilderPageGroupController;
use App\Http\Controllers\Api\BuilderPageGroupV4Controller;
use App\Http\Controllers\Api\BuilderPageGroupV5Controller;
use App\Http\Controllers\Api\BuilderPageV4Controller;
use App\Http\Controllers\Api\BuilderPageV5Controller;
use App\Http\Controllers\Api\BuilderPageV6Controller;
use App\Http\Controllers\Api\DataMappingController;
use App\Http\Controllers\Api\DataSnapshotController;
use App\Http\Controllers\Api\DevelopmentController;
use App\Http\Controllers\Api\FilterController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\KpiEndpointController;
use App\Http\Controllers\Api\LogisticsController;
use App\Http\Controllers\Api\MaintenanceController;
use App\Http\Controllers\Api\MethodesController;
use App\Http\Controllers\Api\NovacityEndpointsController;
use App\Http\Controllers\Api\ProductionController;
use App\Http\Controllers\Api\QualityController;
use App\Http\Controllers\Api\ScheduleController;
use App\Http\Controllers\Api\V4AuthController;
use App\Http\Controllers\Api\V5AuthController;
use App\Http\Controllers\Api\V6AuthController;
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
    Route::get('/endpoints', fn () => Inertia::render('endpoints'))->middleware('role:it')->name('endpoints');

    // V3 activity trace — IT only
    Route::get('/v3/trace', fn () => Inertia::render('v3/trace'))->middleware('role:it')->name('v3.trace');

    // Maintenance panel — IT only (artisan command runner)
    Route::get('/maintenance', fn () => Inertia::render('maintenance'))->middleware('role:it')->name('maintenance');
});

Route::get('/unauthorized', fn () => Inertia::render('unauthorized'))->name('unauthorized');

Route::get('/v1/{any?}', fn () => view('v1'))->where('any', '.*')->name('v1');

Route::get('/v2/{any?}', fn () => view('v2'))->where('any', '.*')->name('v2');

// ── V3 PAGE BUILDER ──────────────────────────────────────────────────
Route::get('/v3', fn () => Inertia::render('v3/page-builder'))->name('v3');
Route::get('/p/{slug}', function ($slug) {
    $page = \App\Models\BuilderPage::where('slug', $slug)->first();
    if (! $page) {
        abort(404);
    }

    return Inertia::render('v3/p/[slug]', [
        'pageId' => $page->id,
        'slug' => $page->slug,
        'pageName' => $page->name,
        'layout' => $page->layout['widgets'] ?? [],
    ]);
})->name('v3.page');

// ── V3 BUILDER API ─────────────────────────────────────────────────
Route::prefix('api/builder-pages')->group(function () {
    Route::get('/', [BuilderPageController::class, 'index']);
    Route::get('/{slug}', [BuilderPageController::class, 'show']);
    Route::post('/', [BuilderPageController::class, 'store']);
    Route::put('/{id}', [BuilderPageController::class, 'update']);
    Route::delete('/{id}', [BuilderPageController::class, 'destroy']);
    Route::post('/{id}/duplicate', [BuilderPageController::class, 'duplicate']);
});

Route::prefix('api/builder-page-groups')->group(function () {
    Route::get('/', [BuilderPageGroupController::class, 'index']);
    Route::post('/', [BuilderPageGroupController::class, 'store']);
    Route::put('/assign-page', [BuilderPageGroupController::class, 'assignPage']);
    Route::put('/reorder-pages', [BuilderPageGroupController::class, 'reorderPages']);
    Route::put('/reorder-groups', [BuilderPageGroupController::class, 'reorderGroups']);
    Route::put('/{id}', [BuilderPageGroupController::class, 'update']);
    Route::delete('/{id}', [BuilderPageGroupController::class, 'destroy']);
});

// ── V3 BUILDER KPI API ────────────────────────────────────────────
Route::get('/api/builder-kpis', [BuilderKpiController::class, 'index']);
Route::get('/api/builder-kpis/data', [BuilderKpiController::class, 'data']);

// ── V3 BUILDER ACTIVITY TRACE ─────────────────────────────────────
// Capture: any authenticated user (fire-and-forget). Query: IT only.
Route::post('/api/builder-activity', [BuilderActivityController::class, 'store'])->middleware('auth');
Route::get('/api/builder-activity', [BuilderActivityController::class, 'index'])->middleware(['auth', 'role:it']);

// ── V4 PAGE BUILDER (standalone login) ─────────────────────────────
Route::get('/v4/login', fn () => Inertia::render('v4/login'))->name('v4.login');

Route::post('/api/v4-auth/check', [V4AuthController::class, 'check']);
Route::post('/api/v4-auth/set-password', [V4AuthController::class, 'setPassword']);
Route::post('/api/v4-auth/login', [V4AuthController::class, 'login']);
Route::post('/api/v4-auth/logout', [V4AuthController::class, 'logout']);
Route::get('/api/v4-auth/me', [V4AuthController::class, 'me']);

Route::middleware('v4.auth')->group(function () {
    Route::get('/v4', fn () => Inertia::render('v4/page-builder'))->name('v4');
    Route::get('/v4/p/{slug}', function ($slug) {
        $page = \App\Models\BuilderPageV4::where('slug', $slug)->first();
        if (! $page) {
            abort(404);
        }

        return Inertia::render('v4/p/[slug]', [
            'pageId' => $page->id,
            'slug' => $page->slug,
            'pageName' => $page->name,
            'layout' => $page->layout['widgets'] ?? [],
        ]);
    })->name('v4.page');

    Route::prefix('api/v4/builder-pages')->group(function () {
        Route::get('/', [BuilderPageV4Controller::class, 'index']);
        Route::get('/{slug}', [BuilderPageV4Controller::class, 'show']);
        Route::post('/', [BuilderPageV4Controller::class, 'store']);
        Route::put('/{id}', [BuilderPageV4Controller::class, 'update']);
        Route::delete('/{id}', [BuilderPageV4Controller::class, 'destroy']);
        Route::post('/{id}/duplicate', [BuilderPageV4Controller::class, 'duplicate']);
    });

    Route::prefix('api/v4/builder-page-groups')->group(function () {
        Route::get('/', [BuilderPageGroupV4Controller::class, 'index']);
        Route::post('/', [BuilderPageGroupV4Controller::class, 'store']);
        Route::put('/assign-page', [BuilderPageGroupV4Controller::class, 'assignPage']);
        Route::put('/reorder-pages', [BuilderPageGroupV4Controller::class, 'reorderPages']);
        Route::put('/reorder-groups', [BuilderPageGroupV4Controller::class, 'reorderGroups']);
        Route::put('/{id}', [BuilderPageGroupV4Controller::class, 'update']);
        Route::delete('/{id}', [BuilderPageGroupV4Controller::class, 'destroy']);
    });
});

// ── V5 PAGE BUILDER (standalone login) ─────────────────────────────
Route::get('/v5/login', fn () => Inertia::render('v5/login'))->name('v5.login');

Route::post('/api/v5-auth/check', [V5AuthController::class, 'check']);
Route::post('/api/v5-auth/set-password', [V5AuthController::class, 'setPassword']);
Route::post('/api/v5-auth/login', [V5AuthController::class, 'login']);
Route::post('/api/v5-auth/logout', [V5AuthController::class, 'logout']);
Route::get('/api/v5-auth/me', [V5AuthController::class, 'me']);

Route::middleware('v5.auth')->group(function () {
    Route::get('/v5', fn () => Inertia::render('v5/page-builder'))->name('v5');
    Route::get('/v5/p/{slug}', function ($slug) {
        $page = \App\Models\BuilderPageV5::where('slug', $slug)->first();
        if (! $page) {
            abort(404);
        }

        return Inertia::render('v5/p/[slug]', [
            'pageId' => $page->id,
            'slug' => $page->slug,
            'pageName' => $page->name,
            'layout' => $page->layout,
            'layoutDraft' => $page->layout_draft,
            'layoutDraftUpdatedAt' => $page->layout_draft_updated_at?->toISOString(),
        ]);
    })->name('v5.page');

    // V5 builder endpoint datasets (from endpoint_datasets table, refreshed by sync commands)
    Route::get('/api/v5/endpoint-datasets', [App\Http\Controllers\Api\EndpointDatasetV5Controller::class, 'index']);

    // V5 builder schema analysis (cross-table join registry), v5.auth only
    Route::get('/api/v5/schema', [App\Http\Controllers\Api\EndpointDatasetV5Controller::class, 'schema']);

    Route::prefix('api/v5/builder-pages')->group(function () {
        Route::get('/', [BuilderPageV5Controller::class, 'index']);
        Route::get('/{slug}', [BuilderPageV5Controller::class, 'show']);
        Route::post('/', [BuilderPageV5Controller::class, 'store']);
        Route::put('/{id}', [BuilderPageV5Controller::class, 'update']);
        Route::delete('/{id}', [BuilderPageV5Controller::class, 'destroy']);
        Route::post('/{id}/duplicate', [BuilderPageV5Controller::class, 'duplicate']);
        Route::post('/{id}/images', [BuilderPageV5Controller::class, 'uploadImage'])->name('v5.page.image.upload');
        Route::get('/{id}/images/{filename}', [BuilderPageV5Controller::class, 'showImage'])->name('v5.page.image');
    });

    Route::prefix('api/v5/builder-page-groups')->group(function () {
        Route::get('/', [BuilderPageGroupV5Controller::class, 'index']);
        Route::post('/', [BuilderPageGroupV5Controller::class, 'store']);
        Route::put('/assign-page', [BuilderPageGroupV5Controller::class, 'assignPage']);
        Route::put('/reorder-pages', [BuilderPageGroupV5Controller::class, 'reorderPages']);
        Route::put('/reorder-groups', [BuilderPageGroupV5Controller::class, 'reorderGroups']);
        Route::put('/{id}', [BuilderPageGroupV5Controller::class, 'update']);
        Route::delete('/{id}', [BuilderPageGroupV5Controller::class, 'destroy']);
    });

    // ── V5 BUILDER ACTIVITY TRACE ───────────────────────────────────
    // Capture + query both require a v5 session.
    Route::post('/api/v5-activity', [BuilderActivityV5Controller::class, 'store']);
    Route::get('/api/v5-activity', [BuilderActivityV5Controller::class, 'index']);

    // ── V5 MEASURE LIBRARY (shared, reusable calculations) ────────────
    Route::prefix('api/v5/measures')->group(function () {
        Route::get('/', [App\Http\Controllers\Api\MeasureV5Controller::class, 'index']);
        Route::post('/', [App\Http\Controllers\Api\MeasureV5Controller::class, 'store']);
        Route::put('/{id}', [App\Http\Controllers\Api\MeasureV5Controller::class, 'update']);
        Route::delete('/{id}', [App\Http\Controllers\Api\MeasureV5Controller::class, 'destroy']);
    });
});

// ── V6 DASHBOARD (V4 foundation; data/measure/graph upgrades) ───────
Route::get('/v6/login', fn () => Inertia::render('v6/login'))->name('v6.login');

Route::post('/api/v6-auth/check', [V6AuthController::class, 'check']);
Route::post('/api/v6-auth/set-password', [V6AuthController::class, 'setPassword']);
Route::post('/api/v6-auth/login', [V6AuthController::class, 'login']);
Route::post('/api/v6-auth/logout', [V6AuthController::class, 'logout']);
Route::get('/api/v6-auth/me', [V6AuthController::class, 'me']);

Route::middleware('v6.auth')->group(function () {
    Route::get('/v6', function () {
        $page = \App\Models\BuilderPageV6::orderBy('id')->first();
        if (! $page) {
            abort(404);
        }

        return redirect()->route('v6.page', ['slug' => $page->slug]);
    })->name('v6');

    Route::get('/v6/p/{slug}', function ($slug) {
        $page = \App\Models\BuilderPageV6::where('slug', $slug)->first();
        if (! $page) {
            abort(404);
        }

        return Inertia::render('v6/p/[slug]', [
            'pageId' => $page->id,
            'slug' => $page->slug,
            'pageName' => $page->name,
            'layout' => $page->layout['widgets'] ?? [],
            'measures' => $page->layout['measures'] ?? [],
            'theme' => $page->layout['theme'] ?? null,
        ]);
    })->name('v6.page');

    Route::get('/api/v6/endpoint-datasets', [App\Http\Controllers\Api\EndpointDatasetV5Controller::class, 'index']);
    Route::put('/api/v6/builder-pages/{id}', [BuilderPageV6Controller::class, 'update']);

    // ── V6 SHARED MEASURE LIBRARY ───────────────────────────────────
    Route::get('/api/v6/measures', [App\Http\Controllers\Api\MeasureLibraryV6Controller::class, 'index']);
    Route::post('/api/v6/measures', [App\Http\Controllers\Api\MeasureLibraryV6Controller::class, 'store']);
    Route::put('/api/v6/measures/{id}', [App\Http\Controllers\Api\MeasureLibraryV6Controller::class, 'update']);
    Route::delete('/api/v6/measures/{id}', [App\Http\Controllers\Api\MeasureLibraryV6Controller::class, 'destroy']);
});

// ── KANBAN (public, no auth) ─────────────────────────────────────────────
Route::prefix('api/kanban')->group(function () {
    Route::get('/boards', [App\Http\Controllers\Api\KanbanController::class, 'index']);
    Route::post('/boards', [App\Http\Controllers\Api\KanbanController::class, 'store']);
    Route::get('/boards/{id}', [App\Http\Controllers\Api\KanbanController::class, 'show']);
    Route::put('/boards/{id}', [App\Http\Controllers\Api\KanbanController::class, 'update']);
    Route::delete('/boards/{id}', [App\Http\Controllers\Api\KanbanController::class, 'destroy']);

    Route::put('/columns/reorder', [App\Http\Controllers\Api\KanbanController::class, 'reorderColumns']);
    Route::post('/boards/{id}/columns', [App\Http\Controllers\Api\KanbanController::class, 'storeColumn']);
    Route::put('/columns/{id}', [App\Http\Controllers\Api\KanbanController::class, 'updateColumn']);
    Route::delete('/columns/{id}', [App\Http\Controllers\Api\KanbanController::class, 'destroyColumn']);

    Route::post('/columns/{id}/cards', [App\Http\Controllers\Api\KanbanController::class, 'storeCard']);
    Route::put('/cards/{id}', [App\Http\Controllers\Api\KanbanController::class, 'updateCard']);
    Route::delete('/cards/{id}', [App\Http\Controllers\Api\KanbanController::class, 'destroyCard']);
    Route::post('/cards/{id}/move', [App\Http\Controllers\Api\KanbanController::class, 'moveCard']);
    Route::post('/cards/{id}/images', [App\Http\Controllers\Api\KanbanController::class, 'uploadImage']);
    Route::get('/cards/{id}/images/{filename}', [App\Http\Controllers\Api\KanbanController::class, 'showImage'])->name('kanban.image');
});

Route::get('/kanban', fn () => Inertia::render('kanban'))->name('kanban');

Route::post('/browser-log', [BrowserLogController::class, 'store']);

// ── SCHEDULE WEBHOOK ─────────────────────────────────────────────────
// GET webhook that runs `php artisan schedule:run` (token-protected).
// Public route on purpose: hit from a cron URL (no session needed).
Route::get('/schedule/run', [ScheduleController::class, 'run']);

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

        // ── MAINTENANCE PANEL (artisan command runner) ─────────────────────
        Route::prefix('maintenance')->group(function () {
            Route::get('/commands', [MaintenanceController::class, 'commands']);
            Route::post('/run', [MaintenanceController::class, 'start'])->middleware('throttle:10,1');
        });
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
    Route::post('/sync-sql', [DataMappingController::class, 'syncFromSql']);
});

Route::get('/data-mappings/export-sql', [DataMappingController::class, 'exportSql']);

// ── NOVACITY ENDPOINTS (from data.json) ─────────────────────────────────
Route::get('/novacity-endpoints', NovacityEndpointsController::class);
Route::get('/novacity-endpoints/all', [NovacityEndpointsController::class, 'allSamples']);
Route::get('/novacity-endpoints/sample/{slug}', [NovacityEndpointsController::class, 'sample'])->where('slug', '.*');
Route::post('/novacity-endpoints/test-and-save', [NovacityEndpointsController::class, 'testAndSave']);
Route::get('/novacity-config', [NovacityEndpointsController::class, 'config']);

// ── NOVACITY ENDPOINTS MANAGER (CRUD) — IT only ─────────────────────────
Route::middleware(['auth', 'role:it'])->prefix('novacity-endpoints')->group(function () {
    Route::get('/structure', [NovacityEndpointsController::class, 'structure']);
    Route::get('/schema', [NovacityEndpointsController::class, 'schema']);
    Route::get('/list', [NovacityEndpointsController::class, 'index']);
    Route::get('/health', [NovacityEndpointsController::class, 'health']);
    Route::post('/refresh', [NovacityEndpointsController::class, 'refresh']);
    Route::post('/{id}/refresh', [NovacityEndpointsController::class, 'refreshOne']);
    Route::post('/test', [NovacityEndpointsController::class, 'test']);
    Route::post('/', [NovacityEndpointsController::class, 'store']);
    Route::post('/reorder', [NovacityEndpointsController::class, 'reorder']);
    Route::get('/{id}', [NovacityEndpointsController::class, 'show']);
    Route::put('/{id}', [NovacityEndpointsController::class, 'update']);
    Route::delete('/{id}', [NovacityEndpointsController::class, 'destroy']);
    Route::post('/{id}/duplicate', [NovacityEndpointsController::class, 'duplicate']);
});
