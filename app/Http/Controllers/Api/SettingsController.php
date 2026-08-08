<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    /**
     * Read a persisted setting (e.g. the sync interval). Returns null when the
     * key was never stored so callers fall back to their default.
     */
    public function show(string $key): JsonResponse
    {
        return response()->json([
            'key' => $key,
            'value' => Setting::get($key),
        ]);
    }

    /**
     * Upsert a setting (key/value) so UI preferences like the sync interval
     * survive a reload and drive the scheduler.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'key' => ['required', 'string', 'max:255'],
            'value' => ['nullable', 'string', 'max:2000'],
        ]);

        Setting::set($data['key'], $data['value'] ?? null, $request->user()?->id);

        return response()->json(['key' => $data['key'], 'value' => $data['value'] ?? null]);
    }
}
