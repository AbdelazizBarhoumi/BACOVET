## CRITICAL PRE-SPRINT BLOCKERS

Before writing any UI code, the following must be resolved with the Novacity API team:

| #    | Blocker                                                                                                | Endpoints / Action required                                                                                                                                                                     |
| ---- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B-01 | **4 BR Bundling query slugs are INACTIVE** in the current API                                          | Request activation of: `rejets_suite_inspection_paquet_jour_en_cours`, `inspections_paquet_jour_en_cours`, `rejets_suite_inspection_paquet_annee_en_cours`, `inspections_paquet_annee_en_cours` |
| B-02 | **No DIVA endpoint exists for BR GTD data** (F-REQ-101/102/103)                                        | Request Novacity configure new endpoints exposing the DIVA reject/control counts per chain                                                                                                      |
| B-03 | **Auth endpoint not defined** in Novacity API doc                                                      | Confirm or build the `/api/auth/login` endpoint that accepts `{eid, password}` and returns a JWT                                                                                                |
| B-04 | **GPRO Consulting data** (SAM, SOT, Effectifs, BPD, EPD, EHD, Objectifs, Cadences) has no API endpoint | Either Novacity adds these endpoints, or agree that these remain static placeholders displaying "—" until the data source is connected                                                          |
| B-05 | **"Base suivi production"** data (F-REQ-216 Taux d'archivage) has no API endpoint                      | Confirm with Bacovet IT whether this data will be exposed via Novacity or manually entered                                                                                                      |
| B-06 | **`requete_unifiee_dashboard_tout-en-un`** (job 53) is also INACTIVE                                   | Not blocking since individual queries are used, but activate for future optimisation                                                                                                            |

---

## SPRINT OVERVIEW MAP

| Sprint | Theme                                               | Pages Covered                            | Duration |
| ------ | --------------------------------------------------- | ---------------------------------------- | -------- |
| 0      | Foundation & Setup                                  | None (infra)                             | Week 1   |
| 1      | Auth + Navigation Shell                             | Login + Sidebar                          | Week 2   |
| 2      | Admin Panel                                         | Admin page                               | Week 3   |
| 3      | Quality Dashboard                                   | Série 100                                | Week 4   |
| 4      | Production Dashboard                                | Série 200 — Confection tab               | Week 5   |
| 5      | Production Dashboard                                | Série 200 — Coupe + Sérigraphie tabs     | Week 6   |
| 6      | Logistics Dashboard                                 | Série 300                                | Week 7   |
| 7      | Development + Méthodes Dashboards + Global Features | Série 350 + F-REQ-404 + Filters + Export | Week 8   |
| 8      | QA, Performance & UAT                               | All pages                                | Week 9   |

---

---

# SPRINT 0 — Foundation & Setup

**Goal:** Everything is configured before one line of UI is written. Zero features visible to users — only developers can verify this sprint.

---

## What's Needed

### 0.1 — Project Bootstrap

- Create the Lovable project with React + Tailwind
- Set the default language to French in all placeholder text
- Configure environment variables:
  - `VITE_API_BASE_URL` = base URL of the Novacity API server
  - `VITE_API_KEY` = provider API key (x-api-key header)
  - `VITE_GOOGLE_DRIVE_API_KEY` = for Sprint 7

### 0.2 — API Service Layer (`/src/services/api.js`)

Central API service that:

- Adds `x-api-key` header to every request automatically
- Has one function per endpoint (22 configured endpoints + 36 custom queries)
- Handles pagination (`limit`, `offset`) as optional parameters (default: limit=100, offset=0)
- Returns `data.data` array on success
- Throws a typed error on `success: false` or HTTP error
- Has a 10-second request timeout

**⚠ Type coercions required** — apply these transformations before returning data:

- `capacite_de_stockage_en_nombre_de_conteneurs`: cast `Conteneurs_Actifs`, `Conteneurs_Consommes`, `Conteneurs_Supprimes` from string to `parseInt()`
- `moyenne_date_de_transfert_date_de_reservation`: cast `MoyenneJours` from string to `parseFloat()`

Functions to create:

```js
// Configured endpoints (22)
fetchItemTrxEnq(limit, offset);
fetchVwItemTrx(limit, offset);
fetchLostType(limit, offset);
fetchLostTimeTrx(limit, offset);
fetchRoverEffectiveness(limit, offset);
fetchProduction(limit, offset);
fetchInlineVsEndlineComparison(limit, offset);
fetchEmpDefectEff(limit, offset);
fetchVwDefect(limit, offset);
fetchRejectQte(limit, offset);
fetchQcmDefectTrx(limit, offset);
fetchCheckPassQte(limit, offset);
fetchMpFamille(limit, offset);
fetchMp(limit, offset);
fetchOfabrication(limit, offset);
fetchMouvement(limit, offset);
fetchMpConteneur(limit, offset);
fetchArticlesColis(limit, offset);
fetchDetailColis(limit, offset);
fetchExpeditions(limit, offset);
fetchVueStock(limit, offset);
fetchDivaStock(limit, offset);

// Custom SQL queries (36)
fetchColisTotalVar(limit, offset);
fetchPacketsRejetes(limit, offset);
fetchWipChaine(limit, offset);
fetchTagingReel(limit, offset);
fetchEtatAvancement(limit, offset);
fetchEfficienceChaine(limit, offset);
fetchMinutesPresence(limit, offset);
fetchMinutesProduites(limit, offset);
fetchTempsOperation(limit, offset);
fetchLostTime(limit, offset);
fetchQteProduite(limit, offset);
fetchQteEntreeSerigraphie(limit, offset);
fetchQteDepartChaineArticleOf(limit, offset);
fetchSortieSerigraphie(limit, offset);
fetchQteEngagement(limit, offset);
fetchSortieCoupe(limit, offset);
fetchQteProduitIndivJour(limit, offset);
fetchPiecesOkJourEnCours(limit, offset);
fetchPiecesProduiteJourEnCours(limit, offset);
fetchRejetsInspectionPaquetJour(limit, offset); // ⚠ CURRENTLY INACTIVE — activate before Sprint 3
fetchInspectionsPaquetJour(limit, offset); // ⚠ CURRENTLY INACTIVE — activate before Sprint 3
fetchPiecesOkAnneeEnCours(limit, offset);
fetchPiecesProduiteAnneeEnCours(limit, offset);
fetchRejetsInspectionPaquetAnnee(limit, offset); // ⚠ CURRENTLY INACTIVE — activate before Sprint 3
fetchInspectionsPaquetAnnee(limit, offset); // ⚠ CURRENTLY INACTIVE — activate before Sprint 3
fetchStockMoyen(limit, offset);
fetchArticlesSansMouvement(limit, offset);
fetchQuantiteTotaleStock(limit, offset);
fetchCapaciteStockage(limit, offset); // apply parseInt() on Conteneurs_* fields
fetchNombreRouleaux(limit, offset);
fetchNombreOFsLivres(limit, offset);
fetchMoyenneDateTransfert(limit, offset); // apply parseFloat() on MoyenneJours
fetchQuantiteParProvenance(limit, offset);
fetchQuantiteParFamille(limit, offset);
fetchQuantiteParTypologie(limit, offset);

// Pending — to be configured by Novacity (Blocker B-02)
// fetchBrGtdJourEnCours(limit, offset)    // F-REQ-102 — DIVA reject/control count by chain, today
// fetchBrGtdDda(limit, offset)            // F-REQ-103 — DIVA reject/control count by chain, year-to-date
// fetchBrAnnuel(limit, offset)            // F-REQ-101 — DIVA annual BR
```

### 0.3 — Admin API Service (`/src/services/adminApi.js`)

- `fetchAllJobs()` → `GET /api/admin/jobs` with Bearer JWT
- `runJobManually(jobId)` → `GET /api/admin/jobs/:id/run` with Bearer JWT

### 0.4 — Auth Context (`/src/context/AuthContext.jsx`)

- Stores: `{ user, role, token, isAuthenticated }`
- `login(eid, password)` → calls backend `/api/auth/login` (Blocker B-03: confirm endpoint) → stores JWT in memory (not localStorage)
- `logout()` → clears state, redirects to `/login`
- `useAuth()` hook exported
- Session expiry: auto-logout after 8 hours

### 0.5 — Router Setup (`/src/App.jsx`)

Configure React Router with these routes:

```
/login         → LoginPage (public)
/              → redirect to role-based default page if logged in, else /login
/admin         → AdminPage            (roles: IT)
/quality       → QualityPage          (roles: Direction, Qualité, Production, Méthodes, IT)
/production    → ProductionPage       (roles: Direction, Production, Chef Atelier, Méthodes, IT)
/logistics     → LogisticsPage        (roles: Direction, Méthodes, Planning, Coupe, IT)
/methods       → MethodesPage         (roles: Direction, Méthodes, IT)           ← NEW (F-REQ-404)
/development   → DevelopmentPage      (roles: Direction, Méthodes, IT)
/unauthorized  → simple "Accès refusé" page
```

Role-based default redirect after login:

| Role                   | Default redirect |
| ---------------------- | ---------------- |
| IT / Administrateur    | /admin           |
| Direction              | /quality         |
| Responsable Production | /production      |
| Chef d'Atelier         | /production      |
| Responsable Qualité    | /quality         |
| Méthodes / Planning    | /methods         |
| Coupe                  | /production      |

Create a `ProtectedRoute` wrapper component that:

- Checks `isAuthenticated`
- Checks that user's `role` is in the allowed roles list
- Redirects to `/login` or `/unauthorized` accordingly

### 0.6 — Design Tokens (Tailwind Config)

```js
colors: {
  brand: {
    dark: '#1a1a2e',
    primary: '#0f3460',
    accent: '#e94560',
  },
  status: {
    green: '#16a34a',
    orange: '#ea580c',
    red: '#dc2626',
    grey: '#6b7280',
  }
}
```

### 0.7 — Shared Component Stubs

Create empty stub files (each returns `<div>ComponentName</div>`):

- `/src/components/BigNumberCard.jsx`
- `/src/components/TrafficLightBadge.jsx`
- `/src/components/LiveSyncPill.jsx`
- `/src/components/GlobalFilterBar.jsx`
- `/src/components/GaugeChart.jsx`
- `/src/components/KpiBarChart.jsx`
- `/src/components/KpiLineChart.jsx`
- `/src/components/KpiDonutChart.jsx`
- `/src/components/KpiAreaChart.jsx`
- `/src/components/KpiPieChart.jsx`
- `/src/components/AlertList.jsx`
- `/src/components/DataTable.jsx`
- `/src/components/ParetoChart.jsx`
- `/src/components/ExportButton.jsx`
- `/src/components/Sidebar.jsx`
- `/src/components/TopBar.jsx`
- `/src/components/LoadingSpinner.jsx`
- `/src/components/ErrorBanner.jsx`
- `/src/components/QpTeamPodium.jsx` ← NEW — F-REQ-118/119

---

## Deliverables — Sprint 0

1. Lovable project running on `localhost:5173`
2. All 58+ API functions exist in `/src/services/api.js`
3. Router loads all 8 route paths without crashing
4. AuthContext accessible via `useAuth()`
5. Tailwind brand colors working
6. All 19 component stub files exist

---

## Tests — Sprint 0

### Manual Tests

| Test ID | What to test                                | How                                                | Expected                                          |
| ------- | ------------------------------------------- | -------------------------------------------------- | ------------------------------------------------- |
| S0-T01  | API key is sent                             | DevTools Network, call any API function            | Header shows `x-api-key: <key>`                   |
| S0-T02  | API error handling                          | Point `VITE_API_BASE_URL` to wrong URL             | Typed error, no uncaught exception                |
| S0-T03  | Protected route blocks unauthenticated user | Navigate to `/quality` without login               | Redirect to `/login`                              |
| S0-T04  | Protected route blocks wrong role           | Log in as Chef d'Atelier, navigate to `/admin`     | Redirect to `/unauthorized`                       |
| S0-T05  | Méthodes can access /quality                | Log in as Méthodes, navigate to `/quality`         | Page loads (no redirect to /unauthorized)         |
| S0-T06  | Session expiry                              | Set timeout to 10s for testing, wait               | Auto-logout and redirect to `/login`              |
| S0-T07  | Router covers all 8 routes                  | Visit each route                                   | No 404 or blank page                              |
| S0-T08  | Brand colors render                         | Add test div `bg-background text-success`     | Correct colors appear                             |
| S0-T09  | Conteneurs_Actifs is integer                | Call `fetchCapaciteStockage()`, inspect result     | `typeof result[0].Conteneurs_Actifs === 'number'` |
| S0-T10  | MoyenneJours is float                       | Call `fetchMoyenneDateTransfert()`, inspect result | `typeof result[0].MoyenneJours === 'number'`      |

### API Smoke Tests

| Test ID   | Endpoint                                                       | Expected                                                     |
| --------- | -------------------------------------------------------------- | ------------------------------------------------------------ |
| S0-API-01 | `GET /api/data/itemtrxenq`                                     | `success: true`, `data` is array                             |
| S0-API-02 | `GET /api/data/q/wip_chaine`                                   | `data[0]` has: chaine, en_cours, entree_jour, sortie_jour    |
| S0-API-03 | `GET /api/data/q/pieces_ok_de_premier_coup_jour_en_cours`      | `data[0].FirstPassToday` is a number                         |
| S0-API-04 | Wrong API key                                                  | HTTP 401 or `success: false`                                 |
| S0-API-05 | `GET /api/admin/jobs` with Bearer JWT                          | Returns array of 39 jobs                                     |
| S0-API-06 | `GET /api/data/q/rejets_suite_inspection_paquet_jour_en_cours` | `success: true` and status is active (Blocker B-01 resolved) |

---

---

# SPRINT 1 — Authentication + Navigation Shell

**Goal:** Users can log in, see the correct sidebar, and navigate between empty page shells.

---

## What's Needed

### 1.1 — Login Page (`/src/pages/LoginPage.jsx`)

**Layout:**

- Full-screen dark background (`bg-background`)
- Centered white card (max-width 400px, rounded, shadow)
- Top: BACOVET logo (text-based if no image) + subtitle "PILOTAGE OPÉRATIONNEL"
- Section header: "ACCÈS PRIVÉ" + lock icon + "NF-REQ-502 : AUTHENTIFICATION UNIQUE"

**Form:**

- Input 1: person icon + placeholder "Identifiant Système" + label "MATRICULE / EID"
- Input 2: lock icon + placeholder "Mot de passe" + type=password + eye toggle + label "CLÉ DE SÉCURITÉ"
- Submit button: full-width dark, "VALIDATION IDENTITÉ →"
- Error zone (hidden by default, red on failure)

**Footer inside card:**

- Left: green dot + "RÉSEAU LOCAL : CONNECTÉ"
- Right: "RÉINITIALISER" link

**Footer below card:**

- "EXCELLENCE INDUSTRIELLE"
- "PROPRIÉTÉ DE BACOVET GROUP © 2026"

**Behavior:**

- On submit: call `login(eid, password)` from AuthContext
- Spinner in button while loading
- On success: redirect to role-based default route
- On failure: "Identifiants incorrects. Veuillez réessayer."
- Enter in password field submits

### 1.2 — App Shell Layout (`/src/layouts/AppLayout.jsx`)

- `<Sidebar />` left (fixed, 240px)
- `<TopBar />` top (fixed, 60px)
- Main content area (scrollable, remaining space)

### 1.3 — Sidebar (`/src/components/Sidebar.jsx`)

**Navigation items:**

- 📊 QUALITÉ (100) → `/quality`
- 🏭 PRODUCTION (200) → `/production` (expandable)
  - └ Confection
  - └ Coupe
  - └ Sérigraphie
- 📦 LOGISTIQUE & PLANNING (300) → `/logistics`
- 🔬 DÉVELOPPEMENT & AMÉLIORATION (350) → `/development`
- 📐 MÉTHODES → `/methods` ← NEW (F-REQ-404)
- ─── SYSTÈME ───
- ⚙ ADMINISTRATION → `/admin`
- Bottom: User avatar + name + role + "→ DÉCONNEXION"

**Behavior:**

- Active route highlighted (`bg-primary` + left border)
- Hide items user's role cannot access
- Production sub-items expand when `/production` is active

### 1.4 — TopBar (`/src/components/TopBar.jsx`)

- Dynamic page title based on route
- Global Filter Bar (4 dropdowns: Marque, Atelier, Ligne, OF) — stubs for now
- "IMPRIMER RAPPORT" button (stub)
- LiveSyncPill component

Page title map:

```
/quality     → "SÉRIE 100 : QUALITÉ"
/production  → "SÉRIE 200 : PRODUCTION"
/logistics   → "PILOTAGE LOGISTIQUE"
/methods     → "MÉTHODES & AMÉLIORATION CONTINUE"   ← NEW
/development → "DÉVELOPPEMENT & AMÉLIORATION"
/admin       → "ADMINISTRATION SYSTÈME"
```

### 1.5 — LiveSyncPill (`/src/components/LiveSyncPill.jsx`)

- "● LIVE SYNC: OK" green — last fetch < 2 minutes
- "● SYNC: ERREUR" red — last fetch failed or stale
- Props: `lastFetchTime`, `hasError`
- Updates every 30 seconds

### 1.6 — Page Shell Stubs

Create empty shells for all pages:

- `QualityPage.jsx`
- `ProductionPage.jsx`
- `LogisticsPage.jsx`
- `MethodesPage.jsx` ← NEW
- `DevelopmentPage.jsx`
- `AdminPage.jsx`
- `UnauthorizedPage.jsx`

### 1.7 — BigNumberCard (`/src/components/BigNumberCard.jsx`)

Props:

```
label: string
value: number|string
unit: string
target: string
status: 'green'|'orange'|'red'|'grey'
source: string
isLoading: boolean
error: string|null
```

Design:

- White card, rounded corners
- Top: label small grey caps
- Center: huge value (4xl–5xl) in status color
- Below: target badge pill
- Bottom: source label tiny grey
- Left border 4px in status color
- Loading: pulse skeleton; Error: red tint with message

### 1.8 — QpTeamPodium (`/src/components/QpTeamPodium.jsx`) ← NEW

Reusable podium component for F-REQ-118 and F-REQ-119:

Props:

```
title: string           — e.g. "🏆 BEST QP TEAM"
teams: Array<{
  rank: number          — 1, 2 or 3
  chain: string         — e.g. "CH1"
  score: number         — composite score
  rft_ok: boolean
  br_ok: boolean
  br_in_ok: boolean
  br_gtd_ok: boolean
}>
variant: 'best'|'worst'
isLoading: boolean
error: string|null
```

Design:

- Three podium columns (1st tallest, 2nd medium, 3rd shortest)
- `variant='best'` → gold/silver/bronze; `variant='worst'` → red/orange/grey
- Each column shows: chain name, score, boolean indicator icons per KPI criterion
- No data available state: "Données DIVA + DRIVE requises"

Score formula (from CDC F-REQ-118/119):

```
score = (rft_ok ? 1 : 0) + (br_in_ok ? 3 : 0) + (br_gtd_ok ? 3 : 0) + (br_ok ? 5 : 0)
```

Maximum score = 12. Sort descending for Best QP Team, ascending for Low QP Team.

### 1.9 — ErrorBanner & LoadingSpinner

**ErrorBanner:** Red banner, warning icon, message prop, dismiss (×)
**LoadingSpinner:** Spinning circle, optional `size: 'sm'|'md'|'lg'`

---

## Deliverables — Sprint 1

1. Login page renders and matches prototype design
2. Login success redirects to correct role page
3. Login failure shows French error message
4. Sidebar renders with correct items per role including Méthodes nav item
5. TopBar renders with page title and LiveSyncPill
6. All 7 page shells load without crashing
7. Sidebar navigation works for all routes
8. BigNumberCard renders in all states
9. QpTeamPodium stub renders in 'best' and 'worst' variants
10. Logout clears session and returns to Login

---

## Tests — Sprint 1

| Test ID | What to test             | Steps                                  | Expected                                                     |
| ------- | ------------------------ | -------------------------------------- | ------------------------------------------------------------ |
| S1-T01  | Login success            | Valid credentials                      | Redirect to role page                                        |
| S1-T02  | Login wrong password     | Wrong password                         | Red error message                                            |
| S1-T03  | Login empty fields       | Submit empty                           | Form validation blocks                                       |
| S1-T04  | Login Enter key          | Press Enter in password                | Submits                                                      |
| S1-T05  | Show password toggle     | Click eye icon                         | Password visible                                             |
| S1-T06  | Sidebar — Direction role | Log in as Direction                    | All 6 nav items                                              |
| S1-T07  | Sidebar — Chef Atelier   | Log in as Chef Atelier                 | Only Production + no Admin + no Methods                      |
| S1-T08  | Sidebar — Méthodes       | Log in as Méthodes                     | Qualité + Production + Logistique + Méthodes + Développement |
| S1-T09  | Sidebar active state     | Navigate to each page                  | Correct item highlighted                                     |
| S1-T10  | Production sub-menu      | Click Production                       | Expands Confection/Coupe/Sérigraphie                         |
| S1-T11  | Logout                   | Click DÉCONNEXION                      | Redirect to Login                                            |
| S1-T12  | Back button after logout | Browser back                           | Stays on Login                                               |
| S1-T13  | LiveSyncPill fresh       | Any page open                          | Green LIVE SYNC: OK                                          |
| S1-T14  | LiveSyncPill stale       | Set lastFetchTime 5 min ago            | Pill turns red                                               |
| S1-T15  | BigNumberCard all states | Render with each status                | Correct border and text color                                |
| S1-T16  | /methods route loads     | Navigate to /methods as Méthodes       | Shell renders                                                |
| S1-T17  | Unauthorized /methods    | Log in as Chef Atelier, go to /methods | /unauthorized                                                |

---

---

# SPRINT 2 — Admin Panel

**Goal:** IT admin can monitor API jobs, manage users, control screen assignments, and read the audit log.

---

## What's Needed

### 2.1 — Admin Page Layout (`/src/pages/AdminPage.jsx`)

Three-column layout inside AppLayout:

- Left: Sidebar
- Center: API Supervision + User Management + Audit Log
- Right: Screen Management

### 2.2 — API Supervision Panel

**Data source:** `GET /api/admin/jobs` (Bearer JWT)

Table per data source:

| Source       | Status    | Last sync     | Response     |
| ------------ | --------- | ------------- | ------------ |
| ERP DIVA     | 🟢 OK     | "il y a 30s"  | "245 lignes" |
| GPRO-PROD    | 🟢 OK     | "il y a 45s"  | "OK"         |
| Google Drive | 🔴 ERREUR | "il y a 5min" | "Timeout"    |

Logic:

- If any job for that source has `last_status !== "ok"` → 🔴
- If latest `last_run` is > 2 minutes ago → 🟠
- Otherwise → 🟢

Relative time display updates every 30 seconds without re-fetching.
Auto-refresh: re-fetch every 60 seconds.
"EXÉCUTER MAINTENANT" button → calls `GET /api/admin/jobs/:id/run` → toast.

**⚠ Display a banner if any of the 4 BR Bundling query jobs (IDs 60, 61, 54, 55) are inactive**, with text: "Attention : 4 requêtes BR Bundling sont inactives. Contactez Novacity pour activation (Blocker B-01)."

### 2.3 — User Management Panel

> Note: Requires a backend user management API built separately. Build the UI; wire to your own backend.

Table columns: Avatar | Nom | Matricule/EID | Rôle | Email | Statut | Actions

Actions: ✏️ Edit (modal) | 🔴/🟢 Désactiver/Activer

**Rôles dropdown:**

```
IT / Administrateur
Direction
Responsable Production
Chef d'Atelier
Responsable Qualité
Méthodes / Planning
Coupe
```

"+ Ajouter utilisateur" button → modal with: Nom, Matricule/EID, Rôle, Mot de passe, Confirmer MDP

### 2.4 — Screen Management Panel (right column)

Grid of screen cards. Each card:

- Screen name (e.g. "Atelier 1 — Confection")
- Status dot: En ligne / Hors ligne
- Dropdown: Qualité | Production Confection | Production Coupe | Production Sérigraphie | Logistique | Méthodes | Développement | Administration

### 2.5 — Audit Log Panel

Scrollable list (max-height 300px).

```
[2026-04-15 14:03:27] [INFO] Synchronisation API Production réussie – 245 enregistrements
[2026-04-15 14:07:45] [USER] Connexion utilisateur: admin@bacovet.com depuis 192.168.1.45
[2026-04-15 14:08:03] [WARN] Latence détectée sur API Logistique – 850ms
```

Color: INFO=grey | USER=blue | WARN=orange | ERROR=red | SYSTEM=purple

Toggle "Enregistrement actif". "EFFACER LES LOGS" with confirmation dialog.
Auto-scroll to bottom on new entries.

---

## Deliverables — Sprint 2

1. Admin page renders with 3-column layout
2. API Supervision shows live job statuses
3. BR Bundling inactive banner shows when applicable
4. Manual job execution works with toast
5. User table renders; modals open and validate
6. Screen management cards with Méthodes option in dropdown
7. Audit log renders color-coded
8. All admin actions require IT role

---

## Tests — Sprint 2

| Test ID | What to test                | Steps                            | Expected                                  |
| ------- | --------------------------- | -------------------------------- | ----------------------------------------- |
| S2-T01  | Jobs API call               | Network tab on Admin page        | Request to `/api/admin/jobs` with JWT     |
| S2-T02  | Source OK                   | All jobs last_status: "ok"       | All sources 🟢                            |
| S2-T03  | Source error                | Set one job last_status: "error" | That source 🔴                            |
| S2-T04  | Source stale                | Set last_run to 10 min ago       | That source 🟠                            |
| S2-T05  | BR Bundling inactive banner | Jobs 60/61/54/55 inactive        | Banner visible with Novacity contact info |
| S2-T06  | Manual job run              | Click EXÉCUTER MAINTENANT        | Toast with result                         |
| S2-T07  | Auto-refresh                | Wait 60s                         | Status refreshes                          |
| S2-T08  | Add user modal              | Click + Ajouter                  | Modal opens with all fields               |
| S2-T09  | Password mismatch           | Different passwords              | "Les mots de passe ne correspondent pas"  |
| S2-T10  | Edit user                   | Click ✏️                         | Modal prefilled                           |
| S2-T11  | Screen Méthodes option      | Open screen dropdown             | "Méthodes" listed as option               |
| S2-T12  | Audit log colors            | View log                         | INFO=grey, WARN=orange, ERROR=red         |
| S2-T13  | Access control              | Log in as Qualité, go to /admin  | /unauthorized                             |

---

---

# SPRINT 3 — Quality Dashboard (Série 100)

**Goal:** The quality page is fully functional with live data.

**⚠ Dependency:** B-01 (BR Bundling endpoints active) and B-02 (DIVA BR GTD endpoints configured) must be resolved before completing sections 3.2 (Cards 1–3) and 3.3. Cards 2/4 will show a "Données indisponibles — activation requise" state until B-01 is resolved.

---

## What's Needed

### 3.1 — Quality Page Structure (`/src/pages/QualityPage.jsx`)

Page title: "SÉRIE 100 : QUALITÉ"

Sections:

1. Top KPI row — 8 BigNumberCards (in two rows of 4)
2. Middle row — BR bar chart + Alert list
3. Best / Low QP Team podiums ← NEW
4. Annual trend line chart
5. Pareto tabs

### 3.2 — Row 1: KPI Cards (F-REQ-101 to F-REQ-107)

**Card 1 — BR CGL (F-REQ-101)** ← NEW

- Source: DIVA (Blocker B-02 — pending API endpoint)
- Formula: `rejets_controle_annuel / nb_controles_annuel * 100`
- Target: ≤5% → Green, 4–5% → Orange, >5% → Red
- Label: "BR CGL (DDA)"
- Source label: "Source: DIVA"
- Until B-02 is resolved: show `BigNumberCard` in `status='grey'` with value "En attente API DIVA" and no error banner

**Card 2 — BR GTD Ce Jour (F-REQ-102)** ← NEW

- Source: DIVA (Blocker B-02 — pending API endpoint)
- Formula: `rejets_controle_chaine_jour / nb_controles_chaine_jour * 100`
- Target: ≤5%
- Label: "BR GTD (Ce jour)"
- Source label: "Source: DIVA"
- Until B-02: grey placeholder as above

**Card 3 — RFT Ce Jour (F-REQ-104)**

- Call: `fetchPiecesOkJourEnCours()` → `data[0].FirstPassToday`
- Call: `fetchPiecesProduiteJourEnCours()` → `data[0].ProducedToday`
- Formula: `(FirstPassToday / ProducedToday * 100).toFixed(1) + "%"`
- Guard: if `ProducedToday === 0` → show "N/A"
- Guard: if computed value > 100 → show "N/A" (sample data anomaly protection)
- Target: ≥98% → Green, 95–98% → Orange, <95% → Red
- Label: "RFT (Ce jour)"
- Source: "Source: GPRO"

**Card 4 — BR Bundling Ce Jour (F-REQ-106)**

- Call: `fetchRejetsInspectionPaquetJour()` → `data[0].BundleRejectToday` ⚠ INACTIVE
- Call: `fetchInspectionsPaquetJour()` → `data[0].BundleInspectedToday` ⚠ INACTIVE
- Formula: `(BundleRejectToday / BundleInspectedToday * 100).toFixed(1) + "%"`
- Guard: division by zero → "N/A"
- Target: ≤4% → Green, 4–5% → Orange, >5% → Red
- Label: "BR Bundling (Ce jour)"
- Source: "Source: GPRO"
- Until B-01 resolved: grey placeholder "Activation requise (B-01)"

**Row 2:**

**Card 5 — BR GTD DDA (F-REQ-103)** ← NEW

- Source: DIVA (Blocker B-02)
- Formula: annual version of F-REQ-102
- Label: "BR GTD DDA (Année)"
- Until B-02: grey placeholder

**Card 6 — RFT Année (F-REQ-105)**

- Call: `fetchPiecesOkAnneeEnCours()` → `data[0].FirstPassYear`
- Call: `fetchPiecesProduiteAnneeEnCours()` → `data[0].ProducedYear`
- Formula: `(FirstPassYear / ProducedYear * 100).toFixed(1) + "%"`
- Target: same as Card 3
- Label: "RFT DDA (Année en cours)"
- Source: "Source: GPRO"

**Card 7 — BR Bundling Année (F-REQ-107)**

- Call: `fetchRejetsInspectionPaquetAnnee()` → `data[0].BundleRejectYear` ⚠ INACTIVE
- Call: `fetchInspectionsPaquetAnnee()` → `data[0].BundleInspectedYear` ⚠ INACTIVE
- Formula: same as Card 4
- Label: "BR Bundling DDA (Année)"
- Until B-01 resolved: grey placeholder

**Card 8 — BR Print Ce Jour (F-REQ-108)**

- Source: Google Drive
- Show placeholder: "Source: Google Drive — Données mises à jour 4×/jour"
- Mock value displayed (will be wired in Sprint 7)

> Note: F-REQ-108 to F-REQ-115 (BR Print, Care Label, Accessoires, Compo) are all Google Drive sourced and will be wired in Sprint 7. Show placeholder cards with mock values and source label "Source: Google Drive — Données mises à jour 4×/jour".

### 3.3 — BR Bar Chart: par Étape de Contrôle

**Component:** `KpiBarChart`
**Data:** `fetchCheckPassQte()` → `{ LOGDATE, SHORTNAME, ShiftCode, DefectPct }`

- Group by `SHORTNAME` (chain), average `DefectPct` for today
- X-axis: chain names; Y-axis: DefectPct 0–20%
- Bar color: ≤4% → green, 4–5% → orange, >5% → red
- Dashed reference line at y=5
- Tooltip: "CH1: 4,2% — Cible: 5%"
- Title: "TAUX DE REJET (BR) PAR CHAÎNE"

### 3.4 — Defect Detail Bar Chart

**Data:** `fetchVwDefect()` → `{ LOGDATE, ShiftCode, ProdGroup, OpNo, Qty }`

Filter to today. Group by `OpNo`, sum `Qty`. Top 8.

- X-axis: OpNo; Y-axis: defect quantity
- primary blue bars
- Title: "DÉFAUTS PAR OPÉRATION (Ce jour)"

### 3.5 — Best & Low QP Team Podiums (F-REQ-118 / F-REQ-119) ← NEW

**Component:** `QpTeamPodium` (built in Sprint 1)

**Data sources required:**

- RFT per chain → `fetchCheckPassQte()` (available)
- BR CGL per chain → DIVA endpoint (Blocker B-02)
- BR GTD per chain → DIVA endpoint (Blocker B-02)
- BR Bundling → `fetchRejetsInspectionPaquetJour()` + `fetchInspectionsPaquetJour()` (Blocker B-01)

**Score formula per chain:**

```
score = (rft_ok ? 1 : 0) + (br_in_ok ? 3 : 0) + (br_gtd_ok ? 3 : 0) + (br_ok ? 5 : 0)
```

Where `_ok` = boolean: KPI is within target threshold.

Thresholds for boolean conversion:

- `rft_ok`: RFT ≥ 98%
- `br_in_ok`: BR Bundling ≤ 5%
- `br_gtd_ok`: BR GTD ≤ 5%
- `br_ok`: BR CGL ≤ 5%

**Layout:**

- Two side-by-side `QpTeamPodium` instances: Best QP (gold variant) + Low QP (red variant)
- Until B-01 and B-02 are resolved: show partial scores using only available data (RFT from GPRO), with a footnote "Score partiel — données DIVA en attente"

### 3.6 — Alert List

Auto-generated from KPI values:

- RFT Ce Jour < 95% → "🔴 RFT CRITIQUE — En dessous de 95%"
- RFT Ce Jour 95–98% → "🟠 RFT EN BAISSE — Sous la cible de 98%"
- BR Bundling > 5% → "🔴 BR BUNDLING CRITIQUE — Dépassement du seuil"
- Any chain DefectPct > 5% → "🔴 [CHAIN] — Taux de rejet élevé"
- No alerts → "✅ Aucune alerte — Tous les indicateurs sont dans les objectifs"

### 3.7 — Annual Trend Line Chart

**Data:** `fetchEfficienceChaine()` → `{ chaine, date, efficience_pct }`

Group by month, average efficience_pct.

- X-axis: months (Jan, Fév, Mar, …)
- Y-axis: 0–100%
- Two lines: RFT trend (blue) + BR trend (red)
- Reference lines: dashed at y=98 (RFT) and y=5 (BR)
- Title: "TENDANCE ANNUELLE — RFT & BR"

### 3.8 — Pareto Charts (2 tabs)

**Tab 1 — Pareto Défauts RFT (F-REQ-116)**
Data: `fetchVwDefect()` group by `OpNo`, sum `Qty`.
ComposedChart: bars (left Y) + cumulative % line (right Y, 0–100%).
80% line in orange. Title: "PARETO DÉFAUTS RFT (Ce jour)"

**Tab 2 — Pareto Défauts Inspection (F-REQ-117)**
Data: `fetchQcmDefectTrx()` group by `ITEMID`, count occurrences.
Same structure. Title: "PARETO DÉFAUTS INSPECTION (Ce jour)"

### 3.9 — Auto-refresh

All calls: fetch on mount + re-fetch every 60 seconds via `useAutoRefresh` hook.
Update LiveSyncPill after every fetch. Set `hasError=true` if any fetch fails.

---

## Deliverables — Sprint 3

1. 8 KPI cards in two rows (grey placeholders for DIVA/Drive-sourced ones)
2. BR bar chart with color-coded bars and reference line
3. Defect bar chart grouped by OpNo
4. Best QP + Low QP Team podiums (partial scores if B-01/B-02 unresolved)
5. Alert list auto-generates alerts
6. Annual trend line chart
7. Both Pareto charts and tab switching
8. 60-second auto-refresh
9. LiveSyncPill reflects fetch state
10. Grey placeholder state (no error banner) for inactive endpoints

---

## Tests — Sprint 3

| Test ID | What to test                     | Steps                                          | Expected                                             |
| ------- | -------------------------------- | ---------------------------------------------- | ---------------------------------------------------- |
| S3-T01  | RFT card live data               | Load Quality page                              | FirstPassToday / ProducedToday × 100 shown correctly |
| S3-T02  | RFT division by zero             | Mock ProducedToday = 0                         | "N/A"                                                |
| S3-T03  | RFT anomaly guard                | Mock ProducedToday = 80, FirstPassToday = 2947 | "N/A" (result >100%)                                 |
| S3-T04  | RFT green                        | Mock RFT = 99%                                 | Green                                                |
| S3-T05  | RFT orange                       | Mock RFT = 96%                                 | Orange                                               |
| S3-T06  | RFT red                          | Mock RFT = 93%                                 | Red                                                  |
| S3-T07  | BR Bundling inactive placeholder | B-01 not resolved                              | Grey card "Activation requise (B-01)"                |
| S3-T08  | BR CGL/GTD inactive placeholder  | B-02 not resolved                              | Grey card "En attente API DIVA"                      |
| S3-T09  | BR bar chart reference line      | Load page                                      | Dashed line at y=5                                   |
| S3-T10  | Alert critical RFT               | Mock RFT < 95%                                 | Red alert appears                                    |
| S3-T11  | No alerts                        | All KPIs within target                         | "✅ Aucune alerte" shown                             |
| S3-T12  | QP Podium renders                | Load page                                      | Two podium components visible                        |
| S3-T13  | Pareto tab switch                | Click Tab 2                                    | Second Pareto renders                                |
| S3-T14  | Auto-refresh                     | Wait 60s                                       | Network request fires again                          |
| S3-T15  | API failure                      | Disconnect network                             | LiveSyncPill red, ErrorBanner shown                  |
| S3-T16  | Loading state                    | Throttle to slow 3G                            | Skeletons visible                                    |

---

---

# SPRINT 4 — Production Dashboard — Confection Tab

**Goal:** Production page Confection tab fully functional with live data.

---

## What's Needed

### 4.1 — Production Page Structure (`/src/pages/ProductionPage.jsx`)

Page title: "SÉRIE 200 : PRODUCTION"

Three tabs: **Confection** (default) | **Coupe** | **Sérigraphie**

### 4.2 — Chain Info Banner Row

**Data:** `fetchWipChaine()` + `fetchEtatAvancement()`

One compact card per chain (~200px wide), horizontally scrollable:

```
┌─────────────────────────────┐
│ CH1                          │
│ OF: OF-2026-0412             │
│ Effectifs: — (GPRO Consult.) │
│ SAM: — min (GPRO Consult.)   │
│ Cadence obj.: — pcs/j        │
│ BPD: — | EPD: — | EHD: —    │  ← NEW (F-REQ-306/307/308)
└─────────────────────────────┘
```

Fields with "—" are from GPRO Consulting (Blocker B-04) — show grey placeholder text "Données GPRO Consulting".

BPD (Beginning Production Date), EPD (End Production Date), EHD (Export Handover Date) are the start date, estimated end date, and export date per OF per chain. These come from GPRO Consulting. Show "—" until B-04 is resolved.

### 4.3 — KPI Cards Row (4 cards)

**Card 1 — Efficience par Chaîne (F-REQ-202)**

- Data: `fetchEfficienceChaine()` → today, average `efficience_pct`
- Target: >85% → Green, 70–85% → Orange, <70% → Red
- Label: "Efficience Globale"

**Card 2 — OWE par Chaîne (F-REQ-204)** ← NEW

- Formula: `[(Quantité déclarée par chaîne × SAM) / (Effectif × minutes_présence)] × 100`
- SAM and Effectif come from GPRO Consulting (Blocker B-04)
- Target: >70% → Green, 60–70% → Orange, <60% → Red
- Label: "OWE (Ce jour)"
- Source: "Source: GPRO + GPRO Consulting"
- Until B-04: grey placeholder "Données GPRO Consulting requises"

**Card 3 — Quantité Produite Ce Jour**

- Data: `fetchQteProduite()` → today, sum `quantite` across all chains/shifts
- Label: "Qté Produite Ce Jour"
- No hard threshold (neutral grey)

**Card 4 — Arrêts Non Planifiés (F-REQ-207)**

- Data: `fetchLostTime()` → today, sum `minutes_perdues`
- Target: <10 min → Green, 10–30 → Orange, >30 → Red
- Label: "Arrêts Ce Jour"
- Value: total minutes + " min"

### 4.4 — Gauge Charts Row: Efficience par Chaîne (F-REQ-202)

**Component:** `GaugeChart` (Recharts RadialBarChart, semicircle 180°)

- Three zones: red 0–70%, orange 70–85%, green 85–100%
- Needle pointing to current value
- Center: value% + chain name

One gauge per chain from `fetchEfficienceChaine()` grouped by `chaine`, today's date.
Responsive grid: 2 per row small screens, 3–4 per row wide.

### 4.5 — Timeline: Arrêts Non Planifiés (F-REQ-207)

**Data:** `fetchLostTime()` → `{ date, chaine, motif, minutes_perdues }`

One row per chain. Blocks proportional to `minutes_perdues`:

- MAINT → orange
- MATIERE → blue
- QUALITE → red

X-axis: 00:00–24:00 (blocks spaced proportionally across day since exact time not in API).
Tooltip: `{chaine} — {motif} — {minutes_perdues} min`
Below: legend table listing each stoppage.

### 4.6 — OF Progress: Donut Charts (F-REQ-305)

**Data:** `fetchEtatAvancement()` → `{ of, avancement_pct, quantite_prevue, quantite_realisee, statut }`

One donut per OF (show only `statut = "en_cours"` + most recent `terminé`):

- Filled arc: `avancement_pct` in green (terminé) or blue (en_cours)
- Empty: grey remainder
- Center: OF + %
- Below: `{quantite_realisee} / {quantite_prevue} pièces`

### 4.7 — Efficience Cumulée Line Chart (F-REQ-203)

**Data:** `fetchEfficienceChaine()` → group by date, per chain.

- X-axis: last 14 dates; Y-axis: 0–120%
- One line per chain (CH1=blue, CH2=green, CH3=orange)
- Dashed reference at y=85
- Title: "EFFICIENCE CUMULÉE PAR CHAÎNE"

### 4.8 — Top Operators Bar Chart (F-REQ-210)

**Data:** `fetchQteProduitIndivJour()` → today, sort by `minutes_produites` desc, top 10.

Horizontal bar chart:

- Y-axis: employee IDs; X-axis: minutes_produites
- Green if `minutes_produites / minutes_presence > 0.9`
- Target line at 90% efficiency
- Title: "TOP OPÉRATEURS (Ce jour)"

### 4.9 — WIP OPTIMAL Area Chart (F-REQ-206)

**Data:** `fetchSortieCoupe()` + `fetchQteEngagement()`, match by `commande`.

- Area 1 blue: `quantite_coupee` — "Sortie Coupe"
- Area 2 orange semi-transparent: `quantite_engagee` — "Engagement"
- Gap = WIP
- Title: "WIP OPTIMAL"

### 4.10 — SAM / SOT / Effectifs / Code Article / Désignation (F-REQ-211–215)

Display as static info fields on each chain card (from chain info banner, section 4.2). All sourced from GPRO Consulting (Blocker B-04). Show "—" placeholders.

### 4.11 — Auto-refresh

All calls: 60-second interval via `useAutoRefresh`. Update LiveSyncPill.

---

## Deliverables — Sprint 4

1. Production page with 3 tabs, Confection default
2. Chain info banner: WIP per chain + OF + BPD/EPD/EHD placeholders
3. 4 KPI cards (OWE as placeholder until B-04)
4. Gauge charts per chain
5. Stoppage timeline with motif colors
6. OF donut charts
7. Efficience cumulative line chart
8. Top operators bar chart
9. WIP area chart
10. 60-second auto-refresh

---

## Tests — Sprint 4

| Test ID | What to test              | Steps                             | Expected                                     |
| ------- | ------------------------- | --------------------------------- | -------------------------------------------- |
| S4-T01  | Efficience green          | Mock efficience_pct = 90          | Green card                                   |
| S4-T02  | Efficience orange         | Mock efficience_pct = 75          | Orange card                                  |
| S4-T03  | Efficience red            | Mock efficience_pct = 60          | Red card                                     |
| S4-T04  | OWE placeholder           | B-04 not resolved                 | Grey card "Données GPRO Consulting requises" |
| S4-T05  | BPD/EPD/EHD on chain card | B-04 not resolved                 | "—" shown in grey                            |
| S4-T06  | Lost time card            | Mock sum = 45 min                 | "45 min" red                                 |
| S4-T07  | Gauge needle              | Check needle position             | Matches efficience_pct                       |
| S4-T08  | Timeline 3 motifs         | API returns MAINT/MATIERE/QUALITE | 3 colored blocks                             |
| S4-T09  | Donut in progress         | avancement_pct = 78               | 78% blue arc                                 |
| S4-T10  | Donut completed           | statut = terminé                  | 100% green arc                               |
| S4-T11  | Top operators sort        | 5 employees in API                | Sorted desc by minutes_produites             |
| S4-T12  | WIP area chart            | Both API calls return data        | Two overlapping areas                        |
| S4-T13  | Tab switching             | Click Coupe                       | Tab content changes                          |
| S4-T14  | Auto-refresh              | Wait 60s                          | Charts update                                |
| S4-T15  | Error on one chart        | Mock one endpoint fail            | ErrorBanner on that chart only               |

---

---

# SPRINT 5 — Production Dashboard — Coupe & Sérigraphie Tabs

**Goal:** Complete the Coupe and Sérigraphie tabs of the Production page.

---

## What's Needed

### 5.1 — Coupe Tab

**Couverture Coupe Bar Chart (F-REQ-311)**

- Data: `fetchSortieCoupe()` → `quantite_coupee` per commande
- Data: `fetchQteEngagement()` → `quantite_engagee` per commande
- Formula: `(quantite_coupee - quantite_engagee) / cadence_hebdo_moyenne`
- `cadence_hebdo_moyenne`: configurable constant (default 1000) from GPRO Consulting (Blocker B-04)
- X-axis: commande; Y-axis: coverage value; reference line at target
- Color: green above target, red below
- Title: "COUVERTURE COUPE"

**Couverture Chaîne Bar Chart (F-REQ-310)** ← NEW

- Formula: `(Qté engagée - Qté planifiée) / cadence_moyenne` per chain
- `Qté engagée`: `fetchQteEngagement()` → `quantite_engagee` aggregated by chain
- `Qté planifiée`: GPRO Consulting (Blocker B-04) — show "—" until resolved
- `cadence_moyenne`: GPRO Consulting (Blocker B-04) — use configurable constant 100 pcs/day default
- Target: > 10 jours (from CDC)
- Bar chart: X-axis = chain, Y-axis = coverage in days
- Color: green ≥ 10 days, orange 5–10, red < 5
- Title: "COUVERTURE CHAÎNE (en jours)"
- Note: partial computation possible with `quantite_engagee` from API; `quantite_planifiee` is a placeholder until B-04

**Taux de Fiabilité des Données — Tagging (F-REQ-217)**

- Data: `fetchTagingReel()` → `{ chaine, shift, tag_theorique, tag_reel, ecart_pct }`
- Table: Chaîne | Shift | Tag Théorique | Tag Réel | Écart %
- Color-code Écart %: ≤2% green, 2–5% orange, >5% red
- Summary gauge: overall average tagging reliability. Target: 95%
- Title: "TAUX DE FIABILITÉ — TAGGING RÉEL"

**Taux d'Archivage Suivi Paquets (F-REQ-216)** ← NEW

- Formula: `(Nbre OF soldés archivés / Nbre OF soldés) * 100`
- Source: "Base suivi production" (Blocker B-05 — no API endpoint)
- Target: 85%
- Type: Gauge Chart
- Show placeholder BigNumberCard with status grey and label "Source: Base suivi production — En attente connexion (B-05)"
- Frequency: journalière (daily refresh)

**Quantité Départage Table (F-REQ-303)**

- Data: `fetchQteDepartChaineArticleOf()` → `{ of, chaine, article, quantite }`
- Table grouped by OF, with chaîne/article/quantité rows and total per OF

**OF Coupe List (F-REQ-302)**

- Data: `fetchOfabrication()` → show only `DtFin === null` (active OFs)
- Table: OF Number | Date Début | Durée (today − DtDebut in days) | Statut badge

### 5.2 — Sérigraphie Tab

**Couverture Sérigraphie Bar Chart (F-REQ-309)**

- Data: `fetchQteEntreeSerigraphie()` + `fetchSortieSerigraphie()`
- Match by `article` + `couleur`
- Formula: `Couverture = qte_entree - qte_sortie` per article/couleur
- X-axis: article; Y-axis: couverture; reference line at cadence hebdo (configurable)
- Color: green above, red below
- Title: "COUVERTURE SÉRIGRAPHIE (Ce jour)"

**Entrée vs Sortie Sérigraphie (dual bar chart)**

- Side-by-side bars per article/couleur
- Blue = entrée (`fetchQteEntreeSerigraphie()`); Orange = sortie (`fetchSortieSerigraphie()`)
- Filter to today; group by `article + couleur`
- Title: "FLUX SÉRIGRAPHIE — Entrée vs Sortie"

**Rejected Packets Table**

- Data: `fetchPacketsRejetes()` → `{ IDColis, reference, motif, qtte, date_rejet }`
- Filter to today, sort by `date_rejet` desc
- BigNumberCard: total rejected qty above table
- Columns: IDColis | Référence | Motif | Quantité | Date/Heure rejet

### 5.3 — Inline vs Endline Comparison (both tabs)

**Data:** `fetchInlineVsEndlineComparison()` → `{ LOGDATE, ShiftCode, SHORTNAME, OPERA }`

Group by SHORTNAME; count operations per chain inline vs endline.
Grouped bar chart: two bars per chain, title: "COMPARAISON INLINE VS ENDLINE"

### 5.4 — Efficience Départage & Vignettes (F-REQ-208/209)

**Data:** `fetchMinutesProduites()` + `fetchMinutesPresence()`

Filter to posts 221 (départage) and 213 (vignettes) — note: position filtering requires GPRO Consulting data (Blocker B-04). Show all operators from `fetchQteProduitIndivJour()` with a note "Filtrage par poste disponible après connexion GPRO Consulting".

Combo Bar/Line chart per operator: bars=minutes_produites, line=efficiency%, dashed target at 85%.

---

## Deliverables — Sprint 5

1. Coupe tab: Couverture Coupe bar chart
2. Coupe tab: Couverture Chaîne bar chart (partial values OK) ← NEW
3. Coupe tab: Tagging Fiabilité table + gauge
4. Coupe tab: Taux d'archivage placeholder with grey card ← NEW
5. Coupe tab: OF Coupe list + Quantité Départage table
6. Sérigraphie tab: Couverture Sérigraphie bar chart
7. Sérigraphie tab: Entrée vs Sortie comparison
8. Sérigraphie tab: Rejected packets table
9. Inline vs Endline chart on both tabs
10. 60-second auto-refresh

---

## Tests — Sprint 5

| Test ID | What to test                 | Steps                        | Expected                                                          |
| ------- | ---------------------------- | ---------------------------- | ----------------------------------------------------------------- |
| S5-T01  | Couverture Coupe calculation | API returns data             | (Sortie − Engagement) / cadence correct                           |
| S5-T02  | Couverture Chaîne — partial  | B-04 unresolved              | Chart shows coverage with available qte_engagee, "—" for planifié |
| S5-T03  | Tagging table color          | ecart_pct = 6%               | Red                                                               |
| S5-T04  | Taux d'archivage placeholder | B-05 unresolved              | Grey card with B-05 message                                       |
| S5-T05  | OF Coupe active filter       | Some OFs have DtFin not null | Only null-DtFin shown                                             |
| S5-T06  | Sérigraphie Couverture       | entrée > sortie              | Green bar                                                         |
| S5-T07  | Rejected packets today       | Yesterday's rejection exists | Not shown                                                         |
| S5-T08  | Total rejected qty           | 3 rejections: qty 12+8+4     | Card shows "24"                                                   |
| S5-T09  | Inline vs Endline            | API has CH1 and CH2          | Two groups of bars                                                |
| S5-T10  | Couverture Chaîne color      | computed value < 5 days      | Red bar                                                           |

---

---

# SPRINT 6 — Logistics & Planning Dashboard (Série 300)

**Goal:** Full Logistics page functional with all stock, delivery, and coverage KPIs.

---

## What's Needed

### 6.1 — Logistics Page Structure (`/src/pages/LogisticsPage.jsx`)

Page title: "PILOTAGE LOGISTIQUE"

Six scrollable sections:

1. Delivery Performance Cards
2. Stock rotation / dead-stock / occupation gauges
3. Stock composition pie charts
4. OF & delivery status
5. Coverage bar charts
6. Stock search table

### 6.2 — Section A: Delivery Performance

**Card 1 — DOT (F-REQ-334)**

- Source: GPRO Planning (Blocker B-04) — mock value 96.2%
- Target: ≥95% → Green, 90–95% → Orange, <90% → Red
- Label: "DOT (Delivery On Time)"
- Source label: "Source: GPRO Planning"

**Card 2 — HOT (F-REQ-335)**

- Source: GPRO Planning — mock value 94.8%
- Label: "HOT (Handover On Time)"

**Card 3 — Respect Planification (F-REQ-336)**

- Data: `fetchQteProduite()` → today sum / configurable daily objective
- Target: ≥95% → Green
- Label: "Respect Planification"

**Card 4 — Lead Time Global (F-REQ-337)**

- Static: STRH + LT Transport = 32 jours (configurable constant)
- Target: ≤32 jours → Green
- Label: "Lead Time Global"

Export Alert Banner (below cards):
"⚠ ALERTE PROCHAIN EXPORT — Départ dans 24h 15min"
Buttons: "LISTE PACKING" | "PLAN D'EXPORT" (stubs)

### 6.3 — Section B: Stock KPIs

**Row 1 — Taux de Rotation (3 radial gauges — F-REQ-316/317/318)**

- Data: `fetchStockMoyen()` → `{ StockMoyen, NbLignesStock }`
- Note: "Coût des marchandises" not in API. Show `StockMoyen` raw value with label "Valeur stock moyen: {StockMoyen}" and footnote "Coût marchandises requis depuis DIVA pour calcul rotation complet"
- All 3 gauges (Accessoires, Tissu, FG) show same aggregate until granular endpoint available

**Row 2 — Taux de Stock Mort (3 BigNumber cards — F-REQ-319/320/321)**

- Data: `fetchArticlesSansMouvement()` → `{ NbArticles_SansMvt_365j, Qtte_SansMvt_365j }`
- Data: `fetchQuantiteTotaleStock()` → `{ Quantite_Totale_Stock }`
- Formula: `(Qtte_SansMvt_365j / Quantite_Totale_Stock * 100).toFixed(2) + "%"`
- All 3 cards show same aggregate

**Row 3 — Taux d'Occupation (3 gauge charts — F-REQ-322/323/324)**

- Data: `fetchNombreRouleaux()` → `{ NbRouleaux }`
- Data: `fetchCapaciteStockage()` → `{ Total_Conteneurs, Conteneurs_Actifs, Conteneurs_Consommes, Conteneurs_Supprimes }`
- **⚠ Parse `Conteneurs_Actifs` to int** (API returns it as a string)
- Formula: `(NbRouleaux / parseInt(Conteneurs_Actifs) * 100).toFixed(1) + "%"`
- Target: ≤85% → Green, 85–95% → Orange, >95% → Red

### 6.4 — Section C: Stock Composition (3 Pie Charts)

**Pie 1 — STOCK/Provenance (F-REQ-332)**

- Data: `fetchQuantiteParProvenance()` → `{ Provenance, Quantite, NbArticles }`
- Filter: exclude rows where `Provenance === null` (total rollup row)
- Tooltip: "{Provenance}: {Quantite} ({NbArticles} articles)"
- Number formatting: French locale (`toLocaleString('fr-FR')`)

**Pie 2 — STOCK/Brand (F-REQ-333)**

- Data: `fetchQuantiteParFamille()` → `{ FamilleFG, Quantite }`
- Filter: exclude `FamilleFG === null` (total rollup) and handle "AUTRE" as its own slice
- Show max 8 named brands + group rest as "Autres"

**Pie 3 — STOCK/Typologie (F-REQ-331)**

- Data: `fetchQuantiteParTypologie()` → `{ Typologie, Quantite, NbArticles }`
- Show top 9 typologies, group rest as "Autres"

### 6.5 — Section D: OF & Delivery Status

**OF Status Table (F-REQ-303/305)**

- Data: `fetchEtatAvancement()` → all OFs
- Columns: OF | Avancement (progress bar) | Qté prévue | Qté réalisée | Statut badge
- Click row → expand → colis detail from `fetchColisTotalVar()` filtered by commande

**Commandes Livrées à Temps (F-REQ-325/326/327)**

- Data: `fetchNombreOFsLivres()` → `{ NbOF_Livres_Total, OF_AvecTransfertCoupe, OF_AvecTransfertCoupeJemmel, OF_AvecTransfertCoupe_Total }`
- Formula: `(OF_AvecTransfertCoupe_Total / NbOF_Livres_Total * 100).toFixed(1) + "%"`
- 3 BigNumberCards (Accessoires, Tissu, FG) showing same aggregate

**Délai Moyen de Livraison (F-REQ-328/329/330)**

- Data: `fetchMoyenneDateTransfert()` → `{ MoyenneJours, NbOFConsideres }`
- **⚠ Parse `MoyenneJours` to float** (API returns it as a string)
- Display: `"{parseFloat(MoyenneJours).toFixed(1)} jours (sur {NbOFConsideres} OFs)"`
- Target: ≤1 jour → Green, 1–3 → Orange, >3 → Red

### 6.6 — Section E: Coverage Charts

Reuse coverage chart components from Sprint 5:

- Couverture Chaîne (F-REQ-310)
- Couverture Coupe (F-REQ-311)
- Couverture Sérigraphie (F-REQ-309)

### 6.7 — Section F: Stock Search Table

Join `fetchVueStock()` + `fetchDivaStock()` by `idmp = IDMP`.

Columns: Code MP | Désignation | Famille | Couleur | Qté Stock | Qté Réservée | Qté Disponible

`Qté Disponible = Qtte − qtteReserve`

Features: search (code/désignation/famille) | famille dropdown filter | sortable columns | pagination 20/page.

Header: `"Stock total: {Quantite_Totale_Stock} | Lignes: {NbLignesStock}"`

All numbers formatted with French locale (`toLocaleString('fr-FR')`).

---

## Deliverables — Sprint 6

1. 6 sections render without errors
2. 4 delivery KPI cards (2 live, 2 mock from GPRO Planning)
3. Occupation gauge with correct parseInt coercion on Conteneurs_Actifs
4. Dead-stock cards with correct formula
5. 3 pie charts with data, null row filtered, French number formatting
6. OF table with progress bars and expandable colis detail
7. Livraison à temps cards
8. Délai moyen with parseFloat coercion + correct color
9. Stock search table: searchable, sortable, paginated

---

## Tests — Sprint 6

| Test ID | What to test             | Steps                                        | Expected                                           |
| ------- | ------------------------ | -------------------------------------------- | -------------------------------------------------- |
| S6-T01  | Dead-stock formula       | Check values                                 | (Qtte_SansMvt / Quantite_Totale) × 100 = correct % |
| S6-T02  | Occupation gauge type    | Inspect `Conteneurs_Actifs`                  | Type is number after parseInt                      |
| S6-T03  | Occupation gauge value   | NbRouleaux=39031, Conteneurs_Actifs="42864"  | Gauge shows ~91% (orange/red)                      |
| S6-T04  | Provenance null filtered | API returns null row                         | Not shown as pie slice                             |
| S6-T05  | Famille rollup filtered  | FamilleFG null row                           | Excluded                                           |
| S6-T06  | OF table expand          | Click OF row                                 | Colis nested table appears                         |
| S6-T07  | Livraison ratio          | OF_AvecTransfertCoupe_Total=3213, Total=4270 | ~75,2%                                             |
| S6-T08  | Délai moyen type         | Inspect MoyenneJours                         | Type is float after parseFloat                     |
| S6-T09  | Délai moyen color        | MoyenneJours = "4.16"                        | Orange (>1 day)                                    |
| S6-T10  | French numbers           | Check any large number                       | "162 067 420,25" format                            |
| S6-T11  | Stock search             | Type "Coton"                                 | Table filters                                      |
| S6-T12  | Sort by column           | Click "Qté Stock"                            | Rows sort descending                               |
| S6-T13  | Pagination               | >20 rows                                     | Page 2 button works                                |
| S6-T14  | Qté Disponible           | Qtte=500, qtteReserve=120                    | Shows 380                                          |

---

---

# SPRINT 7 — Méthodes Page + Development Dashboard + Global Features

**Goal:** Méthodes page built (F-REQ-404), Development page built, global filter bar wired, export functional.

---

## What's Needed

### 7.1 — Méthodes Page (`/src/pages/MethodesPage.jsx`) ← NEW (F-REQ-404)

Page title: "MÉTHODES & AMÉLIORATION CONTINUE"

> This view is designed for the Méthodes / Planning team and for wall-screen display in the methods office. It covers F-REQ-216 through F-REQ-219 (main spec numbering).

**Row 1 — 2 Gauge Charts:**

**Gauge 1 — Taux d'Archivage Suivi Paquets (F-REQ-216)**

- Formula: `(Nbre OF soldés archivés / Nbre OF soldés) * 100`
- Source: Base suivi production (Blocker B-05 — no API endpoint yet)
- Target: 85%
- Frequency: Journalière
- Type: Gauge Chart (Jauge)
- Show placeholder gauge at 0% with banner: "Source: Base suivi production — Données en attente (B-05)"

**Gauge 2 — Taux de Fiabilité des Données sur Système (F-REQ-217)**

- Formula: Différence entre tagging réel et sortie fin chaîne
- Data: `fetchTagingReel()` → `{ chaine, shift, tag_theorique, tag_reel, ecart_pct }`
- Target: 95%
- Compute average absolute `ecart_pct` across all chains/shifts, then `reliability = 100 - avg_abs_ecart`
- Frequency: Journalière
- Display as radial gauge

**Row 2 — 2 BigNumber Cards:**

**Card 1 — Taux de Respect du Temps Estimé par Article (F-REQ-218)**

- Formula: `Temps cotation - Temps prod >= 0 min` → compliant
- Source: Base rendement + Logiciel Cotation (no API endpoint — manual entry via Admin modal)
- Target: 90%
- Frequency: Each new launch (chaque nouveau démarrage)
- Show BigNumberCard with admin-updatable value and update button (IT role only)
- Label: "Respect Temps Estimé"

**Card 2 — Taux des Temps Acceptés dès la Première Version (F-REQ-219)**

- Formula: `(Nbr gammes déchiffrage - Nbr demandes négociation) / Nbre gammes déchiffrage * 100`
- Source: Fichier déchiffrage + Logiciel Cotation (no API — admin-updatable)
- Target: ≥80%
- Frequency: Fichier déchiffrage
- Label: "Temps Acceptés 1ère Version"

**Row 3 — Detail Table:**
| ID Exigence | Indicateur | Valeur actuelle | Cible | Fréquence | Statut |
|---|---|---|---|---|---|
| F-REQ-216 | Taux d'archivage suivi paquets | — | 85% | Journalier | ⚫ En attente |
| F-REQ-217 | Taux fiabilité données système | {computed}% | 95% | Journalier | ✅/🟠/🔴 |
| F-REQ-218 | Respect temps estimé | {admin value}% | 90% | Au démarrage | ✅/🟠/🔴 |
| F-REQ-219 | Temps acceptés 1ère version | {admin value}% | ≥80% | Déchiffrage | ✅/🟠/🔴 |

**Row 4 — Tagging Fiabilité Line Chart (from F-REQ-217):**

- Data: `fetchTagingReel()` → plot `ecart_pct` per chain over all shifts
- X-axis: chain + shift combinations; Y-axis: ecart %
- Reference line at y=0 (perfect tagging) and y=5 (threshold)
- Title: "FIABILITÉ TAGGING PAR CHAÎNE ET SHIFT"

**Admin update modal** (IT role only, "METTRE À JOUR LES DONNÉES" button):

- Opens modal with input fields for F-REQ-218 and F-REQ-219 manual values
- Inputs: numerator and denominator for each formula
- Saves to in-memory state (or backend if user management API available)

### 7.2 — Development Page (`/src/pages/DevelopmentPage.jsx`)

Page title: "DÉVELOPPEMENT & AMÉLIORATION"

> Source: Google Drive / Google Sheets. All values entered/updated manually via Admin panel until Drive API is wired.

**Row 1 — 3 Primary Cards:**

| Card | ID        | Label                    | Formula                                           | Target |
| ---- | --------- | ------------------------ | ------------------------------------------------- | ------ |
| 1    | F-REQ-350 | RFT (Développement)      | modeles_valides_1er_coup / total_modeles × 100    | ≥95%   |
| 2    | F-REQ-351 | Respect Livraison à Date | modeles_livres_a_date / total_modeles × 100       | ≥95%   |
| 3    | F-REQ-352 | Fiabilité Nomenclature   | nomenclatures_fiables / total_nomenclatures × 100 | ≥98%   |

Each: update frequency badge "FREQ: MENSUEL", trend arrow vs last month.

**Row 2 — 3 Additional Cards:**

| Card | ID        | Label                     | Target |
| ---- | --------- | ------------------------- | ------ |
| 4    | F-REQ-353 | % Réclamations Production | <2%    |
| 5    | F-REQ-354 | Déchiffrage Cotation      | 90%    |
| 6    | F-REQ-355 | Étalonnage                | 100%   |

**Detail Table:** ID Exigence | Indicateur | Valeur actuelle | Cible | Statut

**Right Panel:** FIABILITÉ NOMENCLATURE line chart (monthly trend, last 12 months)

**Bottom Right:** ÉTALONNAGE — "100%" large display with "TAUX DE CONFORMITÉ DES OUTILS DE MESURE — TRIMESTRIEL"

**Admin update modal** (IT/Admin only): fields to enter monthly values for all 6 KPIs.

### 7.3 — Global Filter Bar (Wire Up)

`FilterContext` (`/src/context/FilterContext.jsx`): store selected filter values globally.

**Dropdowns:**

- **Marque:** from `fetchQuantiteParFamille()` → FamilleFG values (exclude null)
- **Atelier:** static ["Tous", "Confection", "Coupe", "Sérigraphie"]
- **Ligne:** from `fetchWipChaine()` → chaine values
- **OF:** from `fetchEtatAvancement()` → of values

All pages read from FilterContext and re-filter displayed data on change.
"Réinitialiser filtres" button resets all to "Tous".

### 7.4 — Export Button (Wire Up)

Library: SheetJS (xlsx).

| Page        | Sheet 1 (KPI Summary)                                          | Sheet 2 (Raw data)               |
| ----------- | -------------------------------------------------------------- | -------------------------------- |
| Quality     | 8 KPI card values                                              | vwDefect + checkpassqte raw      |
| Production  | efficience_chaine + qte_produite + lost_time + etat_avancement | Raw per table                    |
| Logistics   | Stock KPI values                                               | Full vue_stock + diva_stock join |
| Méthodes    | F-REQ-216 to 219 values                                        | tagging_reel raw                 |
| Development | All 6 KPI values                                               | —                                |

Filename: `BACOVET_{PageName}_{YYYY-MM-DD}.xlsx` (use French locale date)
TopBar "IMPRIMER RAPPORT" dropdown: "📊 Exporter Excel" | "🖨 Imprimer"
Print: `window.print()` with CSS media query hiding sidebar.

### 7.5 — `useAutoRefresh` Hook (`/src/hooks/useAutoRefresh.js`)

```js
function useAutoRefresh(fetchFn, intervalMs = 60000) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetchTime, setLastFetchTime] = useState(null);
  // fetch on mount + interval
  // cleanup on unmount
  // return { data, isLoading, error, lastFetchTime, refetch }
}
```

Replace all manual `useEffect` fetch logic in Sprints 3–6 with this hook.

### 7.6 — Visual Alerts System

`AlertContext` with rules engine running after every data refresh:

**Quality alerts:**

- RFT < 95% → CRITICAL (red)
- RFT 95–98% → WARNING (orange)
- BR > 5% → CRITICAL (red)
- Chain DefectPct > 5% → WARNING (orange)

**Production alerts:**

- Efficience < 70% → CRITICAL (red)
- Efficience 70–85% → WARNING (orange)
- Lost time > 30 min → WARNING (orange)
- Lost time > 60 min → CRITICAL (red)
- WIP > 2× cadence → WARNING (orange)

Display in:

1. AlertList on Quality page
2. Badge count on sidebar nav items
3. Toast for NEW alerts (not present in previous cycle)

---

## Deliverables — Sprint 7

1. Méthodes page renders with 4 rows of content ← NEW
2. F-REQ-217 tagging gauge shows live value from API
3. F-REQ-218/219 admin-updatable cards work
4. Development page renders with 6 KPI cards
5. Admin manual update modal works for both Méthodes and Dev KPIs
6. Global filter populates from live API data
7. Filtering by Ligne filters production charts
8. Export downloads correct Excel file per page
9. `useAutoRefresh` replaces all manual fetch logic
10. Alert badge count shows on sidebar

---

## Tests — Sprint 7

| Test ID | What to test                  | Steps                                 | Expected                                 |
| ------- | ----------------------------- | ------------------------------------- | ---------------------------------------- |
| S7-T01  | Méthodes page renders         | Navigate to /methods as Méthodes role | All 4 rows visible                       |
| S7-T02  | F-REQ-217 gauge               | Load Méthodes page                    | Tagging reliability % from API           |
| S7-T03  | F-REQ-216 placeholder         | B-05 unresolved                       | Placeholder with B-05 message            |
| S7-T04  | Admin update — Méthodes       | IT role, click update                 | Modal with F-REQ-218/219 inputs          |
| S7-T05  | Méthodes non-IT cannot update | Log in as Méthodes, look for button   | Update button hidden                     |
| S7-T06  | Dev page renders              | Navigate to /development              | All 6 KPI cards                          |
| S7-T07  | Filter Ligne = CH1            | Select CH1                            | Production charts show CH1 only          |
| S7-T08  | Filter reset                  | Change then reset                     | All back to "Tous"                       |
| S7-T09  | Export Quality                | Click Export on Quality page          | Excel downloads                          |
| S7-T10  | Export Méthodes               | Click Export on Méthodes page         | Excel with tagging_reel data             |
| S7-T11  | Export filename               | Check file                            | "BACOVET_Qualité_2026-06-11.xlsx" format |
| S7-T12  | Export 2 sheets               | Open file                             | Sheet 1: KPI Summary, Sheet 2: raw data  |
| S7-T13  | Alert badge                   | Mock RFT < 95%                        | Badge on Qualité sidebar item            |
| S7-T14  | Alert toast                   | New critical alert                    | Toast bottom-right                       |
| S7-T15  | useAutoRefresh cleanup        | Navigate away                         | No memory leak (interval cleared)        |

---

---

# SPRINT 8 — QA, Performance & UAT

**Goal:** Full application stable, performant, visually consistent, and signed off by BACOVET.

---

## What's Needed

### 8.1 — Cross-page Consistency Audit

- All labels in French
- All error messages in French
- Date format: "11/06/2026" or "11 juin 2026"
- Number format: French locale — `"1 664 359"` not `"1,664,359"`
- Percentage format: `"96,8 %"` (space before %)
- Consistent KPI value font size across all pages
- Consistent card padding and border-radius
- Consistent status colors across all pages
- Placeholder state (grey card) consistent for all blocked data sources

### 8.2 — TV / Large Screen (NF-REQ-507)

Test on 1920×1080 at 5 metres viewing distance:

- KPI values minimum 48px (3rem)
- Labels minimum 18px (1.125rem)
- Secondary info minimum 14px (0.875rem)
- All status colors pass WCAG AA (4.5:1 contrast)

### 8.3 — Performance

- Lazy-load pages with `React.lazy()` + `Suspense`
- `useMemo()` for expensive chart data
- Avoid re-render if data unchanged (deep comparison)
- TTI < 3 seconds on LAN
- Request deduplication for simultaneous endpoint calls

### 8.4 — Error Resilience

For every API call:

- Fail → widget shows ErrorBanner, rest of page works
- `success: false` → treated as error
- Empty `data: []` → "Aucune donnée disponible"
- `NaN`, `Infinity`, `null` → "N/A"
- Whole API unreachable → all widgets error, LiveSyncPill red, no crash

**Specific coercion checks:**

- `Conteneurs_Actifs` parseInt: if NaN → default 1 (avoid division by zero in occupation gauge)
- `MoyenneJours` parseFloat: if NaN → show "N/A"
- `ProducedToday` used as denominator: if 0 or result > 100 → show "N/A"
- `ProducedYear` used as denominator: if 0 → show "N/A"

### 8.5 — Role Access Matrix Final Verification

| Route        | IT  | Direction | Resp. Prod | Chef Atelier | Resp. Qualité | Méthodes | Coupe |
| ------------ | --- | --------- | ---------- | ------------ | ------------- | -------- | ----- |
| /admin       | ✅  | ❌        | ❌         | ❌           | ❌            | ❌       | ❌    |
| /quality     | ✅  | ✅        | ✅         | ❌           | ✅            | ✅       | ❌    |
| /production  | ✅  | ✅        | ✅         | ✅           | ❌            | ✅       | ✅    |
| /logistics   | ✅  | ✅        | ❌         | ❌           | ❌            | ✅       | ✅    |
| /methods     | ✅  | ✅        | ❌         | ❌           | ❌            | ✅       | ❌    |
| /development | ✅  | ✅        | ❌         | ❌           | ❌            | ✅       | ❌    |

### 8.6 — Blocker Status Review

Before UAT, review status of all pre-sprint blockers:

| Blocker                              | Status                               | Action if unresolved                              |
| ------------------------------------ | ------------------------------------ | ------------------------------------------------- |
| B-01: BR Bundling endpoints inactive | To verify                            | Show grey placeholder cards; flag in UAT sign-off |
| B-02: DIVA BR GTD endpoints missing  | To verify                            | Show grey placeholder cards; flag in UAT          |
| B-03: Auth endpoint confirmation     | Must be resolved before Sprint 1 UAT | Cannot proceed without auth                       |
| B-04: GPRO Consulting data           | Likely unresolved                    | All affected fields show "—"                      |
| B-05: Base suivi production          | Likely unresolved                    | Taux d'archivage shows grey placeholder           |

### 8.7 — UAT Script

Run with a real BACOVET user for each role:

1. Login successfully
2. Redirect to correct page
3. Correct menu items visible
4. KPI values match source systems
5. Colors correctly indicate factory state
6. Auto-refresh updates values over time
7. Export produces usable Excel file
8. Logout works

**UAT Sign-off checklist:**

| Page                     | Functional KPIs                                   | Colors         | Data matches source | Signed off by        |
| ------------------------ | ------------------------------------------------- | -------------- | ------------------- | -------------------- |
| Login                    | Auth works                                        | —              | —                   | IT                   |
| Admin                    | Jobs visible; BR Bundling banner if needed        | —              | Jobs match server   | IT                   |
| Quality                  | RFT, partial BR (pending B-01/B-02)               | Correct        | GPRO / DIVA pending | Resp. Qualité        |
| Production — Confection  | Efficience, WIP, Lost Time, OWE placeholder       | Gauges correct | GPRO                | Resp. Production     |
| Production — Coupe       | Couverture Coupe, Couverture Chaîne, Tagging      | Correct        | GPRO                | Chef Atelier / Coupe |
| Production — Sérigraphie | Couverture Sérigraphie, Flux                      | Correct        | GPRO                | Resp. Production     |
| Logistics                | Stock, OF, Livraison                              | Gauges correct | DIVA                | Planning             |
| Méthodes                 | F-REQ-217 tagging; F-REQ-216/218/219 placeholders | Correct        | GPRO                | Méthodes             |
| Development              | 6 KPIs (admin-entered)                            | Correct        | Drive (manual)      | Méthodes             |

---

## Full Test Suite — Sprint 8

### Performance Tests

| Test ID | Test                            | Threshold                      |
| ------- | ------------------------------- | ------------------------------ |
| S8-P01  | Quality page TTI on Fast 3G     | < 5 seconds                    |
| S8-P02  | Logistics page TTI              | < 5 seconds                    |
| S8-P03  | Production page TTI             | < 5 seconds                    |
| S8-P04  | Méthodes page TTI               | < 3 seconds                    |
| S8-P05  | Memory — stay 30 min on Quality | Heap does not grow unboundedly |
| S8-P06  | Concurrent API calls            | Max 10 parallel requests       |

### Security Tests

| Test ID | Test                                | Expected                           |
| ------- | ----------------------------------- | ---------------------------------- |
| S8-S01  | API key not in browser storage      | Not in localStorage/sessionStorage |
| S8-S02  | JWT not in URL                      | Only in Authorization header       |
| S8-S03  | Direct URL /admin without login     | Redirect to /login                 |
| S8-S04  | Role bypass /admin as Chef Atelier  | Redirect to /unauthorized          |
| S8-S05  | Back button after logout            | Re-login required                  |
| S8-S06  | Direct URL /methods as Chef Atelier | Redirect to /unauthorized          |

### Visual Consistency Tests

| Test ID | Test                         | Expected                                                            |
| ------- | ---------------------------- | ------------------------------------------------------------------- |
| S8-V01  | French number format         | "162 067 420,25"                                                    |
| S8-V02  | French date format           | "11/06/2026"                                                        |
| S8-V03  | French percentage            | "96,8 %"                                                            |
| S8-V04  | Error messages French        | "Erreur de connexion au serveur"                                    |
| S8-V05  | KPI size at 1920×1080        | ≥48px, readable at 5m                                               |
| S8-V06  | Status color consistency     | Same #16a34a green on all pages                                     |
| S8-V07  | Placeholder state consistent | All grey cards look the same (no mix of error banner + placeholder) |
| S8-V08  | Sidebar one item active      | Only one item highlighted at a time                                 |

### TV / Industrial Screen Tests

| Test ID | Screen    | Test              | Expected                               |
| ------- | --------- | ----------------- | -------------------------------------- |
| S8-TV01 | 1920×1080 | Quality page      | All 8 KPI cards visible without scroll |
| S8-TV02 | 1920×1080 | Production gauges | Readable                               |
| S8-TV03 | 1920×1080 | Méthodes page     | Both gauges readable                   |
| S8-TV04 | 1366×768  | All pages         | No horizontal scrollbar                |
| S8-TV05 | 3840×2160 | All pages         | Scales up, no pixelation               |

---

## SPRINT 8 — DEFINITION OF DONE

- [ ] All 7 pages load without errors on clean session
- [ ] All role restrictions correct (7 roles tested, including /methods)
- [ ] All KPI formulas produce correct values vs source systems
- [ ] Traffic light colors trigger at correct thresholds
- [ ] Auto-refresh every 60 seconds, no performance degradation
- [ ] Export produces valid Excel on all 5 pages (Quality, Production, Logistics, Méthodes, Development)
- [ ] All text French, French number/date formatting
- [ ] Placeholder state (not error banner) shown for all blocked data sources
- [ ] All API errors graceful (no white screens, no uncaught errors)
- [ ] Readable at 5 metres on 1920×1080
- [ ] UAT sign-off from at least one user per role
- [ ] No console errors/warnings in production build
- [ ] Blocker status documented in delivery report

---

## SPRINT DEPENDENCIES MAP

```
Sprint 0 (Foundation) — resolve B-03 before this sprint ends
    ↓
Sprint 1 (Auth + Shell)
    ↓
Sprint 2 (Admin) ────────────────────────────────────┐
    ↓                                                │
Sprint 3 (Quality) ←── resolve B-01 before Sprint 3 │
    ↓                                                │
Sprint 4 (Production — Confection)                   │
    ↓                                                │
Sprint 5 (Production — Coupe + Sérigraphie)          │
    ↓                                                │
Sprint 6 (Logistics) ────────────────────────────────┤
    ↓                                                │
Sprint 7 (Méthodes + Development + Global) ←─────────┘
    ↓
Sprint 8 (QA + UAT)
```

**Can be parallelised:**

- Sprint 2 (Admin) in parallel with Sprint 3 after Sprint 1
- Sprint 6 (Logistics) in parallel with Sprint 5 if two developers available
- Méthodes page (Sprint 7 section 7.1) can be started in parallel with Sprint 5

---

## APPENDIX — Open Items & Pending Decisions

| ID   | Item                                                     | Owner                 | Target sprint   |
| ---- | -------------------------------------------------------- | --------------------- | --------------- |
| B-01 | Activate 4 BR Bundling query slugs in Novacity           | Novacity admin        | Before Sprint 3 |
| B-02 | Configure DIVA BR GTD endpoints (F-REQ-101/102/103)      | Novacity + Bacovet IT | Before Sprint 3 |
| B-03 | Confirm/build `/api/auth/login` endpoint                 | Novacity / Bacovet IT | Before Sprint 1 |
| B-04 | Confirm GPRO Consulting API connectivity plan            | Bacovet IT            | Before Sprint 4 |
| B-05 | Confirm "Base suivi production" data access plan         | Bacovet IT            | Before Sprint 7 |
| D-01 | Define exact `cadence_hebdomadaire_moyenne` constant     | Bacovet Production    | Sprint 4        |
| D-02 | Define `cadence_moyenne` per chain for Couverture Chaîne | Bacovet Production    | Sprint 5        |
| D-03 | Confirm Google Drive API key scope + Sheet IDs           | Bacovet IT            | Sprint 7        |
| D-04 | Confirm backend user management API design               | Bacovet IT            | Sprint 2        |
