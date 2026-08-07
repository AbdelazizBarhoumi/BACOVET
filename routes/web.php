<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BuilderActivityController;
use App\Http\Controllers\Api\BuilderPageController;
use App\Http\Controllers\Api\BuilderPageGroupController;
use App\Http\Controllers\Api\EndpointDatasetController;
use App\Http\Controllers\Api\MeasureController;
use App\Http\Controllers\Api\MeasureJoinController;
use App\Models\User;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return redirect()->route('login');
})->name('home');

Route::get('/login', fn () => Inertia::render('auth/login'))->name('login');

Route::get('/unauthorized', fn () => Inertia::render('unauthorized'))->name('unauthorized');

Route::middleware(['auth', 'active.user', 'audit'])->group(function () {
    Route::get('/dashboard', function () {
        return redirect(User::DEFAULT_REDIRECT[auth()->user()->role->slug] ?? '/quality');
    })->name('dashboard');

    Route::get('/admin', fn () => Inertia::render('admin'))->name('admin');

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
    });
});

Route::post('/auth/login', [AuthController::class, 'login']);

// ── PAGE BUILDER (auth via the main login; users table) ─
Route::middleware('auth')->group(function () {
    Route::get('/p/{slug}', function ($slug) {
        $page = \App\Models\BuilderPage::where('slug', $slug)->first();
        if (! $page) {
            abort(404);
        }

        $user = \App\Support\PageAccess::resolveUser();
        if (! \App\Support\PageAccess::canView($page, $user)) {
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
            'canEdit' => \App\Support\PageAccess::canEdit($page, $user),
            'canManage' => \App\Support\PageAccess::canManage($page, $user),
        ]);
    })->name('builder.page');

    Route::get('/api/endpoint-datasets', [EndpointDatasetController::class, 'index']);
    Route::get('/api/schema', [EndpointDatasetController::class, 'schema']);

    Route::prefix('api/builder-pages')->group(function () {
        Route::get('/', [BuilderPageController::class, 'index']);
        Route::get('/{slug}', [BuilderPageController::class, 'show']);
        Route::post('/', [BuilderPageController::class, 'store']);
        Route::put('/{id}', [BuilderPageController::class, 'update']);
        Route::delete('/{id}', [BuilderPageController::class, 'destroy']);
        Route::post('/{id}/duplicate', [BuilderPageController::class, 'duplicate']);
        Route::post('/{id}/images', [BuilderPageController::class, 'uploadImage'])->name('builder.page.image.upload');
        Route::get('/{id}/images/{filename}', [BuilderPageController::class, 'showImage'])->name('builder.page.image');
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
        Route::get('/', [MeasureController::class, 'index']);
        Route::post('/', [MeasureController::class, 'store']);
        Route::put('/{id}', [MeasureController::class, 'update']);
        Route::delete('/{id}', [MeasureController::class, 'destroy']);
    });

    Route::prefix('api/joins')->group(function () {
        Route::get('/', [MeasureJoinController::class, 'index']);
        Route::post('/', [MeasureJoinController::class, 'store']);
        Route::delete('/{id}', [MeasureJoinController::class, 'destroy']);
    });
});