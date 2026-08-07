<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BuilderActivityLog;
use App\Models\User;
use App\Support\PageAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BuilderActivityController extends Controller
{
    /**
     * Fire-and-forget capture endpoint used by the page builder frontend.
     * Identity (user / ip / agent / timestamp) is always stamped server-side.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'action' => 'required|string|max:50',
            'page_id' => 'nullable|integer',
            'page_slug' => 'nullable|string|max:255',
            'page_name' => 'nullable|string|max:255',
            'group_id' => 'nullable|integer',
            'widget_id' => 'nullable|string|max:64',
            'widget_type' => 'nullable|string|max:32',
            'kpi_code' => 'nullable|string|max:255',
            'detail' => 'nullable|array',
        ]);

        BuilderActivityLog::create([
            'user_id' => PageAccess::resolveUser()?->id,
            'page_id' => $validated['page_id'] ?? null,
            'page_slug' => $validated['page_slug'] ?? null,
            'page_name' => $validated['page_name'] ?? null,
            'group_id' => $validated['group_id'] ?? null,
            'widget_id' => $validated['widget_id'] ?? null,
            'widget_type' => $validated['widget_type'] ?? null,
            'kpi_code' => $validated['kpi_code'] ?? null,
            'action' => $validated['action'],
            'detail' => $validated['detail'] ?? null,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => now(),
        ]);

        return response()->json(['ok' => true]);
    }

    /**
     * Query endpoint — filterable + paginated trace table feed.
     * Admin roles only.
     */
    public function index(Request $request): JsonResponse
    {
        $user = PageAccess::resolveUser();

        if (! PageAccess::isAdmin($user)) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        $query = BuilderActivityLog::with('user');

        if ($request->filled('page_id')) {
            $query->where('page_id', (int) $request->input('page_id'));
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', (int) $request->input('user_id'));
        }

        if ($request->filled('action')) {
            $query->where('action', $request->input('action'));
        }

        if ($request->filled('widget_type')) {
            $query->where('widget_type', $request->input('widget_type'));
        }

        if ($request->filled('kpi_code')) {
            $query->where('kpi_code', 'like', '%'.$request->input('kpi_code').'%');
        }

        if ($request->filled('from')) {
            $query->where('created_at', '>=', $request->input('from'));
        }

        if ($request->filled('to')) {
            $query->where('created_at', '<=', $request->input('to'));
        }

        if ($request->filled('q')) {
            $q = $request->input('q');
            $query->where(function ($sub) use ($q) {
                $sub->where('page_slug', 'like', "%{$q}%")
                    ->orWhere('page_name', 'like', "%{$q}%")
                    ->orWhere('widget_id', 'like', "%{$q}%")
                    ->orWhere('kpi_code', 'like', "%{$q}%")
                    ->orWhere('action', 'like', "%{$q}%")
                    ->orWhereHas('user', fn ($u) => $u->where('name', 'like', "%{$q}%"));
            });
        }

        return response()->json(
            $query->orderByDesc('created_at')->paginate($request->integer('per_page', 50))
        );
    }

    /**
     * User dropdown options for the trace filter. Admin roles only.
     */
    public function users(Request $request): JsonResponse
    {
        $user = PageAccess::resolveUser();

        if (! PageAccess::isAdmin($user)) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        return response()->json(
            User::select('id', 'name')
                ->with('role:id,name,slug')
                ->orderBy('name')
                ->get()
                ->map(fn ($u) => ['id' => $u->id, 'name' => $u->name, 'role' => $u->role?->slug])
        );
    }
}
