# Quality KPI Cards — API Data Reference

## API Endpoints

| Endpoint | Returns |
|---|---|
| `GET /quality/kpis` | 16 KPI cards + synced_at |
| `GET /quality/br-chart` | 7 stages (CGL, AQL, Bundling, Inspection Cmd, Print, Accessoires, Composants) |
| `GET /quality/annual-trend` | Monthly RFT + BR GTD trend data |
| `GET /quality/qp-teams` | Best/worst teams |
| `GET /quality/pareto/rft` | Pareto defect data |
| `GET /quality/pareto/inspection` | Inspection pareto data |
| `GET /quality/pareto/fg` | FG pareto data |

---

## Card 1: br_cgl (F-REQ-101)

**API response:** `{ value, status, source }`
- `value`: float (BR %) or null
- `status`: green/orange/red/grey
- `source`: 'sync_drive_inspection_commande'

**Modal sections:**
- ✅ Value/Cible/Statut boxes
- ✅ Formula: nb_rejets / nb_inspections × 100
- ✅ Source: DRIVE, sync_drive_inspection_commande, 4×/jour
- ❌ Breakdown: NOT available (no per-chain breakdown in brChart for this)
- ❌ Trend: NOT available (no trend data for this KPI)

---

## Card 2: br_gtd_jour (F-REQ-102)

**API response:** `{ value, status, source }`
- `value`: float (avg defect_pct) or null
- `status`: green/orange/red/grey
- `source`: 'check_pass_qte (proxy DIVA)'

**Modal sections:**
- ✅ Value/Cible/Statut boxes
- ✅ Formula: AVG(defect_pct)
- ✅ Source: QCM, check_pass_qte, Temps réel
- ✅ Breakdown: YES — brChart has AQL stage with per-chain data
- ✅ Trend: YES — annualTrend has br_gtd monthly data

---

## Card 3: rft_jour (F-REQ-104)

**API response:** `{ value, status, raw: { first_pass, produced } }`
- `value`: float (RFT %) or null
- `status`: green/orange/red/grey
- `raw.first_pass`: pieces_ok_jour.first_pass_today
- `raw.produced`: pieces_produites_jour.produced_today

**Modal sections:**
- ✅ Value/Cible/Statut boxes
- ✅ Formula: first_pass_today / produced_today × 100
- ✅ Source: QCM, pieces_ok_jour + pieces_produites_jour, Temps réel
- ❌ Breakdown: NOT available (RFT is global, not per-chain in brChart)
- ✅ Trend: YES — annualTrend has rft monthly data

---

## Card 4: br_bundling_jour (F-REQ-106)

**API response:** `{ value, status, blocker }`
- `value`: float (BR %) or null
- `status`: green/orange/red (if active) OR 'inactive' (if B-01)
- `blocker`: null (if active) OR 'B-01' (if inactive)

**Modal sections:**
- ✅ Value/Cible/Statut boxes
- ✅ Formula: bundle_reject / bundle_inspected × 100
- ✅ Source: QCM, rejets_inspection_paquet, Temps réel
- ❌ Breakdown: NOT available
- ❌ Trend: NOT available

---

## Card 5: br_gtd_annee (F-REQ-103)

**API response:** `{ value, status, source }`
- `value`: float (avg defect_pct YTD) or null
- `status`: green/orange/red/grey
- `source`: 'check_pass_qte (proxy DIVA)'

**Modal sections:**
- ✅ Value/Cible/Statut boxes
- ✅ Formula: AVG(defect_pct) YEAR
- ✅ Source: QCM, check_pass_qte, Temps réel
- ✅ Breakdown: YES — brChart has AQL stage
- ✅ Trend: YES — annualTrend has br_gtd monthly data

---

## Card 6: rft_annee (F-REQ-105)

**API response:** `{ value, status, raw: { first_pass, produced } }`
- `value`: float (RFT % YTD) or null
- `status`: green/orange/red/grey
- `raw.first_pass`: pieces_ok_annee.first_pass_year
- `raw.produced`: pieces_produites_annee.produced_year

**Modal sections:**
- ✅ Value/Cible/Statut boxes
- ✅ Formula: first_pass_year / produced_year × 100
- ✅ Source: QCM, pieces_ok_annee + pieces_produites_annee, Temps réel
- ❌ Breakdown: NOT available
- ✅ Trend: YES — annualTrend has rft monthly data

---

## Card 7: br_bundling_annee (F-REQ-107)

**API response:** `{ value, status, blocker }`
- `value`: float (BR % YTD) or null
- `status`: green/orange/red (if active) OR 'inactive' (if B-01)
- `blocker`: null (if active) OR 'B-01' (if inactive)

**Modal sections:**
- ✅ Value/Cible/Statut boxes
- ✅ Formula: bundle_reject_year / bundle_inspected_year × 100
- ✅ Source: QCM, rejets_inspection_paquet, Temps réel
- ❌ Breakdown: NOT available
- ❌ Trend: NOT available

---

## Card 8: br_print (F-REQ-108)

**API response:** `{ value, status, source }`
- `value`: float (BR %) or null
- `status`: green/orange/red/grey
- `source`: 'sync_drive_br_print'

**Modal sections:**
- ✅ Value/Cible/Statut boxes
- ✅ Formula: nb_rejets / nb_inspections × 100
- ✅ Source: DRIVE, sync_drive_br_print, 4×/jour
- ❌ Breakdown: NOT available (no per-chain breakdown)
- ❌ Trend: NOT available (no trend data)

---

## Card 9: br_print_dda (F-REQ-109)

**API response:** `{ value, status, source }`
- `value`: float (BR % YTD) or null
- `status`: green/orange/red/grey
- `source`: 'sync_drive_br_print'

**Modal sections:** Same as br_print but YTD

---

## Card 10: br_care_label_jour (F-REQ-110)

**API response:** `{ value, status, source }`
- `value`: float (BR %) or null
- `status`: green/orange/red/grey
- `source`: 'sync_drive_br_care_label'

**Modal sections:** Same pattern as br_print

---

## Card 11: br_care_label_dda (F-REQ-111)

Same as br_care_label_jour but YTD

---

## Card 12: br_accessoires_jour (F-REQ-112)

**API response:** `{ value, status, source }`
- `value`: float (BR %) or null
- `status`: green/orange/red/grey
- `source`: 'sync_drive_br_accessoires'

**Modal sections:** Same pattern as br_print

---

## Card 13: br_accessoires_dda (F-REQ-113)

Same as br_accessoires_jour but YTD

---

## Card 14: br_compo_jour (F-REQ-114)

**API response:** `{ value, status, source }`
- `value`: float (BR %) or null
- `status`: green/orange/red/grey
- `source`: 'sync_drive_br_compo'

**Modal sections:** Same pattern as br_print

---

## Card 15: br_compo_dda (F-REQ-115)

Same as br_compo_jour but YTD

---

## Card 16: br_commande (F-REQ-101)

**API response:** `{ value, status, source }`
- `value`: float (BR % YTD) or null
- `status`: green/orange/red/grey
- `source`: 'sync_drive_inspection_commande'

**Modal sections:**
- ✅ Value/Cible/Statut boxes
- ✅ Formula: nb_rejets / nb_inspections × 100
- ✅ Source: DRIVE, sync_drive_inspection_commande, 4×/jour
- ❌ Breakdown: NOT available
- ❌ Trend: NOT available

---

## Summary: Which KPIs have Breakdown/Trend

| KPI | Breakdown | Trend |
|---|---|---|
| br_cgl | ❌ | ❌ |
| br_gtd_jour | ✅ (AQL in brChart) | ✅ (br_gtd in annualTrend) |
| rft_jour | ❌ | ✅ (rft in annualTrend) |
| br_bundling_jour | ❌ | ❌ |
| br_gtd_annee | ✅ (AQL in brChart) | ✅ (br_gtd in annualTrend) |
| rft_annee | ❌ | ✅ (rft in annualTrend) |
| br_bundling_annee | ❌ | ❌ |
| br_print | ❌ | ❌ |
| br_print_dda | ❌ | ❌ |
| br_care_label_jour | ❌ | ❌ |
| br_care_label_dda | ❌ | ❌ |
| br_accessoires_jour | ❌ | ❌ |
| br_accessoires_dda | ❌ | ❌ |
| br_compo_jour | ❌ | ❌ |
| br_compo_dda | ❌ | ❌ |
| br_commande | ❌ | ❌ |
