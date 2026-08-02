<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MeasureLibraryV6;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MeasureLibraryV6Controller extends Controller
{
    public function index(): JsonResponse
    {
        $measures = MeasureLibraryV6::orderByRaw('category IS NULL')->orderBy('category')->orderBy('name')->get();

        return response()->json(['measures' => $measures]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:measures_library_v6,name',
            'expression' => 'required|string|min:1',
            'description' => 'nullable|string|max:1000',
            'category' => 'nullable|string|max:255',
        ]);

        $measure = MeasureLibraryV6::create($validated);

        return response()->json(['message' => 'Mesure partagée créée.', 'measure' => $measure], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $measure = MeasureLibraryV6::find($id);
        if (! $measure) {
            return response()->json(['message' => 'Mesure partagée introuvable.'], 404);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:measures_library_v6,name,'.$measure->id,
            'expression' => 'required|string|min:1',
            'description' => 'nullable|string|max:1000',
            'category' => 'nullable|string|max:255',
        ]);

        $measure->update($validated);

        return response()->json(['message' => 'Mesure partagée mise à jour.', 'measure' => $measure]);
    }

    public function destroy(string $id): JsonResponse
    {
        $measure = MeasureLibraryV6::find($id);
        if (! $measure) {
            return response()->json(['message' => 'Mesure partagée introuvable.'], 404);
        }

        $measure->delete();

        return response()->json(['message' => 'Mesure partagée supprimée.']);
    }
}
