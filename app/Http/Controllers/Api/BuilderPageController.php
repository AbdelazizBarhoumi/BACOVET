<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BuilderActivityLog;
use App\Models\BuilderPage;
use App\Models\BuilderPageAccess;
use App\Models\BuilderPagePlacement;
use App\Models\User;
use App\Support\PageAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class BuilderPageController extends Controller
{
    public function index(): JsonResponse
    {
        $user = PageAccess::resolveUser();

        $query = BuilderPage::select('id', 'slug', 'name', 'owner_user_id', 'group_id', 'published', 'created_at', 'updated_at')
            ->with([
                'owner:id,name',
                'accessRows' => fn ($q) => $q->where('user_id', $user->id),
            ])
            ->orderBy('created_at');

        if (! PageAccess::isAdmin($user)) {
            $query->where(function ($q) use ($user) {
                $q->where('owner_user_id', $user->id)
                    ->orWhereHas('accessRows', fn ($a) => $a->where('user_id', $user->id));
            });
        }

        $pages = $query->get();

        $placements = BuilderPagePlacement::where('user_id', $user->id)
            ->whereIn('page_id', $pages->pluck('id'))
            ->get()
            ->keyBy('page_id');

        return response()->json($pages->map(function ($page) use ($user, $placements) {
            $placement = $placements->get($page->id);

            return [
                'id' => $page->id,
                'slug' => $page->slug,
                'name' => $page->name,
                'owner_user_id' => $page->owner_user_id,
                'group_id' => $placement?->group_id,
                'sort_order' => $placement?->sort_order ?? 0,
                'published' => $page->published,
                'created_at' => $page->created_at,
                'updated_at' => $page->updated_at,
                'is_owner' => $page->owner_user_id === $user->id,
                'can_edit' => PageAccess::canEdit($page, $user),
                'can_manage' => PageAccess::canManage($page, $user),
                'can_view' => true,
            ];
        }));
    }

    public function show(string $slug): JsonResponse
    {
        $page = BuilderPage::where('slug', $slug)->first();

        if (! $page) {
            return response()->json(['message' => 'Page not found'], 404);
        }

        $user = PageAccess::resolveUser();
        if (! PageAccess::canView($page, $user)) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        return response()->json($page);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255',
            'group_id' => 'nullable|integer|exists:builder_page_groups,id',
        ]);

        $name = trim($validated['name']) ?: 'Nouvelle page';
        $slug = $this->uniqueSlug($validated['slug'] ?? $name);
        $groupId = $validated['group_id'] ?? null;
        $pageSort = BuilderPagePlacement::where('user_id', PageAccess::resolveUser()?->id)
            ->where('group_id', $groupId)
            ->max('sort_order') ?? -1;

        $page = BuilderPage::create([
            'slug' => $slug,
            'name' => $name,
            'layout' => null,
            'group_id' => $groupId,
            'sort_order' => $pageSort + 1,
            'owner_user_id' => PageAccess::resolveUser()?->id,
        ]);

        BuilderPagePlacement::create([
            'user_id' => $page->owner_user_id,
            'page_id' => $page->id,
            'group_id' => $groupId,
            'sort_order' => $pageSort + 1,
        ]);

        $this->logActivity('page.create', [
            'page_id' => $page->id,
            'page_slug' => $page->slug,
            'page_name' => $page->name,
            'group_id' => $page->group_id,
            'detail' => ['group_id' => $page->group_id],
        ]);

        return response()->json([
            'message' => 'Page created.',
            'page' => $page,
        ], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $page = BuilderPage::find($id);

        if (! $page) {
            return response()->json(['message' => 'Page not found'], 404);
        }

        if (! PageAccess::canEdit($page, PageAccess::resolveUser())) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'slug' => 'nullable|string|max:255',
            'layout' => 'nullable|array',
            'layout_draft' => 'nullable|array',
            'published' => 'nullable|boolean',
        ]);

        if (isset($validated['name'])) {
            $nameChanged = trim($validated['name']) !== $page->name;
            $page->name = trim($validated['name']) ?: $page->name;
            if ($nameChanged) {
                $this->logActivity('page.update', [
                    'page_id' => $page->id,
                    'page_slug' => $page->slug,
                    'page_name' => $page->name,
                    'detail' => ['field' => 'name', 'before' => $page->getOriginal('name'), 'after' => $page->name],
                ]);
            }
        }

        if (isset($validated['slug']) && $validated['slug'] !== $page->slug) {
            $before = $page->slug;
            $page->slug = $this->uniqueSlug($validated['slug'], $page->id);
            $this->logActivity('page.update', [
                'page_id' => $page->id,
                'page_slug' => $page->slug,
                'page_name' => $page->name,
                'detail' => ['field' => 'slug', 'before' => $before, 'after' => $page->slug],
            ]);
        }

        if (array_key_exists('layout', $validated)) {
            $oldLayout = $page->getOriginal('layout');
            $page->layout = $validated['layout'];
            $page->layout_draft = null;
            $page->layout_draft_updated_at = null;
            $this->logActivity('layout.save', [
                'page_id' => $page->id,
                'page_slug' => $page->slug,
                'page_name' => $page->name,
                'detail' => $this->diffLayouts($oldLayout, $page->layout),
            ]);
        }

        if (array_key_exists('layout_draft', $validated)) {
            $page->layout_draft = $validated['layout_draft'];

            if ($validated['layout_draft'] === null) {
                $page->layout_draft_updated_at = null;
                $this->logActivity('layout.discard', [
                    'page_id' => $page->id,
                    'page_slug' => $page->slug,
                    'page_name' => $page->name,
                ]);
            } else {
                $page->layout_draft_updated_at = now();
                $this->logActivity('layout.checkpoint', [
                    'page_id' => $page->id,
                    'page_slug' => $page->slug,
                    'page_name' => $page->name,
                ]);
            }
        }

        if (array_key_exists('published', $validated)) {
            $published = (bool) $validated['published'];
            if ($published !== $page->published) {
                $page->published = $published;
                $this->logActivity($published ? 'page.publish' : 'page.depublish', [
                    'page_id' => $page->id,
                    'page_slug' => $page->slug,
                    'page_name' => $page->name,
                    'detail' => ['published' => $published],
                ]);
            }
        }

        $page->save();

        return response()->json([
            'message' => 'Page updated.',
            'page' => $page,
        ]);
    }

    public function destroy(string $id): JsonResponse
    {
        $page = BuilderPage::find($id);

        if (! $page) {
            return response()->json(['message' => 'Page not found'], 404);
        }

        if (! PageAccess::canManage($page, PageAccess::resolveUser())) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        $this->logActivity('page.delete', [
            'page_id' => $page->id,
            'page_slug' => $page->slug,
            'page_name' => $page->name,
            'group_id' => $page->group_id,
            'detail' => ['widget_count' => count($page->layout['widgets'] ?? [])],
        ]);

        $page->delete();

        return response()->json(['message' => 'Page deleted.']);
    }

    public function duplicate(string $id): JsonResponse
    {
        $src = BuilderPage::find($id);

        if (! $src) {
            return response()->json(['message' => 'Page not found'], 404);
        }

        if (! PageAccess::canView($src, PageAccess::resolveUser())) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        $user = PageAccess::resolveUser();
        $srcPlacement = BuilderPagePlacement::where('user_id', $user?->id)
            ->where('page_id', $src->id)
            ->first();
        $groupId = $srcPlacement?->group_id;
        $pageSort = BuilderPagePlacement::where('user_id', $user?->id)
            ->where('group_id', $groupId)
            ->max('sort_order') ?? -1;

        $page = BuilderPage::create([
            'slug' => $this->uniqueSlug($src->slug.'-copy'),
            'name' => $src->name.' (copie)',
            'layout' => $src->layout,
            'group_id' => $groupId,
            'sort_order' => $pageSort + 1,
            'owner_user_id' => $user?->id,
        ]);

        BuilderPagePlacement::create([
            'user_id' => $user?->id,
            'page_id' => $page->id,
            'group_id' => $groupId,
            'sort_order' => $pageSort + 1,
        ]);

        $this->logActivity('page.duplicate', [
            'page_id' => $page->id,
            'page_slug' => $page->slug,
            'page_name' => $page->name,
            'group_id' => $page->group_id,
            'detail' => ['source_id' => $src->id, 'source_slug' => $src->slug, 'widget_count' => count($src->layout['widgets'] ?? [])],
        ]);

        return response()->json([
            'message' => 'Page duplicated.',
            'page' => $page,
        ], 201);
    }

    public function uploadImage(Request $request, string $id): JsonResponse
    {
        $page = BuilderPage::find($id);

        if (! $page) {
            return response()->json(['message' => 'Page not found'], 404);
        }

        if (! PageAccess::canEdit($page, PageAccess::resolveUser())) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        $validated = $request->validate([
            'image' => 'required|file|image|mimes:jpg,jpeg,png,gif,webp|max:10240',
        ]);

        $path = $request->file('image')->store(
            'builder-images/'.$page->id,
            'public'
        );

        $url = route('builder.page.image', [
            'id' => $page->id,
            'filename' => basename($path),
        ]);

        return response()->json(['url' => $url]);
    }

    public function showImage(string $id, string $filename)
    {
        $page = BuilderPage::find($id);

        if (! $page) {
            abort(404);
        }

        $user = PageAccess::resolveUser();

        // Published pages are public: their images (logos, backgrounds…) must
        // stay reachable without a session so the public view renders fully.
        if (! $page->published && ! PageAccess::canView($page, $user)) {
            abort(403);
        }

        if (! preg_match('/^[a-z0-9_-]+\.(jpg|jpeg|png|gif|webp)$/i', $filename)) {
            abort(404);
        }

        $path = 'builder-images/'.$page->id.'/'.$filename;

        if (! Storage::disk('public')->exists($path)) {
            abort(404);
        }

        return Storage::disk('public')->response($path, null, [
            'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
        ]);
    }

    /**
     * List every user with the current access mode for a page.
     * Only the page owner or an admin may manage permissions.
     */
    public function getPermissions(string $id): JsonResponse
    {
        $page = BuilderPage::find($id);

        if (! $page) {
            return response()->json(['message' => 'Page not found'], 404);
        }

        $user = PageAccess::resolveUser();
        if (! PageAccess::canManage($page, $user)) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        $modes = $page->accessRows->keyBy('user_id')->map->mode;

        $users = User::select('id', 'name', 'email', 'role_id')
            ->with('role:id,name,slug')
            ->orderBy('name')
            ->get();

        return response()->json($users->map(function ($u) use ($modes, $page) {
            return [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'role' => $u->role?->slug,
                'is_owner' => $page->owner_user_id === $u->id,
                'is_admin' => PageAccess::isAdmin($u),
                'mode' => $modes->get($u->id),
            ];
        }));
    }

    /**
     * Persist the access modes chosen by an owner for the other users.
     * Accepts [{user_id, mode: 'view'|'edit'|'none'}].
     */
    public function savePermissions(Request $request, string $id): JsonResponse
    {
        $page = BuilderPage::find($id);

        if (! $page) {
            return response()->json(['message' => 'Page not found'], 404);
        }

        $user = PageAccess::resolveUser();
        if (! PageAccess::canManage($page, $user)) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        $validated = $request->validate([
            'permissions' => 'array',
            'permissions.*.user_id' => 'required|integer|exists:users,id',
            'permissions.*.mode' => 'required|in:view,edit,none',
        ]);

        foreach ($validated['permissions'] ?? [] as $entry) {
            $userId = $entry['user_id'];
            // The owner is never demoted through the sharing panel.
            if ($userId === $page->owner_user_id || $userId === $user->id) {
                continue;
            }

            if ($entry['mode'] === 'none') {
                BuilderPageAccess::where('page_id', $page->id)
                    ->where('user_id', $userId)
                    ->delete();

                continue;
            }

            BuilderPageAccess::updateOrCreate(
                ['page_id' => $page->id, 'user_id' => $userId],
                ['mode' => $entry['mode']],
            );
        }

        return response()->json(['message' => 'Permissions mises à jour.']);
    }

    private function uniqueSlug(string $base, $exceptId = null): string
    {
        $slug = $this->slugify($base);
        $i = 2;

        while (BuilderPage::where('slug', $slug)
            ->when($exceptId, fn ($q) => $q->where('id', '!=', $exceptId))
            ->exists()
        ) {
            $slug = $this->slugify($base).'-'.$i++;
        }

        return $slug;
    }

    private function slugify(string $name): string
    {
        $slug = Str::of($name)
            ->ascii()
            ->lower()
            ->replaceMatches('/[^a-z0-9]+/', '-')
            ->trim('-')
            ->limit(40, '');

        return $slug->isEmpty() ? 'page-'.Str::random(7) : $slug->value();
    }

    private function logActivity(string $action, array $data = []): void
    {
        BuilderActivityLog::create(array_merge([
            'user_id' => PageAccess::resolveUser()?->id,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'action' => $action,
            'created_at' => now(),
        ], $data));
    }

    private function widgetSummary(array $widget): array
    {
        $kpis = [];
        if (! empty($widget['config']['kpiCode'])) {
            $kpis[] = $widget['config']['kpiCode'];
        }
        foreach ($widget['config']['tableGrid']['cells'] ?? [] as $cell) {
            if (! empty($cell['kpiCode'])) {
                $kpis[] = $cell['kpiCode'];
            }
        }

        return [
            'id' => $widget['id'] ?? null,
            'type' => $widget['type'] ?? null,
            'kpis' => array_values(array_unique($kpis)),
        ];
    }

    private function diffLayouts(?array $old, ?array $new): array
    {
        $oldW = collect($old['widgets'] ?? [])->keyBy('id');
        $newW = collect($new['widgets'] ?? [])->keyBy('id');

        $added = $newW->diffKeys($oldW);
        $removed = $oldW->diffKeys($newW);

        $changed = $newW->filter(function ($w, $id) use ($oldW) {
            return $oldW->has($id) && $oldW->get($id) !== $w;
        });

        $kpis = collect([...$added->values(), ...$changed->values()])
            ->flatMap(fn ($w) => $this->widgetSummary($w)['kpis'])
            ->unique()
            ->values()
            ->all();

        return [
            'added' => $added->values()->map(fn ($w) => $this->widgetSummary($w))->all(),
            'removed' => $removed->values()->map(fn ($w) => $this->widgetSummary($w))->all(),
            'changed_count' => $changed->count(),
            'changed_types' => $changed->values()->pluck('type')->unique()->values()->all(),
            'kpi_codes' => $kpis,
        ];
    }
}
