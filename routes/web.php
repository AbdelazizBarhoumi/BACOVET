<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BuilderActivityV5Controller;
use App\Http\Controllers\Api\BuilderPageGroupV5Controller;
use App\Http\Controllers\Api\BuilderPageV5Controller;
use App\Http\Controllers\Api\EndpointDatasetV5Controller;
use App\Http\Controllers\Api\MeasureJoinController;
use App\Http\Controllers\Api\MeasureV5Controller;
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

// ── V5 PAGE BUILDER (auth via the main login; v5_users table kept) ─
Route::middleware('auth')->group(function () {
    Route::get('/p/{slug}', function ($slug) {
        $page = \App\Models\BuilderPageV5::where('slug', $slug)->first();
        if (! $page) {
            abort(404);
        }

        $user = \App\Support\V5PageAccess::resolveV5User();
        if (! \App\Support\V5PageAccess::canView($page, $user)) {
            abort(403);
        }

        return Inertia::render('v5/p/[slug]', [
            'pageId' => $page->id,
            'slug' => $page->slug,
            'pageName' => $page->name,
            'layout' => $page->layout,
            'layoutDraft' => $page->layout_draft,
            'layoutDraftUpdatedAt' => $page->layout_draft_updated_at?->toISOString(),
            'isOwner' => $page->owner_user_id === $user->id,
            'canEdit' => \App\Support\V5PageAccess::canEdit($page, $user),
            'canManage' => \App\Support\V5PageAccess::canManage($page, $user),
        ]);
    })->name('v5.page');

    Route::get('/api/v5/endpoint-datasets', [EndpointDatasetV5Controller::class, 'index']);
    Route::get('/api/v5/schema', [EndpointDatasetV5Controller::class, 'schema']);

    Route::prefix('api/v5/builder-pages')->group(function () {
        Route::get('/', [BuilderPageV5Controller::class, 'index']);
        Route::get('/{slug}', [BuilderPageV5Controller::class, 'show']);
        Route::post('/', [BuilderPageV5Controller::class, 'store']);
        Route::put('/{id}', [BuilderPageV5Controller::class, 'update']);
        Route::delete('/{id}', [BuilderPageV5Controller::class, 'destroy']);
        Route::post('/{id}/duplicate', [BuilderPageV5Controller::class, 'duplicate']);
        Route::post('/{id}/images', [BuilderPageV5Controller::class, 'uploadImage'])->name('v5.page.image.upload');
        Route::get('/{id}/images/{filename}', [BuilderPageV5Controller::class, 'showImage'])->name('v5.page.image');
        Route::get('/{id}/permissions', [BuilderPageV5Controller::class, 'getPermissions']);
        Route::put('/{id}/permissions', [BuilderPageV5Controller::class, 'savePermissions']);
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

    Route::post('/api/v5-activity', [BuilderActivityV5Controller::class, 'store']);
    Route::get('/api/v5-activity', [BuilderActivityV5Controller::class, 'index']);
    Route::get('/api/v5-activity/users', [BuilderActivityV5Controller::class, 'users']);

    Route::prefix('api/v5/measures')->group(function () {
        Route::get('/', [MeasureV5Controller::class, 'index']);
        Route::post('/', [MeasureV5Controller::class, 'store']);
        Route::put('/{id}', [MeasureV5Controller::class, 'update']);
        Route::delete('/{id}', [MeasureV5Controller::class, 'destroy']);
    });

    Route::prefix('api/v5/joins')->group(function () {
        Route::get('/', [MeasureJoinController::class, 'index']);
        Route::post('/', [MeasureJoinController::class, 'store']);
        Route::delete('/{id}', [MeasureJoinController::class, 'destroy']);
    });
});