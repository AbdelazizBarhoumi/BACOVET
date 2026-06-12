<?php

namespace App\Http\Controllers;

use App\Http\Requests\BrowserLogRequest;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Log;

class BrowserLogController extends Controller
{
    public function store(BrowserLogRequest $request)
    {
        $data = $request->validated();

        $map = [
            'log' => 'info',
            'info' => 'info',
            'warn' => 'warning',
            'warning' => 'warning',
            'error' => 'error',
            'debug' => 'debug',
        ];

        $level = $map[$data['level']] ?? 'debug';

        Log::channel('browser')->log($level, $data['message'], [
            'url' => $data['url'] ?? null,
            'ip' => request()->ip(),
            'user_id' => optional(request()->user())->id,
            'user_agent' => request()->userAgent(),
        ]);

        return response()->json(['status' => 'logged']);
    }
}
