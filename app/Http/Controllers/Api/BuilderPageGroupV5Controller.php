<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BuilderActivityLogV5;
use App\Models\BuilderPageGroupV5;
use App\Models\BuilderPageV5;
use App\Support\V5PageAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BuilderPageGroupV5Controller extends Controller
{
    public function index(): JsonResponse
    {
        $user = V5PageAccess::resolveV5User();
        $isAdmin = V5PageAccess::isAdmin($user);

        $groups = BuilderPageGroupV5::with(['pages' => function ($q) use ($user, $isAdmin) {
            $q->select('id', 'slug', 'name', 'group_id', 'sort_order', 'owner_user_id', 'created_at', 'updated_at')
                ->with('accessRows')
                ->when(! $isAdmin, function ($sub) use ($user) {
                    $sub->where(function ($p) use ($user) {
                        $p->where('owner_user_id', $user?->id)
                            ->orWhereHas('accessRows', fn ($a) => $a->where('user_id', $user?->id));
                    });
                })
                ->orderBy('sort_order');
        }])->orderBy('sort_order')->get();

        if (! $isAdmin) {
            $groups = $groups->filter(fn ($g) => $g->pages->isNotEmpty())->values();
        }

        $ungrouped = BuilderPageV5::whereNull('group_id')
            ->select('id', 'slug', 'name', 'group_id', 'sort_order', 'owner_user_id', 'created_at', 'updated_at')
            ->with('accessRows')
            ->when(! $isAdmin, function ($q) use ($user) {
                $q->where(function ($p) use ($user) {
                    $p->where('owner_user_id', $user?->id)
                        ->orWhereHas('accessRows', fn ($a) => $a->where('user_id', $user?->id));
                });
            })
            ->orderBy('sort_order')
            ->get();

        return response()->json([
            'groups' => $groups->map(fn ($g) => [
                'id' => $g->id,
                'name' => $g->name,
                'slug' => $g->slug,
                'sort_order' => $g->sort_order,
                'created_at' => $g->created_at,
                'updated_at' => $g->updated_at,
                'pages' => $g->pages->map(fn ($p) => $this->pageMeta($p, $user, $isAdmin))->values(),
            ])->values(),
            'ungrouped' => $ungrouped->map(fn ($p) => $this->pageMeta($p, $user, $isAdmin))->values(),
        ]);
    }

    private function pageMeta($page, $user, bool $isAdmin): array
    {
        $isOwner = $page->owner_user_id === ($user->id ?? null);
        $sharedMode = $page->accessRows->firstWhere('user_id', $user->id ?? null)?->mode;

        return [
            'id' => $page->id,
            'slug' => $page->slug,
            'name' => $page->name,
            'group_id' => $page->group_id,
            'sort_order' => $page->sort_order,
            'owner_user_id' => $page->owner_user_id,
            'created_at' => $page->created_at,
            'updated_at' => $page->updated_at,
            'is_owner' => $isAdmin || $isOwner,
            'can_edit' => $isAdmin || $isOwner || $sharedMode === 'edit',
            'can_view' => $isAdmin || $isOwner || $sharedMode !== null,
            'can_manage' => $isAdmin || $isOwner,
        ];
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $name = trim($validated['name']);
        $slug = $this->uniqueSlug($name);

        $maxSort = BuilderPageGroupV5::max('sort_order') ?? 0;

        $group = BuilderPageGroupV5::create([
            'name' => $name,
            'slug' => $slug,
            'sort_order' => $maxSort + 1,
        ]);

        $this->logActivity('group.create', [
            'group_id' => $group->id,
            'detail' => ['name' => $group->name, 'slug' => $group->slug],
        ]);

        return response()->json([
            'message' => 'Group created.',
            'group' => $group,
        ], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $group = BuilderPageGroupV5::find($id);
        if (! $group) {
            return response()->json(['message' => 'Group not found'], 404);
        }

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'sort_order' => 'nullable|integer',
        ]);

        if (isset($validated['name'])) {
            $before = $group->name;
            $group->name = trim($validated['name']);
            $this->logActivity('group.update', [
                'group_id' => $group->id,
                'detail' => ['field' => 'name', 'before' => $before, 'after' => $group->name],
            ]);
        }

        if (isset($validated['sort_order'])) {
            $group->sort_order = $validated['sort_order'];
        }

        $group->save();

        return response()->json([
            'message' => 'Group updated.',
            'group' => $group,
        ]);
    }

    public function destroy(string $id): JsonResponse
    {
        $group = BuilderPageGroupV5::find($id);
        if (! $group) {
            return response()->json(['message' => 'Group not found'], 404);
        }

        BuilderPageV5::where('group_id', $group->id)->update(['group_id' => null]);

        $this->logActivity('group.delete', [
            'group_id' => $group->id,
            'detail' => ['name' => $group->name, 'slug' => $group->slug],
        ]);

        $group->delete();

        return response()->json(['message' => 'Group deleted.']);
    }

    public function assignPage(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'page_id' => 'required|integer|exists:builder_pages_v5,id',
            'group_id' => 'nullable|integer|exists:builder_page_groups_v5,id',
        ]);

        $page = BuilderPageV5::findOrFail($validated['page_id']);
        $page->group_id = $validated['group_id'] ?? null;
        $maxSort = BuilderPageV5::where('group_id', $page->group_id)->max('sort_order') ?? 0;
        $page->sort_order = $maxSort + 1;
        $page->save();

        $this->logActivity('group.assign_page', [
            'page_id' => $page->id,
            'page_slug' => $page->slug,
            'page_name' => $page->name,
            'group_id' => $page->group_id,
            'detail' => ['group_id' => $page->group_id, 'sort_order' => $page->sort_order],
        ]);

        return response()->json([
            'message' => 'Page assigned.',
            'page' => $page,
        ]);
    }

    public function reorderPages(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'pages' => 'required|array',
            'pages.*.id' => 'required|integer|exists:builder_pages_v5,id',
            'pages.*.sort_order' => 'required|integer|min:0',
        ]);

        foreach ($validated['pages'] as $item) {
            BuilderPageV5::where('id', $item['id'])->update(['sort_order' => $item['sort_order']]);
        }

        $this->logActivity('group.reorder_pages', [
            'detail' => ['pages' => $validated['pages']],
        ]);

        return response()->json(['message' => 'Pages reordered.']);
    }

    public function reorderGroups(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'groups' => 'required|array',
            'groups.*.id' => 'required|integer|exists:builder_page_groups_v5,id',
            'groups.*.sort_order' => 'required|integer|min:0',
        ]);

        foreach ($validated['groups'] as $item) {
            BuilderPageGroupV5::where('id', $item['id'])->update(['sort_order' => $item['sort_order']]);
        }

        $this->logActivity('group.reorder_groups', [
            'detail' => ['groups' => $validated['groups']],
        ]);

        return response()->json(['message' => 'Groups reordered.']);
    }

    private function uniqueSlug(string $base, $exceptId = null): string
    {
        $slug = $this->slugify($base);
        $i = 2;

        while (BuilderPageGroupV5::where('slug', $slug)
            ->when($exceptId, fn ($q) => $q->where('id', '!=', $exceptId))
            ->exists()
        ) {
            $slug = $this->slugify($base).'-'.$i++;
        }

        return $slug;
    }

    private function logActivity(string $action, array $data = []): void
    {
        BuilderActivityLogV5::create(array_merge([
            'user_id' => V5PageAccess::resolveV5User()?->id,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'action' => $action,
            'created_at' => now(),
        ], $data));
    }

    private function slugify(string $name): string
    {
        $slug = Str::of($name)
            ->ascii()
            ->lower()
            ->replaceMatches('/[^a-z0-9]+/', '-')
            ->trim('-')
            ->limit(40, '');

        return $slug->isEmpty() ? 'group-'.Str::random(7) : $slug->value();
    }
}
