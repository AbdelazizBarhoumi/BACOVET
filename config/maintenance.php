<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Maintenance panel
    |--------------------------------------------------------------------------
    |
    | `enabled` turns the /maintenance page on/off.
    | `token` is the secret that must be entered in the UI before any command
    | can run. It is read from the MAINTENANCE_TOKEN env variable. When it is
    | null/empty every run request is refused (fail-closed).
    |
    | `commands` is the strict allowlist of artisan commands the page may run.
    | Each entry must provide:
    |   - id:          stable key used by the API (never user-supplied)
    |   - label:       human readable name (shown in the UI)
    |   - signature:   the exact artisan signature, e.g. "migrate --force".
    |                  This string is executed verbatim; it is NEVER derived
    |                  from user input.
    |   - category:    grouping key for the UI
    |   - description: short help text
    |   - confirm:     when true the UI asks for confirmation before running
    |
    | Destructive commands such as migrate:fresh / migrate:refresh are
    | intentionally NOT part of the allowlist.
    |
    */

    'enabled' => env('MAINTENANCE_PANEL_ENABLED', true),

    'token' => env('MAINTENANCE_TOKEN'),

    'commands' => [
        // ── Information ─────────────────────────────────────────────────────
        [
            'id' => 'about',
            'label' => 'Informations applicatives',
            'signature' => 'about',
            'category' => 'info',
            'description' => 'Affiche les informations de version et de configuration du framework.',
            'confirm' => false,
        ],

        // ── Cache & optimisation ───────────────────────────────────────────
        [
            'id' => 'cache:clear',
            'label' => 'Vider le cache',
            'signature' => 'cache:clear',
            'category' => 'cache',
            'description' => 'Laravel cache:clear — purge le cache d\'application.',
            'confirm' => false,
        ],
        [
            'id' => 'config:clear',
            'label' => 'Config : purge cache',
            'signature' => 'config:clear',
            'category' => 'cache',
            'description' => 'Supprime la configuration en cache (config:clear).',
            'confirm' => false,
        ],
        [
            'id' => 'route:clear',
            'label' => 'Routes : purge cache',
            'signature' => 'route:clear',
            'category' => 'cache',
            'description' => 'Supprime le cache des routes (route:clear).',
            'confirm' => false,
        ],
        [
            'id' => 'view:clear',
            'label' => 'Vues : purge cache',
            'signature' => 'view:clear',
            'category' => 'cache',
            'description' => 'Supprime le cache des vues Blade (view:clear).',
            'confirm' => false,
        ],
        [
            'id' => 'optimize:clear',
            'label' => 'Optimisation : purge complète',
            'signature' => 'optimize:clear',
            'category' => 'cache',
            'description' => 'Supprime tous les caches de bootstrap (config, routes, views, events).',
            'confirm' => false,
        ],
        [
            'id' => 'optimize',
            'label' => 'Optimiser le bootstrap',
            'signature' => 'optimize',
            'category' => 'cache',
            'description' => 'Recompile config, routes et views pour la production.',
            'confirm' => true,
        ],
        [
            'id' => 'cache:prune-stale-tags',
            'label' => 'Purger les tags expirés',
            'signature' => 'cache:prune-stale-tags',
            'category' => 'cache',
            'description' => 'Supprime les tags de cache expirés (cache:prune-stale-tags).',
            'confirm' => false,
        ],

        // ── Base de données ──────────────────────────────────────────────────
        [
            'id' => 'migrate',
            'label' => 'Migrer la base de données',
            'signature' => 'migrate --force',
            'category' => 'database',
            'description' => 'Exécute les migrations en mode production (--force).',
            'confirm' => true,
        ],
        [
            'id' => 'db:seed',
            'label' => 'Lancer les seeders',
            'signature' => 'db:seed --force',
            'category' => 'database',
            'description' => 'Exécute les seeders en mode production (--force).',
            'confirm' => true,
        ],

        // ── File d\'attente & planificateur ──────────────────────────────────
        [
            'id' => 'queue:restart',
            'label' => 'Redémarrer les workers queue',
            'signature' => 'queue:restart',
            'category' => 'queue',
            'description' => 'Demande aux workers de redémarrer après le job courant.',
            'confirm' => true,
        ],
        [
            'id' => 'schedule:list',
            'label' => 'Lister les tâches planifiées',
            'signature' => 'schedule:list',
            'category' => 'queue',
            'description' => 'Affiche la liste des commandes planifiées (schedule:list).',
            'confirm' => false,
        ],
        [
            'id' => 'schedule:run',
            'label' => 'Exécuter les tâches dues',
            'signature' => 'schedule:run',
            'category' => 'queue',
            'description' => 'Exécute manuellement les tâches planifiées dues.',
            'confirm' => true,
        ],

        // ── Mode maintenance (down/up) ───────────────────────────────────────
        // `down` met tout le site en maintenance (HTTP 503), y compris cette
        // page. Pour récupérer via le navigateur, accédez à /<secret>; sinon
        // relancez la commande `up` en CLI.
        [
            'id' => 'down',
            'label' => 'Passer le site en maintenance',
            'signature' => 'down --secret=baco-vet-secret-2026 --render=errors.503',
            'category' => 'maintenance',
            'description' => 'Active le mode maintenance Laravel (503) avec un secret de contournement. La page elle-même devient inaccessible.',
            'confirm' => true,
        ],
        [
            'id' => 'up',
            'label' => 'Sortir du mode maintenance',
            'signature' => 'up',
            'category' => 'maintenance',
            'description' => 'Désactive le mode maintenance Laravel (à utiliser en CLI si la page est inaccessible).',
            'confirm' => true,
        ],

        // ── Synchronisation des données ──────────────────────────────────────
        [
            'id' => 'sync:endpoint-data',
            'label' => 'Sync endpoints builder',
            'signature' => 'sync:endpoint-data',
            'category' => 'sync',
            'description' => 'Rafraîchit le registre endpoints et les datasets du builder depuis NOVACITY_BASE_URL.',
            'confirm' => false,
        ],
        [
            'id' => 'sync:endpoint-data:refresh',
            'label' => 'Rafraîchir le registre endpoints',
            'signature' => 'sync:endpoint-data --phase=refresh --force',
            'category' => 'sync',
            'description' => 'Recharge la liste des endpoints Novacity (registre forcé).',
            'confirm' => false,
        ],
    ],
];
