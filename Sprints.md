# BACOVET — Laravel + MySQL Backend Architecture
## Full Backend Spec + Revised Sprint Plans (Sprints 0–8)

---

## ARCHITECTURE OVERVIEW

```
[React SPA Frontend]
        │  HTTP (cookie session / CSRF)
        ▼
[Laravel 12 Backend — OUR API]
        │
        ├── MySQL 8.0 (local data, users, synced Novacity data)
        │
        └── Novacity API (via SyncService — backend only, NEVER frontend)
```

**Key principle:** The frontend NEVER calls Novacity directly.
All Novacity data flows through the Laravel sync pipeline → MySQL → Laravel API → Frontend.
Auth, role checks, and all business logic live exclusively on the Laravel backend.

---

## STACK

| Layer        | Technology                        |
|--------------|-----------------------------------|
| Framework    | Laravel 12                        |
| Auth         | Laravel Sanctum (SPA / stateful)  |
| Database     | MySQL 8.0                         |
| Queue driver | database                          |
| Scheduler    | Laravel Scheduler (cron)          |
| Cache        | database      |
| HTTP Client  | Laravel Http (Guzzle wrapper)     |

---

## PROJECT STRUCTURE

```
app/
  Console/
    Commands/
      SyncNovacityQuality.php
      SyncNovacityProduction.php
      SyncNovacityLogistics.php
      SyncNovacityFull.php
  Http/
    Controllers/Api/
      AuthController.php
      AdminController.php
      QualityController.php
      ProductionController.php
      LogisticsController.php
      MethodesController.php
      DevelopmentController.php
      FilterController.php
    Middleware/
      CheckRole.php
      LogAuditTrail.php
      EnsureActiveUser.php
  Models/
    User.php  Role.php  AuditLog.php  Screen.php
    ManualKpiValue.php  NovacityJob.php
    (+ all data models listed in migrations)
  Services/
    NovacityService.php       # HTTP client → Novacity API
    SyncService.php           # orchestrates all sync operations
    KpiComputeService.php     # computes KPI values from DB
    AlertService.php          # generates alert list from KPIs

config/
  novacity.php

database/migrations/
  (all migrations below)

routes/
  api.php
```

---

## INSTALLATION & ENV SETUP

```bash
composer require laravel/sanctum
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
php artisan migrate
```

**.env additions:**
```env
# Novacity API — backend only, never exposed to frontend
NOVACITY_BASE_URL=https://novacity-server.local
NOVACITY_API_KEY=your_x_api_key_here
NOVACITY_TIMEOUT=10

# SPA frontend origin (for Sanctum CORS)
SANCTUM_STATEFUL_DOMAINS=localhost:5173,app.bacovet.local
SESSION_DOMAIN=.bacovet.local

# App
APP_URL=http://api.bacovet.local
FRONTEND_URL=http://localhost:5173
```

**config/novacity.php:**
```php
<?php
return [
    'base_url' => env('NOVACITY_BASE_URL'),
    'api_key'  => env('NOVACITY_API_KEY'),
    'timeout'  => env('NOVACITY_TIMEOUT', 10),
];
```

**config/cors.php** — allow frontend origin with credentials:
```php
'paths'                    => ['api/*', 'sanctum/csrf-cookie'],
'allowed_origins'          => [env('FRONTEND_URL', 'http://localhost:5173')],
'allowed_methods'          => ['*'],
'allowed_headers'          => ['*'],
'supports_credentials'     => true,
```

---

## DATABASE MIGRATIONS (in order)

### M-001 — roles

```php
// database/migrations/2026_01_01_000001_create_roles_table.php
Schema::create('roles', function (Blueprint $table) {
    $table->id();
    $table->string('name');           // "IT / Administrateur"
    $table->string('slug')->unique(); // "it", "direction", "resp_production" …
    $table->timestamps();
});
```

**Seeds (RoleSeeder):**
```php
$roles = [
    ['name' => 'IT / Administrateur',    'slug' => 'it'],
    ['name' => 'Direction',              'slug' => 'direction'],
    ['name' => 'Responsable Production', 'slug' => 'resp_production'],
    ['name' => 'Chef d\'Atelier',        'slug' => 'chef_atelier'],
    ['name' => 'Responsable Qualité',    'slug' => 'resp_qualite'],
    ['name' => 'Méthodes / Planning',    'slug' => 'methodes'],
    ['name' => 'Coupe',                  'slug' => 'coupe'],
];
```

---

### M-002 — users

```php
// database/migrations/2026_01_01_000002_create_users_table.php
Schema::create('users', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->string('matricule')->unique();   // EID
    $table->string('email')->unique()->nullable();
    $table->string('password');
    $table->foreignId('role_id')->constrained('roles');
    $table->boolean('is_active')->default(true);
    $table->ipAddress('last_login_ip')->nullable();
    $table->timestamp('last_login_at')->nullable();
    $table->rememberToken();
    $table->timestamps();

    $table->index('matricule');
    $table->index('role_id');
});
```

---

### M-003 — audit_logs

```php
Schema::create('audit_logs', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
    $table->enum('action_type', ['INFO', 'USER', 'WARN', 'ERROR', 'SYSTEM']);
    $table->text('message');
    $table->ipAddress('ip_address')->nullable();
    $table->string('user_agent', 500)->nullable();
    $table->timestamp('created_at')->useCurrent();

    $table->index(['action_type', 'created_at']);
});
```

---

### M-004 — screens

```php
Schema::create('screens', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->enum('status', ['online', 'offline'])->default('offline');
    $table->enum('assigned_page', [
        'quality', 'production_confection', 'production_coupe',
        'production_serigraphie', 'logistics', 'methodes',
        'development', 'admin'
    ])->nullable();
    $table->timestamps();
});
```

---

### M-005 — manual_kpi_values

```php
// For F-REQ-218, F-REQ-219, and all 6 Development KPIs
Schema::create('manual_kpi_values', function (Blueprint $table) {
    $table->id();
    $table->string('kpi_key')->unique(); // e.g. "f_req_218", "dev_rft"
    $table->string('kpi_label');
    $table->decimal('numerator', 15, 4)->nullable();
    $table->decimal('denominator', 15, 4)->nullable();
    $table->decimal('value', 8, 4)->nullable();  // precomputed %
    $table->string('note', 500)->nullable();
    $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
    $table->timestamps();
});
```

**Seeds (ManualKpiSeeder):**
```php
$keys = [
    // Méthodes
    ['kpi_key' => 'f_req_218', 'kpi_label' => 'Respect Temps Estimé'],
    ['kpi_key' => 'f_req_219', 'kpi_label' => 'Temps Acceptés 1ère Version'],
    // Development
    ['kpi_key' => 'dev_rft',          'kpi_label' => 'RFT Développement'],
    ['kpi_key' => 'dev_livraison',    'kpi_label' => 'Respect Livraison à Date'],
    ['kpi_key' => 'dev_nomenclature', 'kpi_label' => 'Fiabilité Nomenclature'],
    ['kpi_key' => 'dev_reclamations', 'kpi_label' => '% Réclamations Production'],
    ['kpi_key' => 'dev_dechiffrage',  'kpi_label' => 'Déchiffrage Cotation'],
    ['kpi_key' => 'dev_etalonnage',   'kpi_label' => 'Étalonnage'],
];
```

---

### M-006 — novacity_sync_jobs

```php
// Mirrors the Novacity /api/admin/jobs endpoint, updated by SyncService
Schema::create('novacity_sync_jobs', function (Blueprint $table) {
    $table->id();
    $table->integer('novacity_job_id')->unique();
    $table->string('name');
    $table->string('query_slug')->nullable();
    $table->enum('source', ['DIVA', 'GPRO', 'GPRO_CONSULTING', 'GOOGLE_DRIVE', 'OTHER'])
          ->default('OTHER');
    $table->enum('last_status', ['ok', 'error', 'inactive', 'pending'])->default('pending');
    $table->integer('records_count')->nullable();
    $table->integer('response_time_ms')->nullable();
    $table->timestamp('last_run_at')->nullable();
    $table->text('last_error')->nullable();
    $table->boolean('is_active')->default(true);
    $table->timestamps();

    $table->index('source');
    $table->index('last_status');
});
```

---

### M-007 — personal_access_tokens (Sanctum)

```php
// Already created by Sanctum migration, but include in order
// php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
```

---

## DATA TABLES (Synced from Novacity)

> All sync tables include `synced_at` and `sync_batch` columns for tracking freshness.

---

### M-008 — efficience_chaine

```php
Schema::create('efficience_chaine', function (Blueprint $table) {
    $table->id();
    $table->string('chaine', 20);
    $table->date('date');
    $table->decimal('efficience_pct', 6, 2);
    $table->timestamp('synced_at')->useCurrent();

    $table->index(['chaine', 'date']);
    $table->index('date');
});
```

---

### M-009 — wip_chaine

```php
Schema::create('wip_chaine', function (Blueprint $table) {
    $table->id();
    $table->string('chaine', 20);
    $table->string('of_number', 50)->nullable();
    $table->integer('en_cours')->default(0);
    $table->integer('entree_jour')->default(0);
    $table->integer('sortie_jour')->default(0);
    $table->timestamp('synced_at')->useCurrent();

    $table->index('chaine');
});
```

---

### M-010 — check_pass_qte

```php
Schema::create('check_pass_qte', function (Blueprint $table) {
    $table->id();
    $table->date('log_date');
    $table->string('shortname', 50);    // chain name
    $table->string('shift_code', 10)->nullable();
    $table->decimal('defect_pct', 6, 2);
    $table->timestamp('synced_at')->useCurrent();

    $table->index(['shortname', 'log_date']);
    $table->index('log_date');
});
```

---

### M-011 — vw_defects

```php
Schema::create('vw_defects', function (Blueprint $table) {
    $table->id();
    $table->date('log_date');
    $table->string('shift_code', 10)->nullable();
    $table->string('prod_group', 50)->nullable();
    $table->string('op_no', 50);
    $table->integer('qty')->default(0);
    $table->timestamp('synced_at')->useCurrent();

    $table->index(['log_date', 'op_no']);
    $table->index('log_date');
});
```

---

### M-012 — qcm_defect_trx

```php
Schema::create('qcm_defect_trx', function (Blueprint $table) {
    $table->id();
    $table->date('log_date');
    $table->string('item_id', 100);
    $table->string('shift_code', 10)->nullable();
    $table->integer('occurrence_count')->default(1);
    $table->timestamp('synced_at')->useCurrent();

    $table->index(['log_date', 'item_id']);
});
```

---

### M-013 — reject_qte

```php
Schema::create('reject_qte', function (Blueprint $table) {
    $table->id();
    $table->date('log_date');
    $table->string('chaine', 20)->nullable();
    $table->string('shift_code', 10)->nullable();
    $table->integer('qty')->default(0);
    $table->timestamp('synced_at')->useCurrent();

    $table->index('log_date');
});
```

---

### M-014 — pieces_ok_jour

```php
Schema::create('pieces_ok_jour', function (Blueprint $table) {
    $table->id();
    $table->date('date');
    $table->integer('first_pass_today')->default(0);
    $table->timestamp('synced_at')->useCurrent();

    $table->unique('date');
});
```

---

### M-015 — pieces_produites_jour

```php
Schema::create('pieces_produites_jour', function (Blueprint $table) {
    $table->id();
    $table->date('date');
    $table->integer('produced_today')->default(0);
    $table->timestamp('synced_at')->useCurrent();

    $table->unique('date');
});
```

---

### M-016 — pieces_ok_annee

```php
Schema::create('pieces_ok_annee', function (Blueprint $table) {
    $table->id();
    $table->year('year');
    $table->bigInteger('first_pass_year')->default(0);
    $table->timestamp('synced_at')->useCurrent();

    $table->unique('year');
});
```

---

### M-017 — pieces_produites_annee

```php
Schema::create('pieces_produites_annee', function (Blueprint $table) {
    $table->id();
    $table->year('year');
    $table->bigInteger('produced_year')->default(0);
    $table->timestamp('synced_at')->useCurrent();

    $table->unique('year');
});
```

---

### M-018 — rejets_inspection_paquet (bundling — B-01 INACTIVE)

```php
Schema::create('rejets_inspection_paquet', function (Blueprint $table) {
    $table->id();
    $table->date('date');
    $table->enum('period', ['jour', 'annee']);
    $table->integer('bundle_reject')->default(0);
    $table->integer('bundle_inspected')->default(0);
    $table->boolean('is_active')->default(false); // B-01 inactive
    $table->timestamp('synced_at')->useCurrent();

    $table->index(['date', 'period']);
});
```

---

### M-019 — qte_produite

```php
Schema::create('qte_produite', function (Blueprint $table) {
    $table->id();
    $table->date('date');
    $table->string('chaine', 20)->nullable();
    $table->string('shift_code', 10)->nullable();
    $table->integer('quantite')->default(0);
    $table->timestamp('synced_at')->useCurrent();

    $table->index(['date', 'chaine']);
    $table->index('date');
});
```

---

### M-020 — lost_time

```php
Schema::create('lost_time', function (Blueprint $table) {
    $table->id();
    $table->date('date');
    $table->string('chaine', 20)->nullable();
    $table->string('motif', 100)->nullable(); // MAINT, MATIERE, QUALITE
    $table->integer('minutes_perdues')->default(0);
    $table->timestamp('synced_at')->useCurrent();

    $table->index(['date', 'chaine']);
    $table->index('date');
});
```

---

### M-021 — etat_avancement

```php
Schema::create('etat_avancement', function (Blueprint $table) {
    $table->id();
    $table->string('of', 50);
    $table->string('chaine', 20)->nullable();
    $table->decimal('avancement_pct', 5, 2)->default(0);
    $table->integer('quantite_prevue')->default(0);
    $table->integer('quantite_realisee')->default(0);
    $table->enum('statut', ['en_cours', 'termine', 'planifie', 'en_attente'])
          ->default('en_cours');
    $table->timestamp('synced_at')->useCurrent();

    $table->index(['of', 'statut']);
    $table->index('statut');
});
```

---

### M-022 — taging_reel

```php
Schema::create('taging_reel', function (Blueprint $table) {
    $table->id();
    $table->date('date');
    $table->string('chaine', 20);
    $table->string('shift', 10)->nullable();
    $table->integer('tag_theorique')->default(0);
    $table->integer('tag_reel')->default(0);
    $table->decimal('ecart_pct', 6, 2)->default(0);
    $table->timestamp('synced_at')->useCurrent();

    $table->index(['chaine', 'date']);
    $table->index('date');
});
```

---

### M-023 — qte_produit_individuel_jour

```php
Schema::create('qte_produit_individuel_jour', function (Blueprint $table) {
    $table->id();
    $table->date('date');
    $table->string('employee_id', 50);
    $table->string('chaine', 20)->nullable();
    $table->string('poste', 50)->nullable();
    $table->integer('minutes_produites')->default(0);
    $table->integer('minutes_presence')->default(0);
    $table->timestamp('synced_at')->useCurrent();

    $table->index(['date', 'chaine']);
    $table->index('date');
});
```

---

### M-024 — minutes_presence

```php
Schema::create('minutes_presence', function (Blueprint $table) {
    $table->id();
    $table->date('date');
    $table->string('chaine', 20)->nullable();
    $table->string('shift_code', 10)->nullable();
    $table->integer('minutes_presence')->default(0);
    $table->timestamp('synced_at')->useCurrent();

    $table->index(['date', 'chaine']);
});
```

---

### M-025 — minutes_produites

```php
Schema::create('minutes_produites', function (Blueprint $table) {
    $table->id();
    $table->date('date');
    $table->string('chaine', 20)->nullable();
    $table->string('shift_code', 10)->nullable();
    $table->integer('minutes_produites')->default(0);
    $table->timestamp('synced_at')->useCurrent();

    $table->index(['date', 'chaine']);
});
```

---

### M-026 — of_fabrication

```php
Schema::create('of_fabrication', function (Blueprint $table) {
    $table->id();
    $table->string('of_number', 50)->unique();
    $table->string('article', 100)->nullable();
    $table->string('designation', 200)->nullable();
    $table->integer('quantite')->default(0);
    $table->date('dt_debut')->nullable();
    $table->date('dt_fin')->nullable();      // null = active
    $table->string('statut', 50)->nullable();
    $table->timestamp('synced_at')->useCurrent();
    $table->timestamps();

    $table->index('dt_fin');
    $table->index('statut');
});
```

---

### M-027 — sortie_coupe

```php
Schema::create('sortie_coupe', function (Blueprint $table) {
    $table->id();
    $table->date('date');
    $table->string('commande', 50);
    $table->string('article', 100)->nullable();
    $table->integer('quantite_coupee')->default(0);
    $table->timestamp('synced_at')->useCurrent();

    $table->index(['commande', 'date']);
    $table->index('date');
});
```

---

### M-028 — qte_engagement

```php
Schema::create('qte_engagement', function (Blueprint $table) {
    $table->id();
    $table->date('date');
    $table->string('commande', 50);
    $table->string('chaine', 20)->nullable();
    $table->integer('quantite_engagee')->default(0);
    $table->timestamp('synced_at')->useCurrent();

    $table->index(['commande', 'date']);
    $table->index(['chaine', 'date']);
});
```

---

### M-029 — qte_depart_chaine_article_of

```php
Schema::create('qte_depart_chaine_article_of', function (Blueprint $table) {
    $table->id();
    $table->string('of', 50);
    $table->string('chaine', 20)->nullable();
    $table->string('article', 100)->nullable();
    $table->integer('quantite')->default(0);
    $table->date('date')->nullable();
    $table->timestamp('synced_at')->useCurrent();

    $table->index(['of', 'chaine']);
});
```

---

### M-030 — packets_rejetes

```php
Schema::create('packets_rejetes', function (Blueprint $table) {
    $table->id();
    $table->string('id_colis', 100);
    $table->string('reference', 100)->nullable();
    $table->string('motif', 200)->nullable();
    $table->integer('qtte')->default(0);
    $table->timestamp('date_rejet')->nullable();
    $table->timestamp('synced_at')->useCurrent();

    $table->index('date_rejet');
});
```

---

### M-031 — qte_entree_serigraphie

```php
Schema::create('qte_entree_serigraphie', function (Blueprint $table) {
    $table->id();
    $table->date('date');
    $table->string('article', 100);
    $table->string('couleur', 50)->nullable();
    $table->integer('quantite')->default(0);
    $table->timestamp('synced_at')->useCurrent();

    $table->index(['date', 'article']);
});
```

---

### M-032 — sortie_serigraphie

```php
Schema::create('sortie_serigraphie', function (Blueprint $table) {
    $table->id();
    $table->date('date');
    $table->string('article', 100);
    $table->string('couleur', 50)->nullable();
    $table->integer('quantite')->default(0);
    $table->timestamp('synced_at')->useCurrent();

    $table->index(['date', 'article']);
});
```

---

### M-033 — inline_vs_endline_comparison

```php
Schema::create('inline_vs_endline_comparison', function (Blueprint $table) {
    $table->id();
    $table->date('log_date');
    $table->string('shift_code', 10)->nullable();
    $table->string('shortname', 50);  // chain
    $table->string('opera', 50);      // operation type: inline / endline
    $table->integer('count')->default(1);
    $table->timestamp('synced_at')->useCurrent();

    $table->index(['log_date', 'shortname']);
});
```

---

### M-034 — vue_stock

```php
Schema::create('vue_stock', function (Blueprint $table) {
    $table->id();
    $table->string('idmp', 100)->index();
    $table->string('code_mp', 100)->nullable();
    $table->string('designation', 300)->nullable();
    $table->string('famille', 100)->nullable();
    $table->string('couleur', 100)->nullable();
    $table->decimal('qtte', 15, 4)->default(0);
    $table->decimal('qtte_reserve', 15, 4)->default(0);
    $table->string('unite', 20)->nullable();
    $table->timestamp('synced_at')->useCurrent();

    $table->index('famille');
    $table->index('code_mp');
    // Full-text index for search
    $table->fullText(['code_mp', 'designation', 'famille']);
});
```

---

### M-035 — diva_stock

```php
Schema::create('diva_stock', function (Blueprint $table) {
    $table->id();
    $table->string('idmp', 100)->index();
    $table->decimal('qtte_diva', 15, 4)->default(0);
    $table->string('statut', 50)->nullable();
    $table->json('extra_data')->nullable();  // any additional DIVA fields
    $table->timestamp('synced_at')->useCurrent();

    $table->index('idmp');
});
```

---

### M-036 — stock_moyen (aggregate — latest row per sync)

```php
Schema::create('stock_moyen', function (Blueprint $table) {
    $table->id();
    $table->decimal('stock_moyen', 20, 4)->default(0);
    $table->integer('nb_lignes_stock')->default(0);
    $table->timestamp('synced_at')->useCurrent();
});
```

---

### M-037 — articles_sans_mouvement

```php
Schema::create('articles_sans_mouvement', function (Blueprint $table) {
    $table->id();
    $table->integer('nb_articles_sans_mvt_365j')->default(0);
    $table->decimal('qtte_sans_mvt_365j', 15, 4)->default(0);
    $table->timestamp('synced_at')->useCurrent();
});
```

---

### M-038 — quantite_totale_stock

```php
Schema::create('quantite_totale_stock', function (Blueprint $table) {
    $table->id();
    $table->decimal('quantite_totale_stock', 20, 4)->default(0);
    $table->timestamp('synced_at')->useCurrent();
});
```

---

### M-039 — capacite_stockage

```php
Schema::create('capacite_stockage', function (Blueprint $table) {
    $table->id();
    $table->integer('total_conteneurs')->default(0);
    $table->integer('conteneurs_actifs')->default(0);   // stored as INT (was string in API)
    $table->integer('conteneurs_consommes')->default(0);
    $table->integer('conteneurs_supprimes')->default(0);
    $table->timestamp('synced_at')->useCurrent();
});
```

---

### M-040 — nombre_rouleaux

```php
Schema::create('nombre_rouleaux', function (Blueprint $table) {
    $table->id();
    $table->integer('nb_rouleaux')->default(0);
    $table->timestamp('synced_at')->useCurrent();
});
```

---

### M-041 — nombre_ofs_livres

```php
Schema::create('nombre_ofs_livres', function (Blueprint $table) {
    $table->id();
    $table->integer('nb_of_livres_total')->default(0);
    $table->integer('of_avec_transfert_coupe')->default(0);
    $table->integer('of_avec_transfert_coupe_jemmel')->default(0);
    $table->integer('of_avec_transfert_coupe_total')->default(0);
    $table->timestamp('synced_at')->useCurrent();
});
```

---

### M-042 — moyenne_date_transfert

```php
Schema::create('moyenne_date_transfert', function (Blueprint $table) {
    $table->id();
    $table->decimal('moyenne_jours', 8, 4)->default(0); // stored as float (was string in API)
    $table->integer('nb_of_consideres')->default(0);
    $table->timestamp('synced_at')->useCurrent();
});
```

---

### M-043 — quantite_par_provenance

```php
Schema::create('quantite_par_provenance', function (Blueprint $table) {
    $table->id();
    $table->string('provenance', 100)->nullable();
    $table->decimal('quantite', 15, 4)->default(0);
    $table->integer('nb_articles')->default(0);
    $table->timestamp('synced_at')->useCurrent();

    $table->index('provenance');
});
```

---

### M-044 — quantite_par_famille

```php
Schema::create('quantite_par_famille', function (Blueprint $table) {
    $table->id();
    $table->string('famille_fg', 100)->nullable();
    $table->decimal('quantite', 15, 4)->default(0);
    $table->timestamp('synced_at')->useCurrent();

    $table->index('famille_fg');
});
```

---

### M-045 — quantite_par_typologie

```php
Schema::create('quantite_par_typologie', function (Blueprint $table) {
    $table->id();
    $table->string('typologie', 100)->nullable();
    $table->decimal('quantite', 15, 4)->default(0);
    $table->integer('nb_articles')->default(0);
    $table->timestamp('synced_at')->useCurrent();

    $table->index('typologie');
});
```

---

### M-046 — colis_total_var

```php
Schema::create('colis_total_var', function (Blueprint $table) {
    $table->id();
    $table->string('commande', 50)->nullable();
    $table->string('of', 50)->nullable();
    $table->integer('total_colis')->default(0);
    $table->integer('total_qte')->default(0);
    $table->json('extra_data')->nullable();
    $table->timestamp('synced_at')->useCurrent();

    $table->index('commande');
    $table->index('of');
});
```

---

### M-047 — detail_colis

```php
Schema::create('detail_colis', function (Blueprint $table) {
    $table->id();
    $table->string('id_colis', 100)->nullable();
    $table->string('commande', 50)->nullable();
    $table->string('article', 100)->nullable();
    $table->integer('qte')->default(0);
    $table->string('statut', 50)->nullable();
    $table->timestamp('synced_at')->useCurrent();

    $table->index('commande');
    $table->index('id_colis');
});
```

---

### M-048 — articles_colis

```php
Schema::create('articles_colis', function (Blueprint $table) {
    $table->id();
    $table->string('article', 100);
    $table->string('id_colis', 100)->nullable();
    $table->integer('qte')->default(0);
    $table->json('extra_data')->nullable();
    $table->timestamp('synced_at')->useCurrent();

    $table->index('article');
});
```

---

### M-049 — expeditions

```php
Schema::create('expeditions', function (Blueprint $table) {
    $table->id();
    $table->string('reference', 100)->nullable();
    $table->string('destination', 200)->nullable();
    $table->date('date_expedition')->nullable();
    $table->integer('qte_expedies')->default(0);
    $table->string('statut', 50)->nullable();
    $table->json('extra_data')->nullable();
    $table->timestamp('synced_at')->useCurrent();

    $table->index('date_expedition');
});
```

---

### M-050 — emp_defect_eff

```php
Schema::create('emp_defect_eff', function (Blueprint $table) {
    $table->id();
    $table->date('log_date');
    $table->string('employee_id', 50)->nullable();
    $table->string('shortname', 50)->nullable();
    $table->decimal('defect_rate', 6, 2)->default(0);
    $table->decimal('efficiency_pct', 6, 2)->default(0);
    $table->timestamp('synced_at')->useCurrent();

    $table->index('log_date');
});
```

---

### M-051 — inline_endline_raw (raw Novacity tables — kept for auditability)

```php
Schema::create('vw_item_trx', function (Blueprint $table) {
    $table->id();
    $table->json('raw_data');
    $table->timestamp('synced_at')->useCurrent();
});

Schema::create('item_trx_enq', function (Blueprint $table) {
    $table->id();
    $table->json('raw_data');
    $table->timestamp('synced_at')->useCurrent();
});

Schema::create('mp_data', function (Blueprint $table) {
    $table->id();
    $table->string('code_mp', 100)->nullable()->index();
    $table->string('designation', 300)->nullable();
    $table->string('famille', 100)->nullable();
    $table->json('extra_data')->nullable();
    $table->timestamp('synced_at')->useCurrent();
});

Schema::create('mp_conteneur', function (Blueprint $table) {
    $table->id();
    $table->string('code_mp', 100)->nullable()->index();
    $table->integer('nb_conteneurs')->default(0);
    $table->json('extra_data')->nullable();
    $table->timestamp('synced_at')->useCurrent();
});

Schema::create('mouvements', function (Blueprint $table) {
    $table->id();
    $table->date('date_mouvement')->nullable();
    $table->string('type_mouvement', 50)->nullable();
    $table->string('article', 100)->nullable();
    $table->integer('quantite')->default(0);
    $table->json('extra_data')->nullable();
    $table->timestamp('synced_at')->useCurrent();
    $table->index('date_mouvement');
});

Schema::create('lost_types', function (Blueprint $table) {
    $table->id();
    $table->string('code', 50)->unique();
    $table->string('label', 200)->nullable();
    $table->json('extra_data')->nullable();
    $table->timestamp('synced_at')->useCurrent();
});

Schema::create('rover_effectiveness', function (Blueprint $table) {
    $table->id();
    $table->date('log_date')->nullable();
    $table->string('chaine', 20)->nullable();
    $table->decimal('effectiveness_pct', 6, 2)->default(0);
    $table->json('extra_data')->nullable();
    $table->timestamp('synced_at')->useCurrent();
    $table->index('log_date');
});

Schema::create('temps_operation', function (Blueprint $table) {
    $table->id();
    $table->date('date')->nullable();
    $table->string('operation_code', 50)->nullable();
    $table->string('chaine', 20)->nullable();
    $table->decimal('temps_min', 8, 3)->default(0);
    $table->json('extra_data')->nullable();
    $table->timestamp('synced_at')->useCurrent();
    $table->index('date');
});
```
---
### M-052 — sync_settings migration
phpSchema::create('sync_settings', function (Blueprint $table) {
    $table->id();
    $table->string('key')->unique();   // e.g. 'quality_interval_seconds'
    $table->string('value');
    $table->string('description')->nullable();
    $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
    $table->timestamps();
});
Seeder:
phpSyncSetting::insert([
    ['key' => 'quality_interval_seconds',    'value' => '60',  'description' => 'Intervalle sync Qualité'],
    ['key' => 'production_interval_seconds', 'value' => '60',  'description' => 'Intervalle sync Production'],
    ['key' => 'logistics_interval_seconds',  'value' => '300', 'description' => 'Intervalle sync Logistique'],
]);

SyncSettings model
phpclass SyncSetting extends Model
{
    protected $fillable = ['key', 'value', 'updated_by'];

    public static function get(string $key, int $default = 60): int
    {
        return (int) Cache::remember("sync_setting:{$key}", 30, fn() =>
            static::where('key', $key)->value('value') ?? $default
        );
    }
}
The Cache::remember(30) means: read from Redis/cache for 30s, then re-read from DB. This way an admin change takes effect within 30 seconds without a server restart.

Revised Kernel.php — reads interval from DB
phpprotected function schedule(Schedule $schedule): void
{
    // Quality — configurable, minimum 1 minute (cron granularity)
    $schedule->command('sync:quality')
             ->when(fn() => $this->isDue('quality_interval_seconds'))
             ->everyMinute()
             ->name('sync-quality')
             ->withoutOverlapping(5);

    $schedule->command('sync:production')
             ->when(fn() => $this->isDue('production_interval_seconds'))
             ->everyMinute()
             ->name('sync-production')
             ->withoutOverlapping(5);

    $schedule->command('sync:logistics')
             ->when(fn() => $this->isDue('logistics_interval_seconds'))
             ->everyMinute()
             ->name('sync-logistics')
             ->withoutOverlapping(10);
}

private function isDue(string $settingKey): bool
{
    $intervalSeconds = SyncSetting::get($settingKey, 60);
    $lastRunKey      = "sync_last_run:{$settingKey}";
    $lastRun         = Cache::get($lastRunKey, 0);

    if ((time() - $lastRun) >= $intervalSeconds) {
        Cache::put($lastRunKey, time(), $intervalSeconds + 60);
        return true;
    }

    return false;
}

Admin endpoint — update interval
Add to routes/api.php inside the admin group:
phpRoute::get('/sync-config',         [AdminController::class, 'getSyncConfig']);
Route::put('/sync-config/{key}',   [AdminController::class, 'updateSyncConfig']);
AdminController methods:
phppublic function getSyncConfig(): JsonResponse
{
    return response()->json(SyncSetting::all(['key', 'value', 'description', 'updated_at']));
}

public function updateSyncConfig(Request $request, string $key): JsonResponse
{
    $request->validate([
        'value' => 'required|integer|min:60|max:3600', // 60s–1h range
    ]);

    $setting = SyncSetting::where('key', $key)->firstOrFail();
    $setting->update([
        'value'      => $request->value,
        'updated_by' => $request->user()->id,
    ]);

    // Bust the cache so scheduler picks it up within 30s
    Cache::forget("sync_setting:{$key}");

    AuditLog::create([
        'user_id'     => $request->user()->id,
        'action_type' => 'SYSTEM',
        'message'     => "Intervalle sync mis à jour: {$key} = {$request->value}s",
        'ip_address'  => $request->ip(),
    ]);

    return response()->json(['message' => 'Configuration mise à jour.', 'setting' => $setting->fresh()]);
}

Frontend — admin sync config panel
Add to the Admin page (Sprint 2 section 2.2, below the jobs table):
jsx// Admin can update intervals per source
// GET  /api/admin/sync-config   → load current intervals
// PUT  /api/admin/sync-config/{key}  → save

// Input: number field (60–3600 seconds), save button, last-updated timestamp
// After save → backend persists to DB → scheduler picks up within 30s
// Browser close after save = no problem, server reads DB on next tick

So the flow now matches your diagram exactly:
Browser sets interval → PUT /api/admin/sync-config
      ↓
Laravel stores in sync_settings table (MySQL)
      ↓ (Cache busted)
Crontab fires every minute → Kernel.php reads SyncSetting::get() from DB/Cache
      ↓
isDue() checks (time - last_run) >= configured_interval
      ↓
SyncService runs ETL → populates MySQL tables
      ↓
Browser closed? Doesn't matter. Server daemon continues independently.
The minimum configurable granularity is 60 seconds because Linux cron fires every minute. If you ever need sub-minute syncing, that would require replacing the cron with a long-running php artisan sync:daemon command managed by Supervisor — but for a production dashboard, 60s is the standard.
```
---
```
## MODELS

### User.php

```php
<?php
namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $fillable = [
        'name', 'matricule', 'email', 'password', 'role_id', 'is_active',
        'last_login_ip', 'last_login_at',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'is_active'     => 'boolean',
        'last_login_at' => 'datetime',
    ];

    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    public function hasRole(string|array $slugs): bool
    {
        $slugs = (array) $slugs;
        return in_array($this->role->slug, $slugs);
    }

    public function canAccess(string $page): bool
    {
        return in_array($this->role->slug, self::PAGE_ROLES[$page] ?? []);
    }

    public const PAGE_ROLES = [
        'admin'       => ['it'],
        'quality'     => ['it','direction','resp_production','resp_qualite','methodes'],
        'production'  => ['it','direction','resp_production','chef_atelier','methodes','coupe'],
        'logistics'   => ['it','direction','methodes','coupe'],
        'methods'     => ['it','direction','methodes'],
        'development' => ['it','direction','methodes'],
    ];

    public const DEFAULT_REDIRECT = [
        'it'              => '/admin',
        'direction'       => '/quality',
        'resp_production' => '/production',
        'chef_atelier'    => '/production',
        'resp_qualite'    => '/quality',
        'methodes'        => '/methods',
        'coupe'           => '/production',
    ];
}
```

---

### CheckRole Middleware

```php
<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CheckRole
{
    public function handle(Request $request, Closure $next, string ...$roles): mixed
    {
        $user = $request->user();

        if (!$user || !$user->is_active) {
            return response()->json(['message' => 'Non authentifié.'], 401);
        }

        if (!empty($roles) && !in_array($user->role->slug, $roles)) {
            AuditLog::log('WARN', "Accès refusé à {$request->path()} — Rôle: {$user->role->slug}", $request);
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        return $next($request);
    }
}
```

---

### LogAuditTrail Middleware

```php
<?php
namespace App\Http\Middleware;

use App\Models\AuditLog;
use Closure;
use Illuminate\Http\Request;

class LogAuditTrail
{
    private const LOG_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

    public function handle(Request $request, Closure $next): mixed
    {
        $response = $next($request);

        if (in_array($request->method(), self::LOG_METHODS)) {
            AuditLog::create([
                'user_id'     => $request->user()?->id,
                'action_type' => 'USER',
                'message'     => "{$request->method()} {$request->path()} — HTTP {$response->getStatusCode()}",
                'ip_address'  => $request->ip(),
                'user_agent'  => $request->userAgent(),
            ]);
        }

        return $response;
    }
}
```

---

## ROUTES (routes/api.php)

```php
<?php
use App\Http\Controllers\Api\{
    AuthController, AdminController, QualityController,
    ProductionController, LogisticsController,
    MethodesController, DevelopmentController, FilterController
};
use Illuminate\Support\Facades\Route;

// ─── PUBLIC ───────────────────────────────────────────────────────────────────
Route::post('/auth/login',  [AuthController::class, 'login']);

// ─── AUTHENTICATED ────────────────────────────────────────────────────────────
Route::middleware(['auth:sanctum', 'active.user'])->group(function () {

    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me',      [AuthController::class, 'me']);

    // ── ADMIN (IT only) ──────────────────────────────────────────────────────
    Route::prefix('admin')->middleware('role:it')->group(function () {
        Route::get('/jobs',          [AdminController::class, 'listJobs']);
        Route::get('/jobs/{id}/run', [AdminController::class, 'runJob']);

        Route::apiResource('users',   AdminController::class . '@users');
        Route::get('/users',          [AdminController::class, 'listUsers']);
        Route::post('/users',         [AdminController::class, 'createUser']);
        Route::put('/users/{id}',     [AdminController::class, 'updateUser']);
        Route::patch('/users/{id}/toggle', [AdminController::class, 'toggleUser']);

        Route::get('/screens',        [AdminController::class, 'listScreens']);
        Route::put('/screens/{id}',   [AdminController::class, 'updateScreen']);

        Route::get('/audit-logs',     [AdminController::class, 'auditLogs']);
        Route::delete('/audit-logs',  [AdminController::class, 'clearAuditLogs']);

        Route::put('/kpi-values/{key}', [AdminController::class, 'updateKpiValue']);
    });

    // ── QUALITY ──────────────────────────────────────────────────────────────
    Route::prefix('quality')
         ->middleware('role:it,direction,resp_production,resp_qualite,methodes')
         ->group(function () {
        Route::get('/kpis',               [QualityController::class, 'kpis']);
        Route::get('/br-chart',           [QualityController::class, 'brChart']);
        Route::get('/defect-chart',       [QualityController::class, 'defectChart']);
        Route::get('/qp-teams',           [QualityController::class, 'qpTeams']);
        Route::get('/alerts',             [QualityController::class, 'alerts']);
        Route::get('/annual-trend',       [QualityController::class, 'annualTrend']);
        Route::get('/pareto/rft',         [QualityController::class, 'paretoRft']);
        Route::get('/pareto/inspection',  [QualityController::class, 'paretoInspection']);
    });

    // ── PRODUCTION ───────────────────────────────────────────────────────────
    Route::prefix('production')
         ->middleware('role:it,direction,resp_production,chef_atelier,methodes,coupe')
         ->group(function () {
        Route::get('/chain-info',               [ProductionController::class, 'chainInfo']);
        Route::get('/kpis',                     [ProductionController::class, 'kpis']);
        Route::get('/efficience-gauges',        [ProductionController::class, 'efficienceGauges']);
        Route::get('/stoppage-timeline',        [ProductionController::class, 'stoppageTimeline']);
        Route::get('/of-donuts',                [ProductionController::class, 'ofDonuts']);
        Route::get('/efficience-trend',         [ProductionController::class, 'efficienceTrend']);
        Route::get('/top-operators',            [ProductionController::class, 'topOperators']);
        Route::get('/wip',                      [ProductionController::class, 'wip']);
        Route::get('/inline-endline',           [ProductionController::class, 'inlineEndline']);
        // Coupe
        Route::get('/coupe/coverage',           [ProductionController::class, 'coupeCoverage']);
        Route::get('/coupe/chain-coverage',     [ProductionController::class, 'coupeChainCoverage']);
        Route::get('/coupe/tagging',            [ProductionController::class, 'coupeTagging']);
        Route::get('/coupe/ofs',                [ProductionController::class, 'coupeOfs']);
        Route::get('/coupe/departage',          [ProductionController::class, 'coupeDepartage']);
        // Sérigraphie
        Route::get('/serigraphie/coverage',     [ProductionController::class, 'serigraphieCoverage']);
        Route::get('/serigraphie/flux',         [ProductionController::class, 'serigraphieFlux']);
        Route::get('/serigraphie/rejets',       [ProductionController::class, 'serigraphieRejets']);
    });

    // ── LOGISTICS ────────────────────────────────────────────────────────────
    Route::prefix('logistics')
         ->middleware('role:it,direction,methodes,coupe')
         ->group(function () {
        Route::get('/kpis',              [LogisticsController::class, 'kpis']);
        Route::get('/stock-kpis',        [LogisticsController::class, 'stockKpis']);
        Route::get('/stock-composition', [LogisticsController::class, 'stockComposition']);
        Route::get('/ofs',               [LogisticsController::class, 'ofs']);
        Route::get('/livraison',         [LogisticsController::class, 'livraison']);
        Route::get('/coverage',          [LogisticsController::class, 'coverage']);
        Route::get('/stock-search',      [LogisticsController::class, 'stockSearch']);
    });

    // ── MÉTHODES ─────────────────────────────────────────────────────────────
    Route::prefix('methods')
         ->middleware('role:it,direction,methodes')
         ->group(function () {
        Route::get('/kpis',          [MethodesController::class, 'kpis']);
        Route::get('/tagging-chart', [MethodesController::class, 'taggingChart']);
        Route::get('/detail-table',  [MethodesController::class, 'detailTable']);
    });

    // ── DEVELOPMENT ──────────────────────────────────────────────────────────
    Route::prefix('development')
         ->middleware('role:it,direction,methodes')
         ->group(function () {
        Route::get('/kpis',  [DevelopmentController::class, 'kpis']);
        Route::get('/trend', [DevelopmentController::class, 'trend']);
    });

    // ── FILTERS ──────────────────────────────────────────────────────────────
    Route::get('/filters/options', [FilterController::class, 'options']);
});
```

---

## AUTH CONTROLLER

```php
<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\{AuditLog, User};
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Auth, Hash, RateLimiter};

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'matricule' => 'required|string',
            'password'  => 'required|string',
        ]);

        // Rate limiting: 5 attempts per minute per IP
        $key = 'login:' . $request->ip();
        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);
            return response()->json([
                'message' => "Trop de tentatives. Réessayez dans {$seconds} secondes.",
            ], 429);
        }

        $user = User::with('role')
                    ->where('matricule', $request->matricule)
                    ->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            RateLimiter::hit($key);
            AuditLog::create([
                'user_id'     => null,
                'action_type' => 'WARN',
                'message'     => "Échec connexion — Matricule: {$request->matricule}",
                'ip_address'  => $request->ip(),
            ]);
            return response()->json([
                'message' => 'Identifiants incorrects. Veuillez réessayer.',
            ], 401);
        }

        if (!$user->is_active) {
            return response()->json([
                'message' => 'Compte désactivé. Contactez l\'administrateur.',
            ], 403);
        }

        RateLimiter::clear($key);

        // Sanctum SPA — create session
        Auth::login($user);
        $request->session()->regenerate();

        $user->update([
            'last_login_at' => now(),
            'last_login_ip' => $request->ip(),
        ]);

        AuditLog::create([
            'user_id'     => $user->id,
            'action_type' => 'USER',
            'message'     => "Connexion utilisateur: {$user->matricule} depuis {$request->ip()}",
            'ip_address'  => $request->ip(),
            'user_agent'  => $request->userAgent(),
        ]);

        return response()->json([
            'user'             => [
                'id'              => $user->id,
                'name'            => $user->name,
                'matricule'       => $user->matricule,
                'role'            => $user->role->slug,
                'role_label'      => $user->role->name,
                'default_redirect'=> User::DEFAULT_REDIRECT[$user->role->slug] ?? '/quality',
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        AuditLog::create([
            'user_id'     => $request->user()->id,
            'action_type' => 'USER',
            'message'     => "Déconnexion: {$request->user()->matricule}",
            'ip_address'  => $request->ip(),
        ]);

        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Déconnecté avec succès.']);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('role');
        return response()->json([
            'id'              => $user->id,
            'name'            => $user->name,
            'matricule'       => $user->matricule,
            'role'            => $user->role->slug,
            'role_label'      => $user->role->name,
            'default_redirect'=> User::DEFAULT_REDIRECT[$user->role->slug] ?? '/quality',
        ]);
    }
}
```

---

## NOVACITY SERVICE

```php
<?php
namespace App\Services;

use Illuminate\Http\Client\{Response, RequestException};
use Illuminate\Support\Facades\{Http, Log};

class NovacityService
{
    private string $baseUrl;
    private string $apiKey;
    private int    $timeout;

    // Maps our slug names to Novacity query slugs
    private const QUERY_SLUGS = [
        'wip_chaine'             => 'wip_chaine',
        'etat_avancement'        => 'etat_avancement',
        'efficience_chaine'      => 'efficience_chaine',
        'minutes_presence'       => 'minutes_presence',
        'minutes_produites'      => 'minutes_produites',
        'lost_time'              => 'arrets_non_planifies',
        'qte_produite'           => 'qte_produite',
        'qte_produit_indiv'      => 'qte_produit_individuel_journalier',
        'pieces_ok_jour'         => 'pieces_ok_de_premier_coup_jour_en_cours',
        'pieces_produites_jour'  => 'pieces_produites_jour_en_cours',
        'pieces_ok_annee'        => 'pieces_ok_annee_en_cours',
        'pieces_produites_annee' => 'pieces_produites_annee_en_cours',
        // B-01 — INACTIVE:
        'rejets_paquet_jour'     => 'rejets_suite_inspection_paquet_jour_en_cours',
        'inspections_paquet_jour'=> 'inspections_paquet_jour_en_cours',
        'rejets_paquet_annee'    => 'rejets_suite_inspection_paquet_annee_en_cours',
        'inspections_paquet_annee'=> 'inspections_paquet_annee_en_cours',
        // etc. for all 36 custom queries
    ];

    private const ENDPOINT_PATHS = [
        'check_pass_qte'      => '/api/data/checkpassqte',
        'vw_defect'           => '/api/data/vwdefect',
        'qcm_defect_trx'      => '/api/data/qcmdefecttrx',
        'reject_qte'          => '/api/data/rejectqte',
        'of_fabrication'      => '/api/data/ofabrication',
        'vue_stock'           => '/api/data/vuestock',
        'diva_stock'          => '/api/data/divastock',
        'expeditions'         => '/api/data/expeditions',
        'articles_colis'      => '/api/data/articlescolis',
        'detail_colis'        => '/api/data/detailcolis',
        // ... all 22 configured endpoints
    ];

    public function __construct()
    {
        $this->baseUrl = config('novacity.base_url');
        $this->apiKey  = config('novacity.api_key');
        $this->timeout = config('novacity.timeout', 10);
    }

    /**
     * Call a configured endpoint (22 endpoints)
     */
    public function fetchEndpoint(string $key, int $limit = 1000, int $offset = 0): array
    {
        $path = self::ENDPOINT_PATHS[$key] ?? throw new \InvalidArgumentException("Unknown endpoint: $key");
        return $this->get($path, compact('limit', 'offset'));
    }

    /**
     * Call a custom SQL query (36 queries)
     */
    public function fetchQuery(string $key, int $limit = 1000, int $offset = 0): array
    {
        $slug = self::QUERY_SLUGS[$key] ?? throw new \InvalidArgumentException("Unknown query: $key");
        return $this->get("/api/data/q/{$slug}", compact('limit', 'offset'));
    }

    /**
     * Fetch admin jobs list
     */
    public function fetchJobs(string $bearerToken): array
    {
        return $this->get('/api/admin/jobs', [], $bearerToken);
    }

    /**
     * Trigger a job manually
     */
    public function runJob(int $jobId, string $bearerToken): array
    {
        return $this->get("/api/admin/jobs/{$jobId}/run", [], $bearerToken);
    }

    private function get(string $path, array $query = [], ?string $bearerToken = null): array
    {
        $headers = ['x-api-key' => $this->apiKey];
        if ($bearerToken) {
            $headers['Authorization'] = "Bearer {$bearerToken}";
        }

        $response = Http::withHeaders($headers)
                        ->timeout($this->timeout)
                        ->get($this->baseUrl . $path, $query);

        if ($response->failed()) {
            throw new \RuntimeException("Novacity API error [{$path}]: HTTP {$response->status()}");
        }

        $body = $response->json();

        if (isset($body['success']) && !$body['success']) {
            throw new \RuntimeException("Novacity returned success:false for [{$path}]");
        }

        return $body['data'] ?? [];
    }
}
```

---

## SYNC SERVICE

```php
<?php
namespace App\Services;

use App\Models\{NovacityJob, AuditLog};
use App\Models\Sync\{
    CheckPassQte, VwDefect, EfficienteChaine, WipChaine,
    PiecesOkJour, PiecesProduiteJour, QteProduite, LostTime,
    EtatAvancement, TagingReel, VueStock, DivaStock
    // ... all sync models
};
use Illuminate\Support\Facades\{DB, Log};

class SyncService
{
    public function __construct(private NovacityService $novacity) {}

    /**
     * Sync all quality-related data
     * Called every 60s by scheduler
     */
    public function syncQuality(): void
    {
        $this->syncTable('check_pass_qte',       fn() => $this->novacity->fetchEndpoint('check_pass_qte'));
        $this->syncTable('vw_defects',           fn() => $this->novacity->fetchEndpoint('vw_defect'));
        $this->syncTable('qcm_defect_trx',       fn() => $this->novacity->fetchEndpoint('qcm_defect_trx'));
        $this->syncTable('pieces_ok_jour',       fn() => $this->novacity->fetchQuery('pieces_ok_jour'));
        $this->syncTable('pieces_produites_jour',fn() => $this->novacity->fetchQuery('pieces_produites_jour'));
        $this->syncTable('pieces_ok_annee',      fn() => $this->novacity->fetchQuery('pieces_ok_annee'));
        $this->syncTable('pieces_produites_annee',fn()=> $this->novacity->fetchQuery('pieces_produites_annee'));
        // B-01 inactive — skip but don't fail:
        $this->syncTableIfActive('rejets_inspection_paquet', fn() => $this->novacity->fetchQuery('rejets_paquet_jour'));
    }

    /**
     * Sync all production-related data
     */
    public function syncProduction(): void
    {
        $this->syncTable('wip_chaine',          fn() => $this->novacity->fetchQuery('wip_chaine'));
        $this->syncTable('etat_avancement',     fn() => $this->novacity->fetchQuery('etat_avancement'));
        $this->syncTable('efficience_chaine',   fn() => $this->novacity->fetchQuery('efficience_chaine'));
        $this->syncTable('qte_produite',        fn() => $this->novacity->fetchQuery('qte_produite'));
        $this->syncTable('lost_time',           fn() => $this->novacity->fetchQuery('lost_time'));
        $this->syncTable('taging_reel',         fn() => $this->novacity->fetchQuery('taging_reel'));
        $this->syncTable('packets_rejetes',     fn() => $this->novacity->fetchQuery('packets_rejetes'));
        $this->syncTable('sortie_coupe',        fn() => $this->novacity->fetchQuery('sortie_coupe'));
        $this->syncTable('qte_engagement',      fn() => $this->novacity->fetchQuery('qte_engagement'));
        $this->syncTable('qte_entree_serigraphie', fn()=> $this->novacity->fetchQuery('qte_entree_serigraphie'));
        $this->syncTable('sortie_serigraphie',  fn() => $this->novacity->fetchQuery('sortie_serigraphie'));
        $this->syncTable('of_fabrication',      fn() => $this->novacity->fetchEndpoint('of_fabrication'));
        $this->syncTable('inline_vs_endline_comparison', fn() => $this->novacity->fetchEndpoint('inline_vs_endline_comparison'));
        $this->syncTable('qte_produit_individuel_jour',  fn() => $this->novacity->fetchQuery('qte_produit_indiv'));
        $this->syncTable('qte_depart_chaine_article_of', fn() => $this->novacity->fetchQuery('qte_depart_chaine'));
    }

    /**
     * Sync all logistics-related data
     * Every 5 minutes (data changes less frequently)
     */
    public function syncLogistics(): void
    {
        $this->syncTable('vue_stock',             fn() => $this->novacity->fetchEndpoint('vue_stock'));
        $this->syncTable('diva_stock',            fn() => $this->novacity->fetchEndpoint('diva_stock'));
        $this->syncTable('stock_moyen',           fn() => $this->novacity->fetchQuery('stock_moyen'));
        $this->syncTable('articles_sans_mouvement', fn() => $this->novacity->fetchQuery('articles_sans_mouvement'));
        $this->syncTable('quantite_totale_stock', fn() => $this->novacity->fetchQuery('quantite_totale_stock'));
        $this->syncTable('capacite_stockage',     fn() => $this->novacity->fetchQuery('capacite_stockage'));
        $this->syncTable('nombre_rouleaux',       fn() => $this->novacity->fetchQuery('nombre_rouleaux'));
        $this->syncTable('nombre_ofs_livres',     fn() => $this->novacity->fetchQuery('nombre_ofs_livres'));
        $this->syncTable('moyenne_date_transfert',fn() => $this->novacity->fetchQuery('moyenne_date_transfert'));
        $this->syncTable('quantite_par_provenance',fn()=> $this->novacity->fetchQuery('quantite_par_provenance'));
        $this->syncTable('quantite_par_famille',  fn() => $this->novacity->fetchQuery('quantite_par_famille'));
        $this->syncTable('quantite_par_typologie',fn() => $this->novacity->fetchQuery('quantite_par_typologie'));
        $this->syncTable('expeditions',           fn() => $this->novacity->fetchEndpoint('expeditions'));
        $this->syncTable('colis_total_var',       fn() => $this->novacity->fetchQuery('colis_total_var'));
    }

    private function syncTable(string $table, callable $fetcher): void
    {
        $start = microtime(true);
        try {
            $rows = $fetcher();
            if (!empty($rows)) {
                DB::table($table)->truncate();
                $chunks = array_chunk($rows, 500);
                $now    = now();
                foreach ($chunks as $chunk) {
                    $insert = array_map(fn($r) => array_merge($r, ['synced_at' => $now]), $chunk);
                    DB::table($table)->insert($insert);
                }
            }
            $this->updateJobStatus($table, 'ok', count($rows), microtime(true) - $start);
            AuditLog::info("Sync {$table} réussie — " . count($rows) . " enregistrements");
        } catch (\Throwable $e) {
            $this->updateJobStatus($table, 'error', 0, 0, $e->getMessage());
            AuditLog::error("Sync {$table} échouée — {$e->getMessage()}");
            Log::error("SyncService [{$table}]: {$e->getMessage()}");
        }
    }

    private function syncTableIfActive(string $table, callable $fetcher): void
    {
        $job = NovacityJob::where('query_slug', 'LIKE', "%{$table}%")->first();
        if ($job && !$job->is_active) {
            return; // Silently skip inactive jobs (B-01)
        }
        $this->syncTable($table, $fetcher);
    }

    private function updateJobStatus(string $table, string $status, int $count, float $elapsed, ?string $error = null): void
    {
        NovacityJob::where('query_slug', 'LIKE', "%{$table}%")->update([
            'last_status'      => $status,
            'records_count'    => $count,
            'response_time_ms' => (int)($elapsed * 1000),
            'last_run_at'      => now(),
            'last_error'       => $error,
        ]);
    }
}
```

---

## SCHEDULER (app/Console/Kernel.php)

```php
protected function schedule(Schedule $schedule): void
{
    // Quality data — every 60 seconds
    $schedule->call(fn() => app(SyncService::class)->syncQuality())
             ->everyMinute()
             ->name('sync-quality')
             ->withoutOverlapping(5);

    // Production data — every 60 seconds
    $schedule->call(fn() => app(SyncService::class)->syncProduction())
             ->everyMinute()
             ->name('sync-production')
             ->withoutOverlapping(5);

    // Logistics data — every 5 minutes (heavier dataset)
    $schedule->call(fn() => app(SyncService::class)->syncLogistics())
             ->everyFiveMinutes()
             ->name('sync-logistics')
             ->withoutOverlapping(10);
}
```

**Add to crontab on server:**
```
* * * * * cd /var/www/bacovet && php artisan schedule:run >> /dev/null 2>&1
```

---

## QUALITY CONTROLLER (example — full implementation)

```php
<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\{KpiComputeService, AlertService};
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class QualityController extends Controller
{
    public function __construct(
        private KpiComputeService $kpi,
        private AlertService $alerts
    ) {}

    /**
     * All 8 KPI cards in one call
     */
    public function kpis(Request $request): JsonResponse
    {
        $today = Carbon::today();
        $year  = $today->year;

        // Card 3 — RFT Ce Jour
        $piecesOkJour       = DB::table('pieces_ok_jour')->where('date', $today)->first();
        $piecesProduiteJour = DB::table('pieces_produites_jour')->where('date', $today)->first();
        $rftJour            = $this->computeRft(
            $piecesOkJour?->first_pass_today,
            $piecesProduiteJour?->produced_today
        );

        // Card 6 — RFT Année
        $piecesOkAnnee       = DB::table('pieces_ok_annee')->where('year', $year)->first();
        $piecesProduiteAnnee = DB::table('pieces_produites_annee')->where('year', $year)->first();
        $rftAnnee            = $this->computeRft(
            $piecesOkAnnee?->first_pass_year,
            $piecesProduiteAnnee?->produced_year
        );

        // Cards 4 & 7 — BR Bundling (B-01: check if active)
        $bundlingActive = DB::table('novacity_sync_jobs')
            ->where('query_slug', 'like', '%inspection_paquet%')
            ->where('is_active', true)
            ->exists();

        $brBundlingJour  = $bundlingActive ? $this->computeBrBundling('jour') : null;
        $brBundlingAnnee = $bundlingActive ? $this->computeBrBundling('annee') : null;

        return response()->json([
            // Cards 1, 2, 5 — B-02 DIVA (not yet available)
            'br_cgl'         => ['value' => null, 'status' => 'pending', 'blocker' => 'B-02'],
            'br_gtd_jour'    => ['value' => null, 'status' => 'pending', 'blocker' => 'B-02'],
            'br_gtd_annee'   => ['value' => null, 'status' => 'pending', 'blocker' => 'B-02'],

            // Card 3 — RFT Ce Jour
            'rft_jour' => [
                'value'  => $rftJour,
                'status' => $this->rftStatus($rftJour),
                'raw'    => [
                    'first_pass' => $piecesOkJour?->first_pass_today,
                    'produced'   => $piecesProduiteJour?->produced_today,
                ],
            ],

            // Card 4 — BR Bundling Ce Jour
            'br_bundling_jour' => [
                'value'   => $brBundlingJour,
                'status'  => $bundlingActive ? $this->brBundlingStatus($brBundlingJour) : 'inactive',
                'blocker' => $bundlingActive ? null : 'B-01',
            ],

            // Card 6 — RFT Année
            'rft_annee' => [
                'value'  => $rftAnnee,
                'status' => $this->rftStatus($rftAnnee),
                'raw'    => [
                    'first_pass' => $piecesOkAnnee?->first_pass_year,
                    'produced'   => $piecesProduiteAnnee?->produced_year,
                ],
            ],

            // Card 7 — BR Bundling Année
            'br_bundling_annee' => [
                'value'   => $brBundlingAnnee,
                'status'  => $bundlingActive ? $this->brBundlingStatus($brBundlingAnnee) : 'inactive',
                'blocker' => $bundlingActive ? null : 'B-01',
            ],

            // Card 8 — BR Print (Google Drive — Sprint 7)
            'br_print' => ['value' => null, 'status' => 'pending', 'source' => 'google_drive'],

            // Sync metadata
            'synced_at' => DB::table('pieces_ok_jour')
                             ->orderByDesc('synced_at')
                             ->value('synced_at'),
        ]);
    }

    public function brChart(Request $request): JsonResponse
    {
        $today = Carbon::today();

        $data = DB::table('check_pass_qte')
            ->where('log_date', $today)
            ->groupBy('shortname')
            ->select('shortname', DB::raw('AVG(defect_pct) as avg_defect_pct'))
            ->get()
            ->map(fn($row) => [
                'chain'      => $row->shortname,
                'defect_pct' => round($row->avg_defect_pct, 2),
                'status'     => $row->avg_defect_pct <= 4 ? 'green'
                              : ($row->avg_defect_pct <= 5 ? 'orange' : 'red'),
            ]);

        return response()->json(['data' => $data, 'target' => 5]);
    }

    public function defectChart(Request $request): JsonResponse
    {
        $today = Carbon::today();

        $data = DB::table('vw_defects')
            ->where('log_date', $today)
            ->groupBy('op_no')
            ->select('op_no', DB::raw('SUM(qty) as total_qty'))
            ->orderByDesc('total_qty')
            ->limit(8)
            ->get();

        return response()->json(['data' => $data]);
    }

    public function qpTeams(Request $request): JsonResponse
    {
        $today = Carbon::today();

        // RFT per chain (available from GPRO)
        $rftPerChain = DB::table('check_pass_qte')
            ->where('log_date', $today)
            ->groupBy('shortname')
            ->select('shortname', DB::raw('AVG(defect_pct) as avg_defect_pct'))
            ->get()
            ->keyBy('shortname');

        $teams = $rftPerChain->map(function ($row) {
            $rftPct  = 100 - $row->avg_defect_pct;
            $rft_ok  = $rftPct >= 98;
            // B-01/B-02 not available yet — score partial
            $score   = ($rft_ok ? 1 : 0);

            return [
                'chain'         => $row->shortname,
                'score'         => $score,
                'max_score'     => 1, // partial (full max=12 when B-01/B-02 resolved)
                'rft_ok'        => $rft_ok,
                'rft_pct'       => round($rftPct, 1),
                'br_in_ok'      => null, // B-01
                'br_gtd_ok'     => null, // B-02
                'br_ok'         => null, // B-02
                'partial_score' => true,
            ];
        })
        ->values()
        ->sortByDesc('score')
        ->values();

        return response()->json([
            'best'     => $teams->take(3)->values(),
            'worst'    => $teams->reverse()->take(3)->values(),
            'is_partial' => true,
            'missing_blockers' => ['B-01', 'B-02'],
        ]);
    }

    public function alerts(Request $request): JsonResponse
    {
        return response()->json([
            'alerts' => $this->alerts->generateQualityAlerts(),
        ]);
    }

    public function annualTrend(Request $request): JsonResponse
    {
        $data = DB::table('efficience_chaine')
            ->selectRaw("DATE_FORMAT(date, '%Y-%m') as month, AVG(efficience_pct) as avg_eff")
            ->groupBy('month')
            ->orderBy('month')
            ->get();

        return response()->json(['data' => $data]);
    }

    public function paretoRft(Request $request): JsonResponse
    {
        $today = Carbon::today();

        $items = DB::table('vw_defects')
            ->where('log_date', $today)
            ->groupBy('op_no')
            ->select('op_no', DB::raw('SUM(qty) as total'))
            ->orderByDesc('total')
            ->get();

        return response()->json(['data' => $this->buildPareto($items, 'op_no', 'total')]);
    }

    public function paretoInspection(Request $request): JsonResponse
    {
        $today = Carbon::today();

        $items = DB::table('qcm_defect_trx')
            ->where('log_date', $today)
            ->groupBy('item_id')
            ->select('item_id', DB::raw('SUM(occurrence_count) as total'))
            ->orderByDesc('total')
            ->get();

        return response()->json(['data' => $this->buildPareto($items, 'item_id', 'total')]);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function computeRft(?int $ok, ?int $produced): ?float
    {
        if (!$produced || $produced === 0) return null;
        $pct = ($ok / $produced) * 100;
        if ($pct > 100) return null; // anomaly guard
        return round($pct, 1);
    }

    private function computeBrBundling(string $period): ?float
    {
        $row = DB::table('rejets_inspection_paquet')
                 ->where('period', $period)
                 ->orderByDesc('date')
                 ->first();
        if (!$row || $row->bundle_inspected === 0) return null;
        return round(($row->bundle_reject / $row->bundle_inspected) * 100, 1);
    }

    private function rftStatus(?float $pct): string
    {
        if ($pct === null) return 'grey';
        if ($pct >= 98) return 'green';
        if ($pct >= 95) return 'orange';
        return 'red';
    }

    private function brBundlingStatus(?float $pct): string
    {
        if ($pct === null) return 'grey';
        if ($pct <= 4) return 'green';
        if ($pct <= 5) return 'orange';
        return 'red';
    }

    private function buildPareto($items, string $labelKey, string $valueKey): array
    {
        $total      = $items->sum($valueKey);
        $cumulative = 0;

        return $items->map(function ($item) use ($labelKey, $valueKey, $total, &$cumulative) {
            $cumulative += $item->$valueKey;
            return [
                'label'      => $item->$labelKey,
                'value'      => $item->$valueKey,
                'cumulative' => $total > 0 ? round(($cumulative / $total) * 100, 1) : 0,
            ];
        })->toArray();
    }
}
```

---

## FRONTEND AUTH SERVICE (revised for Laravel Sanctum)

```js
// /src/services/auth.js — replaces old JWT approach

const API_BASE = import.meta.env.VITE_API_BASE_URL; // Your Laravel URL

async function getCsrfCookie() {
  await fetch(`${API_BASE}/sanctum/csrf-cookie`, {
    credentials: 'include', // REQUIRED — sends/receives cookies
  });
}

export async function login(matricule, password) {
  await getCsrfCookie();

  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    credentials: 'include',              // session cookie
    headers: {
      'Content-Type': 'application/json',
      'X-XSRF-TOKEN': getCsrfTokenFromCookie(), // CSRF token from cookie
      'Accept': 'application/json',
    },
    body: JSON.stringify({ matricule, password }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Erreur de connexion');
  }

  return res.json(); // { user: { id, name, matricule, role, default_redirect } }
}

export async function logout() {
  const res = await fetch(`${API_BASE}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'X-XSRF-TOKEN': getCsrfTokenFromCookie(),
      'Accept': 'application/json',
    },
  });
  return res.ok;
}

export async function getMe() {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    credentials: 'include',
    headers: { 'Accept': 'application/json' },
  });
  if (res.status === 401) return null;
  return res.json();
}

// Helper: read XSRF-TOKEN from cookie (Sanctum sets it)
function getCsrfTokenFromCookie() {
  return decodeURIComponent(
    document.cookie.split('; ')
      .find(c => c.startsWith('XSRF-TOKEN='))
      ?.split('=')[1] ?? ''
  );
}
```

---

## FRONTEND API SERVICE (revised)

```js
// /src/services/api.js — all calls go to OUR Laravel backend, not Novacity

const API_BASE = import.meta.env.VITE_API_BASE_URL;

function getXsrfToken() {
  return decodeURIComponent(
    document.cookie.split('; ')
      .find(c => c.startsWith('XSRF-TOKEN='))
      ?.split('=')[1] ?? ''
  );
}

async function apiGet(path, params = {}) {
  const url = new URL(`${API_BASE}/api${path}`);
  Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
      'X-XSRF-TOKEN': getXsrfToken(),
    },
    signal: AbortSignal.timeout(15000),
  });

  if (res.status === 401) {
    window.location.href = '/login';
    return null;
  }
  if (res.status === 403) {
    window.location.href = '/unauthorized';
    return null;
  }
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${path}`);
  }

  return res.json();
}

// Quality
export const fetchQualityKpis         = (f = {}) => apiGet('/quality/kpis', f);
export const fetchQualityBrChart      = (f = {}) => apiGet('/quality/br-chart', f);
export const fetchQualityDefectChart  = (f = {}) => apiGet('/quality/defect-chart', f);
export const fetchQualityQpTeams      = (f = {}) => apiGet('/quality/qp-teams', f);
export const fetchQualityAlerts       = ()       => apiGet('/quality/alerts');
export const fetchQualityAnnualTrend  = ()       => apiGet('/quality/annual-trend');
export const fetchQualityParetoRft    = (f = {}) => apiGet('/quality/pareto/rft', f);
export const fetchQualityParetoInsp   = (f = {}) => apiGet('/quality/pareto/inspection', f);

// Production
export const fetchProductionChainInfo     = (f = {}) => apiGet('/production/chain-info', f);
export const fetchProductionKpis          = (f = {}) => apiGet('/production/kpis', f);
export const fetchEfficienceGauges        = (f = {}) => apiGet('/production/efficience-gauges', f);
export const fetchStoppageTimeline        = (f = {}) => apiGet('/production/stoppage-timeline', f);
export const fetchOfDonuts                = (f = {}) => apiGet('/production/of-donuts', f);
export const fetchEfficienceTrend         = (f = {}) => apiGet('/production/efficience-trend', f);
export const fetchTopOperators            = (f = {}) => apiGet('/production/top-operators', f);
export const fetchWip                     = (f = {}) => apiGet('/production/wip', f);
export const fetchInlineEndline           = (f = {}) => apiGet('/production/inline-endline', f);
export const fetchCoupeCoverage           = (f = {}) => apiGet('/production/coupe/coverage', f);
export const fetchCoupeChainCoverage      = (f = {}) => apiGet('/production/coupe/chain-coverage', f);
export const fetchCoupeTagging            = (f = {}) => apiGet('/production/coupe/tagging', f);
export const fetchCoupeOfs                = (f = {}) => apiGet('/production/coupe/ofs', f);
export const fetchCoupeDepartage          = (f = {}) => apiGet('/production/coupe/departage', f);
export const fetchSerigraphieCoverage     = (f = {}) => apiGet('/production/serigraphie/coverage', f);
export const fetchSerigraphieFlux         = (f = {}) => apiGet('/production/serigraphie/flux', f);
export const fetchSerigraphieRejets       = (f = {}) => apiGet('/production/serigraphie/rejets', f);

// Logistics
export const fetchLogisticsKpis           = (f = {}) => apiGet('/logistics/kpis', f);
export const fetchLogisticsStockKpis      = ()       => apiGet('/logistics/stock-kpis');
export const fetchLogisticsStockComp      = ()       => apiGet('/logistics/stock-composition');
export const fetchLogisticsOfs            = (f = {}) => apiGet('/logistics/ofs', f);
export const fetchLogisticsLivraison      = ()       => apiGet('/logistics/livraison');
export const fetchLogisticsCoverage       = (f = {}) => apiGet('/logistics/coverage', f);
export const fetchLogisticsStockSearch    = (f = {}) => apiGet('/logistics/stock-search', f);

// Methods
export const fetchMethodesKpis            = ()       => apiGet('/methods/kpis');
export const fetchMethodesTaggingChart    = (f = {}) => apiGet('/methods/tagging-chart', f);
export const fetchMethodesDetailTable     = ()       => apiGet('/methods/detail-table');

// Development
export const fetchDevelopmentKpis         = ()       => apiGet('/development/kpis');
export const fetchDevelopmentTrend        = ()       => apiGet('/development/trend');

// Admin
export const fetchAdminJobs               = ()       => apiGet('/admin/jobs');
export const runAdminJob                  = (id)     => apiGet(`/admin/jobs/${id}/run`);
export const fetchAdminUsers              = ()       => apiGet('/admin/users');
export const fetchAdminAuditLogs          = (p = {}) => apiGet('/admin/audit-logs', p);
export const fetchAdminScreens            = ()       => apiGet('/admin/screens');

// Filters
export const fetchFilterOptions           = ()       => apiGet('/filters/options');
```

---

## REVISED SPRINT PLANS (Sprint 0 → 8)

The original sprint plans remain structurally identical. The changes below are **complete replacements** of all API interaction sections:

---

### SPRINT 0 — REVISED: Foundation & Setup

**0.1** — Same as before. Add `.env`:

```
VITE_API_BASE_URL=http://api.bacovet.local
# NO API KEY in frontend env — key lives in Laravel .env only
```

**0.2 — API Service Layer** → Replace with the revised `/src/services/api.js` above.
All functions call `GET /api/*` on Laravel backend. Zero Novacity references in frontend.

**0.3 — Admin API Service** → Merged into `/src/services/api.js`.
`fetchAdminJobs()` / `runAdminJob(id)` — no Bearer JWT needed from frontend (session cookie handles auth).

**0.4 — Auth Context (`/src/context/AuthContext.jsx`)** → Replace with:

```jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as authLogin, logout as authLogout, getMe } from '../services/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]                 = useState(null);
  const [isAuthenticated, setIsAuth]    = useState(false);
  const [isLoading, setIsLoading]       = useState(true); // check session on mount

  // On app load, check if session is still valid
  useEffect(() => {
    getMe()
      .then(userData => {
        if (userData) { setUser(userData); setIsAuth(true); }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (matricule, password) => {
    const data = await authLogin(matricule, password);
    setUser(data.user);
    setIsAuth(true);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await authLogout();
    setUser(null);
    setIsAuth(false);
  }, []);

  // Auto-logout at 8h — handled server-side by session lifetime
  // Set SESSION_LIFETIME=480 in Laravel .env

  return (
    <AuthContext.Provider value={{ user, role: user?.role, isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

**Key change:** No JWT in memory. Session cookie managed by browser + Laravel.
`isLoading=true` on first render — show spinner until `getMe()` resolves.

**0.5 — Router** → Add loading guard:

```jsx
// ProtectedRoute.jsx
function ProtectedRoute({ allowedRoles, children }) {
  const { isAuthenticated, isLoading, role } = useAuth();

  if (isLoading) return <LoadingSpinner size="lg" />;
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to="/unauthorized" />;

  return children;
}
```

**0.6, 0.7** — No change.

**Sprint 0 deliverable change:** No "58 API functions for Novacity" — instead: all 22+ Laravel backend endpoint functions in `api.js`.

---

### SPRINT 1 — REVISED: Auth + Navigation Shell

**Login form** → calls `login(matricule, password)` from AuthContext.
- Calls Laravel `POST /api/auth/login` via Sanctum cookie session
- On success: redirects to `user.default_redirect`
- On `401`: shows "Identifiants incorrects. Veuillez réessayer."
- On `429`: shows the rate-limit message from Laravel

**Session expiry** → controlled by Laravel `SESSION_LIFETIME=480` (minutes).
Frontend detects expiry when any API call returns 401 → redirect to `/login`.
No frontend timer needed.

**LiveSyncPill** → Now reflects `synced_at` timestamps returned by each backend endpoint.
Pass `lastSyncedAt` from API response, compare to `Date.now()`.

Everything else in Sprint 1 unchanged.

---

### SPRINT 2 — REVISED: Admin Panel

**API Supervision Panel** → calls `fetchAdminJobs()` → `GET /api/admin/jobs`
Laravel fetches from `novacity_sync_jobs` table (populated by SyncService).

Response shape per job:
```json
{
  "id": 1,
  "source": "DIVA",
  "name": "wip_chaine",
  "last_status": "ok",
  "records_count": 245,
  "response_time_ms": 310,
  "last_run_at": "2026-06-12T14:03:27Z",
  "is_active": true
}
```

**Manual job run** → `runAdminJob(id)` → `GET /api/admin/jobs/{id}/run`
Laravel calls `SyncService` for that specific job, returns result.

**User Management** → calls Laravel user management endpoints (`/api/admin/users`).
Password hashing done by Laravel (`Hash::make()`). Frontend never handles raw passwords beyond sending to backend.

**BR Bundling banner** → Backend includes in jobs response:
```json
{ "inactive_blockers": ["B-01"], "inactive_job_ids": [60, 61, 54, 55] }
```
Frontend shows banner if `inactive_blockers.includes('B-01')`.

**Audit Log** → calls `fetchAdminAuditLogs()` → `GET /api/admin/audit-logs`
All logs created by Laravel middleware automatically.

Everything else in Sprint 2 unchanged.

---

### SPRINT 3 — REVISED: Quality Dashboard

**All data from Laravel backend** — frontend calls:

| Original frontend call         | New call              | Laravel endpoint         |
|--------------------------------|-----------------------|--------------------------|
| `fetchPiecesOkJourEnCours()`   | `fetchQualityKpis()`  | `GET /api/quality/kpis`  |
| `fetchCheckPassQte()`          | `fetchQualityBrChart()` | `GET /api/quality/br-chart` |
| `fetchVwDefect()`              | `fetchQualityDefectChart()` | `GET /api/quality/defect-chart` |
| `fetchEfficienceChaine()`      | `fetchQualityAnnualTrend()` | `GET /api/quality/annual-trend` |

**KPI card status field** — all KPI cards receive `status` from backend:
```json
{
  "rft_jour": { "value": 97.3, "status": "orange", "raw": {...} },
  "br_bundling_jour": { "value": null, "status": "inactive", "blocker": "B-01" },
  "br_cgl": { "value": null, "status": "pending", "blocker": "B-02" }
}
```

Frontend logic: if `status === 'inactive'` → show grey card "Activation requise (B-01)".
If `status === 'pending'` → show grey card "En attente API DIVA".
No frontend division by zero — backend handles all guards and returns `null` with status.

**Global filters** → pass as query params:
```js
fetchQualityBrChart({ chaine: selectedChaine, of: selectedOf })
```
Backend filters SQL queries by these params.

Everything else in Sprint 3 unchanged.

---

### SPRINT 4 — REVISED: Production Dashboard — Confection

All data calls replaced:

| Original                    | New call                       | Backend endpoint                   |
|-----------------------------|--------------------------------|------------------------------------|
| `fetchWipChaine()`          | `fetchProductionChainInfo()`   | `GET /api/production/chain-info`   |
| `fetchEtatAvancement()`     | `fetchOfDonuts()`              | `GET /api/production/of-donuts`    |
| `fetchEfficienceChaine()`   | `fetchEfficienceGauges()`      | `GET /api/production/efficience-gauges` |
| `fetchLostTime()`           | `fetchStoppageTimeline()`      | `GET /api/production/stoppage-timeline` |
| `fetchQteProduite()`        | `fetchProductionKpis()`        | `GET /api/production/kpis`         |
| `fetchQteProduitIndivJour()`| `fetchTopOperators()`          | `GET /api/production/top-operators` |
| `fetchSortieCoupe()` + `fetchQteEngagement()` | `fetchWip()` | `GET /api/production/wip` |

Backend computes and returns processed data — frontend only renders.

Everything else in Sprint 4 unchanged.

---

### SPRINT 5 — REVISED: Coupe & Sérigraphie

All data calls replaced:

| Original                         | New call                    | Backend endpoint                       |
|----------------------------------|-----------------------------|----------------------------------------|
| `fetchSortieCoupe()` + `fetchQteEngagement()` | `fetchCoupeCoverage()` | `GET /api/production/coupe/coverage` |
| `fetchTagingReel()`              | `fetchCoupeTagging()`       | `GET /api/production/coupe/tagging`   |
| `fetchOfabrication()`            | `fetchCoupeOfs()`           | `GET /api/production/coupe/ofs`       |
| `fetchQteDepartChaineArticleOf()`| `fetchCoupeDepartage()`     | `GET /api/production/coupe/departage` |
| `fetchQteEntreeSerigraphie()` + `fetchSortieSerigraphie()` | `fetchSerigraphieCoverage()` + `fetchSerigraphieFlux()` | Backend joins |
| `fetchPacketsRejetes()`          | `fetchSerigraphieRejets()`  | `GET /api/production/serigraphie/rejets` |
| `fetchInlineVsEndlineComparison()`| `fetchInlineEndline()`     | `GET /api/production/inline-endline`  |

Everything else in Sprint 5 unchanged.

---

### SPRINT 6 — REVISED: Logistics

All data calls replaced:

| Original                         | New call                      | Backend endpoint                       |
|----------------------------------|-------------------------------|----------------------------------------|
| `fetchCapaciteStockage()`        | `fetchLogisticsStockKpis()`   | `GET /api/logistics/stock-kpis`        |
| `fetchNombreRouleaux()`          | (included above)              |                                        |
| `fetchQuantiteParProvenance()` etc. | `fetchLogisticsStockComp()`| `GET /api/logistics/stock-composition` |
| `fetchEtatAvancement()`          | `fetchLogisticsOfs()`         | `GET /api/logistics/ofs`               |
| `fetchVueStock()` + `fetchDivaStock()` | `fetchLogisticsStockSearch()` | `GET /api/logistics/stock-search?q=&famille=&page=` |
| `fetchNombreOFsLivres()`         | `fetchLogisticsLivraison()`   | `GET /api/logistics/livraison`         |
| `fetchMoyenneDateTransfert()`    | (included above)              |                                        |

**`parseInt()` and `parseFloat()` coercions** → done in Laravel when syncing from Novacity.
`capacite_stockage.conteneurs_actifs` stored as INT in MySQL.
`moyenne_date_transfert.moyenne_jours` stored as DECIMAL in MySQL.
Frontend receives clean numbers — no coercion needed.

**Stock search** → backend implements `FULLTEXT` search:
```php
// LogisticsController::stockSearch()
$results = DB::table('vue_stock')
    ->when($request->q, fn($q, $search) =>
        $q->whereFullText(['code_mp', 'designation', 'famille'], $search)
    )
    ->when($request->famille, fn($q, $famille) =>
        $q->where('famille', $famille)
    )
    ->paginate(20);
```

Everything else in Sprint 6 unchanged.

---

### SPRINT 7 — REVISED: Méthodes + Development + Global Features

**Méthodes page** → calls `fetchMethodesKpis()` → `GET /api/methods/kpis`

Response:
```json
{
  "f_req_216": { "value": null, "blocker": "B-05" },
  "f_req_217": { "value": 97.2, "status": "green" },
  "f_req_218": { "value": 88.5, "updated_at": "2026-06-10" },
  "f_req_219": { "value": 82.1, "updated_at": "2026-06-08" }
}
```

**Admin update (F-REQ-218/219)** → `PUT /api/admin/kpi-values/f_req_218`
Body: `{ numerator: 177, denominator: 200 }` → backend computes `88.5`.

**Development page** → calls `fetchDevelopmentKpis()` → `GET /api/development/kpis`
Returns all 6 manual KPI values from `manual_kpi_values` table.

**Global filter** → `fetchFilterOptions()` → `GET /api/filters/options`
```json
{
  "marques":  ["LEVIS", "ZARA", "H&M"],
  "ateliers": ["Confection", "Coupe", "Sérigraphie"],
  "lignes":   ["CH1", "CH2", "CH3"],
  "ofs":      ["OF-2026-0412", "OF-2026-0399"]
}
```

**Export** → Unchanged (SheetJS on frontend). Data already loaded in page state.

**`useAutoRefresh` hook** → Unchanged. Now refetches from Laravel endpoints.

**Alert system** → Alerts endpoint `GET /api/quality/alerts` returns pre-computed alerts.
Alert badge counts → included in each page KPI response.

---

### SPRINT 8 — REVISED: QA, Performance & UAT

**Additional backend security checks:**
- `S8-S01`: No API key in browser (confirmed — key only in Laravel `.env`)
- `S8-S02`: No JWT in URL (confirmed — Sanctum uses httpOnly cookie)
- Rate limiting on login: `RateLimiter::for('login', ...)` in `RouteServiceProvider`
- Session fixation protection: `$request->session()->regenerate()` in `AuthController::login()`
- CSRF protection: all non-GET requests require `X-XSRF-TOKEN` header
- `is_active` check on every request via `EnsureActiveUser` middleware

**Performance notes:**
- Add DB indexes (already in migrations above)
- Cache expensive aggregates with `Cache::remember('quality_kpis', 55, fn() => ...)`
- Use `withoutOverlapping()` on scheduler to prevent duplicate syncs

**Blocker status** — same as original Sprint 8 blocker table.

---

## QUICK REFERENCE: Frontend ENV Variables

```env
# /frontend/.env
VITE_API_BASE_URL=http://api.bacovet.local
# That's it. No API keys, no Novacity config in frontend.
```

## QUICK REFERENCE: Backend ENV Variables

```env
# /backend/.env (Laravel)
APP_URL=http://api.bacovet.local
FRONTEND_URL=http://app.bacovet.local
DB_HOST=127.0.0.1
DB_DATABASE=bacovet_prod
DB_USERNAME=bacovet_user
DB_PASSWORD=your_strong_password

NOVACITY_BASE_URL=https://novacity-server.local
NOVACITY_API_KEY=your_key_here
NOVACITY_TIMEOUT=10

SESSION_DRIVER=database
SESSION_LIFETIME=480          # 8 hours
SESSION_DOMAIN=.bacovet.local
SANCTUM_STATEFUL_DOMAINS=app.bacovet.local,localhost:5173

CACHE_STORE=redis             # or database
QUEUE_CONNECTION=database
```

---

## MIGRATION RUN ORDER

```bash
php artisan migrate --seed
# Seeds: RoleSeeder, UserSeeder (create IT admin), ManualKpiSeeder, ScreenSeeder

# After deploy, start the scheduler:
php artisan schedule:work     # for development
# or crontab entry for production (see Scheduler section above)
```

---

*End of BACOVET Backend Architecture Spec — v1.0*
*Covers: Laravel 12 + MySQL 8 + Sanctum SPA Auth + Novacity Sync Pipeline + Revised Sprints 0–8*