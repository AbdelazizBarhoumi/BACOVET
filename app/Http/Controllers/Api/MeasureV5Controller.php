<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BuilderActivityLogV5;
use App\Models\MeasureV5;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MeasureV5Controller extends Controller
{
    public function index(): JsonResponse
    {
        $measures = MeasureV5::query()
            ->orderBy('category')
            ->orderBy('name')
            ->get();

        return response()->json(['measures' => $measures]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:measures_v5,name',
            'expression' => 'required|string',
            'category' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:2000',
        ]);

        $measure = MeasureV5::create([
            'name' => trim($validated['name']),
            'expression' => $validated['expression'],
            'category' => isset($validated['category']) && trim($validated['category']) !== ''
                ? trim($validated['category'])
                : null,
            'description' => $validated['description'] ?? null,
        ]);

        $this->logActivity('measure.create', $measure);

        return response()->json([
            'message' => 'Measure created.',
            'measure' => $measure,
        ], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $measure = MeasureV5::find($id);

        if (! $measure) {
            return response()->json(['message' => 'Measure not found'], 404);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:measures_v5,name,'.$measure->id,
            'expression' => 'required|string',
            'category' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:2000',
        ]);

        $before = $measure->getOriginal();
        $measure->name = trim($validated['name']);
        $measure->expression = $validated['expression'];
        $measure->category = isset($validated['category']) && trim($validated['category']) !== ''
            ? trim($validated['category'])
            : null;
        $measure->description = $validated['description'] ?? null;
        $measure->save();

        $this->logActivity('measure.update', $measure, $before);

        return response()->json([
            'message' => 'Measure updated.',
            'measure' => $measure,
        ]);
    }

    public function destroy(string $id): JsonResponse
    {
        $measure = MeasureV5::find($id);

        if (! $measure) {
            return response()->json(['message' => 'Measure not found'], 404);
        }

        $this->logActivity('measure.delete', $measure, $measure->getOriginal());
        $measure->delete();

        return response()->json(['message' => 'Measure deleted.']);
    }

    private function logActivity(string $action, MeasureV5 $measure, array $before = []): void
    {
        BuilderActivityLogV5::create([
            'user_id' => auth()->guard('v5_users')->id(),
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'action' => $action,
            'detail' => [
                'measure_id' => $measure->id,
                'name' => $measure->name,
                'expression' => $measure->expression,
                'category' => $measure->category,
                'before' => $before,
            ],
            'created_at' => now(),
        ]);
    }
}
