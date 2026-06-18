# Development Page — Complete Reference (Server → View)

## API Endpoints

| Endpoint | Backend Method | Returns |
|---|---|---|
| `GET /development/kpis` | `kpis()` | 4 KPI values (RFT, Livraison, Nomenclature, Réclamations) |
| `GET /development/trend` | `trend()` | Nomenclature monthly trend |
| `GET /development/lead-time` | `leadTimeDev()` | Lead Time Dev value |
| `GET /development/trend-rft` | `trendRft()` | RFT monthly trend |
| `GET /development/trend-livraison` | `trendLivraison()` | Livraison monthly trend |

**Auto-refresh:** All endpoints fetched every 60 seconds.

**Filters (F-REQ-407):** All endpoints accept optional `marque`, `atelier`, `ligne`, `of` query params via `GlobalFilterBar`. Backend filters by `modele` LIKE match on `marque`. Other filter params are accepted but not yet applied (pending schema columns in `sync_drive_development`).

**Excel Export (F-REQ-409):** "IMPRIMER RAPPORT" button in header exports KPI summary table + Lead Time to `.xlsx` via `ExportButton` component (xlsx library). Also offers Print option.

**Data source:** Google Drive → `sync_drive_development` table (synced via SyncService). Fallback: `manual_kpi_values` / `manual_kpi_history` tables.

---

## Files

| File | Purpose |
|---|---|
| `app/Http/Controllers/Api/DevelopmentController.php` | Backend — all endpoints (accepts `Request $request` for filters) |
| `resources/js/services/developmentApi.ts` | Frontend API + types (all functions accept `filters` param) |
| `resources/js/pages/development.tsx` | Main page — 4 rows + filters + export |
| `resources/js/components/development/devKpiDetailConfig.ts` | 5 KPI configs (350–354) |
| `resources/js/components/development/DevKpiDetailModal.tsx` | Detail modal |
| `resources/js/components/GlobalFilterBar.tsx` | Shared filter bar (Marque, Atelier, Ligne, OF) |
| `resources/js/components/ExportButton.tsx` | Excel export + Print dropdown |
| `resources/js/components/TopBar.tsx` | Header — exports filter bar visibility per page |

---

# KPI Definitions

| Key | F-REQ | Label | Formula | Target | Status Logic |
|---|---|---|---|---|---|
| `dev_rft` | 350 | RFT Développement | statut_validation='OK' / total × 100 | ≥ 95% | green≥95, orange≥92, red<92 |
| `dev_livraison` | 351 | Respect Livraison | date_reelle ≤ date_prevue / total × 100 | ≥ 95% | green≥95, orange≥92, red<92 |
| `dev_nomenclature` | 352 | Fiabilité Nomenclature | nomenclature_valide=1 / total × 100 | ≥ 98% | green≥98, orange≥95, red<95 |
| `dev_reclamations` | 353 | Réclamations Prod | est_reclamation=1 / total × 100 | ≤ 2% | green<2, orange≤3, red>3 |
| *(Lead Time)* | 354 | Lead Time Dev | AVG(date_reelle - date_prevue) | ≤ 0j | green≤0, orange≤7, red>7 |

---

# Row 1: RFT + Respect Livraison + Nomenclature

**Backend:** `DevelopmentController::kpis()` + `trend()`

## 1. RFT Développement (F-REQ-350) — KpiCard

### Server

```
kpis() → computeDevKpis()
  └─ sync_drive_development → COUNT(statut_validation='OK') / COUNT(*) × 100
```

### API Response

```json
GET /development/kpis →
{
  "kpis": {
    "dev_rft": {
      "value": 96.5,
      "numerator": 193,
      "denominator": 200,
      "target": 95,
      "target_kind": "min",
      "frequency": "Mensuel",
      "status": "green",
      "source": "sync_drive_development"
    }
  }
}
```

### View

```
┌──────────────────────────────────┐
│ RFT Développement ·350    🟢    │
│ 96.5%                            │
│ Cible: ≥95%         Freq: Mensuel│
│ src: Google Drive                │
└──────────────────────────────────┘
```

**Styling:** Custom `KpiCard` component with left border color (green/orange/red/grey), flash animation for red/orange, clickable → opens modal.

---

## 2. Respect Livraison (F-REQ-351) — GaugeChart

### Server

```
kpis() → computeDevKpis()
  └─ sync_drive_development
     → COUNT(date_livraison_reelle ≤ date_livraison_prevue) / COUNT(both not null) × 100
```

### View

```
Panel "Respect Livraison à Date (F-REQ-351)"
└─ GaugeChart (SVG semicircle)
   ├─ Background arc: var(--muted)
   ├─ Value arc: green(≥95) / orange(≥92) / red(<92)
   ├─ Center text: "92.5%"
   └─ Below: "Cible: ≥95%"
```

**Gauge SVG:** `viewBox="0 0 200 110"`, arc from (10,100) to (190,100), radius 90, stroke-width 14. Arc length = `(angle/180) × 283`.

---

## 3. Fiabilité Nomenclature (F-REQ-352) — Panel + LineChart

### Server

```
kpis() → computeDevKpis()
  └─ sync_drive_development → COUNT(nomenclature_valide=1) / COUNT(*) × 100

trend()
  └─ sync_drive_development (group by month)
     → COUNT(nomenclature_valide=1) / COUNT(*) × 100 per month
     → fallback: manual_kpi_history WHERE kpi_key='dev_nomenclature'
```

### API Response

```json
GET /development/kpis →
{
  "kpis": {
    "dev_nomenclature": {
      "value": 97.8,
      "numerator": 195,
      "denominator": 200,
      "target": 98,
      "target_kind": "min",
      "frequency": "Mensuel",
      "status": "orange",
      "source": "sync_drive_development"
    }
  }
}

GET /development/trend →
{
  "data": [
    { "mois": "Jan", "valeur": 96.2 },
    { "mois": "Fév", "valeur": 97.1 },
    { "mois": "Mar", "valeur": 97.8 }
  ]
}
```

### View

```
Panel "Fiabilité Nomenclature (F-REQ-352)"  [97.8% 🟠]
└─ LineChart (160px height)
   ├─ XAxis: mois (Jan, Fév, Mar...)
   ├─ YAxis: domain [92, 100]
   ├─ ReferenceLine y=98 (green dashed)
   └─ Line: valeur (var(--primary), strokeWidth 2, dot r=2)
```

---

# Row 2: Réclamations (F-REQ-353)

### Server

```
kpis() → computeDevKpis()
  └─ sync_drive_development → COUNT(est_reclamation=1) / COUNT(*) × 100
```

### API Response

```json
GET /development/kpis →
{
  "kpis": {
    "dev_reclamations": {
      "value": 1.5,
      "numerator": 3,
      "denominator": 200,
      "target": 2,
      "target_kind": "max",
      "frequency": "Mensuel",
      "status": "green",
      "source": "sync_drive_development"
    }
  }
}
```

### View

```
┌──────────────────────────────────┐
│ Réclamations Prod ·353    🟢    │
│ 1.5%                             │
│ Cible: <2%          Freq: Mensuel│
│ src: Google Drive                │
└──────────────────────────────────┘

⚠ Dérogation B-05 : Scatter Plot (Nuage) requis —
  données par modèle non disponibles.
  Affichage agrégé validé par Direction/Méthodes.
```

**Note:** CDC F-REQ-353 requires Scatter Plot per model. Data not available — aggregated display approved as derogation B-05.

---

# Row 3: Lead Time Dev (F-REQ-354) + RFT Trend + Livraison Trend

## Lead Time Dev (F-REQ-354)

> **ID note:** CDC §3.4 assigns F-REQ-334 to DOT (Logistics). Lead Time Dev uses F-REQ-354 to avoid ID conflict. Confirm with CDC owner.

### Server

```
leadTimeDev(Request $request)
  └─ sync_drive_development (where both dates not null)
     → optional: WHERE modele LIKE '%marque%'
     → AVG(date_livraison_reelle - date_livraison_prevue)
     Status: green(≤0j), orange(≤7j), red(>7j)
```

### API Response

```json
GET /development/lead-time?marque=BACOVET →
{
  "value": 3.2,
  "target": 0,
  "status": "orange",
  "unit": "jours",
  "target_kind": "max",
  "frequency": "Mensuel",
  "source": "sync_drive_development"
}
```

### View

```
┌──────────────────────────────────┐
│ Lead Time Dev ·354        🟠    │
│ 3.2                              │
│ Cible: ≤0j           Freq: Mensuel│
│ src: sync_drive_development      │
└──────────────────────────────────┘
Délai moyen livraison (jours) — source: sync_drive_development
```

---

## RFT Trend

### Server

```
trendRft()
  └─ sync_drive_development (group by month)
     → COUNT(statut_validation='OK') / COUNT(*) × 100 per month
```

### API Response

```json
GET /development/trend-rft →
{
  "data": [
    { "mois": "Jan", "valeur": 94.5 },
    { "mois": "Fév", "valeur": 95.2 },
    { "mois": "Mar", "valeur": 96.5 }
  ]
}
```

### View

```
Panel "Tendance RFT Développement"
└─ LineChart (160px height)
   ├─ XAxis: mois
   ├─ YAxis: domain [80, 100]
   ├─ ReferenceLine y=95 (green dashed, label "Cible 95%")
   └─ Line: valeur (var(--primary), strokeWidth 2, dot r=3, name "RFT %")
```

---

## Livraison Trend

### Server

```
trendLivraison()
  └─ sync_drive_development (group by month, both dates not null)
     → COUNT(date_reelle ≤ date_prevue) / COUNT(*) × 100 per month
```

### API Response

```json
GET /development/trend-livraison →
{
  "data": [
    { "mois": "Jan", "valeur": 91.0 },
    { "mois": "Fév", "valeur": 93.5 },
    { "mois": "Mar", "valeur": 92.5 }
  ]
}
```

### View

```
Panel "Tendance Respect Livraison"
└─ LineChart (160px height)
   ├─ XAxis: mois
   ├─ YAxis: domain [80, 100]
   ├─ ReferenceLine y=95 (green dashed, label "Cible 95%")
   └─ Line: valeur (var(--chart-2), strokeWidth 2, dot r=3, name "Livraison %")
```

---

# Detail Table

**Data source:** `kpis` state (same API call as Row 1)

### View

```
Panel "Détails des Indicateurs Mensuels (Série 350)"
table:
┌──────┬──────────────────────┬──────────┬──────────┬──────────┬──────────┐
│ ID   │ Indicateur           │ Valeur   │ Cible    │ Fréq.    │ Statut   │
├──────┼──────────────────────┼──────────┼──────────┼──────────┼──────────┤
│ 350  │ RFT Développement    │ 96.5%    │ ≥95%     │ Mensuel  │ 🟢       │
│ 351  │ Respect Livraison    │ 92.5%    │ ≥95%     │ Mensuel  │ 🟠       │
│ 352  │ Fiabilité Nomenclat. │ 97.8%    │ ≥98%     │ Mensuel  │ 🟠       │
│ 353  │ Réclamations Prod    │ 1.5%     │ <2%      │ Mensuel  │ 🟢       │
│ 354  │ Lead Time Dev        │ 3.2j     │ ≤0j      │ Mensuel  │ 🟠       │
└──────┴──────────────────────┴──────────┴──────────┴──────────┴──────────┘
```

---

# KPI Detail Modal

**Component:** `DevKpiDetailModal.tsx`
**Config:** `devKpiDetailConfig.ts` — 5 KPI definitions (350–354)
**Props:** `kpiKey`, `kpiData` (from /kpis), `leadTimeData` (from /lead-time, for dev_leadtime only)

All 5 KPI cards are clickable — opens the detail modal with formula, source, alert rules, and status.

## Modal Structure

```
┌─────────────────────────────────────────────────────────┐
│ F-REQ-350  Série 350 — Développement           [X]     │
│ RFT Développement (Right First Time)                    │
├─────────────────────────────────────────────────────────┤
│ Pourcentage de modèles validés dès le premier...        │
├─────────────┬─────────────┬─────────────────────────────┤
│ Valeur      │ Cible       │ Statut                      │
│  96.5%      │ >= 95%      │ 🟢 Conforme                 │
├─────────────┴─────────────┴─────────────────────────────┤
│ Formule de calcul          │ Source de données           │
│ [Validés 1er coup] ÷       │ Système: Google Drive       │
│ [Total modèles] × 100      │ Source: manual_kpi_values   │
│                             │ Fréquence: Mensuelle        │
├─────────────────────────────┴───────────────────────────┤
│ Règles d'alerte                                         │
│ 🟢 >= 95%  🟠 90% – 95%  🔴 < 90%                     │
├─────────────────────────────────────────────────────────┤
│                                  [Fermer]               │
└─────────────────────────────────────────────────────────┘
```

---

# Color Thresholds

| Status | RFT (≥95) / Livraison (≥95) | Nomenclature (≥98) | Réclamations (≤2) | Lead Time (≤0) | Visual |
|---|---|---|---|---|---|
| `green` | ≥ 95% | ≥ 98% | < 2% | ≤ 0j | Green left border |
| `orange` | 92% – 95% (target−3) | 95% – 98% (target−3) | 2% – 3% | 1–7j | Orange left border + flash |
| `red` | < 92% | < 95% | > 3% | > 7j | Red left border + flash |
| `grey` | null | null | null | null | Grey left border |

---

# Data Fetch Summary

| API Call | State Variable | Used By Rows | Filter Params |
|---|---|---|---|
| `fetchDevelopmentKpis(filters)` | `kpis` | Row 1 (cards), Row 2, Row 3 (lead time card), Table | `marque` |
| `fetchDevelopmentTrend(filters)` | `trend` | Row 1 (nomenclature LineChart) | `marque` |
| `fetchLeadTimeDev(filters)` | `leadTime` | Row 3 (lead time card) | `marque` |
| `fetchDevelopmentTrendRft(filters)` | `trendRft` | Row 3 (RFT trend chart) | `marque` |
| `fetchDevelopmentTrendLivraison(filters)` | `trendLivraison` | Row 3 (Livraison trend chart) | `marque` |

All filters sourced from `useFilters()` → `getFilterParams()` → passed as query params.

---

# Source Google Drive Banner

Shown in KPI detail modal when `config.source.status === 'google_drive'`: "Source Google Drive — Ces KPIs sont alimentés via Google Sheets. La synchronisation est effectuée 4 fois par jour."

Data flows: Google Sheets → SyncService → `sync_drive_development` table → `computeDevKpis()` → API → Frontend. Fallback: `manual_kpi_values` table.
