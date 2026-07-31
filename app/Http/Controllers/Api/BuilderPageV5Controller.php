<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BuilderActivityLogV5;
use App\Models\BuilderPageV5;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BuilderPageV5Controller extends Controller
{
    public function index(): JsonResponse
    {
        $pages = BuilderPageV5::select('id', 'slug', 'name', 'group_id', 'created_at', 'updated_at')
            ->orderBy('created_at')
            ->get();

        return response()->json($pages);
    }

    public function show(string $slug): JsonResponse
    {
        $page = BuilderPageV5::where('slug', $slug)->first();

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
            'group_id' => 'nullable|integer|exists:builder_page_groups_v5,id',
        ]);

        $name = trim($validated['name']) ?: 'Nouvelle page';
        $slug = $this->uniqueSlug($validated['slug'] ?? $name);

        $page = BuilderPageV5::create([
            'slug' => $slug,
            'name' => $name,
            'layout' => null,
            'group_id' => $validated['group_id'] ?? null,
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
        $page = BuilderPageV5::find($id);

        if (! $page) {
            return response()->json(['message' => 'Page not found'], 404);
        }

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'slug' => 'nullable|string|max:255',
            'layout' => 'nullable|array',
            'group_id' => 'nullable|integer|exists:builder_page_groups_v5,id',
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
            $this->logActivity('layout.save', [
                'page_id' => $page->id,
                'page_slug' => $page->slug,
                'page_name' => $page->name,
                'detail' => $this->diffLayouts($oldLayout, $page->layout),
            ]);
        }

        if (array_key_exists('group_id', $validated) && $validated['group_id'] !== $page->group_id) {
            $before = $page->group_id;
            $page->group_id = $validated['group_id'];
            $this->logActivity('page.update', [
                'page_id' => $page->id,
                'page_slug' => $page->slug,
                'page_name' => $page->name,
                'detail' => ['field' => 'group_id', 'before' => $before, 'after' => $page->group_id],
            ]);
        }

        $page->save();

        return response()->json([
            'message' => 'Page updated.',
            'page' => $page,
        ]);
    }

    public function destroy(string $id): JsonResponse
    {
        $page = BuilderPageV5::find($id);

        if (! $page) {
            return response()->json(['message' => 'Page not found'], 404);
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
        $src = BuilderPageV5::find($id);

        if (! $src) {
            return response()->json(['message' => 'Page not found'], 404);
        }

        $page = BuilderPageV5::create([
            'slug' => $this->uniqueSlug($src->slug.'-copy'),
            'name' => $src->name.' (copie)',
            'layout' => $src->layout,
            'group_id' => $src->group_id,
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

    private function uniqueSlug(string $base, $exceptId = null): string
    {
        $slug = $this->slugify($base);
        $i = 2;

        while (BuilderPageV5::where('slug', $slug)
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
        BuilderActivityLogV5::create(array_merge([
            'user_id' => auth()->guard('v5_users')->id(),
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
