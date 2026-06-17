# Production KPI Cards — API Data Reference

## Main KPI Cards (10 cards)

| # | Card Label | KPI Key | API Endpoint | Fields Returned |
|---|---|---|---|---|
| 1 | Efficience Chaîne | `efficience_chaine` | `/production/kpis` → `avg_efficience` | value, status, target |
| 2 | OWE Chaîne | `owe_chaine` | `/production/kpis` → `avg_owe` | value, status, target |
| 3 | RFT Production | `rft_production` | `/production/kpis` → `rft_production` | value, status, target |
| 4 | Arrêts Non Planifiés | `arrets_non_planifies` | `/production/kpis` → `total_lost_time` | value, status, target |
| 5 | BR GTD | `br_gtd` | `/production/kpis` → `br_gtd` | value, status, target |
| 6 | BR Bundling | `br_bundling` | `/production/kpis` → `br_bundling` | value, status, target |
| 7 | BR Print | `br_print` | `/production/kpis` → `br_print` | value, status, target |
| 8 | Taux Archivage | `taux_archivage` | `/production/taux-archivage` | value, target, status |
| 9 | Respect Temps Estimé | `respect_temps_estime` | `/production/respect-temps-estime` | value, target, status |
| 10 | Temps Acceptés V1 | `temps_acceptes` | `/production/taux-temps-acceptes` | value, target, status |

---

## Config Issues Found

### KPIs with `source.status: 'google_drive'` (will show "Données indisponibles" in modal)
- `respect_temps_estime` — should be `'live'` (data from sync_drive_cotation)
- `temps_acceptes` — should be `'live'` (data from sync_drive_gammes)

### KPIs with `mysqlTable: null` (will show "Source: N/A" in modal)
- `br_gtd` — should be `'check_pass_qte'`
- `br_bundling` — should be `'rejets_inspection_paquet'`
- `br_print` — should be `'sync_drive_br_print'`

### KPIs with wrong `mysqlTable`
- `so_progress` — shows `'item_trx_enq'` but data comes from `etat_avancement`

### KPIs with `breakdownType: 'none'` but data IS available
- `rft_production` — no breakdown available (correct)
- `br_gtd` — no breakdown available (correct)
- `br_bundling` — no breakdown available (correct)
- `br_print` — no breakdown available (correct)
- `sam`, `sot`, `effectifs`, `objectif` — no breakdown (correct)

### KPIs with `miniVizType: 'none'` but data IS available
- `rft_production` — no viz (correct)
- `br_print` — no viz (correct)
- `sam`, `sot`, `effectifs`, `objectif` — no viz (correct)

---

## Modal Behavior

The `ProductionKpiDetailModal` shows:
1. Header — always
2. Top 3-stat grid — always
3. Formula & Source — always
4. Breakdown + Mini Viz — only if `isLive` (status === 'live')
4-alt. "Données indisponibles" — only if `isLive` is false (now unreachable)
5. Alert rules — always
6. Footer — always

**Key:** When `isLive` is false, the entire breakdown/viz section is replaced by "Données indisponibles" banner.
