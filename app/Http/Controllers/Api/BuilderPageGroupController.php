<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BuilderPage;
use App\Models\BuilderPageGroup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BuilderPageGroupController extends Controller
{
    public function index(): JsonResponse
    {
        $groups = BuilderPageGroup::with(['pages' => function ($q) {
            $q->select('id', 'slug', 'name', 'group_id', 'sort_order', 'created_at', 'updated_at')
                ->orderBy('sort_order');
        }])->orderBy('sort_order')->get();

        $ungrouped = BuilderPage::whereNull('group_id')
            ->select('id', 'slug', 'name', 'group_id', 'sort_order', 'created_at', 'updated_at')
            ->orderBy('sort_order')
            ->get();

        return response()->json([
            'groups' => $groups,
            'ungrouped' => $ungrouped,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $name = trim($validated['name']);
        $slug = $this->uniqueSlug($name);

        $maxSort = BuilderPageGroup::max('sort_order') ?? 0;

        $group = BuilderPageGroup::create([
            'name' => $name,
            'slug' => $slug,
            'sort_order' => $maxSort + 1,
        ]);

        return response()->json([
            'message' => 'Group created.',
            'group' => $group,
        ], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $group = BuilderPageGroup::find($id);
        if (!$group) {
            return response()->json(['message' => 'Group not found'], 404);
        }

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'sort_order' => 'nullable|integer',
        ]);

        if (isset($validated['name'])) {
            $group->name = trim($validated['name']);
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
        if (!$group) {
            return response()->json(['message' => 'Group not found'], 404);
        }

        BuilderPage::where('group_id', $group->id)->update(['group_id' => null]);

        $group->delete();

        return response()->json(['message' => 'Group deleted.']);
    }

    public function assignPage(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'page_id' => 'required|integer|exists:builder_pages,id',
            'group_id' => 'nullable|integer|exists:builder_page_groups,id',
        ]);

        $page = BuilderPage::findOrFail($validated['page_id']);
        $page->group_id = $validated['group_id'] ?? null;
        $maxSort = BuilderPage::where('group_id', $page->group_id)->max('sort_order') ?? 0;
        $page->sort_order = $maxSort + 1;
        $page->save();

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

        foreach ($validated['pages'] as $item) {
            BuilderPage::where('id', $item['id'])->update(['sort_order' => $item['sort_order']]);
        }

        return response()->json(['message' => 'Pages reordered.']);
    }

    public function reorderGroups(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'groups' => 'required|array',
            'groups.*.id' => 'required|integer|exists:builder_page_groups,id',
            'groups.*.sort_order' => 'required|integer|min:0',
        ]);

        foreach ($validated['groups'] as $item) {
            BuilderPageGroup::where('id', $item['id'])->update(['sort_order' => $item['sort_order']]);
        }

        return response()->json(['message' => 'Groups reordered.']);
    }

    private function uniqueSlug(string $base, $exceptId = null): string
    {
        $slug = $this->slugify($base);
        $i = 2;

        while (BuilderPageGroup::where('slug', $slug)
            ->when($exceptId, fn ($q) => $q->where('id', '!=', $exceptId))
            ->exists()
        ) {
            $slug = $this->slugify($base) . '-' . $i++;
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

        return $slug->isEmpty() ? 'group-' . Str::random(7) : $slug->value();
    }
}