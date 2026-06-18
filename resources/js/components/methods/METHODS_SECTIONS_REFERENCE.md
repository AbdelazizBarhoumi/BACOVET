# Methods Page — Complete Reference (Server → View)

## API Endpoints

| Endpoint | Backend Method | Returns |
|---|---|---|
| `GET /methods/kpis` | `kpis()` | 4 KPI values (216, 217, 218, 219) |
| `GET /methods/tagging-chart` | `taggingChart()` | Tagging per chain/shift |
| `GET /methods/detail-table` | `detailTable()` | Summary table rows |
| `GET /methods/archivage-detail` | `archivageDetail()` | OF-level archivage detail (F-REQ-216) |
| `GET /methods/respect-temps-detail` | `respectTempsDetail()` | Article-level cotation detail (F-REQ-218) |
| `GET /methods/temps-acceptes-detail` | `tempsAcceptesDetail()` | Article-level gammes detail (F-REQ-219) |
| `GET /methods/fiabilite-detail` | `fiabiliteDetail()` | Tagging detail per chaine/shift (F-REQ-217) |

**Auto-refresh:** All endpoints fetched every 60 seconds.
**Filters:** `chaine` (Ligne), `of`, `marque` — passed from GlobalFilterBar. `chaine` filters tagging/F-REQ-217 (tagging-chart + fiabilite-detail); `of` filters archivage/F-REQ-216. `marque` is accepted but not applicable to current data sources (no marque column in any Methods table).

---

## Files

| File | Purpose |
|---|---|
| `app/Http/Controllers/Api/MethodesController.php` | Backend — all endpoints |
| `resources/js/services/methodsApi.ts` | Frontend API + types |
| `resources/js/pages/methods.tsx` | Main page — 4 rows |
| `resources/js/components/methods/methodsKpiDetailConfig.ts` | 4 KPI configs |
| `resources/js/components/methods/MethodsKpiDetailModal.tsx` | Detail modal with drill-down tables |
| `routes/web.php` | Route registration (7 endpoints) |

---

# KPI Definitions

| Key | F-REQ | Label | Formula | Target | Status Logic |
|---|---|---|---|---|---|
| `f_req_216` | 216 | Taux d'Archivage Suivi Paquets | archived / sold_total × 100 | ≥ 85% | green≥85, orange≥70, red<70 |
| `f_req_217` | 217 | Fiabilité Données Système | 100 - AVG(ABS(ecart_pct)) | ≥ 95% | green≥95, orange≥90, red<90 |
| `f_req_218` | 218 | Respect Temps Estimé | production ≤ cotation articles / total × 100 | ≥ 90% | green≥90, orange≥80, red<80 |
| `f_req_219` | 219 | Temps Acceptés 1ère Version | gammes_ok / gammes_total × 100 | ≥ 80% | green≥80, orange≥70, red<70 |

---

# Row 1: Archivage + Fiabilité Données (GaugeCharts)

## F-REQ-216: Taux d'Archivage Suivi Paquets

### Data Source Status: LIVE

Table `sync_gpro_suivi_paquets` exists in migration `2026_06_15_000002_create_gpro_consulting_tables.php` with columns: `of_numero`, `est_solde`, `est_archive`, `synced_at`. Synced by `SyncService::syncMethods()` via GPRO Consulting API (`$this->gpro->fetchData('suivi_paquets')`). Also used by `ProductionController`.

**CDC vs Implementation note:** The CDC names "Base suivi production" as the source. The actual data comes from GPRO suivi_paquets synced to `sync_gpro_suivi_paquets`. The naming discrepancy is a CDC documentation issue, not an implementation gap.

### Server

```
kpis()
  └─ sync_gpro_suivi_paquets (optional of filter)
     → COUNT(est_solde=true AND est_archive=true) / COUNT(est_solde=true) × 100
     Status: green(≥85%), orange(≥70%), red(<70%)
```

### API Response

```json
GET /methods/kpis?of=OF-001 →
{
  "f_req_216": {
    "value": 82.5,
    "status": "orange",
    "target": 85,
    "frequency": "Journalier",
    "source": "sync_gpro_suivi_paquets",
    "numerator": 165,
    "denominator": 200
  }
}
```

### View

```
Panel "Taux d'Archivage Suivi Paquets (F-REQ-216)"
└─ GaugeChart (SVG semicircle, 85% target)
   ├─ Arc: green(≥85) / orange(≥70) / red(<70)
   ├─ Center: "82.5%"
   └─ Below: "Cible: 85%"
```

---

## F-REQ-217: Fiabilité Données Système

### Data Source Status: LIVE (proxy)

**Proxy status:** This KPI is self-flagged as a proxy. The CDC defines it as a cross-system comparison between "tagging réel" (GPRO) and "sortie fin chaîne" (Base suivi production). The current implementation compares `tag_theorique` vs `tag_reel` within a single `taging_reel` query — this is theoretical-vs-actual tagging in one system, not the two-system reliability check the CDC asks for. The proxy is honest and documented, pending blocker B-05.

**OF-level granularity note:** The CDC titles this KPI "par OF," but `taging_reel` only carries `chaine`/`shift` columns, no `of` field. OF-level granularity isn't available yet.

### Server

```
kpis()
  └─ taging_reel (today, optional chaine filter)
     → AVG(ABS(ecart_pct))
     → fiabilite = 100 - avgAbsEcart
     Status: green(≥95%), orange(≥90%), red(<90%)
     is_proxy: true (proxy until GPRO ↔ Base suivi production comparison available)
```

### API Response

```json
GET /methods/kpis?chaine=CH1 →
{
  "f_req_217": {
    "value": 96.8,
    "status": "green",
    "target": 95,
    "frequency": "Journalier",
    "is_proxy": true,
    "proxy_note": "Proxy intérimaire : écart tagging théorique vs réel (taging_reel). Comparaison GPRO ↔ Base suivi production en attente (B-05).",
    "raw": { "avg_abs_ecart": 3.2, "rows_count": 12 }
  }
}
```

### View

```
Panel "Fiabilité Données Système (F-REQ-217)"
└─ GaugeChart (95% target)
   ├─ Arc: green(≥95) / orange(≥90) / red(<90)
   ├─ Center: "96.8%"
   ├─ Below: "Cible: 95%"
   └─ <TrafficBadge> green
```

**Proxy Banner:** When `is_proxy=true` and not loading:
```
⚠ Proxy F-REQ-217 : Proxy intérimaire : écart tagging théorique vs réel...
```

---

# Row 2: Respect Temps + Temps Acceptés (KpiCards)

## F-REQ-218: Respect Temps Estimé

### Data Source Status: LIVE

Table `sync_drive_cotation` (migration `2026_06_15_000001_create_google_drive_tables.php`) with columns: `article`, `temps_cotation_min`, `temps_production_min`, `date`, `synced_at`. Synced from Google Drive "cotation" sheet.

### BUG FIX Applied

The CDC formula is: **"Temps cotation − Temps prod ≥ 0"** → meaning `cotation >= production` → production time must be ≤ cotation time for the article to "respect" the estimate.

**Previous code (WRONG):** `$r->temps_cotation_min <= $r->temps_production_min`
This counted articles where cotation ≤ production (i.e., articles that EXCEEDED the estimate) as "respected" — inverted logic.

**Fixed code (CORRECT):** `$r->temps_production_min <= $r->temps_cotation_min`
This correctly counts articles where production ≤ cotation (i.e., articles that stayed within the estimate).

**Verification:** ART-001: cotation=12.5, production=11.8 → 11.8 ≤ 12.5 → est_respecte=true ✓

### Server

```
kpis()
  └─ sync_drive_cotation
     → COUNT(temps_production_min <= temps_cotation_min) / COUNT(*) × 100
     Status: green(≥90%), orange(≥80%), red(<80%)
```

### API Response

```json
GET /methods/kpis →
{
  "f_req_218": {
    "value": 88.5,
    "status": "orange",
    "target": 90,
    "frequency": "Au démarrage",
    "source": "sync_drive_cotation",
    "numerator": 177,
    "denominator": 200
  }
}
```

### View

```
┌──────────────────────────────────────┐
│ Respect Temps Estimé (F-REQ-218) 🟠 │
│ 88.5%                                │
│ Cible: 90%  Freq: Au démarrage      │
│ src: Base rendement + Logiciel Cotation│
└──────────────────────────────────────┘
```

---

## F-REQ-219: Temps Acceptés 1ère Version

### Data Source Status: LIVE

Table `sync_drive_gammes` (migration `2026_06_15_000001_create_google_drive_tables.php`) with columns: `article`, `nb_gammes_total`, `nb_gammes_acceptees_v1`, `synced_at`. Synced from Google Drive "gammes" sheet.

### CDC Formula Note

The CDC's formula text for this row literally reads "(Nbr des demandes de négociation − Nbr des gammes déchiffrage) × 100," which is a subtraction, not a ratio. This doesn't correspond to any variable in the CDC's data dictionary. The implementation uses the standard ratio `nb_gammes_acceptees_v1 / nb_gammes_total × 100`, which matches the variable mapping table (items 82-83) and the detail table example. The CDC formula text appears to be a drafting error. Flag to CDC owners (Bouhlel Mahmoud / Ben Hadjmbarek Nourhane) for confirmation.

### Server

```
kpis()
  └─ sync_drive_gammes
     → SUM(nb_gammes_acceptees_v1) / SUM(nb_gammes_total) × 100
     Status: green(≥80%), orange(≥70%), red(<70%)
```

### API Response

```json
GET /methods/kpis →
{
  "f_req_219": {
    "value": 85.0,
    "status": "green",
    "target": 80,
    "frequency": "Déchiffrage",
    "source": "sync_drive_gammes",
    "numerator": 170,
    "denominator": 200
  }
}
```

### View

```
┌──────────────────────────────────────────┐
│ Temps Acceptés 1ère Version (F-REQ-219) 🟢│
│ 85.0%                                    │
│ Cible: ≥80%  Freq: Déchiffrage          │
│ src: Fichier déchiffrage + Logiciel Cotation│
└──────────────────────────────────────────┘
```

---

# Row 3: Detail Table

**Backend:** `MethodesController::detailTable()`

### Server

```
detailTable()
  └─ getKpiSummary()
     → Recomputes all 4 KPIs same as kpis() but returns as array of rows
```

### API Response

```json
GET /methods/detail-table →
{
  "data": [
    { "id": "F-REQ-216", "indicateur": "Taux d'archivage suivi paquets", "valeur": "82.5%", "cible": "85%", "frequence": "Journalier", "status": "orange" },
    { "id": "F-REQ-217", "indicateur": "Taux fiabilité données système", "valeur": "96.8%", "cible": "95%", "frequence": "Journalier", "status": "green" },
    { "id": "F-REQ-218", "indicateur": "Respect temps estimé", "valeur": "88.5%", "cible": "90%", "frequence": "Au démarrage", "status": "orange" },
    { "id": "F-REQ-219", "indicateur": "Temps acceptés 1ère version", "valeur": "85.0%", "cible": "≥80%", "frequence": "Déchiffrage", "status": "green" }
  ]
}
```

### View

```
Panel "Tableau Récapitulatif Indicateurs"
table:
┌──────────┬──────────────────────────────────┬──────────┬────────┬────────────┬──────────┐
│ ID       │ Indicateur                       │ Valeur   │ Cible  │ Fréquence  │ Statut   │
├──────────┼──────────────────────────────────┼──────────┼────────┼────────────┼──────────┤
│ F-REQ-216│ Taux d'archivage suivi paquets   │ 82.5%    │ 85%    │ Journalier │ 🟠       │
│ F-REQ-217│ Taux fiabilité données système   │ 96.8%    │ 95%    │ Journalier │ 🟢       │
│ F-REQ-218│ Respect temps estimé             │ 88.5%    │ 90%    │ Démarrage  │ 🟠       │
│ F-REQ-219│ Temps acceptés 1ère version      │ 85.0%    │ ≥80%   │ Déchiffrage│ 🟢       │
└──────────┴──────────────────────────────────┴──────────┴────────┴────────────┴──────────┘
```

---

# Row 4: Tagging Fiabilité Line Chart

**Backend:** `MethodesController::taggingChart()`

## Server

```
taggingChart(chaine)
  └─ taging_reel (today, optional chaine filter)
     → chaine, shift, tag_theorique, tag_reel, ecart_pct
     → status: green(|ecart|≤2%), orange(|ecart|≤5%), red(|ecart|>5%)
```

## API Response

```json
GET /methods/tagging-chart →
{
  "data": [
    { "chaine": "CH1", "shift": "M", "tag_theorique": 500, "tag_reel": 488, "ecart_pct": -2.4, "status": "orange" },
    { "chaine": "CH1", "shift": "A", "tag_theorique": 450, "tag_reel": 445, "ecart_pct": -1.1, "status": "green" },
    { "chaine": "CH2", "shift": "M", "tag_theorique": 520, "tag_reel": 505, "ecart_pct": -2.9, "status": "orange" },
    { "chaine": "CH3", "shift": "M", "tag_theorique": 480, "tag_reel": 460, "ecart_pct": -4.2, "status": "red" }
  ]
}
```

## View

```
Panel "Fiabilité Tagging par Chaîne et Shift"
└─ LineChart (250px height)
   ├─ XAxis: composite key "CH1-M", "CH1-A", "CH2-M"...
   ├─ YAxis: "Écart %" label
   ├─ ReferenceLine y=0 (green dashed) — perfect match
   ├─ ReferenceLine y=5 (red dashed) — upper threshold
   ├─ ReferenceLine y=-5 (red dashed) — lower threshold
   └─ Line: ecart_pct (var(--primary), strokeWidth 2)
      └─ Dot: colored by status (green/orange/red)
```

**Styling:** Custom dot renderer — green dot for |ecart|≤2%, orange for ≤5%, red for >5%.

---

# Detail Endpoints (for modal drill-down)

## Archivage Detail

### Server

```
archivageDetail()
  └─ sync_gpro_suivi_paquets → of_numero, est_solde, est_archive
     (optional of filter)
```

### API Response

```json
GET /methods/archivage-detail →
{
  "data": [
    { "of_numero": "OF-001", "est_solde": true, "est_archive": true },
    { "of_numero": "OF-002", "est_solde": true, "est_archive": false },
    { "of_numero": "OF-003", "est_solde": false, "est_archive": false }
  ]
}
```

---

## Respect Temps Detail

### Server

```
respectTempsDetail()
  └─ sync_drive_cotation
     → article, temps_cotation_min, temps_production_min
     → difference = production - cotation
     → est_respecte = production <= cotation  (FIXED: was inverted)
```

### API Response

```json
GET /methods/respect-temps-detail →
{
  "data": [
    { "article": "ART-001", "temps_cotation": 12.5, "temps_production": 11.8, "difference": -0.7, "est_respecte": true },
    { "article": "ART-002", "temps_cotation": 15.0, "temps_production": 16.2, "difference": 1.2, "est_respecte": false }
  ]
}
```

---

## Temps Acceptés Detail

### Server

```
tempsAcceptesDetail()
  └─ sync_drive_gammes
     → article, nb_gammes_total, nb_gammes_acceptees_v1
     → taux_pct = acceptees / total × 100
```

### API Response

```json
GET /methods/temps-acceptes-detail →
{
  "data": [
    { "article": "ART-001", "nb_gammes_total": 5, "nb_acceptees_v1": 4, "taux_pct": 80.0 },
    { "article": "ART-002", "nb_gammes_total": 3, "nb_acceptees_v1": 3, "taux_pct": 100.0 }
  ]
}
```

---

## Fiabilité Detail (F-REQ-217)

### Server

```
fiabiliteDetail(chaine)
  └─ taging_reel (today, optional chaine filter)
     → chaine, shift, tag_theorique, tag_reel, ecart_pct, ecart_abs
     → status: green(|ecart|≤2%), orange(|ecart|≤5%), red(|ecart|>5%)
```

### API Response

```json
GET /methods/fiabilite-detail?chaine=CH1 →
{
  "data": [
    { "chaine": "CH1", "shift": "M", "tag_theorique": 500, "tag_reel": 488, "ecart_pct": -2.4, "ecart_abs": 2.4, "status": "orange" },
    { "chaine": "CH1", "shift": "A", "tag_theorique": 450, "tag_reel": 445, "ecart_pct": -1.1, "ecart_abs": 1.1, "status": "green" }
  ]
}
```

**Note:** This endpoint reuses the same `taging_reel` data as `taggingChart()` but adds `ecart_abs` for the modal table. The modal renders this as a scrollable detail table showing per-chaine/shift tagging breakdown with color-coded status dots.

---

# KPI Detail Modal

**Component:** `MethodsKpiDetailModal.tsx`
**Config:** `methodsKpiDetailConfig.ts` — 4 KPI definitions

## Modal Structure

For F-REQ-217 (when `is_proxy=true`), an additional proxy disclaimer banner is rendered between the description and the stat boxes:

```
┌─────────────────────────────────────────────────────────┐
│ F-REQ-217  Méthodes & Planning                [X]      │
│ Taux de Fiabilité des Données sur Système               │
├─────────────────────────────────────────────────────────┤
│ Mesure la fiabilité des données en comparant...          │
├─────────────────────────────────────────────────────────┤
│ ⚠ Proxy : Proxy intérimaire : écart tagging théorique   │
│   vs réel (taging_reel). Comparaison GPRO ↔ Base suivi  │
│   production en attente (B-05).                          │
├─────────────┬─────────────┬─────────────────────────────┤
│ Valeur      │ Cible       │ Statut                      │
│  96.8%      │ >= 95%      │ 🟢 Conforme                 │
├─────────────┴─────────────┴─────────────────────────────┤
│ Formule de calcul          │ Source de données           │
│ [100 - AVG(ABS(ecart_pct))]│ Système: GPRO (tagging_reel)│
│ ÷ 100                      │ Table: taging_reel          │
│                             │ Fréquence: Journalière      │
├─────────────────────────────┴───────────────────────────┤
│ Données détaillées (scrollable table)                   │
│ ┌──────┬───────┬─────────┬─────────┬────────┬────────┐  │
│ │Chaîne│Shift  │Tag Théo.│Tag Réel │Écart % │Statut  │  │
│ ├──────┼───────┼─────────┼─────────┼────────┼────────┤  │
│ │CH1   │M      │500      │488      │-2.4%   │🟠      │  │
│ │CH1   │A      │450      │445      │-1.1%   │🟢      │  │
│ └──────┴───────┴─────────┴─────────┴────────┴────────┘  │
├─────────────────────────────────────────────────────────┤
│ Règles d'alerte                                         │
│ 🟢 >= 95%  🟠 90% – 95%  🔴 < 90%                     │
├─────────────────────────────────────────────────────────┤
│                                  [Fermer]               │
└─────────────────────────────────────────────────────────┘
```

All 4 KPIs show a detail drill-down table when data is available: archivage rows (OF/soldé/archivé), tagging rows (chaine/shift/ecart), cotation rows (article/temps/diff), gammes rows (article/total/acceptées/taux).

---

# Color Thresholds

| Status | F-REQ-216 | F-REQ-217 | F-REQ-218 | F-REQ-219 | Tagging | Visual |
|---|---|---|---|---|---|---|
| `green` | ≥ 85% | ≥ 95% | ≥ 90% | ≥ 80% | \|ecart\| ≤ 2% | Green left border |
| `orange` | 70–85% | 90–95% | 80–90% | 70–80% | \|ecart\| ≤ 5% | Orange + flash |
| `red` | < 70% | < 90% | < 80% | < 70% | \|ecart\| > 5% | Red + flash |
| `grey` | null | null | null | null | — | Grey |

**Note on alerting bands (F-REQ-407/408):** The CDC only specifies single target values for each KPI (85%, 95%, 90%, 80%). The orange/red band thresholds (e.g., 70–85% for F-REQ-216, 90–95% for F-REQ-217) are dev-determined defaults. These should get sign-off from the Méthodes team (Bouhlel Mahmoud / Ben Hadjmbarek Nourhane) before go-live.

---

# Data Fetch Summary

| API Call | State Variable | Used By Rows |
|---|---|---|
| `fetchMethodesKpis(filters)` | `kpis` | Row 1 (gauges), Row 2 (cards) |
| `fetchMethodesTaggingChart(filters)` | `tagging` | Row 4 (line chart) |
| `fetchMethodesDetailTable()` | `details` | Row 3 (table) |
| `fetchArchivageDetail(filters)` | `archivageDetail` | Modal drill-down (F-REQ-216) |
| `fetchFiabiliteDetail(filters)` | `fiabiliteDetail` | Modal drill-down (F-REQ-217) |
| `fetchRespectTempsDetail()` | `respectTempsDetail` | Modal drill-down (F-REQ-218) |
| `fetchTempsAcceptesDetail()` | `tempsAcceptesDetail` | Modal drill-down (F-REQ-219) |

**Filters:** `chaine` (Ligne), `of`, `marque` from `useFilters()` are passed to `kpis`, `tagging-chart`, and `fiabilite-detail` endpoints. `of` also passed to `archivage-detail`. Note: `marque` filter is accepted by the API but not applicable to any Methods data source (no `marque` column exists in `sync_gpro_suivi_paquets`, `taging_reel`, `sync_drive_cotation`, or `sync_drive_gammes`).

---

# Export (F-REQ-409)

Export to Excel is handled globally via `AppShell` → `TopBar` → `ExportButton`. The methods page passes `exportRows` (4 KPI summary rows) and `exportFilename="BACOVET_Methodes"` to AppShell. This produces a `.xlsx` file with the KPI summary data. This is consistent with all other pages in the dashboard.

---

# Cross-Cutting Requirements Status

| F-REQ | Requirement | Status | Notes |
|---|---|---|---|
| F-REQ-407 | Filtrage (Marque, Ligne, OF) | Partial | Ligne (chaine) and OF wired. Marque accepted but not applicable — no marque column in Methods data sources. |
| F-REQ-408 | Alerting (3-tier colors) | Done | All 4 KPIs + tagging chart use green/orange/red thresholds. Bands are dev-determined defaults pending Méthodes team sign-off. |
| F-REQ-409 | Export Excel | Done | Handled via AppShell global ExportButton. |

---

# CDC Numbering Note

The CDC numbers these four KPIs as F-REQ-216 to 219 in the main body (section 3.4) but as F-REQ-218 to 221 in Annexe 1's priority table. This is an inconsistency in the CDC itself. This implementation follows the main body's numbering (216–219), which is the more detailed/authoritative section.

---

# CDC Source Naming Clarification

Per F-REQ-DAT-001 (CDC's list of connected systems): ERP DIVA, GPRO-Prod/Planning, Google Drive/Sheets, GPRO Consulting. "Base suivi production" and "Base rendement" do NOT appear as separate systems — they are internal/business nicknames for data living inside GPRO Consulting or GPRO-Prod. This confirms:
- **F-REQ-216**: "Base suivi production" = GPRO suivi_paquets → `sync_gpro_suivi_paquets` ✓
- **F-REQ-218**: "Base rendement + Logiciel Cotation" = Google Drive cotation sheet → `sync_drive_cotation` ✓
- **F-REQ-219**: "Fichier déchiffrage + Logiciel Cotation" = Google Drive gammes sheet → `sync_drive_gammes` ✓

**F-REQ-217 nuance:** The CDC's F-REQ-217 "Source" column lists only "GPRO" — it does NOT mention "Base suivi production," even though the formula needs both tagging réel and sortie fin chaine. Item 79 ("Sortie fin chaine") is the only place that source is named, and the InlineVSEndlineComparison lead (see B-05 section below) lives in QCM — a different technical system than GPRO Consulting. The CDC author may have used "Base suivi production" loosely to mean "wherever end-of-line counts live" rather than one specific system. Keep this distinction in mind rather than treating the naming clarification as a single global mapping.

Should be confirmed in writing from Bouhlel Mahmoud / Ben Hadjmbarek Nourhane for delivery paper trail.

---

# Verification Depth Note

- **taging_reel**: Independently confirmed live — documented in the Novacity API catalog (DIVATEX/SDT/QCM scope).
- **sync_gpro_suivi_paquets**: Confirmation rests on code references only — migration `2026_06_15_000002_create_gpro_consulting_tables.php` and `SyncService::syncMethods()`. GPRO Consulting's API is not covered by the Novacity doc (which only covers DIVATEX, SDT, QCM). Very likely fine given real migration + real sync method, but for the delivery paper trail, this one is code-referenced rather than externally spec-verified.

---

# B-05 Investigation Lead: InlineVSEndlineComparison

F-REQ-217's real formula needs "tagging réel" (inline check) vs "sortie fin chaine" (end-of-line count). CDC variable dictionary item 79 names "Sortie fin chaine" as the missing half. A QCM-sourced view already configured in the Novacity API catalog may carry this data:

**Endpoint:** `InlineVSEndlineComparison` (`/api/data/inlinevsendlinecomparison`)

The name maps almost exactly onto what F-REQ-217 needs — "inline" = tagging réel during production, "endline" = sortie fin chaine. The columns currently exposed (LOGDATE, ShiftCode, SHORTNAME, OPERA) don't show quantity fields, but the Novacity doc says configured endpoints only expose a restricted column subset. Two possibilities worth investigating:

1. **Exposed columns:** Ask Novacity/IT whether `vwInlineVSEndlineComparison` carries `inline-qty`/`endline-qty` columns that aren't surfaced yet
2. **Custom SQL query:** Build a query against the view (same pattern as the other 36 queries in the catalog)

If the view carries real comparison numbers, F-REQ-217 could graduate from the `taging_reel` proxy to the actual CDC-specified calculation without a brand-new system integration — just a new query or exposed columns on something already connected. Raise with whoever owns B-05 before assuming a fresh data source is needed.

---

# ETL Architecture Confirmation

Per F-REQ-DAT-002, the Middleware API is supposed to "extraire, transformer et charger (ETL)" variables from Excel/Drive sources and consolidate them into one central feed. F-REQ-218 and F-REQ-219 each name two CDC sources but sync to one consolidated Drive table — this is correct ETL behavior, not a shortcut. The question of whether both named upstream feeds are genuinely landing in the consolidated sheet (vs. one being dropped) is a data-pipeline audit item, not a code issue.

---

# CDC Section 3.4 Formatting Artifact

F-REQ-216 through 219 visually sit inside the "3.4 Groupe : Logistique, Planning (Série 300)" table in the CDC — between F-REQ-211 (SAM) and F-REQ-301 (OF confection). This is a table-continuation artifact from CDC editing, not an intentional classification. F-REQ-404 ("Vue Méthodes") is unambiguous that 216–219 are the Méthodes indicators.

---

# Open Items

| Item | Status | Action Required |
|---|---|---|
| Orange/red threshold bands (F-REQ-408) | Dev-determined defaults | Sign-off from Méthodes team (Bouhlel Mahmoud / Ben Hadjmbarek Nourhane) |
| F-REQ-217 proxy (B-05) | Honestly disclosed, pending — **concrete lead identified** | Investigate `InlineVSEndlineComparison` QCM view for real inline/endline qty columns (see B-05 section). Raise with B-05 owner before assuming fresh data source needed. |
| OF-level granularity for F-REQ-217 | Not available | `taging_reel` has no `of` column |
| Chaine-level granularity for F-REQ-216 | Not available | `sync_gpro_suivi_paquets` has no `chaine` column |
| F-REQ-219 CDC formula text | Likely drafting error | "(Nbr demandes négociation − Nbr gammes déchiffrage) × 100" is subtraction, not ratio — needs documented correction from CDC owners |
| Marque filter on F-REQ-218/219 cards | Silently inert | No marque column in data sources — consider disabling the filter visually on this page, or adding a tooltip explaining why |
| CDC source naming sign-off | Needs written confirmation | "Base suivi production" / "Base rendement" are nicknames per F-REQ-DAT-001, but Bouhlel Mahmoud / Ben Hadjmbarek Nourhane should confirm in writing for delivery paper trail. Note: F-REQ-217's source is only "GPRO" per CDC — the "sortie fin chaine" source may be QCM-based, not GPRO Consulting. |
| Upstream feed audit | Needs verification | Confirm both named upstream feeds (Logiciel Cotation + Base rendement for F-REQ-218; Fichier déchiffrage + Logiciel Cotation for F-REQ-219) are genuinely landing in the consolidated Drive sheets — data-pipeline audit item |

---

# CDC Mockup Note

F-REQ-404 ("Vue Méthodes") does not include a prototype screenshot in the CDC, unlike F-REQ-400/401/402/403/405/406 which each ship with one. The "prototypes only" disclaimer on page 18 nominally covers "F-REQ-401 à F-REQ-405" (which includes 404), but no visual was provided. This page's layout — gauges for 216/217, KpiCards for 218/219, the summary table, the tagging line chart — was built from the KPI text specs and general display principles (NF-REQ-507, F-REQ-408), not against a CDC prototype. If anyone on the client side asks "where's this layout from," the honest answer is "extrapolated from the spec because the CDC didn't provide one for this page."
