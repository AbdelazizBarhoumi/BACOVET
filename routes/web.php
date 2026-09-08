<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BuilderActivityController;
use App\Http\Controllers\Api\BuilderPageController;
use App\Http\Controllers\Api\BuilderPageGroupController;
use App\Http\Controllers\Api\EndpointDatasetController;
use App\Http\Controllers\Api\MaintenanceController;
use App\Http\Controllers\Api\MeasureController;
use App\Http\Controllers\Api\MeasureJoinController;
use App\Http\Controllers\Api\NovacityEndpointsController;
use App\Http\Controllers\Api\ScheduleController;
use App\Http\Controllers\Api\SettingsController;
use App\Models\BuilderPage;
use App\Support\PageAccess;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/login', fn () => Inertia::render('auth/login'))->name('login');

Route::get('/change-password', fn () => Inertia::render('auth/change-password'))
    ->middleware(['auth', 'active.user'])
    ->name('change-password');

Route::middleware(['auth', 'active.user', 'must.change.password', 'audit'])->group(function () {
    Route::get('/', fn () => Inertia::render('builder/page-builder'))->name('home');

    Route::get('/admin', fn () => Inertia::render('admin'))->name('admin');

    Route::get('/trace', fn () => Inertia::render('trace'))
        ->middleware('role:it')
        ->name('trace');

    Route::get('/maintenance', fn () => Inertia::render('maintenance'))
        ->middleware('role:it')
        ->name('maintenance');

    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    Route::prefix('admin')->middleware('role:it')->group(function () {
        Route::get('/users', [AdminController::class, 'listUsers']);
        Route::post('/users', [AdminController::class, 'createUser']);
        Route::put('/users/{id}', [AdminController::class, 'updateUser']);
        Route::delete('/users/{id}', [AdminController::class, 'deleteUser']);
        Route::patch('/users/{id}/toggle', [AdminController::class, 'toggleUser']);

        Route::get('/audit-logs', [AdminController::class, 'auditLogs']);
        Route::post('/audit-logs', [AdminController::class, 'createAuditLog']);

        // ── MAINTENANCE PANEL (artisan command runner) ─────────────────────
        Route::prefix('maintenance')->group(function () {
            Route::get('/commands', [MaintenanceController::class, 'commands']);
            Route::post('/run', [MaintenanceController::class, 'start'])->middleware('throttle:10,1');
        });
    });
});

// ── SCHEDULE WEBHOOK ─────────────────────────────────────────────────
// GET webhook that runs `php artisan schedule:run` (token-protected).
// Public route on purpose: hit from a cron URL (no session needed).
Route::get('/schedule/run', [ScheduleController::class, 'run']);

Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/change-password', [AuthController::class, 'changePassword'])
    ->middleware(['auth', 'active.user']);

// ── PUBLIC READ-ONLY VIEW (published dashboards / kiosk, no session) ────
// Published pages are viewable without login, so nothing can expire their
// session. The GET endpoints below are read-only and never depend on the
// auth user; they feed the public view its datasets, schema, joins, measures
// and uploaded images. Writes (POST/PUT/DELETE) stay behind auth.
Route::get('/pub/{slug}', function ($slug) {
    $page = BuilderPage::where('slug', $slug)->first();

    if (! $page || ! $page->published) {
        abort(404);
    }

    return Inertia::render('builder/p/[slug]', [
        'pageId' => $page->id,
        'slug' => $page->slug,
        'pageName' => $page->name,
        'layout' => $page->layout,
        'layoutDraft' => null,
        'layoutDraftUpdatedAt' => null,
        'isOwner' => false,
        'canEdit' => false,
        'canManage' => false,
        'isPublic' => true,
        'published' => true,
    ]);
})->name('builder.page.public');

Route::get('/api/endpoint-datasets', [EndpointDatasetController::class, 'index']);
Route::get('/api/endpoint-datasets/status', [EndpointDatasetController::class, 'status']);
Route::get('/api/schema', [EndpointDatasetController::class, 'schema']);
Route::get('/api/measures', [MeasureController::class, 'index']);
Route::get('/api/joins', [MeasureJoinController::class, 'index']);
Route::get('/api/builder-pages/{id}/images/{filename}', [BuilderPageController::class, 'showImage'])->name('builder.page.image');

// ── PAGE BUILDER (auth via the main login; users table) ─
// /p/{slug} is the builder URL. Published pages are public, so a guest
// landing here is redirected to the read-only /pub/{slug} view instead of
// being bounced to the login page; unpublished pages still require login.
Route::get('/p/{slug}', function ($slug) {
    $page = BuilderPage::where('slug', $slug)->first();
    if (! $page) {
        abort(404);
    }

    $user = PageAccess::resolveUser();

    if (! $user) {
        if ($page->published) {
            return redirect()->route('builder.page.public', ['slug' => $page->slug]);
        }

        return redirect()->route('login');
    }

    if (! PageAccess::canView($page, $user)) {
        abort(403);
    }

    return Inertia::render('builder/p/[slug]', [
        'pageId' => $page->id,
        'slug' => $page->slug,
        'pageName' => $page->name,
        'layout' => $page->layout,
        'layoutDraft' => $page->layout_draft,
        'layoutDraftUpdatedAt' => $page->layout_draft_updated_at?->toISOString(),
        'isOwner' => $page->owner_user_id === $user->id,
        'canEdit' => PageAccess::canEdit($page, $user),
        'canManage' => PageAccess::canManage($page, $user),
        'isPublic' => false,
        'published' => $page->published,
    ]);
})->name('builder.page');

Route::middleware('auth')->group(function () {
    Route::post('/api/endpoint-datasets/sync', [EndpointDatasetController::class, 'sync']);
    Route::get('/api/dashboard-parameters', [EndpointDatasetController::class, 'dashboardParameters']);

    Route::get('/api/settings/{key}', [SettingsController::class, 'show']);
    Route::post('/api/settings', [SettingsController::class, 'store']);

    Route::prefix('api/builder-pages')->group(function () {
        Route::get('/', [BuilderPageController::class, 'index']);
        Route::get('/{slug}', [BuilderPageController::class, 'show']);
        Route::post('/', [BuilderPageController::class, 'store']);
        Route::put('/{id}', [BuilderPageController::class, 'update']);
        Route::delete('/{id}', [BuilderPageController::class, 'destroy']);
        Route::post('/{id}/duplicate', [BuilderPageController::class, 'duplicate']);
        Route::post('/{id}/images', [BuilderPageController::class, 'uploadImage'])->name('builder.page.image.upload');
        Route::get('/{id}/permissions', [BuilderPageController::class, 'getPermissions']);
        Route::put('/{id}/permissions', [BuilderPageController::class, 'savePermissions']);
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

    Route::post('/api/activity', [BuilderActivityController::class, 'store']);
    Route::get('/api/activity', [BuilderActivityController::class, 'index']);
    Route::get('/api/activity/users', [BuilderActivityController::class, 'users']);

    Route::prefix('api/measures')->group(function () {
        Route::post('/', [MeasureController::class, 'store']);
        Route::put('/{id}', [MeasureController::class, 'update']);
        Route::delete('/{id}', [MeasureController::class, 'destroy']);
    });

    Route::prefix('api/joins')->group(function () {
        Route::post('/', [MeasureJoinController::class, 'store']);
        Route::delete('/{id}', [MeasureJoinController::class, 'destroy']);
    });
});

// ── NOVACITY ENDPOINTS (from data.json) ─
Route::get('/novacity-endpoints', NovacityEndpointsController::class);
Route::get('/novacity-endpoints/all', [NovacityEndpointsController::class, 'allSamples']);
Route::get('/novacity-endpoints/sample/{slug}', [NovacityEndpointsController::class, 'sample'])->where('slug', '.*');
Route::post('/novacity-endpoints/test-and-save', [NovacityEndpointsController::class, 'testAndSave']);
Route::get('/novacity-config', [NovacityEndpointsController::class, 'config']);

// ── NOVACITY ENDPOINTS MANAGER (CRUD) — IT only ─
Route::middleware(['auth', 'role:it'])->prefix('novacity-endpoints')->group(function () {
    Route::get('/structure', [NovacityEndpointsController::class, 'structure']);
    Route::get('/schema', [NovacityEndpointsController::class, 'schema']);
    Route::get('/list', [NovacityEndpointsController::class, 'index']);
    Route::get('/health', [NovacityEndpointsController::class, 'health']);
    Route::post('/refresh', [NovacityEndpointsController::class, 'refresh']);
    Route::post('/retry-failed', [NovacityEndpointsController::class, 'retryFailed']);
    Route::post('/rewrite-root', [NovacityEndpointsController::class, 'rewriteRoot']);
    Route::post('/refresh-group', [NovacityEndpointsController::class, 'refreshGroup']);
    Route::get('/roots', [NovacityEndpointsController::class, 'roots']);
    Route::post('/roots', [NovacityEndpointsController::class, 'storeRoot']);
    Route::post('/roots/toggle', [NovacityEndpointsController::class, 'toggleRoot']);
    Route::delete('/roots/{root}', [NovacityEndpointsController::class, 'destroyRoot']);
    Route::get('/params', [NovacityEndpointsController::class, 'parameterLists']);
    Route::post('/params/roots', [NovacityEndpointsController::class, 'storeRootParameters']);
    Route::post('/params/roots/delete', [NovacityEndpointsController::class, 'deleteRootParameter']);
    Route::post('/{id}/refresh', [NovacityEndpointsController::class, 'refreshOne']);
    Route::post('/test', [NovacityEndpointsController::class, 'test']);
    Route::post('/catalogue', [NovacityEndpointsController::class, 'catalogue']);
    Route::post('/import', [NovacityEndpointsController::class, 'import']);
    Route::patch('/{id}/toggle', [NovacityEndpointsController::class, 'toggle']);
    Route::post('/{id}/parameter', [NovacityEndpointsController::class, 'setParameter']);
    Route::post('/', [NovacityEndpointsController::class, 'store']);
    Route::post('/reorder', [NovacityEndpointsController::class, 'reorder']);
    Route::get('/{id}', [NovacityEndpointsController::class, 'show']);
    Route::put('/{id}', [NovacityEndpointsController::class, 'update']);
    Route::delete('/{id}', [NovacityEndpointsController::class, 'destroy']);
    Route::post('/{id}/duplicate', [NovacityEndpointsController::class, 'duplicate']);
});
