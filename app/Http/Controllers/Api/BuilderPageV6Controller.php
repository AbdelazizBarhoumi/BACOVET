<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BuilderPageV6;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BuilderPageV6Controller extends Controller
{
    public function first(): JsonResponse
    {
        $page = BuilderPageV6::orderBy('id')->first();
        if (! $page) return response()->json(['message' => 'No V6 dashboard exists.'], 404);
        return response()->json($page);
    }

    public function show(string $slug): JsonResponse
    {
        $page = BuilderPageV6::where('slug', $slug)->first();
        return $page
            ? response()->json($page)
            : response()->json(['message' => 'Dashboard not found.'], 404);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $page = BuilderPageV6::find($id);
        if (! $page) return response()->json(['message' => 'Dashboard not found.'], 404);
        $validated = $request->validate(['layout' => 'nullable|array']);
        if (array_key_exists('layout', $validated)) $page->layout = $validated['layout'];
        $page->save();
        return response()->json(['message' => 'Dashboard updated.', 'page' => $page]);
    }
}
