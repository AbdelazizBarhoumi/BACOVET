# Quality Page — All Sections Reference

## Section A: KPI Cards (16 cards)
Already documented in QUALITY_KPI_REFERENCE.md

---

## Section B: BR Bar Chart + Alerts

### BR Bar Chart ("Taux de rejet par étape de contrôle")

**API endpoint:** `GET /quality/br-chart`
**Response:** `{ data: BrChartItem[], target: 5 }`
**BrChartItem:** `{ stage, defect_pct, status, blocker?, source? }`

**Data flow:**
- `fetchQualityBrChart(filters)` → `brChart` state
- `brChart.map(d => ({ ...d, chartValue: d.defect_pct ?? 0 }))` → chart data
- Bars colored by `barFill(d.status)`, null values show grey/muted

**7 stages in brChart:**
1. CGL — status: 'pending', blocker: 'B-02', source: 'DIVA'
2. AQL — from check_pass_qte, has real data
3. Bundling — from rejets_inspection_paquet, may be inactive
4. Inspection Cmd — from sync_drive_inspection_commande, has data
5. Print — from sync_drive_br_print, has data
6. Accessoires — from sync_drive_br_accessoires, has data
7. Composants — from sync_drive_br_compo, has data

**Tooltip:** Shows "Données non disponibles" when defect_pct is null (CGL stage)
**Status:** ✅ All stages properly connected. CGL shows grey (expected - DIVA not available)

### Alerts Panel ("Dernières alertes qualité")

**Data source:** `generateAlerts(kpis, brChart)` — computed client-side from KPI data
**Alert types:** RFT < 95% → red, RFT 95-98% → orange, BR > 5% → red, BR 4-5% → orange
**Status:** ✅ Working correctly

---

## Section C: Team Podiums ("Meilleure/À Améliorer Équipe QP")

**API endpoint:** `GET /quality/qp-teams`
**Response:** `{ best: QpTeam[], worst: QpTeam[], is_partial, missing_blockers }`
**QpTeam:** `{ chain, score, max_score, rft_ok, rft_pct, br_in_ok, br_gtd_ok, br_ok, defect_pct, partial_score }`

**Data flow:**
- `fetchQualityQpTeams(filters)` → `qpTeams` state
- `qpTeams.best` → `QpTeamPodium variant="best"`
- `qpTeams.worst` → `QpTeamPodium variant="worst"`
- `qpTeams.is_partial` → shows "Score partiel — données DIVA + DRIVE en attente"

**Status:** ✅ Working correctly. Podiums show chain rankings.

---

## Section D: Pareto Tabs (3 tabs)

### Tab 1: Pareto RFT
**API endpoint:** `GET /quality/pareto/rft`
**Response:** `{ data: ParetoItem[] }` where `ParetoItem = { label, value, cumulative }`
**Data flow:** `fetchQualityParetoRft(filters)` → `paretoRft` state
**Chart:** ComposedChart with Bar (value) + Line (cumulative %)
**Status:** ✅ Working correctly

### Tab 2: Pareto Inspection Colis
**API endpoint:** `GET /quality/pareto/inspection`
**Response:** `{ data: ParetoItem[] }`
**Data flow:** `fetchQualityParetoInspection(filters)` → `paretoInsp` state
**Chart:** Same as RFT but with different fill color
**Status:** ✅ Working correctly

### Tab 3: Pareto FG (Colis)
**API endpoint:** `GET /quality/pareto/fg`
**Response:** `{ data: ParetoItem[] }`
**Data flow:** `fetchQualityParetoFg(filters)` → `paretoFg` state
**Chart:** Same pattern, fill color: chart-2
**Status:** ✅ Working correctly

---

## Section F: KPI Summary Table

**Data source:** `kpis` state (from `fetchQualityKpis`)
**Rows:** All 16 KPIs with columns: ID, Indicateur, Valeur, Cible, Statut
**Status:** ✅ All 16 rows present including br_commande

---

## Data Fetch Summary

| API Call | Used By | Status |
|---|---|---|
| `fetchQualityKpis(filters)` | KPI cards, summary table, alerts | ✅ |
| `fetchQualityBrChart(filters)` | BR bar chart, alerts | ✅ |
| `fetchQualityQpTeams(filters)` | Team podiums | ✅ |
| `fetchQualityAnnualTrend()` | KPI detail modal sparklines | ✅ |
| `fetchQualityParetoRft(filters)` | Pareto RFT tab | ✅ |
| `fetchQualityParetoInspection(filters)` | Pareto Inspection tab | ✅ |
| `fetchQualityParetoFg(filters)` | Pareto FG tab | ✅ |

---

## Issues Found

None — all sections are properly connected to their API endpoints and display data correctly.
