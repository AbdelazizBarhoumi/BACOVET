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
    |   - group:       optional sort order within the category
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
            'description' => 'Remove la configuration en cache (config:clear).',
            'confirm' => false,
        ],
        [
            'id' => 'route:clear',
            'label' => 'Routes : purge cache',
            'signature' => 'route:clear',
            'category' => 'cache',
            'description' => 'Remove le cache des routes (route:clear).',
            'confirm' => false,
        ],
        [
            'id' => 'view:clear',
            'label' => 'Vues : purge cache',
            'signature' => 'view:clear',
            'category' => 'cache',
            'description' => 'Remove le cache des vues Blade (view:clear).',
            'confirm' => false,
        ],
        [
            'id' => 'optimize:clear',
            'label' => 'Optimisation : purge complète',
            'signature' => 'optimize:clear',
            'category' => 'cache',
            'description' => 'Remove tous les caches de bootstrap (config, routes, views, events).',
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

        // ── Synchronisation des données ──────────────────────────────────────
        [
            'id' => 'sync:quality',
            'label' => 'Sync Qualité',
            'signature' => 'sync:quality',
            'category' => 'sync',
            'description' => 'Synchronise les données Qualité (Novacity QCM).',
            'confirm' => false,
        ],
        [
            'id' => 'sync:production',
            'label' => 'Sync Production',
            'signature' => 'sync:production',
            'category' => 'sync',
            'description' => 'Synchronise les données Production (Novacity SDT).',
            'confirm' => false,
        ],
        [
            'id' => 'sync:logistics',
            'label' => 'Sync Logistique',
            'signature' => 'sync:logistics',
            'category' => 'sync',
            'description' => 'Synchronise les données Logistique (Novacity DIVATEX).',
            'confirm' => false,
        ],
        [
            'id' => 'sync:drive',
            'label' => 'Sync Google Drive',
            'signature' => 'sync:drive',
            'category' => 'sync',
            'description' => 'Synchronise les fichiers Google Drive.',
            'confirm' => false,
        ],
        [
            'id' => 'sync:gpro',
            'label' => 'Sync GPRO Consulting',
            'signature' => 'sync:gpro',
            'category' => 'sync',
            'description' => 'Synchronise les données GPRO Consulting.',
            'confirm' => false,
        ],
        [
            'id' => 'sync:full',
            'label' => 'Sync complète (toutes sources)',
            'signature' => 'sync:full',
            'category' => 'sync',
            'description' => 'Synchronise toutes les sources Novacity + Drive + GPRO.',
            'confirm' => true,
        ],
        [
            'id' => 'sync:kpi-endpoints',
            'label' => 'Sync KPI Endpoints',
            'signature' => 'sync:kpi-endpoints',
            'category' => 'sync',
            'description' => 'Met à jour les endpoints KPI (toutes fréquences).',
            'confirm' => false,
        ],
        [
            'id' => 'sync:instant-endpoints',
            'label' => 'Sync endpoints instantanés',
            'signature' => 'sync:instant-endpoints',
            'category' => 'sync',
            'description' => 'Rejoue les endpoints à fréquence instantanée.',
            'confirm' => false,
        ],
        [
            'id' => 'sync:endpoint-datasets',
            'label' => 'Sync datasets V5',
            'signature' => 'sync:endpoint-datasets',
            'category' => 'sync',
            'description' => 'Rafraîchit les datasets du builder V5.',
            'confirm' => false,
        ],
        [
            'id' => 'endpoints:refresh',
            'label' => 'Rafraîchir le registre endpoints',
            'signature' => 'endpoints:refresh',
            'category' => 'sync',
            'description' => 'Recharge la liste des endpoints Novacity.',
            'confirm' => false,
        ],

        // ── Export ───────────────────────────────────────────────────────────
        [
            'id' => 'export:mappings',
            'label' => 'Exporter les mappings',
            'signature' => 'export:mappings',
            'category' => 'export',
            'description' => 'Génère le fichier config des data-mappings.',
            'confirm' => false,
        ],
        [
            'id' => 'export:endpoints',
            'label' => 'Exporter les endpoints',
            'signature' => 'export:endpoints',
            'category' => 'export',
            'description' => 'Génère le fichier config des endpoints.',
            'confirm' => false,
        ],
        [
            'id' => 'export:page-data',
            'label' => 'Exporter les données de pages',
            'signature' => 'export:page-data',
            'category' => 'export',
            'description' => 'Génère le JSON des données de pages publiques.',
            'confirm' => false,
        ],
    ],
];
