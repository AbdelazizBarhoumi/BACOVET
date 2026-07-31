<?php

use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'role' => \App\Http\Middleware\CheckRole::class,
            'audit' => \App\Http\Middleware\LogAuditTrail::class,
            'active.user' => \App\Http\Middleware\EnsureActiveUser::class,
            'standalone.user' => \App\Http\Middleware\ResolveStandaloneUser::class,
            'v4.auth' => \App\Http\Middleware\EnsureV4Authenticated::class,
        ]);

        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        $middleware->validateCsrfTokens(except: [
            'browser-log',
            'auth/login',
            'api/data-auth/*',
            'api/v4-auth/*',
            'api/builder-pages/*',
            'api/builder-pages',
            'api/v4/builder-pages/*',
            'api/v4/builder-pages',
            'api/v4/builder-page-groups/*',
            'api/v4/builder-page-groups',
        ]);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
