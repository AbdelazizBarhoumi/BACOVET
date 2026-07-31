<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BuilderPageV4;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BuilderPageV4Controller extends Controller
{
    public function index(): JsonResponse
    {
        $pages = BuilderPageV4::select('id', 'slug', 'name', 'group_id', 'created_at', 'updated_at')
            ->orderBy('created_at')
            ->get();

        return response()->json($pages);
    }

    public function show(string $slug): JsonResponse
    {
        $page = BuilderPageV4::where('slug', $slug)->first();

        if (! $page) {
            return response()->json(['message' => 'Page not found'], 404);
        }

        return response()->json($page);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255',
            'group_id' => 'nullable|integer|exists:builder_page_groups_v4,id',
        ]);

        $name = trim($validated['name']) ?: 'Nouvelle page';
        $slug = $this->uniqueSlug($validated['slug'] ?? $name);

        $page = BuilderPageV4::create([
            'slug' => $slug,
            'name' => $name,
            'layout' => null,
            'group_id' => $validated['group_id'] ?? null,
        ]);

        return response()->json([
            'message' => 'Page created.',
            'page' => $page,
        ], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $page = BuilderPageV4::find($id);

        if (! $page) {
            return response()->json(['message' => 'Page not found'], 404);
        }

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'slug' => 'nullable|string|max:255',
            'layout' => 'nullable|array',
            'group_id' => 'nullable|integer|exists:builder_page_groups_v4,id',
        ]);

        if (isset($validated['name'])) {
            $page->name = trim($validated['name']) ?: $page->name;
        }

        if (isset($validated['slug']) && $validated['slug'] !== $page->slug) {
            $page->slug = $this->uniqueSlug($validated['slug'], $page->id);
        }

        if (array_key_exists('layout', $validated)) {
            $page->layout = $validated['layout'];
        }

        if (array_key_exists('group_id', $validated)) {
            $page->group_id = $validated['group_id'];
        }

        $page->save();

        return response()->json([
            'message' => 'Page updated.',
            'page' => $page,
        ]);
    }

    public function destroy(string $id): JsonResponse
    {
        $page = BuilderPageV4::find($id);

        if (! $page) {
            return response()->json(['message' => 'Page not found'], 404);
        }

        $page->delete();

        return response()->json(['message' => 'Page deleted.']);
    }

    public function duplicate(string $id): JsonResponse
    {
        $src = BuilderPageV4::find($id);

        if (! $src) {
            return response()->json(['message' => 'Page not found'], 404);
        }

        $page = BuilderPageV4::create([
            'slug' => $this->uniqueSlug($src->slug.'-copy'),
            'name' => $src->name.' (copie)',
            'layout' => $src->layout,
            'group_id' => $src->group_id,
        ]);

        return response()->json([
            'message' => 'Page duplicated.',
            'page' => $page,
        ], 201);
    }

    private function uniqueSlug(string $base, $exceptId = null): string
    {
        $slug = $this->slugify($base);
        $i = 2;

        while (BuilderPageV4::where('slug', $slug)
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
}
