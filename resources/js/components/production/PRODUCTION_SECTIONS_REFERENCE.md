# Production Page — Complete Reference (Server → View)

## API Endpoints

| Endpoint | Backend Method | Returns |
|---|---|---|
| `GET /production/chain-info` | `chainInfo()` | Chain cards data |
| `GET /production/kpis` | `kpis()` | 8 KPI cards |
| `GET /production/efficience-gauges` | `efficienceGauges()` | Per-chain gauges |
| `GET /production/wip-gauges` | `wipGauges()` | Per-chain WIP gauges |
| `GET /production/stoppage-timeline` | `stoppageTimeline()` | Stoppages today |
| `GET /production/of-donuts` | `ofDonuts()` | OF progress donuts |
| `GET /production/so-progress` | `soProgress()` | SO progress bars |
| `GET /production/efficience-trend` | `efficienceTrend()` | Monthly trend |
| `GET /production/top-operators` | `topOperators()` | Top operators |
| `GET /production/wip` | `wip()` | WIP flux area chart |
| `GET /production/breakdown/{kpiKey}` | `breakdown()` | KPI detail breakdown |
| `GET /production/coupe/coverage` | `coupeCoverage()` | Coupe coverage days |
| `GET /production/coupe/chain-coverage` | `coupeChainCoverage()` | Per-chain coverage |
| `GET /production/coupe/tagging` | `coupeTagging()` | Tagging table |
| `GET /production/coupe/ofs` | `coupeOfs()` | Active OFs list |
| `GET /production/coupe/qte-departage` | `coupeQteDepartage()` | Qte départage table |
| `GET /production/coupe/departage` | `coupeDepartage()` | Départage per operator |
| `GET /production/serigraphie/coverage` | `serigraphieCoverage()` | Sérigraphie coverage |
| `GET /production/serigraphie/flux` | `serigraphieFlux()` | Entrée vs Sortie chart |
| `GET /production/serigraphie/rejets` | `serigraphieRejets()` | Rejets table |
| `GET /production/inline-endline` | `inlineEndline()` | Inline vs Endline chart |
| `GET /production/taux-archivage` | `tauxArchivage()` | Archivage KPI |
| `GET /production/respect-temps-estime` | `respectTempsEstime()` | Temps estimé KPI |
| `GET /production/taux-temps-acceptes` | `tauxTempsAcceptes()` | Temps acceptés KPI |

**Auto-refresh:** Page fetches all active endpoints every 60 seconds via `setInterval`. Tab switches reset all state and re-fetch.

---

## Page Architecture

3 tabs → `ProductionTab` component with `workshop` prop: `'confection' | 'coupe' | 'serigraphie'`

### Tab Visibility Matrix

| Row | Section | Confection | Coupe | Sérigraphie |
|-----|---------|:---:|:---:|:---:|
| 1 | Chain info cards | ✅ | ✅ | ❌ |
| 2 | KPI cards | ✅ | ✅ | ✅ |
| 3 | Efficience Gauges + WIP Gauges + Stoppages | ✅ | ✅ | ❌ |
| 4 | Couverture + Chain Coverage | ❌ | ✅ | ✅ |
| 5 | OF Donuts + SO Progress | ✅ | ✅ | ❌ |
| 6 | Départage/Vignettes + Top Ops + WIP Flux | ✅ | ✅ | ❌ |
| 7 | Efficience Opérateur (all ops) | ✅ | ✅ | ❌ |
| 8 | Efficience Cumulée Trend | ✅ | ✅ | ❌ |
| 9 | Coupe tables / Sérigraphie panels | ❌ | ✅ | ✅ |

---

## Files

| File | Purpose |
|---|---|
| `app/Http/Controllers/Api/ProductionController.php` | Backend — all endpoints |
| `resources/js/services/productionApi.ts` | Frontend API fetch + types |
| `resources/js/pages/production.tsx` | Main page — 3 tabs, all sections |
| `resources/js/components/production/productionKpiDetailConfig.ts` | 28 KPI configs |
| `resources/js/components/production/ProductionKpiDetailModal.tsx` | Detail modal |
| `resources/js/components/production/ProductionKpiCard.tsx` | KPI card wrapper |

---

# Row 1: Chain Info Cards

**Visibility:** Confection + Coupe only (not Sérigraphie)
**Backend:** `QualityController::chainInfo()` → queries `wip_chaine`, `efficience_chaine`, `check_pass_qte`, `qte_depart_chaine_article_of`, `etat_avancement`, `of_fabrication`, `vue_stock`, `sync_gpro_article_master`, `sync_gpro_chain_planning`, `sync_gpro_of_dates`

## Server → API → View

### 1. Server

```
chainInfo()
  ├─ wip_chaine → key by chaine → en_cours, entree_jour, sortie_jour, of_number, article, ehd, bpd
  ├─ efficience_chaine (today) → key by chaine → efficience_pct, heures_prod, heures_standards
  ├─ check_pass_qte (today) → group by shortname → AVG(defect_pct) = br_gtd
  ├─ qte_depart_chaine_article_of → group by chaine → of, article, quantite
  ├─ etat_avancement → key by of → avancement_pct, statut
  ├─ of_fabrication → key by of_number → dt_debut, dt_fin
  ├─ vue_stock → key by code_mp → designation
  ├─ sync_gpro_article_master → key by code_article → sam_min, sot_min, effectif_requis
  ├─ sync_gpro_chain_planning → group by chaine → objectif_journalier, cadence_hebdo
  └─ sync_gpro_of_dates → group by of_numero → ehd
```

### 2. API Response

```json
GET /production/chain-info →
{
  "data": [
    {
      "id": "CH1",
      "of": "OF-1234",
      "article": "ART-001",
      "designation": "T-shirt Domyos",
      "sam": 12.5,
      "sot": 8.3,
      "effectif": 15,
      "objectif": 500,
      "eff": 87.5,
      "hp": 6.2,
      "hs": 5.4,
      "wip": 45,
      "status": "green",
      "br_gtd": 3.2,
      "bpd": "2026-06-15",
      "epd": "2026-06-20",
      "ehd": "2026-06-22",
      "entree_jour": 120,
      "sortie_jour": 80
    }
  ],
  "metadata": { "missing_fields": [] }
}
```

### 3. View — Chain Card

```
┌──────────────────────────────────────┐
│ 🟢 CH1              OF-1234          │
│                      QTÉ: 500        │
│ Article  SAM      SOT     Effectif  │
│ ART-001  12.5min  8.3min  15        │
│ Eff.     WIP      BPD     EPD       │
│ 87.5%    45       06/15   06/20     │
│ BR GTD: 3.2% (green/orange/red)     │
│ Entrée: 120  Sortie: 80             │
│ HP: 6.2h  HS: 5.4h                  │
│ ──────────────────────────────────── │
│ T-shirt Domyos (designation)         │
└──────────────────────────────────────┘
```

**Styling:** 4-column grid (`md:grid-cols-4`), each card `rounded-lg border border-border bg-card p-3`. Status dot: green/orange/red/grey. BR GTD color: green(≤4), orange(≤5), red(>5).

---

# Row 2: KPI Cards

**Visibility:** All tabs (but different cards per workshop)

## Server → API → View

### 1. Server — `kpis()`

```
kpis()
  ├─ Efficience: AVG(efficience_pct) from efficience_chaine (today)
  ├─ OWE: (avg_eff × avg_sot) / avg_sam from efficience_chaine + sync_gpro_article_master
  ├─ RFT: computeRft(pieces_ok_jour, pieces_produites_jour)
  ├─ WIP: SUM(en_cours) from wip_chaine
  ├─ Lost Time: SUM(minutes_perdues) from lost_time (today)
  ├─ BR GTD: AVG(defect_pct) from check_pass_qte (today)
  ├─ BR Bundling: (bundle_reject / bundle_inspected) × 100 from rejets_inspection_paquet
  └─ BR Print: (nb_rejets / nb_inspections) × 100 from sync_drive_br_print
```

### 2. API Response

```json
GET /production/kpis →
{
  "avg_efficience": { "value": 87.5, "status": "green", "target": "≥ 85%" },
  "avg_owe": { "value": 72.3, "status": "green", "target": "≥ 70%" },
  "rft_production": { "value": 97.8, "status": "orange", "target": "≥ 98%", "source": "pieces_ok_jour" },
  "total_wip": { "value": 450, "status": "green", "target": "≤ ½ cadence" },
  "total_lost_time": { "value": 25, "status": "red", "target": "< 10 min" },
  "br_gtd": { "value": 3.8, "status": "green", "target": "≤ 5%" },
  "br_bundling": { "value": 2.1, "status": "green", "target": "≤ 5%" },
  "br_print": { "value": 1.8, "status": "green", "target": "≤ 5%" },
  "synced_at": "2026-06-18T10:30:00.000000Z"
}
```

### 3. View — ProductionKpiCard

Wraps `<BigNumberCard>` with click handler → opens `<ProductionKpiDetailModal>`.

**Cards per tab:**
- **Confection + Coupe:** Efficience Chaîne ·202, OWE Chaîne ·204, RFT Production ·104, WIP Total ·205, Arrêts Non Planifiés ·207, BR GTD ·102, BR Bundling ·106, BR Print ·108, Taux Archivage ·216, Respect Temps Estimé ·218, Temps Acceptés V1 ·219
- **Sérigraphie:** RFT Production ·104, BR Print ·108, Taux Archivage ·216, Respect Temps Estimé ·218, Temps Acceptés V1 ·219

---

# Row 3: Efficience Gauges + WIP Gauges + Stoppages Timeline

**Visibility:** Confection + Coupe only

## Efficience Gauges

### Server

```
efficienceGauges()
  └─ efficience_chaine (today) → select chaine, efficience_pct
```

### API Response

```json
GET /production/efficience-gauges →
{
  "data": [
    { "chaine": "CH1", "efficience_pct": 87.5 },
    { "chaine": "CH2", "efficience_pct": 82.1 },
    { "chaine": "CH3", "efficience_pct": 91.3 }
  ]
}
```

### View

```
Panel "Efficience par Chaîne · Gauges"
└─ flex justify-around
   └─ For each chain: <Gauge value={87.5} label="CH1" />
```

## WIP Gauges

### Server

```
wipGauges()
  └─ wip_chaine → chaine, en_cours
     → wip_pct = (en_cours / (cadence/2)) × 100
     → raw_wip, target = cadence/2
```

### API Response

```json
GET /production/wip-gauges →
{
  "data": [
    { "chaine": "CH1", "wip": 90.0, "raw_wip": 45, "target": 50 }
  ]
}
```

### View

```
Panel "WIP par Chaîne · 205 Gauges"
└─ <Gauge value={90} label="CH1" max={200} inverted={true} />
   └─ "45 / 50" (raw_wip / target)
```

## Stoppages Timeline

### Server

```
stoppageTimeline()
  └─ lost_time (today) → chaine, motif, minutes_perdues/60 (hours), pseudo-start time
```

### API Response

```json
GET /production/stoppage-timeline →
{
  "data": [
    { "chaine": "CH1", "motif": "MAINT", "duration": 0.5, "start": 8.0 },
    { "chaine": "CH1", "motif": "MATIERE", "duration": 0.25, "start": 8.5 },
    { "chaine": "CH2", "motif": "QUALITE", "duration": 0.75, "start": 8.0 }
  ]
}
```

### View

```
Panel "Chronologie des arrêts (Aujourd'hui)"
└─ For each chain: horizontal bar (06h → 18h)
   └─ Colored segments: MAINT=chart-4(blue), MATIERE=warning(orange), QUALITE=destructive(red)
      width = (duration/12) × 100%
   └─ Below: motif list with chain, start time, duration, TrafficBadge
```

---

# Row 4: Couverture + Chain Coverage

**Visibility:** Coupe → Couverture Coupe + Chain Coverage | Sérigraphie → Couverture Sérigraphie + Chain Coverage

## Couverture Coupe (F-REQ-311)

### Server

```
coupeCoverage()
  ├─ sortie_coupe (today) → SUM(quantite_coupee)
  ├─ qte_engagement (today) → SUM(quantite_engagee)
  └─ delta = qteCoupee - qteEngagee
     jours = delta / cadence_hebdo (1000)
```

### API Response

```json
GET /production/coupe/coverage →
{ "value": 2.5, "unit": "jours", "delta_pcs": 2500, "status": "green" }
```

### View

```
Panel "Couverture Coupe ·311"
└─ "2.5 jours" (big number)
   "Reliquat à couper"
   <TrafficBadge> "Flux OK" or "Alerte Flux"
```

## Couverture Sérigraphie (F-REQ-309)

### Server

```
serigraphieCoverage()
  ├─ qte_entree_serigraphie (today) → SUM(quantite)
  └─ sortie_serigraphie (today) → SUM(quantite)
     seri = qteEntree - qteSortie
```

### API Response

```json
GET /production/serigraphie/coverage →
{ "value": 150, "status": "green", "target": "> cadence hebdo" }
```

### View

```
Panel "Couverture Sérigraphie ·309"
└─ "150" (big number)
   "Pcs en attente"
   <TrafficBadge> "OK" or "Retard"
```

## Chain Coverage (F-REQ-310)

### Server

```
coupeChainCoverage()
  ├─ qte_engagement → group by chaine → SUM(quantite_engagee)
  ├─ qte_depart_chaine_article_of → group by chaine → SUM(quantite)
  ├─ sync_gpro_chain_planning → cadence_hebdo per chain
  └─ jours = max(0, engagement - planifie) / cadence_hebdo
```

### API Response

```json
GET /production/coupe/chain-coverage →
{
  "value": 3.2,
  "unit": "jours",
  "breakdown": [
    { "chaine": "CH1", "value": 1.5, "engagement": 600, "planifie": 500 },
    { "chaine": "CH2", "value": 0.8, "engagement": 450, "planifie": 400 }
  ]
}
```

### View

```
Panel "Couverture Chaîne ·310"
└─ BarChart (vertical)
   XAxis: jours (Jours label)
   YAxis: chaine
   Bar: value (var(--primary))
   Tooltip: "1.5 jours (Eng: 600 / Plan: 500)"
```

---

# Row 5: OF Donuts + SO Progress

**Visibility:** Confection + Coupe only

## OF Donuts (F-REQ-305)

### Server

```
ofDonuts()
  └─ etat_avancement → of, pct = (quantite_realisee/quantite_prevue)×100 or avancement_pct, statut
     → limit 8
```

### API Response

```json
GET /production/of-donuts →
{
  "data": [
    { "of": "OF-1234", "pct": 75.0, "statut": "en_cours" },
    { "of": "OF-1235", "pct": 100.0, "statut": "termine" }
  ]
}
```

### View

```
Panel "Taux d'avancement OF ·305"
└─ grid-cols-2/4
   └─ For each OF:
      <PieChart> inner donut (32-48px radius)
        Cell "done": green if termine, chart-4 if en_cours
        Cell "remaining": muted
      OF number + "75%"
```

## SO Progress (F-REQ-304)

### Server

```
soProgress()
  └─ etat_avancement → group by chaine → SUM(quantite_realisee), SUM(quantite_prevue)
     → realise, restant = max(0, prevue - realise)
```

### API Response

```json
GET /production/so-progress →
{
  "data": [
    { "chaine": "CH1", "realise": 400, "restant": 100 },
    { "chaine": "CH2", "realise": 350, "restant": 150 }
  ]
}
```

### View

```
Panel "SO Progress par Chaîne ·304"
└─ BarChart (horizontal, stacked)
   Bar "Réalisé": chart-4 (blue)
   Bar "Restant": muted
```

---

# Row 6: Départage/Vignettes + Top Ops + WIP Flux

**Visibility:** Confection → all 4 panels | Coupe → Top Ops + WIP Flux only

## Départage (F-REQ-208) + Vignettes (F-REQ-209) — Confection only

### Server

```
coupeDepartage(poste=221)  // Départage
  └─ qte_produit_individuel_jour LEFT JOIN minutes_presence
     → group by employee_id → eff = min_prod / min_pres × 100

coupeDepartage(poste=213)  // Vignettes
  └─ same query with poste filter
```

### API Response

```json
GET /production/coupe/departage?poste=221 →
{
  "data": [
    { "employe": "EMP001", "eff": 92.5, "min_prod": 450.0, "min_pres": 486.5 }
  ]
}
```

### View

```
Panel "Efficience Départage ·208"
└─ BarChart (vertical)
   XAxis: employe
   YAxis: % (eff)
   Bar: eff (chart-1 for Départage, chart-2 for Vignettes)
```

## Top Operators (F-REQ-210)

### Server

```
topOperators()
  └─ qte_produit_individuel_jour LEFT JOIN minutes_presence
     → group by employee_id, chaine → eff = min_std / min_pres × 100
     → orderBy desc, limit 10
```

### API Response

```json
GET /production/top-operators →
{
  "data": [
    { "nom": "EMP001", "chaine": "CH1", "eff": 95.2, "min_std": 480.0, "min_pres": 504.2 }
  ]
}
```

### View

```
Panel "Top Opérateurs (Aujourd'hui) ·210"
└─ BarChart (horizontal)
   XAxis: % (eff) with ReferenceLine at 90% (green dashed)
   YAxis: nom
   Bar: eff (var(--primary))
```

## WIP Flux (F-REQ-206)

### Server

```
wip()
  ├─ qte_engagement (last 30 days) → group by date → SUM(quantite_engagee)
  └─ sortie_coupe (last 30 days) → group by date → SUM(quantite_coupee)
     → merge by date → engagement, sortie, wip = sortie - engagement
```

### API Response

```json
GET /production/wip →
{
  "data": [
    { "date": "06-01", "sortie": 800, "engagement": 750, "wip": 50 },
    { "date": "06-02", "sortie": 900, "engagement": 850, "wip": 50 }
  ]
}
```

### View

```
Panel "Flux Coupe & Engagement ·206"
└─ AreaChart
   Area "Sortie coupe": green, fillOpacity 0.25
   Area "Engagement": orange, fillOpacity 0.25
```

---

# Row 7: Efficience Opérateur (All Ops)

**Visibility:** Confection + Coupe only

### Server

```
topOperators(all=1)
  └─ Same as top operators but limit 1000 (all operators)
```

### View

```
Panel "Efficience par Opérateur ·201 (Aujourd'hui)"
└─ ComposedChart
   Bar yAxisId="left": eff (var(--primary))
   Line yAxisId="right": min_std (green, no dots)
```

---

# Row 8: Efficience Cumulée Trend (F-REQ-203)

**Visibility:** Confection + Coupe only

### Server

```
efficienceTrend()
  └─ qte_produit_individuel_jour LEFT JOIN minutes_presence (month start → today)
     → group by date → jour (MM-DD), eff = total_prod / total_pres × 100
```

### API Response

```json
GET /production/efficience-trend →
{
  "data": [
    { "jour": "06-01", "eff": 86.2 },
    { "jour": "06-02", "eff": 88.1 }
  ]
}
```

### View

```
Panel "Efficience Cumulée ·203"
└─ LineChart
   XAxis: jour
   YAxis: domain [0, 100], unit "%"
   ReferenceLine y=85 (green dashed)
   Line: eff (var(--primary), strokeWidth 2, no dots)
```

---

# Row 9: Coupe Tables / Sérigraphie Panels

## Coupe Tables (Coupe only)

### Tagging (F-REQ-217)

**Server:** `coupeTagging()` → `taging_reel` (today) → all columns

**API Response:**
```json
{ "data": [{ "chaine": "CH1", "shift": "M", "tag_theorique": 500, "tag_reel": 480, "ecart_pct": -4.0 }] }
```

**View:** Table — Chaîne | Shift | Théorique | Réel | Écart% (red if negative)

### OFs List

**Server:** `coupeOfs()` → `of_fabrication` WHERE `dt_fin IS NULL`

**View:** Paginated table (20/page) — OF | Article | Désignation | Qté | Début | Statut (colored badge)

### Qte Départage (F-REQ-303)

**Server:** `coupeQteDepartage()` → `qte_depart_chaine_article_of` → group by of, article

**View:** Table — OF | Article | Qté

### Inline vs Endline (F-REQ-007)

**Server:** `inlineEndline()` → `inline_vs_endline_comparison` (today, fallback to latest date)

**View:** Stacked BarChart — each opera as a colored bar segment per chain

---

## Sérigraphie Panels (Sérigraphie only)

### Flux Entrée vs Sortie (F-REQ-309)

**Server:** `serigraphieFlux()` → `qte_entree_serigraphie` + `sortie_serigraphie` (today) → merge by article|couleur

**API Response:**
```json
{ "data": [{ "article": "ART-001", "couleur": "Bleu", "entree": 100, "sortie": 80 }] }
```

**View:** BarChart — Bar "Entrée" (chart-4) + Bar "Sortie" (chart-2)

### Rejets (F-REQ-309)

**Server:** `serigraphieRejets()` → `packets_rejetes` (today)

**API Response:**
```json
{ "data": [{ "id_colis": "COL-001", "reference": "REF-001", "motif": "Défaut couture", "qtte": 5, "date_rejet": "2026-06-18" }], "metadata": { "br_print_note": "F-REQ-108: BR Print sync pending." } }
```

**View:** Table — ID Colis | Référence | Motif | Qté | Date rejet + info note

---

# KPI Detail Modal

**Component:** `ProductionKpiDetailModal.tsx`
**Props:** `kpiKey`, `kpiData`, `extraData`, `breakdownData`, `onClose`
**Config:** `productionKpiDetailConfig.ts` — 28 KPI definitions

## Modal Structure

```
┌─────────────────────────────────────────────────────────┐
│ F-REQ-202  Série 200 — Performance Production  [X]     │
│ Efficience par Chaîne                                    │
├─────────────────────────────────────────────────────────┤
│ Taux d'efficience de la chaîne de production...          │
├─────────────┬─────────────┬─────────────────────────────┤
│ Valeur      │ Cible       │ Statut                      │
│  87.5%      │ > 85%       │ 🟢 Conforme                 │
├─────────────┴─────────────┴─────────────────────────────┤
│ Formule de calcul          │ Source de données           │
│ [Heures standards] ÷       │ Système: SDT               │
│ [Heures produites] × 100   │ Source: efficience_chaine   │
│                             │ Fréquence: Instantané       │
├─────────────────────────────┴───────────────────────────┤
│ Breakdown: Per-chain table (value, status, écart)        │
│ Mini Viz: Gauge per chain                                │
├─────────────────────────────────────────────────────────┤
│ Règles d'alerte                                         │
│ 🟢 ≥ 90%  🟠 85% – 90%  🔴 < 85%                      │
├─────────────────────────────────────────────────────────┤
│ [Exporter XLSX]                            [Fermer]     │
└─────────────────────────────────────────────────────────┘
```

## Breakdown Types

| Type | KPIs | Server Endpoint |
|---|---|---|
| `per_chain` | efficience_chaine, owe_chaine, wip_chaine, br_gtd, br_bundling, br_print, rft_production, taux_archivage, respect_temps_estime, temps_acceptes | `GET /production/breakdown/{key}` |
| `per_operator` | efficience_operateur, efficience_depart, efficience_vignettes | `GET /production/breakdown/{key}` |
| `timeline` | arrets_non_planifies | `GET /production/breakdown/{key}` |
| `per_of` | wip_optimal | `GET /production/breakdown/{key}` |
| `none` | efficience_cumulee, taux_avancement_of, so_progress, couverture_*, top_operateurs, sam, sot, effectifs, objectif | — |

## Mini Visualization Types

| Type | KPIs | Rendering |
|---|---|---|
| `gauge` | efficience_chaine, owe_chaine, wip_chaine | SVG semicircle gauge |
| `sparkline` | efficience_cumulee, wip_optimal | SVG polyline (7 points) |
| `horizontal_bar` | efficience_operateur, efficience_depart, efficience_vignettes | Recharts horizontal bar |
| `timeline` | arrets_non_planifies | Colored bar segments |
| `donut` | taux_avancement_of | Recharts PieChart donut |
| `none` | All others | — |

---

# Color Thresholds

| Status | Efficience KPIs | BR KPIs | WIP KPIs | Lost Time | Visual |
|---|---|---|---|---|---|
| `green` | ≥ 85% | < 4% | ≤ ½ cadence | 0 stops | Green left border |
| `orange` | 70–85% | 4–5% | ½–1× cadence | 1 stop ≤10min | Orange left border + flash |
| `red` | < 70% | > 5% | > 1× cadence | >1 stop or >10min | Red left border + flash |
| `grey` | null | null | null | null | Grey left border |

---

# Data Fetch Summary

| API Call | State Variable | Used By Rows |
|---|---|---|
| `fetchProductionChainInfo(filters)` | `chains` | Row 1 |
| `fetchProductionKpis(filters)` | `kpis` | Row 2 |
| `fetchProductionGauges(filters)` | `gauges` | Row 3 |
| `fetchProductionWipGauges(filters)` | `wipGauges` | Row 3 |
| `fetchProductionStoppages(filters)` | `stoppages` | Row 3 |
| `fetchProductionOfDonuts(filters)` | `ofProgress` | Row 5 |
| `fetchProductionSoProgress(filters)` | `soProgress` | Row 5 |
| `fetchProductionTrend(filters)` | `trend` | Row 8 |
| `fetchProductionTopOps(filters)` | `topOps` | Row 6 |
| `fetchProductionTopOps({...filters, all:'1'})` | `allOps` | Row 7 |
| `fetchProductionWip(filters)` | `wipData` | Row 6 |
| `fetchDepartage('OP221', filters)` | `departage` | Row 6 (confection) |
| `fetchDepartage('OP213', filters)` | `vignettes` | Row 6 (confection) |
| `fetchCoupeChainCoverage(filters)` | `coupeChainCoverage` | Row 4 |
| `fetchCoupeCoverage(filters)` | `coupeCoverage` | Row 4 (coupe) |
| `fetchCoupeTagging(filters)` | `coupeTagging` | Row 9 (coupe) |
| `fetchCoupeOfs(filters)` | `coupeOfs` | Row 9 (coupe) |
| `fetchCoupeQteDepartage(filters)` | `coupeQteDepartage` | Row 9 (coupe) |
| `fetchInlineEndline(filters)` | `inlineEndlineData` | Row 9 (coupe) |
| `fetchSerigraphieCoverage(filters)` | `serigraphieCoverage` | Row 4 (serigraphie) |
| `fetchSerigraphieFlux(filters)` | `seriFlux` | Row 9 (serigraphie) |
| `fetchSerigraphieRejets(filters)` | `seriRejets` | Row 9 (serigraphie) |
| `fetchTauxArchivage()` | `tauxArchivage` | Row 2 |
| `fetchRespectTempsEstime()` | `respectTempsEstime` | Row 2 |
| `fetchTauxTempsAcceptes()` | `tauxTempsAcceptes` | Row 2 |
| `fetchProductionBreakdown(key, filters)` | `breakdownData` | Modal |
