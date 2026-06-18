# Logistics Page — Complete Reference (Server → View)

## API Endpoints

| Endpoint | Backend Method | Returns |
|---|---|---|
| `GET /logistics/kpis` | `kpis()` | DOT, HOT, Respect Plan, Lead Time |
| `GET /logistics/stock-kpis` | `stockKpis()` | Rotation, Stock Mort, Occupation |
| `GET /logistics/stock-composition` | `stockComposition()` | 3 pie chart datasets |
| `GET /logistics/ofs` | `ofs()` | OF list + Livraison + Délai |
| `GET /logistics/livraison` | `livraison()` | Livraison + Délai (separate) |
| `GET /logistics/coverage` | `coverage()` | 3 coverage bar charts |
| `GET /logistics/stock-search` | `stockSearch()` | Paginated stock table |
| `GET /logistics/stock-reliability` | `stockReliability()` | Global + 3 category reliability |

**Auto-refresh:** All endpoints fetched every 60 seconds. Stock search re-fetches on query/page change.

**Fallback flags:** DOT, HOT, Lead Time, and Coverage return `is_fallback: true` when using proxy/constant values instead of live data. The frontend shows "Estimé" badges when fallback is active.

---

## Files

| File | Purpose |
|---|---|
| `app/Http/Controllers/Api/LogisticsController.php` | Backend — all endpoints |
| `resources/js/services/logisticsApi.ts` | Frontend API fetch + types |
| `resources/js/pages/logistics.tsx` | Main page — 8 sections |
| `resources/js/components/logistics/kpiDetailConfig.ts` | 8 KPI configs |
| `resources/js/components/logistics/LogisticsKpiDetailModal.tsx` | Detail modal |

---

# Section A: Delivery Performance KPI Cards

**Visibility:** Always shown (4 cards)
**Backend:** `LogisticsController::kpis()`

## Server → API → View

### 1. Server

```
kpis()
  ├─ DOT (F-REQ-334):
  │  sync_drive_dot_hot (Google Drive "gproplanning/carnet")
  │  → qte_livree_on_time / qte_commandee × 100
  │  is_fallback = true when no Drive data available
  │
  ├─ HOT (F-REQ-335):
  │  sync_drive_dot_hot (proxy: Jemmel cutting site)
  │  → qte_livree_on_time / qte_commandee × 100
  │  Note: Proxy — F-REQ-335 requires main courante (real handover data)
  │  is_fallback = true when no Drive data available
  │
  ├─ Respect Planification (F-REQ-336):
  │  sync_gpro_chain_planning → objectif_journalier per chain
  │  qte_produite (today) → actual per chain
  │  % chains where actual >= objective
  │
  └─ Lead Time (F-REQ-337):
     sync_gpro_of_dates → avg(ehd - bpd) across all OFs
     Fallback: configurable constant = 32 days (no GPRO data)
     is_fallback = true when using constant
```

### 2. API Response

```json
GET /logistics/kpis →
{
  "dot": {
    "value": 92.5,
    "status": "orange",
    "source": "sync_drive_dot_hot",
    "is_fallback": false,
    "raw": { "total": 1000, "livres": 925 }
  },
  "hot": {
    "value": 88.0,
    "status": "orange",
    "source": "sync_drive_dot_hot (proxy Jemmel)",
    "note": "Proxy: transferts via Jemmel. F-REQ-335 requiert main courante.",
    "is_fallback": false,
    "raw": { "total": 500, "livres": 440 }
  },
  "respect_plan": {
    "value": 85.7,
    "status": "orange",
    "source": "sync_gpro_chain_planning + qte_produite",
    "is_fallback": false,
    "raw": { "respecting": 6, "total": 7 }
  },
  "lead_time": {
    "value": 30.5,
    "status": "green",
    "unit": "j",
    "target": 32,
    "source": "sync_gpro_of_dates (ehd - bpd)",
    "note": "Moyenne 150 OFs",
    "is_fallback": false
  },
  "next_export": "2026-06-20",
  "synced_at": "2026-06-18T10:30:00.000000Z"
}
```

### 3. View — 4 BigNumberCards

```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ DOT ·334     │ HOT ·335     │ Respect      │ Lead Time    │
│ 92.5%        │ 88.0%        │ Planif ·336  │ Global ·337  │
│ ≥ 95%        │ ≥ 95%        │ 85.7%        │ ≤ 32 j       │
│ 🟠           │ 🟠           │ ≥ 95%        │ 🟢           │
│ Drive sheet  │ Drive proxy  │ GPRO + qte   │ GPRO dates   │
│ [Estimé]     │ [Estimé]     │              │ [Estimé]     │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

**Styling:** 4-column grid (`md:grid-cols-4`). Cards with red/orange status get `animate-flash-alert` class. Click opens `<LogisticsKpiDetailModal>`.

**Fallback badges:** When `is_fallback: true`, a small "Estimé" badge appears below the card:
- DOT: "Estimé — pas de données Drive"
- HOT: "Estimé — pas de données Drive"
- Lead Time: "Estimé — constante 32j"

**Next Export Alert:** If `kpis.next_export` is set, shows a blue banner: "Alerte prochain export : 2026-06-20"

### Status Logic

```php
$statusFor($pct, $target):
  null → grey
  >= $target → green
  >= $target - 5 → orange
  else → red
```

For DOT/HOT/Respect: target=95, so green≥95, orange≥90, red<90.

### Lead Time Status

```php
leadTimeStatus($value):
  null → grey
  <= 32 → green
  <= 40 → orange
  > 40 → red
```

---

# Section B: Stock KPIs

**Visibility:** Always shown (3 panels in a row)
**Backend:** `LogisticsController::stockKpis()`

## Server → API → View

### 1. Server

```
stockKpis()
  ├─ Stock Moyen (F-REQ-316/317/318):
  │  stock_moyen → stock_moyen value, nb_lignes_stock
  │  Note: "Coût marchandises requis depuis DIVA pour calcul rotation complet"
  │  (Panel renamed: shows raw quantity, not a rate — no rate formula possible
  │   without DIVA cost data)
  │
  ├─ Stock Mort (F-REQ-319/320/321):
  │  articles_sans_mouvement → qtte_sans_mvt_365j
  │  quantite_totale_stock → quantite_totale_stock
  │  stock_mort_pct = (sans_mvt / total_stock) × 100
  │  Status: green(≤10%), orange(10-12%), red(>12%)
  │  NOTE: 10%/12% thresholds are implementation assumptions — no CDC Cible specified
  │
  └─ Occupation (F-REQ-322/323/324):
     nombre_rouleaux → nb_rouleaux
     capacite_stockage → total_conteneurs (NOT conteneurs_actifs)
     occupation_pct = (rouleaux / total_conteneurs) × 100
     Status: green(≤85%), orange(85-95%), red(>95%)
     Note: "Rouleaux / Capacité totale (X conteneurs)"
```

### 2. API Response

```json
GET /logistics/stock-kpis →
{
  "rotation": {
    "stock_moyen": 150000,
    "nb_lignes": 450,
    "note": "Coût marchandises requis depuis DIVA pour calcul rotation complet",
    "categories": {
      "accessoires": { "value": null, "status": "pending", "note": "Données par catégorie en attente (Q-37)" },
      "tissu": { "value": null, "status": "pending" },
      "fg": { "value": null, "status": "pending" }
    }
  },
  "stock_mort": {
    "value": 8.5,
    "status": "green",
    "nb_articles_sans_mvt": 120,
    "qtte_sans_mvt": 5000,
    "qtte_totale": 58824,
    "note": "Basé sur quantités (Novacity ne fournit pas les coûts).",
    "categories": { ... }
  },
  "occupation": {
    "value": 70.0,
    "status": "green",
    "nb_rouleaux": 3500,
    "conteneurs_actifs": 4828,
    "total_conteneurs": 5000,
    "note": "Rouleaux / Capacité totale (5 000 conteneurs)",
    "categories": { ... }
  },
  "synced_at": "2026-06-18T10:30:00.000000Z"
}
```

### 3. View

```
Panel "Stock Moyen ·316/317/318"
└─ "150 000" (big number, formatted fr-FR)
   "Quantité totale en stock"
   "Coût marchandises requis depuis DIVA..."
   NOTE: Tagged with Rotation F-REQ IDs because this value is the denominator
   for F-REQ-316/317/318 (Coût des marchandises ÷ Stock moyen). Full rotation rate
   requires DIVA cost data (numerator, not yet available).

Panel "Taux de Stock Mort ·319/320/321"
├─ "Articles sans mouvement 365j: 120"
└─ "Taux stock mort: 8.50%"
   <TrafficBadge> green

Panel "Taux d'Occupation ·322/323/324"
├─ <Gauge value={70.0} label="Global" />
├─ "Rouleaux: 3 500"
├─ "Capacité totale: 5 000"
└─ "Rouleaux / Capacité totale (5 000 conteneurs)"
```

---

# Section C: Stock Composition Pie Charts

**Visibility:** Always shown (3 pie charts in a row)
**Backend:** `LogisticsController::stockComposition()`

## Server → API → View

### 1. Server

```
stockComposition()
  ├─ quantite_par_provenance → provenance, quantite, nb_articles
  │  Filters: whereNotNull('provenance') — excludes null rollup row
  │
  ├─ quantite_par_famille → famille_fg, quantite
  │  Filters: whereNotNull('famille_fg') — excludes null rollup row
  │
  └─ quantite_par_typologie → typologie, quantite, nb_articles
     Filters: whereNotNull('typologie') — excludes null rollup row
```

### 2. API Response

```json
GET /logistics/stock-composition →
{
  "provenance": [
    { "name": "Import Chine", "value": 25000, "nb_articles": 150 },
    { "name": "Local Tunisie", "value": 18000, "nb_articles": 80 }
  ],
  "famille": [
    { "name": "NABAIJI", "value": 20000 },
    { "name": "DOMYOS", "value": 15000 },
    { "name": "KIPSTA", "value": 8000 }
  ],
  "typologie": [
    { "name": "Tissu Jersey", "value": 30000, "nb_articles": 200 },
    { "name": "Accessoires Coton", "value": 12000, "nb_articles": 90 }
  ],
  "synced_at": "2026-06-18T10:30:00.000000Z"
}
```

### 3. View

```
Panel "Stock par Provenance ·332"     Panel "Stock par Marque ·333"     Panel "Stock par Typologie ·331"
└─ PieChart (donut, inner=40, outer=75) └─ PieChart                      └─ PieChart
   ├─ Cell colors: PIE_COLORS palette     ├─ Cell colors                    ├─ Cell colors
   ├─ Tooltip: "Import Chine: 25 000"     ├─ Tooltip                        ├─ Tooltip
   └─ Legend: inline, mono 10px            └─ Legend                          └─ Legend
```

**PIE_COLORS:** `['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5', 'success', 'warning', 'muted-foreground']` (8 colors — Typologie has 37 slices, so color reuse is expected)

**Known data quality:** Null rollup rows are filtered. "AUTRE" dominates famille (~99%), "NON RENSEIGNE" dominates provenance (~99%). Upstream tagging in DIVA needs attention for meaningful pie breakdowns.

---

# Section D: OF & Delivery Status

**Visibility:** Always shown (2 panels)
**Backend:** `LogisticsController::ofs()` (livraison + delai_moyen part)

## Server → API → View

### 1. Server

```
ofs()
  ├─ Livraison (F-REQ-325/326/327):
  │  nombre_ofs_livres → of_avec_transfert_coupe_total / nb_of_livres_total × 100
  │  Status: green(≥80%), orange(70-80%), red(<70%)
  │  NOTE: This is a DIVA-based metric, NOT the same as DOT (Section A).
  │  DOT uses Google Drive data; Livraison uses Novacity nombre_ofs_livres.
  │
  └─ Délai Moyen (F-REQ-328/329/330):
     moyenne_date_transfert → moyenne_jours, nb_of_consideres
     Status: green(≤1j), orange(1-3j), red(>3j)
```

### 2. API Response

```json
GET /logistics/ofs →
{
  "livraison": {
    "value": 85.0,
    "status": "green",
    "total_ofs": 200,
    "transfert_total": 170
  },
  "delai_moyen": {
    "value": 2.3,
    "status": "orange",
    "nb_ofs": 150
  },
  ...
}
```

### 3. View

```
Panel "Commandes Livrées à Temps ·325/326/327"
└─ "Taux de livraison: 85.0%"
   <TrafficBadge> green
   "170 / 200 OFs"

Panel "Délai de Livraison Moyen ·328/329/330"
└─ "Délai moyen: 2.3 j"
   <TrafficBadge> orange
   "Sur 150 OFs"
```

---

# Section E: OF List Table

**Visibility:** Always shown
**Backend:** `LogisticsController::ofs()` (ofs part)

## Server → API → View

### 1. Server

```
ofs()
  ├─ etat_avancement → of, avancement_pct, quantite_prevue, quantite_realisee, statut
  ├─ sync_gpro_of_dates → bpd, ehd, epd (per OF, from GPRO Consulting)
  ├─ colis_total_var → group by commande → article, total_colis, total_qte
  └─ EPD computation: prefer GPRO epd, fallback (prevue - realisee) / 100 + today
```

### 2. API Response

```json
GET /logistics/ofs →
{
  "ofs": [
    {
      "of": "OF-1234",
      "avancement_pct": 75,
      "quantite_prevue": 500,
      "quantite_realisee": 375,
      "statut": "en_cours",
      "colis": [
        { "article": "ART-001", "total_colis": 10, "total_qte": 200 }
      ],
      "bpd": "2026-06-01",
      "ehd": "2026-06-18",
      "epd": "2026-06-15"
    }
  ]
}
```

### 3. View

```
Panel "OF en Cours"
table:
┌──────┬──────────────────┬──────────┬──────────┬──────────┬──────────┐
│ OF   │ Avancement       │ Qté prév │ Qté réa. │ EPD      │ Statut   │
├──────┼──────────────────┼──────────┼──────────┼──────────┼──────────┤
│ OF-  │ ████████░░ 75%   │ 500      │ 375      │ 15/06    │ en_cours │
│ 1234 │                  │          │          │          │          │
└──────┴──────────────────┴──────────┴──────────┴──────────┴──────────┘
```

**Styling:**
- Progress bar: `<Progress value={75}>` (1.5px height)
- Statut badge: `termine` → green bg, `en_cours` → blue bg
- EPD: GPRO date or computed fallback or "—"
- OF column: text-primary color

**Note:** BPD/EHD are now populated from `sync_gpro_of_dates`. EPD prefers the GPRO value when available, falling back to the computed estimate.

---

# Section F: Coverage Bar Charts

**Visibility:** Always shown (3 charts)
**Backend:** `LogisticsController::coverage()`

## Server → API → View

### 1. Server

```
coverage()
  ├─ Chaîne (F-REQ-310):
  │  qte_engagement JOIN qte_depart_chaine_article_of ON `of` → group by chaine
  │  planifie = SUM(qte_depart_chaine_article_of.quantite) per chain
  │  cadence_daily = cadence_hebdo / 6 (from GPRO, fallback 100)
  │  jours = max(0, quantite_engagee - planifie) / cadence_daily
  │  is_fallback = true when no GPRO data
  │
  ├─ Coupe (F-REQ-311):
  │  qte_engagement (total) - sortie_coupe (today)
  │  avg_cadence_daily = avg(cadence_hebdo) / 6 across all chains (fallback 100)
  │  jours = delta / avg_cadence_daily
  │  NOTE: CDC says "Qté lancé" (separate GPRO variable), but using sortie_coupe as proxy
  │
  └─ Sérigraphie (F-REQ-309):
     qte_entree_serigraphie (today) - sortie_serigraphie (today) per article
     jours = max(0, entree - sortie) / avg_cadence_daily
```

### 2. API Response

```json
GET /logistics/coverage →
{
  "chaine": [
    { "name": "CH1", "jours": 6.5, "cadence_daily": 100.0, "engagement": 1200, "planifie": 550 },
    { "name": "CH2", "jours": 4.2, "cadence_daily": 100.0, "engagement": 800, "planifie": 380 }
  ],
  "coupe": [
    { "name": "Global", "jours": 12.5, "cadence_daily": 100.0 }
  ],
  "serigraphie": [
    { "name": "ART-001", "jours": 3.0 },
    { "name": "ART-002", "jours": 1.5 }
  ],
  "is_fallback": true,
  "synced_at": "2026-06-18T10:30:00.000000Z"
}
```

### 3. View

```
Panel "Couverture Chaîne ·310"        Panel "Couverture Coupe ·311"     Panel "Couverture Sérigraphie ·309"
└─ BarChart (180px height)            └─ BarChart                       └─ BarChart
   XAxis: name (CH1, CH2)              XAxis: name (Global)             XAxis: name (article names)
   YAxis: unit="j"                     YAxis: unit="j"                  YAxis: unit="j"
   Bar: jours (color by target)        Bar: jours                       Bar: jours
     green if >= target                  green if >= 7                    green if >= 5
     red if < target                     red if < 7                      red if < 5
```

**Targets:**
- Chaîne=10j (CDC literal: "Cible > 10 jours" — fixed constant, correct)
- Coupe=7j (CDC says "Cible > cadence hebdomadaire moyenne" — relative, 7j is implementation proxy)
- Sérigraphie=5j (CDC says "Cible > cadence hebdomadaire moyenne" — relative, 5j is implementation proxy)

**NOTE:** Coupe and Sérigraphie thresholds should ideally be cadence-relative. The CDC's literal text is "plus de jours que la cadence hebdomadaire moyenne" — meaning coverage exceeds one week's output. Fixed constants are proxies until cadence-relative thresholds are wired through the frontend.

**Chaîne formula note:** The CDC formula is `(Qté engagé − Qté planifié) / cadence`. "Qté planifié" maps to `qte_depart_chaine_article_of.quantite` (dispatched quantity per chain). GPRO Consulting does not have a separate "Qté planifié" field in `sync_gpro_chain_planning`; the closest available is the SDT-derived `qte_depart_chaine_article_of`.

**Structural proxy note (affects Chaîne + Coupe):** The CDC's variable table assigns conceptually distinct variables to each KPI:
- Chaîne: row 40 "Qté engagement" (engagé) → feeds Couverture Chaîne
- Chaîne: row 41 "Qté planifié" → feeds Couverture Chaîne
- Coupe: row 117 "Qté lancé" → feeds Couverture Coupe
- WIP OPTIMAL: row 43 "Qté engagement" + row 45 "Qté départage" → feed F-REQ-206

But Novacity exposes only two relevant queries: `qte_engagement` (maps to rows 40/43) and `qte_depart_chaine_article_of` (maps to row 45). The CDC assumes these are separate tracked quantities; in practice they collapse onto the same underlying data. This means:
- Chaîne's "engagé" and Coupe's "lancé" may be the same `qte_engagement` source viewed differently
- Chaîne's "planifié" is proxied by `qte_depart_chaine_article_of.quantite`, which the CDC earmarks for WIP OPTIMAL, not Couverture Chaîne
- The substitution is the best available proxy, not a semantic match

This is a structural granularity gap between what Novacity exposes and what the CDC's variable table assumes exists separately. Worth flagging once at acceptance rather than treating each chart's note as an independent decision.

---

# Section G: Stock Reliability

**Visibility:** Only if `stockReliability` is not null (3 panels)
**Backend:** `LogisticsController::stockReliability()`

## Server → API → View

### 1. Server

```
stockReliability()
  ├─ Global:
  │  quantite_totale_stock → total
  │  articles_sans_mouvement → dead
  │  reliability = (total - dead) / total × 100
  │  Status: green(≥99.5%), orange(≥98%), red(<98%)
  │
  ├─ Accessoires (F-REQ-313):
  │  quantite_par_typologie → keyword match (accessoir, anneau, elastique, etc.)
  │  If qty > 0: use global reliability
  │
  ├─ Tissu (F-REQ-314):
  │  vue_stock.Famille → fabric family match (tissu, coton, polyester, nylon, etc.)
  │  NOTE: Uses vue_stock.Famille, NOT quantite_par_typologie.
  │  Typologie is a trims/accessories taxonomy; fabric materials live in vue_stock.Famille.
  │  If qty > 0: use global reliability
  │
  └─ FG (F-REQ-315):
     quantite_par_typologie → keyword match (coque, emballage, carton, etc.)
     If qty > 0: use global reliability
```

### 2. API Response

```json
GET /logistics/stock-reliability →
{
  "global": {
    "value": 99.2,
    "status": "orange",
    "target": 99.5,
    "note": "Proxy: (stock_total - articles_sans_mvt) / stock_total."
  },
  "accessoires": {
    "value": 99.2,
    "status": "orange",
    "target": 99.5,
    "note": "12 000 unités — Comptage physique requis pour valeurs exactes"
  },
  "tissu": {
    "value": 99.2,
    "status": "orange",
    "target": 99.5,
    "note": "45 000 unités — Comptage physique requis pour valeurs exactes"
  },
  "fg": {
    "value": 99.2,
    "status": "orange",
    "target": 99.5,
    "note": "678 000 unités — Comptage physique requis pour valeurs exactes"
  },
  "synced_at": "2026-06-18T10:30:00.000000Z"
}
```

### 3. View

```
Panel "Fiabilité Stock Accessoires ·313"    Panel "Fiabilité Stock Tissu ·314"    Panel "Fiabilité Stock FG ·315"
└─ "99.2%"                                   └─ "99.2%"                             └─ "99.2%"
   <TrafficBadge> orange                       <TrafficBadge> orange                  <TrafficBadge> orange
   "Cible: 99.5%"                              "Cible: 99.5%"                         "Cible: 99.5%"
   "12 000 unités — Comptage..."               "45 000 unités — Comptage..."          "678 000 unités — Comptage..."
```

---

# Section H: Stock Search Table

**Visibility:** Always shown
**Backend:** `LogisticsController::stockSearch()`

## Server → API → View

### 1. Server

```
stockSearch(q, page)
  vue_stock LEFT JOIN diva_stock ON idmp
  → code_mp, designation, famille, couleur, idmagasin, qtte, qtte_reserve, qtte_disponible
  WHERE code_mp LIKE %q% OR designation LIKE %q% OR famille LIKE %q%
  ORDER BY code_mp
  LIMIT 20 OFFSET (page-1)*20
```

### 2. API Response

```json
GET /logistics/stock-search?q=coton&page=1 →
{
  "data": [
    {
      "code_mp": "MP-001",
      "designation": "Tissu Coton 180g",
      "famille": "Tissu",
      "couleur": "Blanc",
      "idmagasin": "MAG-01",
      "qtte": 5000,
      "qtte_reserve": 1200,
      "qtte_disponible": 3800
    }
  ],
  "total": 45,
  "page": 1,
  "per_page": 20,
  "total_pages": 3,
  "stock_total": 450,
  "synced_at": "2026-06-18T10:30:00.000000Z"
}
```

### 3. View

```
Panel "Stock Matières Premières" [Search: Rechercher code, désignation…]
┌──────────┬────────────────┬────────┬────────┬─────────┬──────────┬──────────┬──────────┐
│ Code MP  │ Désignation    │ Famille│ Couleur│ Magasin │ Qté stock│ Qté rés. │ Qté disp.│
├──────────┼────────────────┼────────┼────────┼─────────┼──────────┼──────────┼──────────┤
│ MP-001   │ Tissu Coton    │ Tissu  │ Blanc  │ MAG-01  │ 5 000    │ 1 200    │ 3 800    │
│ MP-002   │ Elastique 3cm  │ Access.│ Noir   │ MAG-03  │ 200      │ 250      │ ⚠ -50    │
└──────────┴────────────────┴────────┴────────┴─────────┴──────────┴──────────┴──────────┘
  45 résultat(s) — page 1/3          [← Préc] [Suiv →]
```

**Styling:**
- Search input: `h-7 w-64 border-border bg-secondary text-xs`
- Negative qtte_disponible: `text-destructive` + AlertCircle icon
- Pagination: simple prev/next buttons with disabled state
- Export: AppShell exports current search results as XLSX

---

# KPI Detail Modal

**Component:** `LogisticsKpiDetailModal.tsx`
**Props:** `kpiKey`, `kpiData`, `onClose`
**Config:** `kpiDetailConfig.ts` — 8 KPI definitions

## Modal Structure

```
┌─────────────────────────────────────────────────────────┐
│ F-REQ-334  Série 300 — Supply Chain           [X]      │
│ DOT — Delivery On Time                                  │
├─────────────────────────────────────────────────────────┤
│ Pourcentage de commandes livrées à la date promise...   │
├─────────────┬─────────────┬─────────────────────────────┤
│ Valeur      │ Cible       │ Statut                      │
│  92.5%      │ >= 95%      │ 🟠 Vigilance                │
├─────────────┴─────────────┴─────────────────────────────┤
│ Formule de calcul          │ Source de données           │
│ [Qté livrée à temps] ÷     │ Système: Google Drive       │
│ [Qté commandée] × 100      │ Source: sync_drive_dot_hot  │
│                             │ Fréquence: Quotidien        │
├─────────────────────────────┴───────────────────────────┤
│ Règles d'alerte                                         │
│ 🟢 >= 95%  🟠 90% – 95%  🔴 < 90%                     │
├─────────────────────────────────────────────────────────┤
│                                  [Fermer]               │
└─────────────────────────────────────────────────────────┘
```

## KPI Configs

| Key | F-REQ | Label | Target | Source | Status Logic |
|---|---|---|---|---|---|
| `dot` | 334 | DOT — Delivery On Time | ≥ 95% | sync_drive_dot_hot (Google Drive) | green≥95, orange≥90, red<90 |
| `hot` | 335 | HOT — Handover On Time (proxy Jemmel) | ≥ 95% | sync_drive_dot_hot (Google Drive) | green≥95, orange≥90, red<90 |
| `respect_plan` | 336 | Respect Planification | ≥ 95% | sync_gpro_chain_planning + qte_produite | green≥95, orange≥90, red<90 |
| `lead_time` | 337 | Lead Time Global | ≤ 32j | sync_gpro_of_dates (ehd − bpd) | green≤32, orange≤40, red>40 |
| `stock_mort` | 319 | Taux de Stock Mort | ≤ 10% | articles_sans_mouvement + quantite_totale_stock | green≤10, orange≤12, red>12 |
| `occupation` | 322 | Taux d'Occupation | ≤ 85% | nombre_rouleaux + capacite_stockage | green≤85, orange≤95, red>95 |
| `livraison` | 325 | Commandes Livrées à Temps | ≥ 80% | nombre_ofs_livres (DIVA) | green≥80, orange≥70, red<70 |
| `delai_moyen` | 328 | Délai Moyen Livraison | ≤ 1j | moyenne_date_transfert | green≤1, orange≤3, red>3 |

---

# Color Thresholds

| Status | Delivery KPIs | Stock KPIs | Occupation | Lead Time | Visual |
|---|---|---|---|---|---|
| `green` | ≥ target | ≤ max | ≤ 85% | ≤ 32j | Green left border |
| `orange` | target-5 to target | max to max+2 | 85–95% | 32–40j | Orange left border + flash |
| `red` | < target-5 | > max+2 | > 95% | > 40j | Red left border + flash |
| `grey` | null | null | null/0 | null | Grey left border |

**Note:** Lead Time uses days (wider tolerance) while other KPIs use percentages. The orange band for Lead Time is target+8, not target+2.

---

# Data Fetch Summary

| API Call | State Variable | Used By Sections |
|---|---|---|
| `fetchLogisticsKpis()` | `kpis` | A (cards) |
| `fetchLogisticsStockKpis()` | `stockKpis` | B (panels) |
| `fetchLogisticsStockComposition()` | `stockComp` | C (pies) |
| `fetchLogisticsOfs()` | `ofsData` | D + E (delivery + OF table) |
| `fetchLogisticsCoverage()` | `coverageData` | F (bar charts) |
| `fetchLogisticsStockSearch({q, page})` | `stockRows`, `stockTotal`, `stockTotalPages` | H (table) |
| `fetchLogisticsStockReliability()` | `stockReliability` | G (reliability) |

---

# Open Items (not yet implemented)

| Item | CDC Ref | Status |
|---|---|---|
| Per-category breakdown (Rotation, Livraison, Délai) | F-REQ-313–330 | Scope decision pending |
| Value-based stock KPIs (Rotation, Stock Mort, pies) | — | No cost field in Novacity |
| Dynamic filtering at API layer | F-REQ-407 | Client-side only |
| "colis préparés vs prévus" + trucks waiting | F-REQ-405 | Not in any endpoint |
| Page-level PDF/print export | F-REQ-409 | Stock-search only |
| Objectif journalier per chain pipeline | — | GPRO confirmed live |
| CDC numbering inconsistency (body vs Annexe 1 vs mockup) | — | Flag to CDC owner |
| F-REQ-301/302/303 — chain-level OF counts + non-soldé list | F-REQ-301–303 | View-ownership unclear (CDC body = Logistics, Annexe 1 = Production) |
| Coupe/Sérigraphie cadence-relative thresholds | F-REQ-311/309 | Fixed 7j/5j are proxies; CDC says "cadence hebdomadaire moyenne" |
| Typologie pie bucketing (top N + "Autres") | NF-REQ-507 | 37 slices illegible at 5m; needs deliberate top-N decision |
