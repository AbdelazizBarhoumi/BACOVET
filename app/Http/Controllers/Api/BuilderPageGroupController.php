<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BuilderActivityLog;
use App\Models\BuilderPage;
use App\Models\BuilderPageGroup;
use App\Models\BuilderPagePlacement;
use App\Models\User;
use App\Support\PageAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BuilderPageGroupController extends Controller
{
    /**
     * Build the sidebar for the acting user.
     *
     * Each user has their own organisation: pages live in the user's own
     * placements (personal groups or "Sans groupe"). A page that the user can
     * access but has never placed shows up under "Sans groupe" until they drag
     * it into one of their groups.
     */
    public function index(): JsonResponse
    {
        $user = PageAccess::resolveUser();
        $isAdmin = PageAccess::isAdmin($user);

        $pages = BuilderPage::select('id', 'slug', 'name', 'owner_user_id', 'created_at', 'updated_at')
            ->with('accessRows')
            ->when(! $isAdmin, function ($q) use ($user) {
                $q->where(function ($p) use ($user) {
                    $p->where('owner_user_id', $user?->id)
                        ->orWhereHas('accessRows', fn ($a) => $a->where('user_id', $user?->id));
                });
            })
            ->get();

        $placements = BuilderPagePlacement::where('user_id', $user?->id)
            ->whereIn('page_id', $pages->pluck('id'))
            ->get()
            ->keyBy('page_id');

        $groups = BuilderPageGroup::where('owner_user_id', $user?->id)
            ->orderBy('sort_order')
            ->get();

        $grouped = [];
        foreach ($groups as $group) {
            $grouped[$group->id] = [
                'group' => $group,
                'pages' => [],
            ];
        }

        $ungrouped = [];
        foreach ($pages as $page) {
            $placement = $placements->get($page->id);
            $groupId = $placement?->group_id;

            if ($groupId !== null && isset($grouped[$groupId])) {
                $grouped[$groupId]['pages'][] = $page;
            } else {
                $ungrouped[] = $page;
            }
        }

        $byEffectiveOrder = fn ($a, $b) => ($placements->get($a->id)?->sort_order ?? PHP_INT_MAX) <=> ($placements->get($b->id)?->sort_order ?? PHP_INT_MAX);
        $ungroupedOrder = function ($a, $b) use ($placements) {
            $pa = $placements->get($a->id);
            $pb = $placements->get($b->id);

            if ($pa && $pb) {
                return $pa->sort_order <=> $pb->sort_order;
            }
            if ($pa) {
                return -1;
            }
            if ($pb) {
                return 1;
            }

            return $a->created_at <=> $b->created_at;
        };

        usort($ungrouped, $ungroupedOrder);

        return response()->json([
            'groups' => array_values(array_map(function ($entry) use ($user, $isAdmin, $placements, $byEffectiveOrder) {
                $pages = $entry['pages'];
                usort($pages, $byEffectiveOrder);

                return [
                    'id' => $entry['group']->id,
                    'name' => $entry['group']->name,
                    'slug' => $entry['group']->slug,
                    'sort_order' => $entry['group']->sort_order,
                    'created_at' => $entry['group']->created_at,
                    'updated_at' => $entry['group']->updated_at,
                    'can_manage' => $isAdmin || $entry['group']->owner_user_id === $user?->id,
                    'pages' => array_values(array_map(
                        fn ($p) => $this->pageMeta($p, $placements->get($p->id), $user, $isAdmin),
                        $pages,
                    )),
                ];
            }, $grouped)),
            'ungrouped' => array_values(array_map(
                fn ($p) => $this->pageMeta($p, $placements->get($p->id), $user, $isAdmin),
                $ungrouped,
            )),
        ]);
    }

    private function pageMeta($page, $placement, $user, bool $isAdmin): array
    {
        $isOwner = $isAdmin || $page->owner_user_id === ($user->id ?? null);
        $sharedMode = $page->accessRows->firstWhere('user_id', $user->id ?? null)?->mode;

        return [
            'id' => $page->id,
            'slug' => $page->slug,
            'name' => $page->name,
            'group_id' => $placement?->group_id,
            'sort_order' => $placement?->sort_order ?? 0,
            'owner_user_id' => $page->owner_user_id,
            'created_at' => $page->created_at,
            'updated_at' => $page->updated_at,
            'is_owner' => $isOwner,
            'can_edit' => $isOwner || $sharedMode === 'edit',
            'can_view' => $isOwner || $sharedMode !== null,
            'can_manage' => $isOwner,
        ];
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $name = trim($validated['name']);
        $slug = $this->uniqueSlug($name);

        $maxSort = BuilderPageGroup::where('owner_user_id', PageAccess::resolveUser()?->id)->max('sort_order') ?? 0;

        $group = BuilderPageGroup::create([
            'name' => $name,
            'slug' => $slug,
            'sort_order' => $maxSort + 1,
            'owner_user_id' => PageAccess::resolveUser()?->id,
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
        $group = BuilderPageGroup::find($id);
        if (! $group) {
            return response()->json(['message' => 'Group not found'], 404);
        }

        $user = PageAccess::resolveUser();
        if (! $this->canManageGroup($group, $user)) {
            return response()->json(['message' => 'Accès refusé.'], 403);
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
        $group = BuilderPageGroup::find($id);
        if (! $group) {
            return response()->json(['message' => 'Group not found'], 404);
        }

        $user = PageAccess::resolveUser();
        if (! $this->canManageGroup($group, $user)) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        // Only the acting user's own placements reference a personal group, but
        // a public (legacy) group may be referenced by several users — always
        // let those pages fall back to "Sans groupe" instead of deleting them.
        BuilderPagePlacement::where('group_id', $group->id)->update(['group_id' => null]);

        $this->logActivity('group.delete', [
            'group_id' => $group->id,
            'detail' => ['name' => $group->name, 'slug' => $group->slug],
        ]);

        $group->delete();

        return response()->json(['message' => 'Group deleted.']);
    }

    /**
     * Move a page in the acting user's own sidebar view.
     */
    public function assignPage(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'page_id' => 'required|integer|exists:builder_pages,id',
            'group_id' => 'nullable|integer|exists:builder_page_groups,id',
        ]);

        $user = PageAccess::resolveUser();

        $page = BuilderPage::findOrFail($validated['page_id']);
        if (! PageAccess::canView($page, $user)) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        $group = $validated['group_id'] ?? null;
        if ($group !== null && ! $this->canUseGroup(BuilderPageGroup::find($group), $user)) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        $pageSort = BuilderPagePlacement::where('user_id', $user?->id)
            ->where('group_id', $group)
            ->max('sort_order') ?? -1;

        BuilderPagePlacement::updateOrCreate(
            ['user_id' => $user?->id, 'page_id' => $page->id],
            ['group_id' => $group, 'sort_order' => $pageSort + 1],
        );

        $this->logActivity('group.assign_page', [
            'page_id' => $page->id,
            'page_slug' => $page->slug,
            'page_name' => $page->name,
            'group_id' => $group,
            'detail' => ['group_id' => $group, 'sort_order' => $pageSort + 1],
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
            'pages.*.id' => 'required|integer|exists:builder_pages,id',
            'pages.*.sort_order' => 'required|integer|min:0',
        ]);

        $user = PageAccess::resolveUser();

        foreach ($validated['pages'] as $item) {
            $page = BuilderPage::find($item['id']);
            if (! $page || ! PageAccess::canView($page, $user)) {
                continue;
            }

            BuilderPagePlacement::updateOrCreate(
                ['user_id' => $user?->id, 'page_id' => $item['id']],
                ['sort_order' => $item['sort_order']],
            );
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
            'groups.*.id' => 'required|integer|exists:builder_page_groups,id',
            'groups.*.sort_order' => 'required|integer|min:0',
        ]);

        $user = PageAccess::resolveUser();

        foreach ($validated['groups'] as $item) {
            $group = BuilderPageGroup::find($item['id']);

            if (! $group || ! $this->canManageGroup($group, $user)) {
                continue;
            }

            $group->update(['sort_order' => $item['sort_order']]);
        }

        $this->logActivity('group.reorder_groups', [
            'detail' => ['groups' => $validated['groups']],
        ]);

        return response()->json(['message' => 'Groups reordered.']);
    }

    private function canManageGroup(?BuilderPageGroup $group, ?User $user): bool
    {
        if (! $group || ! $user) {
            return false;
        }

        return PageAccess::isAdmin($user) || $group->owner_user_id === $user->id;
    }

    private function canUseGroup(?BuilderPageGroup $group, ?User $user): bool
    {
        if (! $group || ! $user) {
            return false;
        }

        // Grouping is personal: a user can only pin pages into groups they own.
        return $group->owner_user_id === $user->id;
    }

    private function uniqueSlug(string $base, $exceptId = null): string
    {
        $slug = $this->slugify($base);
        $i = 2;

        while (BuilderPageGroup::where('slug', $slug)
            ->when($exceptId, fn ($q) => $q->where('id', '!=', $exceptId))
            ->exists()
        ) {
            $slug = $this->slugify($base).'-'.$i++;
        }

        return $slug;
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
