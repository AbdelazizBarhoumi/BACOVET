# Admin Page — Complete Reference (Server → View)
## API Endpoints
| Endpoint | Method | Backend | Purpose |
|---|---|---|---|
| `GET /admin/jobs` | GET | `listJobs()` | List all Novacity background jobs |
| `POST /admin/jobs/{id}/run` | POST | `runJob()` | Manually trigger a job |
| `GET /admin/users` | GET | `listUsers()` | List all users |
| `POST /admin/users` | POST | `createUser()` | Create a user |
| `PUT /admin/users/{id}` | PUT | `updateUser()` | Update a user |
| `PATCH /admin/users/{id}/toggle` | PATCH | `toggleUser()` | Toggle user active status |
| `DELETE /admin/users/{id}` | DELETE | `deleteUser()` | Delete a user |
| `GET /admin/screens` | GET | `listScreens()` | List all TV screens |
| `POST /admin/screens` | POST | `createScreen()` | Create a screen |
| `PUT /admin/screens/{id}` | PUT | `updateScreen()` | Update a screen |
| `DELETE /admin/screens/{id}` | DELETE | `deleteScreen()` | Delete a screen |
| `GET /admin/sync-config` | GET | `getSyncConfig()` | List sync interval configs |
| `PUT /admin/sync-config/{key}` | PUT | `updateSyncConfig()` | Update a sync interval |
| `GET /admin/audit-logs` | GET | `auditLogs()` | List audit logs (paginated) |
| `POST /admin/audit-logs` | POST | `createAuditLog()` | Create an audit log entry |
| `DELETE /admin/audit-logs` | DELETE | `clearAuditLogs()` | Clear audit logs |
| `GET /admin/kpi-values` | GET | `listKpiValues()` | List manual KPI values |
| `PUT /admin/kpi-values/{key}` | PUT | `updateKpiValue()` | Update a manual KPI value |
| `GET /admin/pipeline/status` | GET | `pipelineStatus()` | Pipeline source status |
| `POST /admin/pipeline/sync/{source}` | POST | `triggerSync()` | Trigger sync for a source |
| `POST /admin/pipeline/sync-all` | POST | `triggerAllSync()` | Trigger all syncs |
**Auth:** All endpoints require admin role. CSRF token required for state-changing operations.
---
## Files
| File | Purpose |
|---|---|
| `app/Http/Controllers/AdminController.php` | Backend — all endpoints |
| `app/Http/Controllers/AuthController.php` | Auth — login/logout with audit logging |
| `resources/js/services/adminApi.ts` | Frontend API + types |
| `resources/js/pages/admin.tsx` | Main page — 2-column layout |
| `resources/js/context/AuthContext.tsx` | Role definitions + access matrix |
| `app/Models/User.php` | PAGE_ROLES + DEFAULT_REDIRECT |
| `database/seeders/RoleSeeder.php` | Role seed data (7 CDC profiles) |
| `database/seeders/ManualKpiSeeder.php` | Manual KPI seed data (8 KPIs) |
---
## Page Layout
```
┌──────────────────────────────┬──────────────────┐
│ LEFT COLUMN (2/3)            │ RIGHT (1/3)      │
│                              │                  │
│ 1. Configuration globale     │ 7. Écrans TV     │
│ 2. Configuration Sync        │                  │
│ 3. Gestion KPI Manuels       │ 8. Pipeline      │
│ 4. Supervision flux API      │    Supervision   │
│ 5. Gestion des comptes       │                  │
│ 6. Journal d'audit           │                  │
└──────────────────────────────┴──────────────────┘
```
---
# CDC Pilier Mapping
| Pilier | CDC Ref | Admin Sections | Status |
|---|---|---|---|
| Pilier 1 — Supervision des flux | F-REQ-401 | Section 4 (API jobs) + Section 8 (Pipeline) | Covered |
| Pilier 2 — Gestion des Écrans | NF-REQ-503 | Section 7 — Toggle online/offline, assign page | Covered |
| Pilier 3 — Audit + IAM | NF-REQ-505 | Section 5 (users) + Section 6 (audit logs) | Covered |
---
# Section 1: Configuration Globale
**Panel:** "Configuration globale"
**Data:** Client-side state from `useLiveData()` hook
## View
```
Panel "Configuration globale"
├─ Label: "Fréquence de rafraîchissement (secondes)"
├─ Input: type=number, min=10, max=600, value=refreshIntervalSec
├─ Button: "Forcer la synchronisation" → forceSync()
└─ Right: "Dernière sync: 10:30:00"
```
**Actions:**
- Refresh interval change → `setRefreshIntervalSec()` (client-side, 10-600s range)
- Force sync button → `forceSync()` + creates audit log "Sync globale forcée"
**CDC coverage:** NF-REQ-508 (rafraîchissement automatique). Not in CDC spec but valuable.
---
# Section 2: Configuration Sync Backend
**Panel:** "Configuration Sync Backend"
**Backend:** `getSyncConfig()` → `SyncSetting` model
**Visibility:** Only shown if `syncConfig.length > 0`
## Server → API → View
### Server
```
getSyncConfig()
  └─ SyncSetting::all(['key', 'value', 'description', 'updated_at'])
updateSyncConfig(key, value)
  └─ SyncSetting::where('key', $key)->update(['value' => $value, 'updated_by' => user_id])
     → Cache::forget("sync_setting:{$key}")
     → AuditLog::create(...)
```
### API Response
```json
GET /admin/sync-config →
{
  "data": [
    { "key": "sync_quality_interval", "value": "300", "description": "Intervalle sync Qualité (secondes)", "updated_at": "2026-06-18T10:00:00Z" },
    { "key": "sync_production_interval", "value": "600", "description": "Intervalle sync Production", "updated_at": "2026-06-18T10:00:00Z" }
  ]
}
```
### View
```
Panel "Configuration Sync Backend"
├─ Subtitle: "Intervalles de synchronisation Novacity → MySQL (min: 60s, max: 3600s)"
└─ For each config item:
   ├─ Label: "Intervalle sync Qualité (secondes)"
   ├─ Input: type=number, min=60, max=3600, value=300, w-24
   ├─ "sec" label
   └─ Button: "Sauver" → updateSyncConfig(key, value)
```
**CDC coverage:** NF-REQ-506 (supervision des syncs). Not in CDC spec but supports sync management.
---
# Section 3: Gestion des KPI Manuels
**Panel:** "Gestion des KPI Manuels"
**Backend:** `listKpiValues()` + `updateKpiValue()`
**Seeded KPIs (ManualKpiSeeder):**
| KPI Key | Label | CDC Ref | Source |
|---|---|---|---|
| `f_req_216` | Taux d'archivage | F-REQ-216 | Base suivi prod |
| `f_req_217` | Taux fiabilité données (GPRO) | F-REQ-217 | Base fiabilité GPRO |
| `f_req_218` | Respect Temps Estimé | F-REQ-218 | Base rendement + Cotation |
| `f_req_219` | Temps Acceptés 1ère Version | F-REQ-219 | Déchiffrage + Cotation |
| `dev_rft` | RFT Développement | F-REQ-350 | Drive (monthly) |
| `dev_livraison` | Respect Livraison à Date | F-REQ-351 | Drive (monthly) |
| `dev_nomenclature` | Fiabilité Nomenclature | F-REQ-352 | Drive (monthly) |
| `dev_reclamations` | % Réclamations Production | F-REQ-353 | Drive (monthly) |
## Server → API → View
### Server
```
listKpiValues()
  └─ ManualKpiValue::with('updater')->get()
     → kpi_key, kpi_label, value, numerator, denominator, updated_at, updated_by
updateKpiValue(key, numerator, denominator)
  └─ value = (numerator / denominator) × 100
     ManualKpiValue::updateOrCreate(...)
     manual_kpi_history: upsert (year, month, value, numerator, denominator)
     AuditLog::create(...)
```
### API Response
```json
GET /admin/kpi-values →
{
  "data": [
    { "kpi_key": "f_req_216", "kpi_label": "Taux d'archivage", "value": 82.5, "numerator": 165, "denominator": 200, "updated_at": "2026-06-18T10:00:00Z", "updated_by": "Admin" }
  ]
}
```
### View
```
Panel "Gestion des KPI Manuels"
├─ Subtitle: "Valeurs KPI saisies manuellement (Méthodes + Développement)"
table:
┌──────────────┬──────────────────┬──────────┬────────────────┬──────────┐
│ Clé          │ Indicateur       │ Valeur   │ Dernière MAJ   │ Actions  │
├──────────────┼──────────────────┼──────────┼────────────────┼──────────┤
│ f_req_216    │ Taux archivage   │ 82.5%    │ 18/06 10:00    │ ✏ Modifier│
│ f_req_217    │ Fiabilité GPRO   │ 91.2%    │ 18/06 10:00    │ ✏ Modifier│
│ ...          │ ...              │ ...      │ ...            │ ...      │
└──────────────┴──────────────────┴──────────┴────────────────┴──────────┘
Edit Modal (Dialog):
├─ "Modifier — Taux d'archivage"
├─ Input: Numérateur (valeur actuelle)
├─ Input: Dénominateur (total)
├─ Preview: "Résultat: 82.5%" (auto-computed)
└─ Buttons: Annuler / Enregistrer
```
---
# Section 4: Supervision des flux API
**Panel:** "Supervision des flux API"
**Backend:** `listJobs()` → Novacity API
## Server → API → View
### Server
```
listJobs()
  └─ NovacityService::fetchJobs(adminToken) → Novacity API
     → Map: id, name, query_slug, source, last_status, last_run_at, is_active
```
### API Response
```json
GET /admin/jobs →
{
  "data": [
    { "id": 1, "name": "wip", "query_slug": "wip", "source": "SDT", "last_status": "ok", "last_run_at": "2026-06-18T10:30:00Z", "is_active": true },
    { "id": 2, "name": "taging", "query_slug": "taging", "source": "QCM", "last_status": "ok", "last_run_at": "2026-06-18T10:30:00Z", "is_active": true },
    { "id": 3, "name": "stock", "query_slug": "stock", "source": "DIVATEX", "last_status": "ok", "last_run_at": "2026-06-18T10:30:00Z", "is_active": true }
  ]
}
```
### View
```
Panel "Supervision des flux API"
table:
┌─────────────────────┬──────────┬──────────────────┬──────────────┐
│ Source              │ Statut   │ Dernière sync    │ Action       │
├─────────────────────┼──────────┼──────────────────┼──────────────┤
│ ERP DIVA            │ 🟢 200 OK│ il y a 5 min 30s │ Exécuter     │
│ Novacity SDT        │ 🟢 200 OK│ il y a 2 min 15s │ Exécuter     │
│ Novacity QCM        │ 🟢 200 OK│ il y a 3 min     │ Exécuter     │
└─────────────────────┴──────────┴──────────────────┴──────────────┘
```
**Logic:** Jobs are grouped by `source` field from the Novacity API response. Only 3 sources exist in the Novacity system (SDT, QCM, DIVATEX). Source labels:
- `DIVATEX` / `DIVA` → "ERP DIVA"
- `SDT` → "Novacity SDT"
- `QCM` → "Novacity QCM"
Other source values display their raw value. GPRO and Google Drive are NOT Novacity jobs — they appear only in Section 8 (Pipeline Supervision).

**Status logic:** `ok` if all jobs in source have `last_status='ok'`, `error` if any has error, `stale` if last run > 2 minutes ago.
**Action:** "Exécuter Maintenant" → `runJobManually(firstJobId)` or `forceSync()` if no jobs.
---
# Section 5: Gestion des comptes
**Panel:** "Gestion des comptes"
**Backend:** CRUD on `User` model
## CDC Role Matrix (Section 2)
| Role Slug | Label | Pages Allowed |
|---|---|---|
| `admin` | IT / Administrateur | All (admin, quality, production, logistics, development, methods) |
| `direction` | Direction | quality, production, logistics, development, methods |
| `resp_production` | Responsable Production | quality, production |
| `chef_atelier` | Chef d'Atelier | production |
| `resp_qualite` | Responsable Qualité | quality |
| `methodes` | Méthodes / Planning | quality, production, logistics, methods, development |
| `planning_coupe` | Planning / Coupe | production, logistics |
## Server → API → View
### Server
```
listUsers()     → User::with('role')->get()
createUser()    → validate → User::create([...])
updateUser()    → User::findOrFail(id)->update([...])
toggleUser()    → User::findOrFail(id)->toggle is_active
deleteUser()    → User::findOrFail(id)->delete() (can't delete self)
```
### API Response
```json
GET /admin/users →
[
  { "id": 1, "name": "Admin", "matricule": "ADM001", "role": { "slug": "admin", "name": "IT / Administrateur" }, "email": "admin@bacovet.com", "is_active": true }
]
```
### View
```
Panel "Gestion des comptes" [ + Ajouter utilisateur ]
table:
┌──────────────┬───────────┬──────────────────┬──────────────────┬──────────┬──────────┐
│ Utilisateur  │ Matricule │ Rôle             │ Email            │ Statut   │ Actions  │
├──────────────┼───────────┼──────────────────┼──────────────────┼──────────┼──────────┤
│ AA Admin     │ ADM001    │ IT / Administrat │ admin@bacovet    │ Active   │ ✏ 🗑     │
│ BH Ibrahim   │ IBR001    │ Direction        │ ibrahim@bacovet  │ Active   │ ✏ 🗑     │
└──────────────┴───────────┴──────────────────┴──────────────────┴──────────┴──────────┘
Total utilisateurs : 7
```
**Dialogs:**
- Create: `UserDialog` with name, matricule, email, role (select from 7 CDC profiles), password, active toggle
- Edit: Same `UserDialog` pre-filled with existing data
- Delete: Confirmation dialog "Voulez-vous vraiment supprimer...?"
---
# Section 6: Journal d'audit système
**Panel:** "Journal d'audit système"
**Backend:** `auditLogs()` + `createAuditLog()` + `clearAuditLogs()`
## NF-REQ-505 Coverage
| Event | Action Type | Logged Where |
|---|---|---|
| Login success | `LOGIN` | `AuthController::login()` — user ID, IP, timestamp, user_agent |
| Login failure | `LOGIN_FAILED` | `AuthController::login()` — matricule attempted, IP |
| Logout | `LOGOUT` | `AuthController::logout()` — user ID, IP, session duration |
| Admin actions | `USER` / `SYSTEM` | Various admin endpoints |
## Server → API → View
### Server
```
auditLogs()
  └─ AuditLog::with('user')->orderBy('created_at', 'desc')->paginate(50)
     (SoftDeletes: only non-archived entries returned by default)
createAuditLog(action_type, message)
  └─ AuditLog::create([...])
clearAuditLogs()
  └─ AuditLog::where('user_id', current_user)->delete()  // soft-delete (NF-REQ-505 infalsifiable)
     → creates self-referencing entry "Journal d'audit masqué"
     → original records preserved with deleted_at timestamp
```
### View
```
Panel "Journal d'audit système" [ 🗑 Archiver les logs ] [ Enregistrement serveur actif ]
└─ scrollable div (max-h-80):
   [10:30:00] [LOGIN]        Connexion utilisateur: P-1042 depuis 192.168.1.1
   [10:29:45] [USER]         Utilisateur créé: test@bacovet.com (admin)
   [10:28:30] [SYSTEM]       Intervalle sync mis à jour: sync_quality = 300s
   [10:25:00] [LOGIN_FAILED] Échec connexion — Matricule: UNKNOWN-999
   [10:20:00] [LOGOUT]       Déconnexion: P-1042 (durée session: 3600s)
```
**Auto-refresh:** Logs refresh every 10 seconds via `setInterval`. New entries auto-scroll to bottom.
**Action types with colors:**
- `ERROR` / `LOGIN_FAILED` → red (destructive)
- `WARN` → orange
- `USER` / `LOGIN` / `LOGOUT` → blue (chart-4)
- `SYSTEM` → primary
- Other → green
---
# Section 7: Écrans TV (Right Column)
**Panel:** "Écrans TV"
**Backend:** CRUD on `Screen` model
## Screen Page Options (NF-REQ-503)
| Value | Label | CDC Reference |
|---|---|---|
| `quality` | Qualité (Série 100) | Vue Qualité |
| `production` | Production (Série 200) | Vue Production |
| `production_confection` | Production / Confection | Sub-view Série 200 |
| `production_coupe` | Production / Coupe | Sub-view Série 200 |
| `production_serigraphie` | Production / Sérigraphie | Sub-view Série 200 |
| `logistics` | Logistique (Série 300) | Vue Logistique |
| `development` | Développement (Série 350) | Vue Développement |
| `methodes` | Méthodes (F-REQ-404) | Vue Méthodes |
| `admin` | Admin | Admin panel |
## Server → API → View
### Server
```
listScreens()    → Screen::all()
createScreen()   → Screen::create([name, status, assigned_page])
updateScreen()   → Screen::findOrFail(id)->update([...])
deleteScreen()   → Screen::findOrFail(id)->delete()
```
### API Response
```json
GET /admin/screens →
[
  { "id": 1, "name": "Écran Production", "status": "online", "assigned_page": "production" },
  { "id": 2, "name": "Écran Qualité", "status": "offline", "assigned_page": "quality" }
]
```
### View
```
Panel "Écrans TV" [ + Ajouter écran ]
├─ Card "Écran Production":
│  ├─ 🖥 icon + "Écran Production"
│  ├─ Toggle button: online/offline
│  ├─ Select: assigned_page (quality/production/logistics/...)
│  └─ 🗑 delete button
├─ Card "Écran Qualité":
│  ├─ 🖥 icon + "Écran Qualité"
│  ├─ Toggle button: online/offline
│  └─ 🗑 delete button
└─ Create dialog: name input + create button
```
---
# Section 8: Pipeline Supervision (Right Column)
**Panel:** "Pipeline Supervision"
**Backend:** `pipelineStatus()` + `triggerSync()` + `triggerAllSync()`
## Server → API → View
### Server
```
pipelineStatus()
  └─ NovacityJob::whereIn('source', ['SDT','QCM','DIVATEX','DIVA','GOOGLE_DRIVE','GPRO'])->get()
     → groupBy('source')
     → status: 'online'/'degraded'/'offline'
     → last_sync, total_rows, last_error
triggerSync(source)
  └─ Process::run("php artisan sync:{command}")
     AuditLog::create(...)
triggerAllSync()
  └─ For each command: Process::run("php artisan sync:{command}")
```
### API Response
```json
GET /admin/pipeline/status →
[
  { "name": "Novacity SDT", "status": "online", "last_sync": "2026-06-18T10:30:00Z", "total_rows": 15000, "last_error": null },
  { "name": "Novacity QCM", "status": "degraded", "last_sync": "2026-06-18T10:25:00Z", "total_rows": 8000, "last_error": "Connection timeout" },
  { "name": "Novacity DIVATEX", "status": "online", "last_sync": "2026-06-18T10:28:00Z", "total_rows": 25000, "last_error": null },
  { "name": "Google Drive", "status": "offline", "last_sync": null, "total_rows": 0, "last_error": null },
  { "name": "GPRO Consulting", "status": "online", "last_sync": "2026-06-18T10:30:00Z", "total_rows": 3000, "last_error": null }
]
```
### View
```
Panel "Pipeline Supervision"
├─ Button: "🔄 Sync Toutes les Sources" → triggerAllSync()
└─ For each source:
   ├─ Card "Novacity SDT":
   │  ├─ Status dot: 🟢 online / 🟡 degraded / ⚫ offline
   │  ├─ "Dernière sync: il y a 2 min"
   │  ├─ "15 000 lignes synchronisées"
   │  └─ Button: "Synchroniser" → triggerSync('novacity-sdt')
   ├─ Card "Google Drive":
   │  ├─ Status: ⚫ offline
   │  └─ Button: "Synchroniser" → triggerSync('google-drive')
   └─ ...
```
**Sync command mapping:**
| Source | Artisan Command |
|---|---|
| `novacity-sdt` | `sync:quality` |
| `novacity-qcm` | `sync:quality` |
| `novacity-divatex` | `sync:logistics` |
| `google-drive` | `sync:drive` |
| `gpro-consulting` | `sync:gpro` |
---
# Data Fetch Summary
| API Call | State Variable | Used By Sections |
|---|---|---|
| `fetchAllJobs()` | `jobs` (reducer) | Section 4 (API status by source), Section 8 (pipeline) |
| `fetchAllUsers()` | `users` (reducer) | Section 5 (users table) |
| `fetchAllScreens()` | `screens` (reducer) | Section 7 (screens cards) |
| `fetchAuditLogs()` | `logs` | Section 6 (audit log) — auto-refresh 10s |
| `fetchSyncConfig()` | `syncConfig` | Section 2 (sync intervals) |
| `fetchManualKpiValues()` | `kpiValues` | Section 3 (KPI table) |
| `fetchPipelineStatus()` | Not used by admin.tsx | Endpoint available — admin page computes pipeline from `jobs` reducer instead |
---
# RBAC
| Role | Access |
|---|---|
| `admin` | Full access to all admin features |
| `direction` | Read-only (can view but not modify) |
| Other roles | Redirected to `/unauthorized` |
---
# State Management
Uses `useReducer` with `adminReducer` for jobs, users, screens. Actions:
- `LOAD_DATA` — initial load from API
- `SET_ERROR` — server error
- `UPDATE_JOBS` — after job run
- `UPDATE_USERS` — after user CRUD
- `UPDATE_SCREENS` — after screen CRUD
Audit logs use separate `useState`. Sync config and KPI values use separate `useState`.
---
# Session Expiry (F-REQ-400 / NF-REQ-502)
**CDC Requirement:** "La session doit expirer automatiquement après une période d'inactivité ou à la fin d'un shift standard (8 heures)."
**Backend:** `SESSION_LIFETIME=480` (8 hours) in `.env` / `config/session.php`. Driver: database.
**Frontend:** Inactivity timeout in `AuthContext.tsx` — 30 min idle (mouse/keyboard/scroll/touch) → forced logout via `router.post('/auth/logout')`.
**Implementation layers:**
1. Server-side: Laravel session garbage collection runs every request. Sessions older than 480 min are destroyed.
2. Client-side: Activity event listeners reset a 30-min timer. On expiry, toast "Session expirée par inactivité" and redirect to login.
3. Both layers operate independently — a user hitting the server after 480 min gets redirected even if the frontend timer hasn't fired.
---
# Known CDC Inconsistencies
## Coupe role — Section 2 vs NF-REQ-501
CDC Section 2 says "Coupe: Lecture Tous" (full read access). CDC NF-REQ-501 says "Planning/Coupe: DOT, HOT, Lead Time, Respect Planif" (logistics-focused). The admin implementation chose the NF-REQ-501 definition (`planning_coupe` → production, logistics), which is defensible but diverges from Section 2. Flagged as a known CDC inconsistency resolved in favour of the more specific clause.

## F-REQ-217 — Manual vs automatic
The Novacity API exposes `taging_reel` (query §3.4) with `tag_theorique`, `tag_reel`, `ecart_pct` per chain/shift. If "sortie fin chaine" (variable 79) is also stored locally by the sync, F-REQ-217 could be computed automatically — not entered manually. Currently seeded as manual KPI in `ManualKpiSeeder`. Verify whether "Base suivi production" is the local MySQL DB (auto-fed) or a separate external system (manual).
