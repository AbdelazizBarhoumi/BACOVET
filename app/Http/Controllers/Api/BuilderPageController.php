<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BuilderPage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BuilderPageController extends Controller
{
    public function index(): JsonResponse
    {
        $pages = BuilderPage::select('id', 'slug', 'name', 'created_at', 'updated_at')
            ->orderBy('created_at')
            ->get();

        return response()->json($pages);
    }

    public function show(string $slug): JsonResponse
    {
        $page = BuilderPage::where('slug', $slug)->first();

        if (!$page) {
            return response()->json(['message' => 'Page not found'], 404);
        }

        return response()->json($page);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255',
        ]);

        $name = trim($validated['name']) ?: 'Nouvelle page';
        $slug = $this->uniqueSlug($validated['slug'] ?? $name);

        $page = BuilderPage::create([
            'slug' => $slug,
            'name' => $name,
            'layout' => null,
        ]);

        return response()->json([
            'message' => 'Page created.',
            'page' => $page,
        ], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $page = BuilderPage::find($id);

        if (!$page) {
            return response()->json(['message' => 'Page not found'], 404);
        }

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'slug' => 'nullable|string|max:255',
            'layout' => 'nullable|array',
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

        $page->save();

        return response()->json([
            'message' => 'Page updated.',
            'page' => $page,
        ]);
    }

    public function destroy(string $id): JsonResponse
    {
        $page = BuilderPage::find($id);

        if (!$page) {
            return response()->json(['message' => 'Page not found'], 404);
        }

        $page->delete();

        return response()->json(['message' => 'Page deleted.']);
    }

    public function duplicate(string $id): JsonResponse
    {
        $src = BuilderPage::find($id);

        if (!$src) {
            return response()->json(['message' => 'Page not found'], 404);
        }

        $page = BuilderPage::create([
            'slug' => $this->uniqueSlug($src->slug . '-copy'),
            'name' => $src->name . ' (copie)',
            'layout' => $src->layout,
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

        while (BuilderPage::where('slug', $slug)
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

        return $slug->isEmpty() ? 'page-' . Str::random(7) : $slug->value();
    }
}
