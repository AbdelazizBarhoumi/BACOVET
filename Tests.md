# BACOVET Dashboard — Test Plan (All Sprints)
**Project:** Operational Piloting Dashboard — BACOVET
**Document version:** 1.0 — aligned with Sprint Plan Revised v2
**Date:** 11/06/2026

---

## HOW TO USE THIS DOCUMENT

Each test entry includes:
- **Prerequisites** — what must be true before you run the test
- **Steps** — exact numbered actions to perform
- **Expected result** — what you must observe to pass
- **Where to look** — which tool or UI area to inspect

### Tools required before starting

| Tool | Purpose | How to get it |
|---|---|---|
| Chrome or Edge (latest) | All UI tests | Already installed |
| Chrome DevTools | Network, Console, Application inspection | F12 or Cmd+Opt+I |
| Postman | API smoke tests | postman.com/downloads |
| React DevTools extension | Component state inspection | Chrome Web Store |
| VS Code or any text editor | Check source files | Already installed |
| `localhost:5173` | Dev server (Vite) | Run `npm run dev` in project root |

### Test environment variables

Set these in your `.env.local` before running any test:

```
VITE_API_BASE_URL=https://your-novacity-server.com
VITE_API_KEY=your_x_api_key_here
```

### Notation used

- `→` means "then navigate to" or "then click"
- `[DevTools]` means open Chrome DevTools (F12)
- `[Console]` means the DevTools Console tab
- `[Network]` means the DevTools Network tab
- `[Application]` means the DevTools Application tab
- `PASS ✅` / `FAIL ❌` — write these in your test log

---

---

# SPRINT 0 — Foundation & Setup

## Before you start Sprint 0 tests

1. Run `npm run dev` in the project root.
2. Open Chrome and navigate to `http://localhost:5173`.
3. Open DevTools (F12) and keep it open for the entire sprint.

---

## S0-T01 — API key is injected in every request

**What we are testing:** Every HTTP request to the Novacity API carries the `x-api-key` header.

**Prerequisites:** `.env.local` has a valid `VITE_API_KEY`. Dev server is running.

**Steps:**
1. Open `http://localhost:5173` in Chrome.
2. Open DevTools → **Network** tab.
3. Clear existing entries (click the 🚫 icon).
4. Open the browser **Console** tab.
5. Paste and run the following snippet:
   ```js
   import('/src/services/api.js').then(m => m.fetchWipChaine()).then(console.log)
   ```
   *(If import doesn't work, call the function directly from the React app by temporarily adding a button that triggers it.)*
6. Switch back to the **Network** tab.
7. Click the first request that appeared (to your Novacity server).
8. In the **Headers** section, look under **Request Headers**.

**Expected result:**
- A header named `x-api-key` is present.
- Its value matches the `VITE_API_KEY` variable in your `.env.local`.
- No `x-api-key` header with an empty or undefined value.

**Fail condition:** Header is absent, or its value is `"undefined"` or `""`.

---

## S0-T02 — API error handling does not crash the app

**What we are testing:** When the API base URL is wrong, the service throws a typed error and does not cause an uncaught exception.

**Prerequisites:** Dev server running.

**Steps:**
1. Temporarily edit `.env.local`: change `VITE_API_BASE_URL` to `https://wrong-url-that-does-not-exist.local`.
2. Restart the dev server (`Ctrl+C` → `npm run dev`).
3. Open `http://localhost:5173`.
4. Open DevTools → **Console** tab.
5. Call any API function (same snippet as S0-T01).
6. Observe the Console output.

**Expected result:**
- The console shows a caught error log (e.g. `"API Error: Network request failed"` or similar typed error message).
- There is **no** red `Uncaught TypeError` or `Uncaught ReferenceError` in the console.
- The page does **not** go blank or show a React crash screen.

**After the test:** Restore the correct `VITE_API_BASE_URL` and restart the dev server.

---

## S0-T03 — Unauthenticated user is blocked from protected routes

**What we are testing:** Navigating to `/quality` without being logged in redirects to `/login`.

**Prerequisites:** No active session (you have never logged in, or you cleared storage).

**Steps:**
1. Open a **fresh incognito window** in Chrome (Cmd+Shift+N / Ctrl+Shift+N).
2. Navigate directly to `http://localhost:5173/quality`.
3. Observe the URL and the page content.

**Expected result:**
- The URL changes to `http://localhost:5173/login`.
- The Login page is displayed.
- You do **not** see any quality dashboard content.

---

## S0-T04 — Wrong role is blocked from admin route

**What we are testing:** A Chef d'Atelier cannot access `/admin`.

**Prerequisites:** A Chef d'Atelier test account exists in the backend. You know its credentials.

**Steps:**
1. Navigate to `http://localhost:5173/login`.
2. Log in with the Chef d'Atelier credentials.
3. After successful login, manually type `http://localhost:5173/admin` in the address bar and press Enter.
4. Observe the URL and page content.

**Expected result:**
- The URL changes to `http://localhost:5173/unauthorized`.
- The page shows "Accès refusé" (or equivalent French message).
- You do **not** see any admin panel content.

---

## S0-T05 — Méthodes role can access /quality

**What we are testing:** The Méthodes role was added to the /quality allowed roles list.

**Prerequisites:** A Méthodes test account exists.

**Steps:**
1. Log in as Méthodes user.
2. Navigate directly to `http://localhost:5173/quality`.
3. Observe whether the page loads or redirects.

**Expected result:**
- The page stays on `/quality` (or the Quality shell is displayed).
- You are **not** redirected to `/unauthorized`.

---

## S0-T06 — Session expires after timeout

**What we are testing:** The auto-logout triggers after the configured timeout.

**Prerequisites:** Logged in as any user. Temporarily set session timeout to 10 seconds in `AuthContext.jsx` (change `8 * 60 * 60 * 1000` to `10000`).

**Steps:**
1. Log in with any valid credentials.
2. Do nothing. Wait 10 seconds.
3. Watch the URL and page.

**Expected result:**
- After 10 seconds the app redirects to `http://localhost:5173/login` automatically.
- The session state is cleared (trying to go back to a protected route redirects to login again).

**After the test:** Restore the timeout to `8 * 60 * 60 * 1000` (8 hours).

---

## S0-T07 — All 8 routes load without crashing

**What we are testing:** Every defined route renders something (at minimum a stub page) without a blank screen or React error boundary.

**Prerequisites:** Logged in as an IT/Admin user (has access to all routes).

**Steps:**
1. Log in as IT admin.
2. For each of the following URLs, type the URL in the address bar and press Enter:
   - `http://localhost:5173/quality`
   - `http://localhost:5173/production`
   - `http://localhost:5173/logistics`
   - `http://localhost:5173/methods`
   - `http://localhost:5173/development`
   - `http://localhost:5173/admin`
   - `http://localhost:5173/unauthorized`
3. For each route, note what you see.

**Expected result for each route:**
- Page loads in under 2 seconds.
- No blank white screen.
- No React error boundary message ("Something went wrong").
- At minimum a placeholder text like "SÉRIE 100 : QUALITÉ — En cours de développement" is visible.
- No red error messages in the DevTools Console.

---

## S0-T08 — Brand colors render correctly

**What we are testing:** Tailwind custom color tokens are correctly configured.

**Prerequisites:** Dev server running. Add a temporary test div to `App.jsx`:
```jsx
<div className="bg-brand-dark text-status-green p-4">TEST COULEURS</div>
```

**Steps:**
1. Load `http://localhost:5173`.
2. Find the test div on screen.
3. Inspect it visually and confirm colors.
4. Open DevTools → right-click the div → **Inspect**.
5. In the Styles panel, check the computed `background-color` and `color` values.

**Expected result:**
- Background color is `#1a1a2e` (dark navy).
- Text color is `#16a34a` (green).

**After the test:** Remove the temporary test div.

---

## S0-T09 — Conteneurs_Actifs is returned as a number (integer)

**What we are testing:** The `fetchCapaciteStockage()` function applies `parseInt()` to the string fields returned by the API.

**Prerequisites:** API is reachable. Dev server running.

**Steps:**
1. Open DevTools → **Console** tab.
2. Run:
   ```js
   import('/src/services/api.js').then(m =>
     m.fetchCapaciteStockage().then(data => {
       console.log('Type Conteneurs_Actifs:', typeof data[0].Conteneurs_Actifs);
       console.log('Value:', data[0].Conteneurs_Actifs);
     })
   )
   ```
3. Observe the console output.

**Expected result:**
- `Type Conteneurs_Actifs: number` (not `"string"`).
- The numeric value printed is `42864` (or similar integer, not `"42864"` with quotes).

---

## S0-T10 — MoyenneJours is returned as a float

**What we are testing:** The `fetchMoyenneDateTransfert()` function applies `parseFloat()` to `MoyenneJours`.

**Steps:**
1. Open DevTools → **Console** tab.
2. Run:
   ```js
   import('/src/services/api.js').then(m =>
     m.fetchMoyenneDateTransfert().then(data => {
       console.log('Type MoyenneJours:', typeof data[0].MoyenneJours);
       console.log('Value:', data[0].MoyenneJours);
     })
   )
   ```

**Expected result:**
- `Type MoyenneJours: number`.
- Value is `4.16` (float, not `"4.16"` string).

---

## S0-API-01 — itemtrxenq endpoint returns data

**Tool:** Postman

**Steps:**
1. Open Postman. Create a new GET request.
2. URL: `{{VITE_API_BASE_URL}}/api/data/itemtrxenq?limit=100&offset=0`
3. Headers: add `x-api-key: {{your_api_key}}`
4. Click **Send**.

**Expected result:**
```json
{
  "success": true,
  "count": >= 1,
  "data": [ { "IsSplit": ..., "SONo": ..., ... } ]
}
```
- `success` is `true`.
- `count` is a number ≥ 1.
- `data` is an array of objects.

---

## S0-API-02 — wip_chaine returns correct fields

**Steps:**
1. Postman GET: `{{VITE_API_BASE_URL}}/api/data/q/wip_chaine`
2. Header: `x-api-key`.

**Expected result:**
- `success: true`.
- Each item in `data` has: `chaine`, `en_cours`, `entree_jour`, `sortie_jour`.
- Example: `{"chaine":"CH1","en_cours":1820,"entree_jour":420,"sortie_jour":390}`.

---

## S0-API-03 — pieces_ok query returns FirstPassToday as a number

**Steps:**
1. Postman GET: `{{VITE_API_BASE_URL}}/api/data/q/pieces_ok_de_premier_coup_jour_en_cours`
2. Header: `x-api-key`.

**Expected result:**
- `data[0].FirstPassToday` exists and is a number (e.g. `2947`).

---

## S0-API-04 — Wrong API key returns 401

**Steps:**
1. Postman GET: `{{VITE_API_BASE_URL}}/api/data/itemtrxenq`
2. Header: `x-api-key: WRONG_KEY_123`.

**Expected result:**
- HTTP status `401 Unauthorized` OR response body `{"success": false, ...}`.
- The app service must handle this without crashing.

---

## S0-API-05 — Admin jobs endpoint returns 39 jobs

**Steps:**
1. Postman GET: `{{VITE_API_BASE_URL}}/api/admin/jobs`
2. Header: `Authorization: Bearer {{your_jwt_token}}`

**Expected result:**
- `success: true`.
- `data` is an array of 39 objects.
- Each object has: `id`, `nom`, `schedule`, `action_type`, `action_ref`, `actif`, `last_run`, `last_status`.

---

## S0-API-06 — BR Bundling endpoints are ACTIVE (Blocker B-01)

**Steps:**
1. Postman GET: `{{VITE_API_BASE_URL}}/api/data/q/rejets_suite_inspection_paquet_jour_en_cours`
2. Header: `x-api-key`.

**Expected result:**
- `success: true` AND the query `actif` state is active (not returning an "inactive query" error).
- `data[0].BundleRejectToday` exists.

**If this fails:** Document as Blocker B-01. Notify Novacity to activate the 4 BR Bundling slugs. The Sprint 3 BR cards will show grey placeholders until resolved.

---

---

# SPRINT 1 — Authentication + Navigation Shell

## Before you start Sprint 1 tests

1. Dev server running at `http://localhost:5173`.
2. At least two test accounts exist in the auth backend:
   - **IT Admin** account: `eid=IT001`, password known
   - **Chef d'Atelier** account: `eid=CA001`, password known
   - **Méthodes** account: `eid=MET001`, password known
   - **Direction** account: `eid=DIR001`, password known
3. Clear browser storage before each test: DevTools → **Application** → **Storage** → **Clear site data**.

---

## S1-T01 — Login success redirects to correct page

**What we are testing:** Valid credentials log in and redirect to the role's default page.

**Steps:**
1. Navigate to `http://localhost:5173/login`.
2. In the **MATRICULE / EID** field, type `IT001`.
3. In the **CLÉ DE SÉCURITÉ** field, type the IT account password.
4. Click **VALIDATION IDENTITÉ →**.
5. Watch the URL and page that loads.

**Expected result:**
- URL changes to `http://localhost:5173/admin` (IT default route).
- The Admin page shell is displayed (or "ADMINISTRATION SYSTÈME" title in the TopBar).
- No error message is shown.

**Repeat for each role:**
| EID | Role | Expected redirect |
|---|---|---|
| IT001 | IT Admin | /admin |
| DIR001 | Direction | /quality |
| CA001 | Chef d'Atelier | /production |
| MET001 | Méthodes | /methods |

---

## S1-T02 — Wrong password shows French error message

**Steps:**
1. Navigate to `http://localhost:5173/login`.
2. Enter EID: `IT001`, Password: `wrongpassword123`.
3. Click **VALIDATION IDENTITÉ →**.

**Expected result:**
- URL stays on `/login`.
- A red error message appears below the submit button.
- The exact text is: **"Identifiants incorrects. Veuillez réessayer."**
- The password field is cleared.
- The EID field retains the entered value.

---

## S1-T03 — Empty form shows validation

**Steps:**
1. Navigate to `/login`.
2. Leave both fields empty.
3. Click **VALIDATION IDENTITÉ →**.

**Expected result:**
- The form does **not** submit (no network request in DevTools → Network).
- Inline validation messages appear on both fields (e.g., red border or text under each field).
- No API call is made.

---

## S1-T04 — Enter key in password field submits the form

**Steps:**
1. Navigate to `/login`.
2. Type EID: `IT001`.
3. Click into the password field, type the correct password.
4. Press **Enter** (do not click the button).

**Expected result:**
- Same result as clicking the button: redirects to `/admin`.
- A network request to the auth endpoint is visible in DevTools → Network.

---

## S1-T05 — Password visibility toggle works

**Steps:**
1. Navigate to `/login`.
2. In the **CLÉ DE SÉCURITÉ** field, type `TestPassword123`.
3. Look at the field — the text should appear as `••••••••••••••`.
4. Click the eye icon (👁) on the right side of the password field.

**Expected result:**
- After clicking the eye icon, the typed password becomes visible as plain text: `TestPassword123`.
- Click the eye icon again — it returns to masked `•••••••••••••`.

---

## S1-T06 — Sidebar shows all 6 navigation items for Direction

**Steps:**
1. Log in as **Direction** (DIR001).
2. Look at the left sidebar.
3. Count and read all navigation items.

**Expected result — all 6 items are visible:**
- 📊 QUALITÉ (100)
- 🏭 PRODUCTION (200)
- 📦 LOGISTIQUE & PLANNING (300)
- 🔬 DÉVELOPPEMENT & AMÉLIORATION (350)
- 📐 MÉTHODES
- ⚙ ADMINISTRATION (should NOT be visible for Direction — verify it is hidden)

**Correction:** Direction does not have access to /admin. Verify ADMINISTRATION is **not** in the sidebar for Direction.

---

## S1-T07 — Chef d'Atelier only sees Production in sidebar

**Steps:**
1. Log in as **Chef d'Atelier** (CA001).
2. Look at the left sidebar.

**Expected result — visible items:**
- 🏭 PRODUCTION (200) only
- All other items (Qualité, Logistique, Méthodes, Développement, Administration) are **not** visible.

---

## S1-T08 — Méthodes user sees correct sidebar items

**Steps:**
1. Log in as **Méthodes** (MET001).
2. Look at the left sidebar.

**Expected result — visible items:**
- 📊 QUALITÉ (100) ✅
- 🏭 PRODUCTION (200) ✅
- 📦 LOGISTIQUE & PLANNING (300) ✅
- 📐 MÉTHODES ✅
- 🔬 DÉVELOPPEMENT & AMÉLIORATION (350) ✅
- ⚙ ADMINISTRATION ❌ (must NOT be visible)

---

## S1-T09 — Active route is highlighted in the sidebar

**Steps:**
1. Log in as IT Admin.
2. Navigate to `/quality`. Look at the sidebar.
3. Navigate to `/production`. Look at the sidebar.
4. Navigate to `/methods`. Look at the sidebar.

**Expected result for each navigation:**
- The currently active route has a distinct left border highlight (brand-primary blue) or background color.
- Only **one** item is highlighted at a time.
- When on `/quality`, QUALITÉ is highlighted; others are not.

---

## S1-T10 — Production sub-menu expands on click

**Steps:**
1. Log in as IT Admin.
2. Click the **PRODUCTION (200)** item in the sidebar.

**Expected result:**
- Three sub-items appear below it:
  - └ Confection
  - └ Coupe
  - └ Sérigraphie
- Clicking Confection navigates to `/production` with Confection as the active tab.

---

## S1-T11 — Logout clears session and redirects

**Steps:**
1. Log in as any user.
2. Navigate to any protected page.
3. In the sidebar bottom, click **→ DÉCONNEXION**.

**Expected result:**
- URL changes to `http://localhost:5173/login`.
- Login page is displayed.
- The user's name/role is no longer shown anywhere.

---

## S1-T12 — Browser back button after logout stays on login

**Steps:**
1. Complete test S1-T11 (log out successfully).
2. While on the Login page, press the browser **Back** button.

**Expected result:**
- The browser does **not** navigate back to the protected page.
- URL remains on `/login`.
- No dashboard content is visible.

---

## S1-T13 — LiveSyncPill shows green when data is fresh

**Steps:**
1. Log in and navigate to `/quality`.
2. Look at the top-right of the TopBar for the LiveSyncPill.

**Expected result:**
- The pill shows: `● LIVE SYNC: OK`
- The dot and text are **green**.

---

## S1-T14 — LiveSyncPill turns red when data is stale

**What we are testing:** If `lastFetchTime` is more than 2 minutes ago, the pill turns red.

**Steps:**
1. Open the `LiveSyncPill.jsx` component source.
2. Temporarily override `lastFetchTime` to `new Date(Date.now() - 5 * 60 * 1000)` (5 minutes ago) in the component's props or state.
3. Save and observe the pill in the browser.

**Expected result:**
- The pill changes to: `● SYNC: ERREUR`
- The dot and text are **red**.

**After the test:** Revert the change.

---

## S1-T15 — BigNumberCard renders in all four status states

**What we are testing:** The card correctly uses green/orange/red/grey border and value color.

**Steps:**
1. Add a temporary test page that renders 4 `BigNumberCard` components:
   ```jsx
   <BigNumberCard label="Test Vert" value="96.8" unit="%" target="CIBLE: ≥98%" status="green" source="Test" />
   <BigNumberCard label="Test Orange" value="96.0" unit="%" target="CIBLE: ≥98%" status="orange" source="Test" />
   <BigNumberCard label="Test Rouge" value="93.5" unit="%" target="CIBLE: ≥98%" status="red" source="Test" />
   <BigNumberCard label="Test Gris" value="—" unit="" target="" status="grey" source="En attente" />
   ```
2. Load the test page in the browser.

**Expected result:**
- **Green card:** Left border is `#16a34a`. Value `96.8%` is in green text.
- **Orange card:** Left border is `#ea580c`. Value `96.0%` is in orange text.
- **Red card:** Left border is `#dc2626`. Value `93.5%` is in red text.
- **Grey card:** Left border is `#6b7280`. Value `—` is in grey text.

**Loading state test:** Add `isLoading={true}` to one card.
- Expected: skeleton pulse rectangles replace the value and label.

**Error state test:** Add `error="Erreur de connexion"` to one card.
- Expected: card has a red tint and shows the error message text.

---

## S1-T16 — /methods route loads for Méthodes role

**Steps:**
1. Log in as Méthodes user (MET001).
2. Navigate to `http://localhost:5173/methods`.

**Expected result:**
- Page loads showing the Méthodes page shell.
- TopBar title shows **"MÉTHODES & AMÉLIORATION CONTINUE"**.
- No redirect to `/unauthorized`.

---

## S1-T17 — Chef d'Atelier cannot access /methods

**Steps:**
1. Log in as Chef d'Atelier (CA001).
2. Manually navigate to `http://localhost:5173/methods`.

**Expected result:**
- URL changes to `http://localhost:5173/unauthorized`.
- "Accès refusé" message displayed.

---

### Responsiveness Tests (Sprint 1)

## S1-R01 — Login page at 1920×1080

**Steps:**
1. Open Chrome DevTools → **Device Toolbar** (Ctrl+Shift+M).
2. Set resolution to 1920×1080.
3. Navigate to `/login`.

**Expected result:**
- Login card is centered on the page.
- Card width is approximately 400px.
- All text is readable without horizontal scroll.
- "EXCELLENCE INDUSTRIELLE" footer is visible at the bottom.

## S1-R02 — Dashboard at 1920×1080

**Steps:**
1. Log in as IT Admin.
2. Set DevTools Device Toolbar to 1920×1080.
3. Navigate to `/quality`.

**Expected result:**
- Sidebar is visible on the left (240px).
- TopBar spans the full width minus sidebar.
- Content area fills the remaining space.
- No horizontal scroll bar.

---

---

# SPRINT 2 — Admin Panel

## Before you start Sprint 2 tests

1. Log in as IT Admin.
2. Navigate to `http://localhost:5173/admin`.
3. Keep DevTools open on the Network tab.

---

## S2-T01 — Admin page fires jobs API request on load

**Steps:**
1. Clear the Network tab (click 🚫).
2. Navigate to `/admin` (or refresh the page).
3. In the Network tab, filter by XHR/Fetch.

**Expected result:**
- A request to `/api/admin/jobs` is visible.
- The request has an `Authorization: Bearer <token>` header (check under Request Headers).
- The response has `success: true` and `data` is an array.

---

## S2-T02 — All sources show green when all jobs OK

**Prerequisites:** Verify in Postman that all jobs currently have `last_status: "ok"`.

**Steps:**
1. Navigate to `/admin`.
2. Look at the API Supervision panel.

**Expected result:**
- All three source rows (ERP DIVA, GPRO-PROD, Google Drive) show a **green 🟢** indicator.
- Status label says **"OK"** next to each.

---

## S2-T03 — Source shows red when one job has an error

**Steps:**
1. In your backend/API admin, manually set the `last_status` of any GPRO-related job to `"error"`.
2. Navigate to `/admin` (or wait for the 60-second auto-refresh).

**Expected result:**
- The **GPRO-PROD** row shows a **red 🔴** indicator.
- Status label says **"ERREUR"**.

**After the test:** Restore `last_status` to `"ok"`.

---

## S2-T04 — Source shows orange when job is stale

**Steps:**
1. Manually set a job's `last_run` to 10 minutes ago in the backend.
2. Navigate to `/admin`.

**Expected result:**
- The affected source row shows an **orange 🟠** indicator.
- Time since sync shows something like **"il y a 10 minutes"**.

---

## S2-T05 — BR Bundling inactive banner is shown

**Steps:**
1. In Postman, verify that job IDs 60, 61, 54, 55 have `actif: false`.
2. Navigate to `/admin`.

**Expected result:**
- An orange or yellow banner appears at the top of the API Supervision panel.
- Text says something like: **"Attention : 4 requêtes BR Bundling sont inactives. Contactez Novacity pour activation (Blocker B-01)."**

---

## S2-T06 — Manual job execution shows a toast

**Steps:**
1. Navigate to `/admin`.
2. In the API Supervision panel, find any job row with an **"EXÉCUTER MAINTENANT"** button.
3. Click **EXÉCUTER MAINTENANT**.

**Expected result:**
- A toast notification appears in the corner of the screen.
- Toast text shows the result from the API (e.g., **"Requête exécutée : 1 ligne(s) retournée(s)."**).
- In DevTools Network: a GET request to `/api/admin/jobs/:id/run` is visible with Bearer JWT header.

---

## S2-T07 — Auto-refresh fires every 60 seconds

**Steps:**
1. Navigate to `/admin`.
2. Open DevTools → **Network** tab. Clear existing entries.
3. Wait 65 seconds without interacting with the page.

**Expected result:**
- A new request to `/api/admin/jobs` appears in the Network tab after approximately 60 seconds.
- The UI updates to reflect any status changes.
- No page reload occurs (the URL stays the same, the page does not flicker).

---

## S2-T08 — Add user modal opens with all fields

**Steps:**
1. Navigate to `/admin`.
2. In the User Management panel, click **"+ Ajouter utilisateur"**.

**Expected result:**
- A modal dialog opens.
- The modal contains the following fields:
  - Nom complet (text input)
  - Matricule / EID (text input)
  - Rôle (dropdown)
  - Mot de passe initial (password input)
  - Confirmer mot de passe (password input)
- A submit button labelled **"CRÉER LE COMPTE"** is visible.
- The Rôle dropdown contains these options: IT / Administrateur, Direction, Responsable Production, Chef d'Atelier, Responsable Qualité, Méthodes / Planning, Coupe.

---

## S2-T09 — Password mismatch validation

**Steps:**
1. Open the Add User modal (same as S2-T08).
2. Enter: Nom = "Test User", EID = "TEST001", Rôle = "Coupe".
3. Mot de passe = `Password123`, Confirmer = `DifferentPassword`.
4. Click **"CRÉER LE COMPTE"**.

**Expected result:**
- The form does **not** submit.
- An inline error message appears: **"Les mots de passe ne correspondent pas."**
- No API request is fired (check DevTools Network).

---

## S2-T10 — Edit user modal opens prefilled

**Steps:**
1. Navigate to `/admin`.
2. In the User table, find any user row.
3. Click the ✏️ edit button on that row.

**Expected result:**
- A modal opens.
- All fields are **prefilled** with the existing user's data (Nom, Rôle, Email).
- Password field is empty (for security — never pre-fill passwords).

---

## S2-T11 — Screen dropdown contains Méthodes option

**Steps:**
1. Navigate to `/admin`.
2. In the Screen Management panel (right column), find any screen card.
3. Click the dropdown on that card.

**Expected result:**
- The dropdown shows the following options:
  - Qualité
  - Production Confection
  - Production Coupe
  - Production Sérigraphie
  - Logistique
  - **Méthodes** ← verify this is present
  - Développement
  - Administration

---

## S2-T12 — Audit log color-coding

**Steps:**
1. Navigate to `/admin`.
2. In the Audit Log panel, look at the log entries.

**Expected result:**
- Entries starting with `[INFO]` have **grey** text.
- Entries starting with `[WARN]` have **orange** text.
- Entries starting with `[ERROR]` have **red** text.
- Entries starting with `[USER]` have **blue** text.
- Entries starting with `[SYSTEM]` have **purple** text.

---

## S2-T13 — Non-IT role cannot access /admin

**Steps:**
1. Log out.
2. Log in as Responsable Qualité.
3. Navigate directly to `http://localhost:5173/admin`.

**Expected result:**
- URL changes to `/unauthorized`.
- "Accès refusé" page shown.

---

---

# SPRINT 3 — Quality Dashboard (Série 100)

## Before you start Sprint 3 tests

1. Log in as Responsable Qualité or IT Admin.
2. Navigate to `http://localhost:5173/quality`.
3. The page should auto-fetch data on load.
4. Keep DevTools open.

---

## S3-T01 — RFT Ce Jour card shows correct value

**Steps:**
1. Load the Quality page.
2. Open DevTools → **Network** tab.
3. Find the requests to `pieces_ok_de_premier_coup_jour_en_cours` and `pieces_produites_jour_en_cours`.
4. Note the values: `FirstPassToday` and `ProducedToday` from each response.
5. Manually calculate: `(FirstPassToday / ProducedToday * 100)`.
6. Look at the **"RFT (Ce jour)"** card on the page.

**Expected result:**
- The card shows the computed value, formatted with 1 decimal place and `%` suffix.
- Example: if `FirstPassToday = 2947` and `ProducedToday = 3020`, the card shows **"97,5 %"** (French format).
- The value matches your manual calculation.

---

## S3-T02 — RFT shows "N/A" when ProducedToday is zero

**Steps:**
1. In your API or using a mock, set `ProducedToday = 0`.
2. Reload the Quality page.
3. Look at the RFT Ce Jour card.

**Expected result:**
- The card shows **"N/A"** instead of a number.
- No `"Infinity%"` or `"NaN%"` is displayed.
- The card status is `grey`.

---

## S3-T03 — RFT shows "N/A" when computed value exceeds 100%

**What we are testing:** The anomaly guard that protects against the API sample data issue (`FirstPassToday: 2947, ProducedToday: 80` = 3684%).

**Steps:**
1. Mock the response: `FirstPassToday = 2947`, `ProducedToday = 80`.
2. Reload the Quality page.
3. Look at the RFT Ce Jour card.

**Expected result:**
- Card shows **"N/A"** (not "3684,0 %").
- Card status is `grey` with a note like "Données anormales".

---

## S3-T04 — RFT card color: Green at 99%

**Steps:**
1. Mock: `FirstPassToday = 990`, `ProducedToday = 1000` → RFT = 99%.
2. Reload the page.

**Expected result:**
- Card shows **"99,0 %"**.
- Left border color is **green** (`#16a34a`).
- Value text is green.

---

## S3-T05 — RFT card color: Orange at 96%

**Steps:**
1. Mock: `FirstPassToday = 960`, `ProducedToday = 1000` → RFT = 96%.
2. Reload the page.

**Expected result:**
- Card shows **"96,0 %"**.
- Left border and value are **orange** (`#ea580c`).

---

## S3-T06 — RFT card color: Red at 93%

**Steps:**
1. Mock: `FirstPassToday = 930`, `ProducedToday = 1000` → RFT = 93%.
2. Reload the page.

**Expected result:**
- Card shows **"93,0 %"**.
- Left border and value are **red** (`#dc2626`).

---

## S3-T07 — BR Bundling shows grey placeholder when endpoints are inactive (B-01)

**Applies if Blocker B-01 is NOT resolved.**

**Steps:**
1. Confirm that `rejets_suite_inspection_paquet_jour_en_cours` is inactive (check via Postman: it returns an error or `actif: false`).
2. Load the Quality page.
3. Look at the **"BR Bundling (Ce jour)"** card.

**Expected result:**
- The card is **grey**.
- It does **not** show an `ErrorBanner` (red banner).
- It shows the text: **"Activation requise (B-01)"** or similar placeholder.
- No console errors.

---

## S3-T08 — BR CGL/GTD cards show grey placeholder when DIVA API absent (B-02)

**Applies if Blocker B-02 is NOT resolved.**

**Steps:**
1. Load the Quality page.
2. Look at the **"BR CGL (DDA)"** and **"BR GTD (Ce jour)"** cards.

**Expected result:**
- Both cards are **grey**.
- Text shows: **"En attente API DIVA"** or similar.
- No error banner, no crash.

---

## S3-T09 — BR bar chart has a dashed reference line at y=5

**Steps:**
1. Load the Quality page.
2. Scroll to the bar chart titled **"TAUX DE REJET (BR) PAR CHAÎNE"**.

**Expected result:**
- The chart has bars for each chain (CH1, CH2, CH3…).
- A **horizontal dashed line** is visible at the y=5 level.
- Hovering over a bar shows a tooltip: e.g., **"CH1: 1,2% — Cible: 5%"**.

---

## S3-T10 — Alert list generates a red alert when RFT < 95%

**Steps:**
1. Mock RFT to 93% (as in S3-T06).
2. Reload the page.
3. Look at the **"DERNIÈRES ALERTES QUALITÉ"** panel.

**Expected result:**
- A red alert entry appears: **"🔴 RFT CRITIQUE — En dessous de 95%"**.
- The entry shows a timestamp.

---

## S3-T11 — Alert list shows "Aucune alerte" when all KPIs are within target

**Steps:**
1. Mock all KPIs within their green thresholds.
2. Reload the page.
3. Look at the Alert List panel.

**Expected result:**
- The panel shows: **"✅ Aucune alerte — Tous les indicateurs sont dans les objectifs"**.
- No red or orange alert entries.

---

## S3-T12 — Best QP and Low QP Team podiums render

**Steps:**
1. Load the Quality page.
2. Scroll to the QP Team podium section.

**Expected result:**
- Two podium components are visible side by side.
- Left podium title: **"🏆 BEST QP TEAM"** (gold/silver/bronze).
- Right podium title: **"⚠ LOW QP TEAM"** (red/orange/grey).
- If B-01/B-02 are unresolved: each podium shows a footnote **"Score partiel — données DIVA en attente"**.
- If B-01/B-02 are resolved: each podium shows 3 chain columns with scores.

---

## S3-T13 — Pareto tab switching

**Steps:**
1. Load the Quality page.
2. Scroll to the Pareto section.
3. Tab 1 ("PARETO DÉFAUTS RFT") should be active by default. Verify the chart is visible.
4. Click **Tab 2 ("PARETO DÉFAUTS INSPECTION")**.

**Expected result:**
- Tab 2 becomes active (visual indicator changes).
- A different Pareto chart renders — this one groups by `ITEMID` instead of `OpNo`.
- Both a bar series and a cumulative % line series are visible on each tab.
- The 80% cumulative line is drawn in orange.

---

## S3-T14 — Data auto-refreshes every 60 seconds

**Steps:**
1. Load the Quality page.
2. Open DevTools → **Network** tab. Clear entries.
3. Wait 65 seconds without touching the page.

**Expected result:**
- New requests appear in the Network tab for all the Quality page endpoints.
- Approximate time between requests: 60 seconds (±5 seconds acceptable).
- The UI updates with the refreshed data.
- No page reload occurs.

---

## S3-T15 — API failure makes LiveSyncPill red and shows ErrorBanner

**Steps:**
1. With the Quality page open, temporarily disable network access (DevTools → **Network** tab → check **"Offline"** checkbox at top).
2. Wait 65 seconds for the next auto-refresh cycle.

**Expected result:**
- The LiveSyncPill in the TopBar changes to: `● SYNC: ERREUR` in **red**.
- An `ErrorBanner` component appears on the relevant chart/card that failed.
- Other parts of the page that had already loaded remain visible.
- No full white screen crash.

**After the test:** Uncheck "Offline" in DevTools Network.

---

## S3-T16 — Loading skeletons appear during slow network

**Steps:**
1. In DevTools → **Network** tab, set throttle to **"Slow 3G"** (dropdown at the top of the Network tab).
2. Navigate to `/quality` (hard refresh with Ctrl+Shift+R).

**Expected result:**
- While data is loading, cards show **pulse skeleton rectangles** instead of real values.
- Charts show a loading spinner.
- Once data arrives, skeletons are replaced by real content.

**After the test:** Set throttle back to "No throttling".

---

---

# SPRINT 4 — Production Dashboard (Confection Tab)

## Before you start Sprint 4 tests

1. Log in as Responsable Production or IT Admin.
2. Navigate to `http://localhost:5173/production`.
3. Confection tab should be active by default.

---

## S4-T01 — Efficience card color: Green at 90%

**Steps:**
1. Mock `efficience_pct = 90` for today's data in `efficience_chaine` query.
2. Load the Production page.

**Expected result:**
- **"Efficience Globale"** card shows **"90 %"** (or average across chains).
- Card is **green** (>85% threshold met).

---

## S4-T02 — Efficience card color: Orange at 75%

**Steps:**
1. Mock average `efficience_pct = 75`.
2. Reload.

**Expected result:** Card shows **"75 %"** in **orange** (70–85% range).

---

## S4-T03 — Efficience card color: Red at 60%

**Steps:**
1. Mock average `efficience_pct = 60`.
2. Reload.

**Expected result:** Card shows **"60 %"** in **red** (<70%).

---

## S4-T04 — OWE card shows grey placeholder when B-04 unresolved

**Steps:**
1. Load the Production page.
2. Find the **"OWE (Ce jour)"** card.

**Expected result (if B-04 is unresolved):**
- Card is **grey**.
- Shows text: **"Données GPRO Consulting requises"** or similar.
- No error banner, no crash.

---

## S4-T05 — BPD/EPD/EHD show "—" on chain cards

**Steps:**
1. Load the Production page.
2. Look at the chain info banner row at the top.
3. Find any chain card (e.g., CH1).

**Expected result:**
- The card shows:
  - OF number (from API) ✅
  - Effectifs: **—** (grey text "Données GPRO Consulting")
  - SAM: **—**
  - BPD: **—** | EPD: **—** | EHD: **—**

---

## S4-T06 — Lost time card: Red at 45 minutes

**Steps:**
1. Mock `lost_time` data: two entries for today, `minutes_perdues = 22` and `23`.
2. Reload the Production page.

**Expected result:**
- **"Arrêts Ce Jour"** card shows **"45 min"**.
- Card is **red** (>30 min threshold).

---

## S4-T07 — Gauge chart needle matches efficience_pct value

**Steps:**
1. Load the Production page.
2. Look at the Gauge Charts row (one per chain).
3. Check the needle position on the CH1 gauge.
4. Cross-reference with the raw API data: open DevTools → Network, find the `efficience_chaine` request, check `efficience_pct` for CH1 (today's date).

**Expected result:**
- The gauge needle points to the same percentage as `efficience_pct` from the API.
- The color zone the needle falls in matches the threshold (green zone if ≥85%, orange 70–85%, red <70%).
- The center label shows the percentage and chain name.

---

## S4-T08 — Stoppage timeline shows colored blocks

**Steps:**
1. Ensure `lost_time` API returns at least 3 motifs for today (MAINT, MATIERE, QUALITE).
2. Load the Production page.
3. Scroll to the **"Arrêts Non Planifiés"** timeline.

**Expected result:**
- One row per chain (CH1, CH2, etc.).
- Each row has colored blocks:
  - MAINT → **orange** block
  - MATIERE → **blue** block
  - QUALITE → **red** block
- Block width is proportional to `minutes_perdues` (a 45-minute block is wider than a 10-minute block).
- Hovering over a block shows tooltip: **"CH1 — MAINT — 45 min"**.
- A legend below the timeline lists all stoppages.

---

## S4-T09 — Donut chart shows 78% for in-progress OF

**Steps:**
1. Verify `etat_avancement` API returns `{ of: "OF-2026-0412", avancement_pct: 78.2, statut: "en_cours" }`.
2. Load the Production page.
3. Find the donut chart for OF-2026-0412.

**Expected result:**
- The donut has a **blue** filled arc covering approximately 78% of the circle.
- The remaining ~22% is **grey**.
- Center text shows **"OF-2026-0412"** and **"78 %"**.
- Below the donut: **"2 346 / 3 000 pièces"**.

---

## S4-T10 — Completed OF shows 100% green donut

**Steps:**
1. Verify `etat_avancement` has `{ avancement_pct: 100, statut: "termine" }` for an OF.
2. Load the page.

**Expected result:**
- The completed OF donut is fully filled in **green** (100%).
- A checkmark ✅ or "Terminé" badge appears near/below the donut.

---

## S4-T11 — Top operators sorted by minutes_produites descending

**Steps:**
1. Load the Production page.
2. Scroll to **"TOP OPÉRATEURS (Ce jour)"** horizontal bar chart.

**Expected result:**
- The bars are sorted with the **longest bar at the top** (highest `minutes_produites` first).
- Bars where `minutes_produites / minutes_presence > 0.9` are **green**; others are a neutral color.

---

## S4-T12 — WIP area chart shows two overlapping areas

**Steps:**
1. Load the Production page.
2. Scroll to the **"WIP OPTIMAL"** area chart.

**Expected result:**
- Two overlapping colored areas are visible.
- Blue area = quantite_coupee (Sortie Coupe).
- Orange semi-transparent area = quantite_engagee (Engagement).
- The gap between the blue and orange areas represents WIP.
- A legend identifies each area.

---

## S4-T13 — Tab switching works

**Steps:**
1. Load the Production page.
2. Click the **"Coupe"** tab.
3. Click the **"Sérigraphie"** tab.
4. Click **"Confection"** to return.

**Expected result:**
- Each tab click changes the content area visibly.
- The active tab has a visual highlight (underline or background color change).
- No page crash or blank content area.
- Switching tabs does not trigger a page reload.

---

## S4-T14 — Efficience cumulative line chart shows per-chain lines

**Steps:**
1. Ensure the `efficience_chaine` API has data for at least 2 different chains and 2 dates.
2. Load the Production page.
3. Look at the **"EFFICIENCE CUMULÉE PAR CHAÎNE"** line chart.

**Expected result:**
- There is one line per chain (CH1 = blue, CH2 = green, CH3 = orange).
- A dashed horizontal reference line is visible at y=85.
- The X-axis shows dates.
- A legend identifies each chain.

---

## S4-T15 — API error on one chart does not crash the whole page

**Steps:**
1. Open `api.js` and temporarily make `fetchLostTime()` throw an error immediately.
2. Reload the Production page.

**Expected result:**
- The **"Arrêts Non Planifiés"** timeline/card shows an `ErrorBanner` component.
- All other charts on the page still render normally with their data.
- No white screen. No "Something went wrong" React error boundary.

**After the test:** Restore `fetchLostTime()`.

---

---

# SPRINT 5 — Production (Coupe & Sérigraphie Tabs)

## Before you start Sprint 5 tests

1. Navigate to `/production`.
2. Click the **"Coupe"** tab before running Coupe tests.
3. Click the **"Sérigraphie"** tab before running Sérigraphie tests.

---

## S5-T01 — Couverture Coupe calculation is correct

**Steps:**
1. Open DevTools → Network. Check the `sortie_coupe` response: note `quantite_coupee` for a commande.
2. Check the `qte_engagement` response: note `quantite_engagee` for the same commande.
3. Manually compute: `(quantite_coupee - quantite_engagee) / cadence_default` (cadence default = 1000).
4. Look at the **"COUVERTURE COUPE"** bar chart.

**Expected result:**
- The bar height for that commande matches your manual calculation.
- Bars above the reference line are **green**; bars below are **red**.

---

## S5-T02 — Couverture Chaîne shows partial data when B-04 unresolved

**Steps:**
1. Load the Coupe tab.
2. Find the **"COUVERTURE CHAÎNE (en jours)"** bar chart.

**Expected result (if B-04 unresolved):**
- Chart renders with bars based on `quantite_engagee` from the API.
- A footnote or annotation states: **"Qté planifiée: données GPRO Consulting en attente"**.
- The chart does not crash; bars are visible.

---

## S5-T03 — Tagging table shows red for ecart_pct > 5%

**Steps:**
1. Verify `taging_reel` API returns at least one row with `ecart_pct` outside ±5% (e.g., CH1/S2 with `ecart_pct: -5.33`).
2. Load the Coupe tab.
3. Find the **"TAUX DE FIABILITÉ — TAGGING RÉEL"** table.

**Expected result:**
- The row with `ecart_pct = -5.33` has its **Écart %** cell highlighted in **red**.
- A row with `ecart_pct = 0.42` has its cell in **green**.
- A row with `ecart_pct = -1.47` (between 2–5%) has its cell in **orange**.

---

## S5-T04 — Taux d'archivage shows grey placeholder (B-05)

**Steps:**
1. Load the Coupe tab.
2. Find the **Taux d'Archivage Suivi Paquets** card/gauge.

**Expected result:**
- Component is **grey**.
- Shows label: **"Source: Base suivi production — Données en attente (B-05)"**.
- No error banner. No crash.

---

## S5-T05 — OF Coupe list only shows active OFs (DtFin is null)

**Steps:**
1. Check `ofabrication` API: verify it has both `DtFin: null` (active) and `DtFin: "2026-04-15T18:00:00.000Z"` (finished) entries.
2. Load the Coupe tab.
3. Look at the **OF Coupe List** table.

**Expected result:**
- Only OFs with `DtFin === null` are shown in the "En cours" table.
- Example: OF-2026-0412 (has a DtFin) is **NOT** in the list.
- OF-2026-0413 and OF-2026-0414 (DtFin = null) **ARE** in the list.
- Status badge says **"En cours"** (blue).

---

## S5-T06 — Sérigraphie green bar when entrée > sortie

**Steps:**
1. Verify API: `qte_entree_serigraphie` has `{ article: "ART-001", couleur: "Blanc", quantite: 620 }` and `sortie_serigraphie` has `{ article: "ART-001", couleur: "Blanc", quantite: 598 }`.
2. Coverage = 620 − 598 = 22 (above 0, assume above target).
3. Load the Sérigraphie tab.
4. Look at **"COUVERTURE SÉRIGRAPHIE"** bar chart.

**Expected result:**
- The bar for ART-001/Blanc is **green** (couverture above target).

---

## S5-T07 — Rejected packets from yesterday are not shown

**Steps:**
1. Verify `packets_rejetes` API has entries with `date_rejet` from yesterday.
2. Load the Sérigraphie tab.
3. Look at the **rejected packets table**.

**Expected result:**
- Only rows where `date_rejet` is today's date (11/06/2026) are shown.
- Yesterday's entries are **absent** from the table.

---

## S5-T08 — Total rejected quantity BigNumber card sums correctly

**Steps:**
1. Verify `packets_rejetes` API returns today: quantities `12, 8, 4`.
2. Load the Sérigraphie tab.
3. Look at the BigNumberCard above the rejected packets table.

**Expected result:**
- Card shows **"24"** (sum of 12 + 8 + 4).
- Label: "Total Qté Rejetée (Ce jour)".

---

## S5-T09 — Inline vs Endline chart shows two groups per chain

**Steps:**
1. Verify `inlinevsendlinecomparison` API has data for at least CH1 and CH2.
2. Load the Coupe tab (and Sérigraphie tab — chart appears on both).
3. Look at **"COMPARAISON INLINE VS ENDLINE"**.

**Expected result:**
- The chart has grouped bars: for each chain (CH1, CH2), two bars appear side by side.
- Legend identifies: Inline operations (one color) vs Endline operations (another color).

---

## S5-T10 — Couverture Chaîne bar color: Red when below 5 days

**Steps:**
1. Mock: `quantite_engagee = 200`, cadence = 100/day → coverage = 2 days.
2. Reload the Coupe tab.

**Expected result:**
- That chain's bar in **"COUVERTURE CHAÎNE"** is **red** (< 5 days).

---

---

# SPRINT 6 — Logistics Dashboard

## Before you start Sprint 6 tests

1. Log in as Méthodes/Planning or IT Admin.
2. Navigate to `http://localhost:5173/logistics`.

---

## S6-T01 — Dead-stock formula produces correct percentage

**Steps:**
1. Open DevTools → Network.
2. Find the `articles_sans_mouvement_durant_365_jours` response: note `Qtte_SansMvt_365j` (e.g., `147329728.72`).
3. Find the `quantite_totale_du_stock` response: note `Quantite_Totale_Stock` (e.g., `162067420.25`).
4. Manually compute: `(147329728.72 / 162067420.25 * 100) = 90.91%`.
5. Look at the **"Taux de Stock Mort"** cards.

**Expected result:**
- The card value matches your calculated percentage (e.g., **"90,91 %"** in French format).
- Since this is very high, the card should be **red** (no explicit threshold was given — use >50% as red if not defined).

---

## S6-T02 — Conteneurs_Actifs type is integer after coercion

**Steps:**
1. Open DevTools → **Console**.
2. Run:
   ```js
   import('/src/services/api.js').then(m =>
     m.fetchCapaciteStockage().then(d => {
       console.log('raw type:', typeof d[0].Conteneurs_Actifs);
       console.log('value:', d[0].Conteneurs_Actifs);
     })
   )
   ```

**Expected result:**
- `raw type: number` (NOT `"string"`).
- Value: `42864` (integer, no quotes).

---

## S6-T03 — Occupation gauge shows ~91% (orange/red)

**Steps:**
1. Verify API values: `NbRouleaux = 39031`, `Conteneurs_Actifs = "42864"`.
2. Expected: `39031 / 42864 * 100 = 91.1%`.
3. Load the Logistics page.
4. Look at the **"Taux d'Occupation"** gauge charts.

**Expected result:**
- Each occupation gauge shows approximately **"91,1 %"**.
- Since 91.1% > 85% and > 85%, the gauge is in the **orange or red** zone.
- The needle/arc is in the correct colored zone.

---

## S6-T04 — Provenance pie chart excludes the null total row

**Steps:**
1. Verify `quantite_par_provenance_total` API returns a row with `Provenance: null` (the rollup total row).
2. Load the Logistics page.
3. Look at the **"STOCK/Provenance"** pie chart.

**Expected result:**
- The pie chart has **3 slices** (Chine, France, NON RENSEIGNE).
- There is **no 4th slice** for the null total row.
- Total of all slice quantities ≠ the null row value (which was a sum of all).

---

## S6-T05 — Famille pie chart excludes null rollup row

**Steps:**
1. Verify `quantite_par_famille` API returns `{ FamilleFG: null, Quantite: 162067420.25 }` as last row.
2. Load the Logistics page.
3. Look at the **"STOCK/Brand"** pie chart.

**Expected result:**
- The null row is **not** shown as a slice.
- Named brands (DOMYOS, KALENJI, etc.) appear as individual slices.
- "AUTRE" may appear as a grouped slice for small brands.

---

## S6-T06 — OF table row expands to show colis detail

**Steps:**
1. Load the Logistics page.
2. Scroll to the OF Status Table.
3. Click on any OF row.

**Expected result:**
- The row expands to reveal a **nested table** underneath.
- The nested table shows colis data: commande, article, couleur, total_colis, total_pieces.
- Clicking the row again collapses it.

---

## S6-T07 — Livraison ratio is computed correctly

**Steps:**
1. Verify API: `NbOF_Livres_Total = 4270`, `OF_AvecTransfertCoupe_Total = 3213`.
2. Expected: `3213 / 4270 * 100 = 75.2%`.
3. Load the Logistics page.
4. Find the **"Taux de Commandes Livrées à Temps"** cards.

**Expected result:**
- Cards show **"75,2 %"** (French format, 1 decimal).

---

## S6-T08 — MoyenneJours type is float and card shows correct color

**Steps:**
1. Open Console, run:
   ```js
   import('/src/services/api.js').then(m =>
     m.fetchMoyenneDateTransfert().then(d => {
       console.log('type:', typeof d[0].MoyenneJours);
       console.log('value:', d[0].MoyenneJours);
     })
   )
   ```
2. Then look at the **"Délai de Livraison"** card on the Logistics page.

**Expected result:**
- Console: `type: number`, value: `4.16` (float).
- Card shows: **"4,2 jours (sur 6 576 OFs)"** (French format).
- Card is **orange** (>1 day but ≤3 would be orange; >3 would be red — at 4.16 it is **red**).

---

## S6-T09 — Stock search filters correctly

**Steps:**
1. Load the Logistics page.
2. Scroll to the **Stock Search Table**.
3. In the search input, type **"Coton"**.

**Expected result:**
- The table updates immediately (or after a short debounce) to show only rows where Désignation or Famille contains "Coton".
- Rows with "Lin naturel" or "Polyester" are hidden.
- Row count label updates to reflect the filtered count.

---

## S6-T10 — Sort by column works

**Steps:**
1. In the Stock Search Table, click the **"Qté Stock"** column header.

**Expected result:**
- Rows sort in **descending** order by Qté Stock (highest first).
- The column header shows a sort indicator (▼ arrow).
- Clicking again sorts ascending (▲).

---

## S6-T11 — Pagination shows page 2 when table has more than 20 rows

**Steps:**
1. Verify the joined `vue_stock` + `diva_stock` data has more than 20 rows (the API count is 4261 lines).
2. Load the Logistics page, scroll to the Stock Search Table.

**Expected result:**
- Only 20 rows are visible at a time.
- Pagination controls appear below the table (Page 1, 2, 3… or Previous/Next buttons).
- Clicking **Page 2** loads the next 20 rows.
- The rows change — Page 2 does not show the same rows as Page 1.

---

## S6-T12 — Qté Disponible is computed as Qtte minus qtteReserve

**Steps:**
1. Verify API: a row has `Qtte = 500`, `qtteReserve = 120`.
2. Expected Qté Disponible = 500 − 120 = **380**.
3. Find that row in the Stock Search Table.

**Expected result:**
- The **"Qté Disponible"** column for that row shows **380**.

---

---

# SPRINT 7 — Méthodes + Development + Global Features

## Before you start Sprint 7 tests

1. Log in as Méthodes user for Méthodes tests.
2. Log in as IT Admin for Development admin tests.
3. Navigate accordingly.

---

## S7-T01 — Méthodes page renders all 4 rows

**Steps:**
1. Log in as Méthodes user.
2. Navigate to `http://localhost:5173/methods`.
3. Scroll through the entire page.

**Expected result:**
- **Row 1 (Gauges):** Two gauge charts visible: "Taux d'Archivage" (grey placeholder if B-05) and "Taux de Fiabilité Données Système".
- **Row 2 (BigNumber cards):** Two cards: "Respect Temps Estimé" and "Temps Acceptés 1ère Version".
- **Row 3 (Detail Table):** Table with 4 rows (F-REQ-216, 217, 218, 219) showing current values, targets, and status badges.
- **Row 4 (Line Chart):** "FIABILITÉ TAGGING PAR CHAÎNE ET SHIFT" chart with ecart_pct lines.
- No crashes, no blank sections.

---

## S7-T02 — F-REQ-217 gauge shows live tagging reliability from API

**Steps:**
1. Open DevTools → Network.
2. Find the `taging_reel` API call on page load.
3. Note the `ecart_pct` values returned.
4. Manually compute reliability: `100 - average(abs(ecart_pct values))`.
   - E.g., ecart_pct values: -1.47, 0.42, -5.33 → avg abs = (1.47 + 0.42 + 5.33)/3 = 2.41 → reliability = 97.59%.
5. Look at the **"Taux de Fiabilité des Données sur Système"** gauge.

**Expected result:**
- Gauge shows a value close to your computed reliability %.
- If ≥ 95%, gauge needle is in the green zone.
- If < 95%, gauge needle is in the orange/red zone.

---

## S7-T03 — F-REQ-216 shows placeholder when B-05 unresolved

**Steps:**
1. Navigate to `/methods`.
2. Find the **"Taux d'Archivage Suivi Paquets"** gauge.

**Expected result:**
- Gauge shows **grey** placeholder.
- Text: **"Source: Base suivi production — Données en attente (B-05)"**.
- No error banner. Gauge needle at 0%.

---

## S7-T04 — IT Admin can open the Méthodes update modal

**Steps:**
1. Log in as IT Admin.
2. Navigate to `/methods`.
3. Find the **"METTRE À JOUR LES DONNÉES"** button (visible only to IT/Admin).
4. Click it.

**Expected result:**
- A modal dialog opens.
- Modal contains input fields for:
  - F-REQ-218: numerator (Nb articles conformes) + denominator (Total articles)
  - F-REQ-219: numerator (Nb gammes acceptées) + denominator (Nb gammes déchiffrage)
- Submit button: **"ENREGISTRER"**.

---

## S7-T05 — Méthodes user cannot see the update button

**Steps:**
1. Log in as Méthodes user (MET001).
2. Navigate to `/methods`.

**Expected result:**
- The **"METTRE À JOUR LES DONNÉES"** button is **not visible** on the page.
- No update controls are shown to non-IT users.

---

## S7-T06 — Development page renders all 6 KPI cards

**Steps:**
1. Log in as IT Admin.
2. Navigate to `http://localhost:5173/development`.

**Expected result:**
- **Row 1:** 3 cards visible: RFT Développement (F-REQ-350), Respect Livraison à Date (F-REQ-351), Fiabilité Nomenclature (F-REQ-352).
- **Row 2:** 3 more cards: % Réclamations Production, Déchiffrage Cotation, Étalonnage.
- Each card has a **"FREQ: MENSUEL"** badge.
- Right panel: Fiabilité Nomenclature line chart.
- Bottom right: Étalonnage **"100 %"** large display.

---

## S7-T07 — Filter by Ligne (CH1) filters production charts

**Steps:**
1. Navigate to `/production`.
2. In the TopBar, click the **"Ligne"** dropdown.
3. Select **"CH1"**.

**Expected result:**
- The gauge charts, efficiency charts, and top operators table update to show **only CH1 data**.
- The Efficience Globale card shows only CH1's efficiency, not an average across all chains.
- The filter dropdown shows "CH1" as the selected value.
- A **"Réinitialiser filtres"** button or indicator appears.

---

## S7-T08 — Filter reset restores all data

**Steps:**
1. Apply any filter (e.g., Ligne = CH1 as in S7-T07).
2. Click **"Réinitialiser filtres"**.

**Expected result:**
- All 4 filter dropdowns reset to **"Tous"**.
- Charts and cards show data for all chains/brands/OFs again.
- The page data is equivalent to the unfiltered state.

---

## S7-T09 — Export Excel from Quality page downloads a file

**Steps:**
1. Navigate to `/quality`.
2. In the TopBar, click **"IMPRIMER RAPPORT"**.
3. A dropdown appears. Click **"📊 Exporter Excel"**.

**Expected result:**
- A file download begins automatically.
- The file is named in the format: **`BACOVET_Qualité_2026-06-11.xlsx`** (today's date in YYYY-MM-DD format).
- The download appears in the browser's download bar or Downloads folder.

---

## S7-T10 — Exported Excel file has 2 sheets

**Steps:**
1. Complete S7-T09 (download the file).
2. Open the downloaded `.xlsx` file in Excel or LibreOffice Calc.

**Expected result:**
- The workbook has **2 sheets**.
- **Sheet 1** is named "Résumé KPI" or similar — contains the BigNumber card values in a clean table (KPI name, value, target, status).
- **Sheet 2** is named "Données brutes" or similar — contains raw tabular data (vwDefect + checkpassqte rows).

---

## S7-T11 — Export filename contains today's date

**Steps:**
1. Download the Quality export (S7-T09).
2. Check the filename.

**Expected result:**
- Filename matches: `BACOVET_Qualité_2026-06-11.xlsx`.
- The date portion is today's date in `YYYY-MM-DD` format (not US format, not French format with slashes).

---

## S7-T12 — Export works on Méthodes page

**Steps:**
1. Navigate to `/methods`.
2. Click **"IMPRIMER RAPPORT"** → **"📊 Exporter Excel"**.

**Expected result:**
- File downloads: `BACOVET_Methodes_2026-06-11.xlsx`.
- Sheet 1: KPI Summary with F-REQ-216 to 219 values.
- Sheet 2: Raw `taging_reel` data.

---

## S7-T13 — Alert badge appears on sidebar when RFT is critical

**Steps:**
1. Mock RFT < 95% (as in S3-T06 / S3-T10).
2. Navigate to `/quality`.

**Expected result:**
- In the sidebar, the **"QUALITÉ (100)"** nav item shows a small red badge with the number of active alerts (e.g., a red dot with **"1"** or **"2"**).

---

## S7-T14 — Toast appears for a new critical alert

**Steps:**
1. Mock RFT at 97% (within range, no alert).
2. Load `/quality`.
3. After the first data load, change the mock to RFT = 92% (critical).
4. Wait for the 60-second auto-refresh to fire.

**Expected result:**
- A **toast notification** appears in the bottom-right corner of the screen.
- Toast is red or orange.
- Text: **"🔴 RFT CRITIQUE — En dessous de 95%"** (or similar).
- Toast auto-dismisses after a few seconds.

---

## S7-T15 — useAutoRefresh hook does not leak memory

**Steps:**
1. Open DevTools → **Performance** tab. Click **Record**.
2. Navigate to `/quality`.
3. Wait 2 minutes (2 refresh cycles).
4. Navigate away to `/logistics`.
5. Wait another 60 seconds.
6. Stop recording.

**Expected result:**
- In the Performance recording, no new network requests to Quality endpoints fire after navigating to `/logistics`.
- This confirms the interval was cleaned up on unmount.
- Memory heap snapshot does not show steadily growing "detached" nodes.

---

---

# SPRINT 8 — QA, Performance & UAT

## Before you start Sprint 8 tests

1. The app must be built for production: `npm run build` then `npm run preview`.
2. Use the production preview URL (typically `http://localhost:4173`) for performance tests.
3. For visual consistency tests, use a 1920×1080 monitor or browser window.

---

## Performance Tests

### S8-P01 — Quality page TTI on Fast 3G

**Steps:**
1. Open DevTools → **Network** tab. Set throttle to **"Fast 3G"**.
2. Navigate to `/quality` (hard refresh: Ctrl+Shift+R).
3. In the Network tab, note the **"Load"** time in the status bar at the bottom.
4. Alternatively, open DevTools → **Lighthouse** tab. Set category to "Performance" and device to "Desktop". Click **Analyze page load**.

**Expected result:**
- Time to Interactive (TTI) ≤ 5 seconds on Fast 3G.
- First Contentful Paint (FCP) ≤ 2 seconds.

---

### S8-P02 — Memory does not grow over 30 minutes

**Steps:**
1. Open DevTools → **Memory** tab.
2. Take a heap snapshot: click **"Take snapshot"**. Note the total size.
3. Navigate to `/quality` and leave it open for 30 minutes.
4. Take another heap snapshot.
5. Compare the two snapshots.

**Expected result:**
- The heap size does not grow by more than 20% between the two snapshots.
- There are no large collections of "detached DOM nodes" in the snapshot comparison.

---

### S8-P03 — Concurrent API calls capped at reasonable level

**Steps:**
1. Navigate to `/production`.
2. Open DevTools → **Network** tab. Clear entries.
3. Hard refresh the page.
4. During the initial load, count the number of simultaneous pending XHR/Fetch requests at any one moment.

**Expected result:**
- Maximum concurrent requests does not exceed 10–12.
- Requests are not all fired simultaneously but staggered or batched.

---

## Security Tests

### S8-S01 — API key is never stored in browser storage

**Steps:**
1. Open DevTools → **Application** tab.
2. Expand **Local Storage** → click `http://localhost:5173`.
3. Expand **Session Storage** → same.
4. Expand **Cookies** → same.
5. Search for any value that looks like an API key.

**Expected result:**
- No entry in LocalStorage, SessionStorage, or Cookies contains the `VITE_API_KEY` value.
- The JWT token is also **not** in browser storage (it is in memory only).

---

### S8-S02 — JWT is only in the Authorization header

**Steps:**
1. Log in as IT Admin.
2. Open DevTools → **Network** tab.
3. Trigger a request to `/api/admin/jobs`.
4. Inspect the request.

**Expected result:**
- The JWT appears only in the **Authorization** header as `Bearer <token>`.
- The JWT is **not** in the URL query string.
- The JWT is **not** in the request body.

---

### S8-S03 — /admin URL without login redirects to /login

**Steps:**
1. Open an incognito window.
2. Navigate directly to `http://localhost:5173/admin`.

**Expected result:**
- URL changes to `/login`.
- No admin content is shown.

---

### S8-S06 — /methods URL as Chef d'Atelier redirects to /unauthorized

**Steps:**
1. Log in as Chef d'Atelier (CA001).
2. Navigate directly to `http://localhost:5173/methods`.

**Expected result:**
- URL changes to `/unauthorized`.
- "Accès refusé" is displayed.

---

## Visual Consistency Tests

### S8-V01 — French number formatting

**What to check:** Any large number displayed in the app uses French locale (space as thousands separator, comma as decimal).

**Steps:**
1. Navigate to `/logistics`.
2. Find the **"Stock total"** header above the search table.
3. Find any stock quantity value in the pie charts.

**Expected result:**
- Large numbers formatted as **"162 067 420,25"** (space thousands, comma decimal).
- NOT **"162,067,420.25"** (US format).
- NOT **"162067420.25"** (no separator).

---

### S8-V02 — French date formatting

**Steps:**
1. Look for any date displayed in the UI (e.g., OF start date in the OF table, audit log timestamps).

**Expected result:**
- Dates appear as **"11/06/2026"** or **"11 juin 2026"**.
- NOT **"06/11/2026"** (US format).
- NOT **"2026-06-11"** (ISO format — acceptable in exports but not in UI).

---

### S8-V03 — French percentage formatting

**Steps:**
1. Navigate to `/quality`.
2. Look at the RFT card value.

**Expected result:**
- Value shown as **"96,8 %"** (comma decimal, space before %).
- NOT **"96.8%"** (US format).

---

### S8-V04 — All error messages are in French

**Steps:**
1. Disconnect network (DevTools → Network → Offline).
2. Wait for the next auto-refresh on `/quality`.
3. Look at the ErrorBanner that appears.

**Expected result:**
- Error message is in French: e.g., **"Erreur de connexion au serveur"** or **"Impossible de charger les données"**.
- NOT **"Server connection error"** or any English text.

---

### S8-V05 — KPI values are at least 48px at 1920×1080

**Steps:**
1. Set browser window to 1920×1080 (full-screen on a 1920×1080 monitor, or use DevTools device emulation).
2. Navigate to `/quality`.
3. Right-click the main RFT value number → **Inspect**.
4. In DevTools Styles panel, look for the font-size.

**Expected result:**
- `font-size` computed value ≥ **48px** (= 3rem with 16px base, or `text-5xl` in Tailwind = 3rem).

---

### S8-V06 — Status colors are consistent across all pages

**What to check:** The "green" status color is the same hex value on all pages.

**Steps:**
1. On `/quality`, right-click a green KPI card border → Inspect.
2. Note the computed `border-left-color` hex value.
3. Repeat on `/production` (Efficience card in green state).
4. Repeat on `/logistics` (DOT card in green state).
5. Repeat on `/methods` (F-REQ-217 gauge in green state).

**Expected result:**
- All green borders use the same color: **`#16a34a`** (or `rgb(22, 163, 74)`).
- All orange uses `#ea580c`.
- All red uses `#dc2626`.

---

### S8-V07 — Placeholder state is visually consistent (not ErrorBanner)

**Steps:**
1. Navigate to `/quality` (with B-01/B-02 unresolved → some cards should be grey placeholders).
2. Navigate to `/methods` (with B-05 unresolved → Taux d'Archivage should be grey placeholder).
3. Compare the appearance of grey placeholder cards on both pages.

**Expected result:**
- Grey placeholder cards look the same on both pages (same grey border, same font, same placeholder text style).
- They do **not** look like ErrorBanners (no red tint, no warning icon).
- They are visually distinct from fully loaded cards.

---

## TV / Industrial Screen Tests

### S8-TV01 — All 8 Quality KPI cards visible at 1920×1080

**Steps:**
1. Set resolution to 1920×1080 (DevTools device emulation or physical screen).
2. Navigate to `/quality`.
3. Check whether the two rows of 4 cards are visible **without scrolling**.

**Expected result:**
- 8 cards visible without any scroll.
- Cards are evenly spaced and do not overflow their containers.

---

### S8-TV02 — Production gauge charts readable at 1920×1080

**Steps:**
1. At 1920×1080, navigate to `/production`.
2. Check the gauge charts row.

**Expected result:**
- Each gauge chart is large enough to read the percentage value from a simulated 5-metre distance.
- Numbers inside gauges are at least 24px (readable as large format).
- No text overflow or truncation in chain labels.

---

### S8-TV03 — Sidebar text is not truncated at 1366×768

**Steps:**
1. Set DevTools device emulation to 1366×768.
2. Log in as Direction (has all sidebar items visible).
3. Look at the sidebar.

**Expected result:**
- All sidebar labels are fully visible:
  - "LOGISTIQUE & PLANNING (300)" — check this is not truncated.
  - "DÉVELOPPEMENT & AMÉLIORATION (350)" — check no overflow.
- Sidebar is 240px wide and text fits within it.

---

### S8-TV04 — No horizontal scrollbar at 1366×768

**Steps:**
1. Set DevTools to 1366×768.
2. Navigate to each page: /quality, /production, /logistics, /methods, /development.

**Expected result:**
- No horizontal scrollbar appears on any page.
- All content is within the viewport width.

---

## Full UAT Sign-Off Checklist

Complete this table with a real BACOVET user for each role. Write ✅ PASS or ❌ FAIL in each cell.

| Test | IT | Direction | Resp. Production | Chef Atelier | Resp. Qualité | Méthodes | Coupe |
|---|---|---|---|---|---|---|---|
| Login successfully | | | | | | | |
| Redirected to correct default page | | | | | | | |
| Correct sidebar items visible | | | | | | | |
| Cannot access unauthorized routes | | | | | | | |
| KPI values match source systems | | | | | | | |
| Traffic light colors match factory reality | | | | | | | |
| Auto-refresh updates values over time | | | | | | | |
| Export produces usable Excel | | | | | | | |
| Logout works | | | | | | | |
| Blocker status documented | | | | | | | |

---

## Blocker Resolution Checklist (complete before final UAT)

| Blocker | Resolved? | Evidence | Sprint affected |
|---|---|---|---|
| B-01: BR Bundling endpoints active | ☐ Yes ☐ No | Postman test S0-API-06 result | Sprint 3 |
| B-02: DIVA BR GTD endpoints configured | ☐ Yes ☐ No | API call to new DIVA endpoint succeeds | Sprint 3 |
| B-03: Auth endpoint confirmed | ☐ Yes ☐ No | Login flow works (S1-T01) | Sprint 1 |
| B-04: GPRO Consulting connectivity | ☐ Yes ☐ No | SAM/SOT/Effectifs show real values | Sprint 4 |
| B-05: Base suivi production access | ☐ Yes ☐ No | Taux d'archivage shows real value | Sprint 7 |

---

## Definition of Done — Full Project Pass Criteria

The project is complete when ALL of the following are checked:

- [ ] S0-T01 through S0-T10: All Sprint 0 tests PASS
- [ ] S1-T01 through S1-T17: All Sprint 1 tests PASS
- [ ] S2-T01 through S2-T13: All Sprint 2 tests PASS
- [ ] S3-T01 through S3-T16: All Sprint 3 tests PASS
- [ ] S4-T01 through S4-T15: All Sprint 4 tests PASS
- [ ] S5-T01 through S5-T10: All Sprint 5 tests PASS
- [ ] S6-T01 through S6-T12: All Sprint 6 tests PASS
- [ ] S7-T01 through S7-T15: All Sprint 7 tests PASS
- [ ] S8-P01 through S8-P03: Performance tests PASS
- [ ] S8-S01 through S8-S06: Security tests PASS
- [ ] S8-V01 through S8-V07: Visual consistency tests PASS
- [ ] S8-TV01 through S8-TV04: TV screen tests PASS
- [ ] UAT sign-off table: All cells PASS for all roles
- [ ] Blocker resolution checklist: B-01 and B-03 resolved (minimum); B-02/B-04/B-05 documented if still pending
- [ ] Zero console errors in production build
- [ ] Zero uncaught exceptions in production build