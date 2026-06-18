# Quality Page — Complete Reference (Server → View)

## API Endpoints

| Endpoint | Backend Method | Returns |
|---|---|---|
| `GET /quality/kpis` | `QualityController::kpis()` | 16 KPI cards + synced_at |
| `GET /quality/br-chart` | `QualityController::brChart()` | 6 stages with defect data |
| `GET /quality/annual-trend` | `QualityController::annualTrend()` | Monthly RFT + BR GTD |
| `GET /quality/qp-teams` | `QualityController::qpTeams()` | Best/worst teams |
| `GET /quality/pareto/rft` | `QualityController::paretoRft()` | Pareto by operation |
| `GET /quality/pareto/inspection` | `QualityController::paretoInspection()` | Pareto by item |
| `GET /quality/pareto/fg` | `QualityController::paretoFg()` | Pareto by defect motif |

**Auto-refresh:** Page fetches all 7 endpoints every 60 seconds via `setInterval`.

---

## Color Thresholds (CDC F-REQ-402)

| Status | BR KPIs | RFT KPIs | Card Visual |
|---|---|---|---|
| `green` | < 4% | ≥ 98% | Solid green left border (1px) |
| `orange` | 4% – 5% | 95% – 98% | Solid orange left border + flash pulse |
| `red` | > 5% | < 95% | Solid red left border + flash pulse |
| `grey` | null (no data) | null (no data) | Grey left border, value shows "—" |

**Flash CSS:** `@keyframes flash-alert { 0%,100%{opacity:1} 50%{opacity:0.5} }` — 1.5s infinite.

---

## Files

| File | Purpose |
|---|---|
| `app/Http/Controllers/Api/QualityController.php` | Backend — all 7 endpoints |
| `resources/js/services/qualityApi.ts` | Frontend API fetch + TypeScript types |
| `resources/js/pages/quality.tsx` | Main page — all sections |
| `resources/js/components/quality/kpiDetailConfig.ts` | 16 KPI configs (formula, source, thresholds) |
| `resources/js/components/quality/KpiDetailModal.tsx` | Detail modal overlay |
| `resources/js/components/QpTeamPodium.tsx` | Podium component |
| `resources/css/app.css` | Flash animation CSS |

---

# Section A: KPI Cards (16 cards, 4×4 grid)

## How It Works (end-to-end)

### 1. Server — MySQL Tables → PHP Controller

```
QualityController::kpis()
│
├─ RFT Today ──────────────────────────────────────────────────────────────
│  DB::table('pieces_ok_jour')->whereDate('date', today)     → first_pass_today
│  DB::table('pieces_produites_jour')->whereDate('date', today) → produced_today
│  $this->kpi->computeRft(first_pass, produced) = (first_pass / produced) × 100
│  Status: $this->kpi->rftStatus(value) → green(≥98) / orange(95-98) / red(<95)
│
├─ RFT Year ───────────────────────────────────────────────────────────────
│  DB::table('pieces_ok_annee')->where('year', year)      → first_pass_year
│  DB::table('pieces_produites_annee')->where('year', year) → produced_year
│  Same formula and status logic as RFT Today
│
├─ BR GTD Today ───────────────────────────────────────────────────────────
│  DB::table('check_pass_qte')->whereDate('log_date', today)
│    → selectRaw('AVG(defect_pct) as avg_defect_pct')
│  Status: $this->kpi->brStatus(value) → green(<4) / orange(4-5) / red(>5)
│
├─ BR GTD Year ────────────────────────────────────────────────────────────
│  DB::table('check_pass_qte')->whereYear('log_date', year)
│    → selectRaw('AVG(defect_pct) as avg_defect_pct')
│  Same status logic
│
├─ BR Bundling Today + Year ───────────────────────────────────────────────
│  DB::table('rejets_inspection_paquet')->where('period', period)
│    → orderByDesc('date')->first()
│  if (bundle_inspected > 0) → (bundle_reject / bundle_inspected) × 100
│  Status: brStatus(value)
│
├─ BR CGL (DDA) ──────────────────────────────────────────────────────────
│  $this->computeDriveBrDda('sync_drive_inspection_commande', year)
│    → DB::table('sync_drive_inspection_commande')->whereYear('date', year)
│      → selectRaw('SUM(nb_rejets) as total_rejets, SUM(nb_inspections) as total_inspections')
│    → (total_rejets / total_inspections) × 100
│  Status: brStatus(value)
│
└─ BR Print/CareLabel/Accessoires/Compo (today + year) ───────────────────
   $this->computeDriveBr('sync_drive_br_print', today)
     → DB::table($table)->whereDate('date', today)->first()
     → (nb_rejets / nb_inspections) × 100
   Status: brStatus(value)
```

### 2. API Response

```json
GET /quality/kpis →
{
  "br_cgl":              { "value": 3.2,  "status": "green", "source": "sync_drive_inspection_commande" },
  "br_gtd_jour":         { "value": 3.8,  "status": "green", "source": "check_pass_qte (proxy DIVA)" },
  "rft_jour":            { "value": 97.5, "status": "orange", "raw": { "first_pass": 15600, "produced": 16000 } },
  "br_bundling_jour":    { "value": 2.1,  "status": "green" },
  "br_gtd_annee":        { "value": 4.1,  "status": "orange", "source": "check_pass_qte (proxy DIVA)" },
  "rft_annee":           { "value": 98.2, "status": "green", "raw": { "first_pass": 1664359, "produced": 1695000 } },
  "br_bundling_annee":   { "value": 3.5,  "status": "green" },
  "br_print":            { "value": 1.8,  "status": "green", "source": "sync_drive_br_print" },
  "br_print_dda":        { "value": 2.3,  "status": "green", "source": "sync_drive_br_print" },
  "br_care_label_jour":  { "value": 4.5,  "status": "orange", "source": "sync_drive_br_care_label" },
  "br_care_label_dda":   { "value": 3.9,  "status": "green", "source": "sync_drive_br_care_label" },
  "br_accessoires_jour": { "value": 2.7,  "status": "green", "source": "sync_drive_br_accessoires" },
  "br_accessoires_dda":  { "value": 3.1,  "status": "green", "source": "sync_drive_br_accessoires" },
  "br_compo_jour":       { "value": 1.2,  "status": "green", "source": "sync_drive_br_compo" },
  "br_compo_dda":        { "value": 1.8,  "status": "green", "source": "sync_drive_br_compo" },
  "br_commande":         { "value": 3.2,  "status": "green", "source": "sync_drive_inspection_commande" },
  "synced_at": "2026-06-18T10:30:00.000000Z"
}
```

### 3. Frontend State

```
fetchQualityKpis(filters) → setKpis(response) → kpis state
```

### 4. View — KpiCard Component

Each card rendered via `<KpiCard>` which wraps `<BigNumberCard>`:

```
┌──────────────────────────────┐
│ ▌ BR GTD (Ce jour)           │ ← label (uppercase, mono 11px)
│ ▌ 3.8%                       │ ← value (mono 32px bold, color by status)
│ ▌ Cible: ≤ 5%                │ ← target (mono 10px, muted)
│ ▌ src: DIVA                  │ ← source (mono 10px, muted, truncated)
└──────────────────────────────┘
 ▌ = 1px solid colored left border (green/orange/red/grey)
```

- **Loading:** `KpiCardSkeleton` — animated pulse placeholders
- **Null value:** BigNumberCard shows "—" with grey border
- **Click:** Opens `<KpiDetailModal>` with `kpiKey` for that card

### Card Layout (4 rows × 4)

```
Row 1: BR CGL (DDA)       | BR GTD (Ce jour)  | RFT (Ce jour)     | BR Bundling (Ce jour)
Row 2: BR GTD DDA          | RFT DDA            | BR Bundling DDA   | BR Print (Ce jour)
Row 3: BR Print DDA        | BR Care Label      | BR Care Label DDA | BR Accessoires
Row 4: BR Accessoires DDA  | BR Compo           | BR Compo DDA      | BR Commande (DDA)
```

---

# KPI Detail Modal (opens on card click)

## How It Works (end-to-end)

### 1. Config Source

`kpiDetailConfig.ts` — `KPI_DETAIL_CONFIG[kpiKey]` provides:
- `id` → F-REQ number (e.g. "102")
- `label` → Display name
- `description` → Full text
- `formula` → numerator/denominator/multiplier/resultUnit
- `target` → value + operator (≤/≥)
- `thresholds` → green/orange/red strings
- `source` → system/novacityEndpoint/mysqlTable/frequency/status
- `trendAvailable` → boolean
- `period` → "jour" | "annee"

### 2. Modal Structure

```
┌─────────────────────────────────────────────────────────┐
│ F-REQ-102  Série 100 — Qualité Produits     [X]        │
│ BR GTD — Contrôle fin de ligne (Aujourd'hui)            │
│ Vue: Quotidienne  |  Exigence: 102                      │
├─────────────────────────────────────────────────────────┤
│ Taux de pièces rejetées au contrôle fin de ligne ce jour│
├─────────────┬─────────────┬─────────────────────────────┤
│ Valeur      │ Cible       │ Statut                      │
│ actuelle    │             │                             │
│  3.8%       │ <= 5%       │ 🟢 Conforme                 │
│  (green)    │             │                             │
├─────────────┴─────────────┴─────────────────────────────┤
│ Formule de calcul          │ Source de données           │
│ [Rejets GTD] ÷ [AVG%] ×1 │ Système: QCM               │
│                             │ Source: check_pass_qte     │
│                             │ Fréquence: Temps réel      │
│                             │ Sync: 18/06/2026, 10:30    │
├─────────────────────────────┴───────────────────────────┤
│ Tendance                           │ Règles d'alerte    │
│ [sparkline SVG — last 7 months]    │ 🟢 < 4%            │
│                                     │ 🟠 4% – 5%        │
│                                     │ 🔴 > 5%            │
├─────────────────────────────────────┴───────────────────┤
│ [Exporter XLSX]                            [Fermer]     │
└─────────────────────────────────────────────────────────┘
```

### 3. Trend Selection Logic

```typescript
trendValues = (() => {
    if (!config.trendAvailable) return [];
    if (kpiKey === 'rft_jour' || kpiKey === 'rft_annee') {
        return trendData.map(d => d.rft).filter(v => v !== null).slice(-7);
    }
    if (kpiKey === 'br_gtd_jour' || kpiKey === 'br_gtd_dda') {
        return trendData.map(d => d.br_gtd).filter(v => v !== null).slice(-7);
    }
    return [];
})();
```

### 4. KPIs with Trend Sparklines

| KPI | Trend Source | Data Key |
|---|---|---|
| `rft_jour` | annualTrend → monthly RFT | `d.rft` |
| `rft_annee` | annualTrend → monthly RFT | `d.rft` |
| `br_gtd_jour` | annualTrend → monthly BR GTD | `d.br_gtd` |
| `br_gtd_dda` | annualTrend → monthly BR GTD | `d.br_gtd` |

### 5. Formula Display

Hidden when numerator/denominator fields are `'—'` (Drive-sourced KPIs without granular field names). KPIs that show formula: `br_cgl`, `br_gtd_jour`, `rft_jour`, `br_bundling_jour`, `br_gtd_dda`, `rft_annee`, `br_bundling_annee`, `br_commande`.

---

# Section B: BR Bar Chart + Alerts

## BR Bar Chart — How It Works (end-to-end)

### 1. Server — MySQL → PHP Controller

```
QualityController::brChart()
│
├─ CGL stage ─────────────────────────────────────────────────────────────
│  $this->computeDriveBr('sync_drive_inspection_commande', today)
│    → DB::table('sync_drive_inspection_commande')->whereDate('date', today)
│    → (nb_rejets / nb_inspections) × 100
│
├─ AQL stage ─────────────────────────────────────────────────────────────
│  DB::table('check_pass_qte')->whereDate('log_date', today)
│    → selectRaw('AVG(defect_pct) as avg_defect_pct')
│
├─ Bundling stage ────────────────────────────────────────────────────────
│  DB::table('rejets_inspection_paquet')->where('period', 'jour')
│    → orderByDesc('date')->first()
│    → (bundle_reject / bundle_inspected) × 100
│
├─ Print stage ───────────────────────────────────────────────────────────
│  $this->computeDriveBr('sync_drive_br_print', today)
│
├─ Accessoires stage ─────────────────────────────────────────────────────
│  $this->computeDriveBr('sync_drive_br_accessoires', today)
│
└─ Composants stage ──────────────────────────────────────────────────────
   $this->computeDriveBr('sync_drive_br_compo', today)
```

### 2. API Response

```json
GET /quality/br-chart →
{
  "data": [
    { "stage": "CGL",        "defect_pct": 3.2,  "status": "green",  "source": "sync_drive_inspection_commande" },
    { "stage": "AQL",        "defect_pct": 3.8,  "status": "green",  "source": "check_pass_qte" },
    { "stage": "Bundling",   "defect_pct": 2.1,  "status": "green",  "source": "rejets_inspection_paquet" },
    { "stage": "Print",      "defect_pct": 1.8,  "status": "green",  "source": "sync_drive_br_print" },
    { "stage": "Accessoires","defect_pct": 2.7,  "status": "green",  "source": "sync_drive_br_accessoires" },
    { "stage": "Composants", "defect_pct": 1.2,  "status": "green",  "source": "sync_drive_br_compo" }
  ],
  "target": 5
}
```

### 3. Frontend State

```
fetchQualityBrChart(filters) → setBrChart(response.data) → brChart state
```

### 4. View — Recharts BarChart

```
Panel "Taux de rejet (BR) par étape de contrôle"
│
└─ ResponsiveContainer (100% × 260px)
   └─ BarChart
      ├─ CartesianGrid (dashed, var(--border))
      ├─ XAxis: dataKey="stage" → CGL | AQL | Bundling | Print | Accessoires | Composants
      ├─ YAxis: unit="%" domain=[0, 10]
      ├─ ReferenceLine: y=5 (dashed orange, label "Cible 5%")
      ├─ Tooltip: shows "3.2%" or "Données non disponibles"
      └─ Bar dataKey="chartValue" radius=[4,4,0,0]
         └─ Cell per stage: fill = barFill(status) | opacity = 1 or 0.3 if null

barFill(status):
  green  → var(--success)   (#16a34a)
  orange → var(--warning)   (#ea580c)
  red    → var(--destructive) (#dc2626)
  grey   → var(--muted)
```

---

## Alerts Panel — How It Works (end-to-end)

### 1. Server — Client-side Computation

No API call. `generateAlerts(kpis, brChart)` computes from existing state:

```
generateAlerts(kpis, brChart)
│
├─ Check rft_jour.value
│  < 95 → push("RFT CRITIQUE — En dessous de 95%", red)
│  95-98 → push("RFT EN BAISSE — Sous la cible de 98%", orange)
│
├─ Check br_gtd_jour.value
│  > 5 → push("BR GTD CRITIQUE — Dépassement du seuil", red)
│  4-5 → push("BR GTD VIGILANCE — Approche du seuil", orange)
│
├─ Check br_bundling_jour.value
│  > 5 → push("BR BUNDLING CRITIQUE", red)
│  4-5 → push("BR BUNDLING VIGILANCE", orange)
│
├─ Check br_print, br_print_dda, br_care_label, br_accessoires, br_compo
│  Same pattern: >5 → red, 4-5 → orange
│
├─ Check each brChart stage
│  > 5 → push("stage — Taux de rejet critique", red)
│  4-5 → push("stage — Taux de rejet en vigilance", orange)
│
└─ If no alerts → push("Aucune alerte — Tous les indicateurs sont dans les objectifs", green)

Return: alerts.slice(0, 8)  ← max 8 alerts shown
```

### 2. View

```
Panel "Dernières alertes qualité"
│
└─ div.space-y-2
   └─ For each alert:
      ├─ TrafficBadge(level) ← colored dot (red/orange/green)
      ├─ div.truncate.font-bold.uppercase ← alert type text
      └─ div.font-mono.text-[10px] ← timestamp "10:30"
```

---

# Section C: Team Podiums — How It Works (end-to-end)

## 1. Server — MySQL → PHP Controller

```
QualityController::qpTeams()
│
├─ Per-chain BR GTD ──────────────────────────────────────────────────────
│  DB::table('check_pass_qte')->whereDate('log_date', today)
│    ->groupBy('shortname')
│    ->select('shortname', DB::raw('AVG(defect_pct) as avg_defect_pct'))
│  Result: { CH1: 3.2, CH2: 5.9, CH3: 2.1, ... }
│
├─ Global RFT ────────────────────────────────────────────────────────────
│  pieces_ok_jour + pieces_produites_jour → computeRft()
│  $globalRftOk = ($globalRft >= 98)
│
├─ Bundling BR ───────────────────────────────────────────────────────────
│  rejets_inspection_paquet (jour) → (bundle_reject / bundle_inspected) × 100
│
└─ For each chain, compute CDC formula:
   ┌─────────────────────────────────────────────────────────────┐
   │ score = (br_ok × 5) + (br_in_ok × 3) + (br_gtd_ok × 3) + (rft_ok × 1) │
   │ max_score = 12                                               │
   │                                                              │
   │ br_gtd_ok = (chain_avg_defect_pct ≤ 5)                     │
   │ br_in_ok  = (bundling_br ≤ 5)                               │
   │ br_ok     = false (BR CGL DIVA not available)              │
   │ rft_ok    = globalRftOk                                     │
   └─────────────────────────────────────────────────────────────┘
   Sort by score DESC, tiebreak by defect_pct ASC
   Best = top 3, Worst = bottom 3
```

## 2. API Response

```json
GET /quality/qp-teams →
{
  "best": [
    { "chain": "CH3", "score": 10, "max_score": 12, "rft_ok": true, "rft_pct": 98.5,
      "br_in_ok": true, "br_gtd_ok": true, "br_ok": false, "defect_pct": 2.1, "partial_score": false },
    { "chain": "CH1", "score": 9, "max_score": 12, "rft_ok": true, "rft_pct": 98.5,
      "br_in_ok": true, "br_gtd_ok": false, "br_ok": false, "defect_pct": 3.2, "partial_score": false },
    { "chain": "CH5", "score": 7, "max_score": 12, "rft_ok": true, "rft_pct": 98.5,
      "br_in_ok": false, "br_gtd_ok": true, "br_ok": false, "defect_pct": 4.0, "partial_score": false }
  ],
  "worst": [
    { "chain": "CH7", "score": 4, "max_score": 12, "rft_ok": true, "rft_pct": 98.5,
      "br_in_ok": false, "br_gtd_ok": false, "br_ok": false, "defect_pct": 6.8, "partial_score": false },
    { "chain": "CH2", "score": 4, "max_score": 12, "rft_ok": true, "rft_pct": 98.5,
      "br_in_ok": false, "br_gtd_ok": false, "br_ok": false, "defect_pct": 5.9, "partial_score": false },
    { "chain": "CH8", "score": 3, "max_score": 12, "rft_ok": false, "rft_pct": 97.0,
      "br_in_ok": false, "br_gtd_ok": false, "br_ok": false, "defect_pct": 7.2, "partial_score": false }
  ],
  "is_partial": false
}
```

## 3. Frontend State

```
fetchQualityQpTeams(filters) → mapTeam(team, rank) → setQpTeams({ best, worst })
```

## 4. View — QpTeamPodium Component

```
┌──────────────────────┬──────────────────────┐
│ 🏆 Meilleure Équipe  │ ⚠️ Équipe à Améliorer│
│ Score max: 12/12     │ Score max: 12/12     │
├───────┬──────┬───────┼───────┬──────┬───────┤
│   2nd │  1st │  3rd  │  2nd  │ 1st  │  3rd  │
│       │  🏆  │       │       │  ⚠️  │       │
│  CH1  │ CH3  │  CH5  │  CH2  │ CH7  │  CH8  │
│ 9/12  │10/12 │ 7/12  │ 4/12  │ 4/12 │ 3/12  │
│BR:3.2%│BR:2.1│BR:4.0%│BR:5.9%│BR:6.8│BR:7.2%│
│       │      │       │       │      │       │
│ ☑ RFT │ ☑ RFT│ ☑ RFT │ ☑ RFT │ ☑ RFT│ ☒ RFT │
│ ☒ BRGTD│☑ BRGTD│☑ BRGTD│☒ BRGTD│☒ BRGTD│☒ BRGTD│
│ ☒ BRIN│ ☑ BRIN│☒ BRIN │☒ BRIN │☒ BRIN │☒ BRIN │
│ ☒ BRCGL│☒ BRCGL│☒ BRCGL│☒ BRCGL│☒ BRCGL│☒ BRCGL│
│  🥈    │  🥇  │  🥉   │  🥈   │  🥇  │  🥉   │
├───────┴──────┴───────┼───────┴──────┴───────┤
│  bg: gray gradient   │  bg: red gradient    │
└──────────────────────┴──────────────────────┘
```

**Podium rendering:**
- 3 columns: second (65% height), first (100%), third (45%)
- Best variant: amber gradient, trophy icon, medal SVGs (gold/silver/bronze)
- Worst variant: red gradient, alert icon, medal SVGs
- Each column: chain name (bold), score/max_score, defect_pct, 4 indicator icons
- Indicator: CheckCircle2 (green) if ok, XCircle (red) if not, grey dot if null
- Empty state: "Aucune donnée disponible"

---

# Section D: Pareto Tabs — How It Works (end-to-end)

## Tab 1: Pareto RFT (CDC F-REQ-116)

### 1. Server

```
QualityController::paretoRft()
  DB::table('vw_defects')->whereDate('log_date', today)
    ->groupBy('op_no')
    ->select('op_no', DB::raw('SUM(qty) as total'))
    ->orderByDesc('total')
  buildPareto($items, 'op_no', 'total')
    → cumulative % calculated
```

### 2. API Response

```json
GET /quality/pareto/rft →
{
  "data": [
    { "label": "OP10", "value": 120, "cumulative": 35.0 },
    { "label": "OP20", "value": 95,  "cumulative": 62.8 },
    { "label": "OP30", "value": 55,  "cumulative": 78.9 },
    { "label": "OP40", "value": 30,  "cumulative": 87.6 },
    { "label": "OP50", "value": 20,  "cumulative": 93.5 }
  ]
}
```

### 3. View

```
Panel "Pareto des défauts" → Tabs → "Pareto RFT"
└─ ComposedChart (vertical layout, 100% × 260px)
   ├─ Bar dataKey="value" fill="var(--primary)" name="Quantité"
   └─ Line dataKey="cumulative" stroke="var(--destructive)" name="Cumulé %"
```

---

## Tab 2: Pareto Inspection AQL (CDC F-REQ-117)

### 1. Server

```
QualityController::paretoInspection()
  DB::table('qcm_defect_trx')->whereDate('log_date', today)
    ->groupBy('item_id')
    ->select('item_id', DB::raw('COUNT(*) as total'))
    ->orderByDesc('total')
  buildPareto($items, 'item_id', 'total')
```

### 2. API Response

```json
GET /quality/pareto/inspection →
{
  "data": [
    { "label": "ITEM-A1", "value": 45, "cumulative": 28.1 },
    { "label": "ITEM-B2", "value": 38, "cumulative": 51.9 },
    { "label": "ITEM-C3", "value": 25, "cumulative": 67.5 }
  ]
}
```

### 3. View

```
Tab "Pareto Inspection AQL"
└─ ComposedChart (vertical layout)
   ├─ Bar dataKey="value" fill="var(--chart-4)" name="Occurrences"
   └─ Line dataKey="cumulative" stroke="var(--destructive)" name="Cumulé %"
```

---

## Tab 3: Pareto Défauts FG (CDC F-REQ-117)

### 1. Server

```
QualityController::paretoFg()
  ├─ DB::table('packets_rejetes')->whereDate('date_rejet', today)
  │    ->groupBy('motif')->select('motif as label', DB::raw('SUM(qtte) as value'))
  └─ DB::table('sync_drive_inspection_commande')->whereDate('date', today)
       ->selectRaw("'Inspection Commande' as label, nb_rejets as value")
  Merge both → sortByDesc('value')
  buildPareto($items, 'label', 'value')
```

### 2. API Response

```json
GET /quality/pareto/fg →
{
  "data": [
    { "label": "Défaut couture",       "value": 35, "cumulative": 41.2 },
    { "label": "Matière défectueuse",   "value": 20, "cumulative": 64.7 },
    { "label": "Inspection Commande",   "value": 15, "cumulative": 82.4 }
  ]
}
```

### 3. View

```
Tab "Pareto Défauts FG"
└─ ComposedChart (vertical layout)
   ├─ Bar dataKey="value" fill="var(--chart-2)" name="Rejets FG"
   └─ Line dataKey="cumulative" stroke="var(--destructive)" name="Cumulé %"
```

---

# Section F: KPI Summary Table — How It Works (end-to-end)

## 1. Data Source

Uses `kpis` state (same API call as Section A). No separate fetch.

## 2. View — HTML Table

```
Panel "Synthèse des indicateurs Qualité"
│
├─ table.w-full.text-sm
│  ├─ thead: Indicateur | Valeur | Cible | Statut (4 columns)
│  └─ tbody.font-mono
│     ├─ BR CGL (DDA)       │ 3.2%  │ ≤ 5%  │ 🟢
│     ├─ BR GTD (jour)      │ 3.8%  │ ≤ 5%  │ 🟢
│     ├─ BR GTD DDA (année) │ 4.1%  │ ≤ 5%  │ 🟠
│     ├─ RFT Prod (jour)    │ 97.5% │ ≥ 98% │ 🟠
│     ├─ RFT DDA (année)    │ 98.2% │ ≥ 98% │ 🟢
│     ├─ BR Bundling (jour) │ 2.1%  │ ≤ 5%  │ 🟢
│     ├─ BR Bundling DDA    │ 3.5%  │ ≤ 5%  │ 🟢
│     ├─ BR Print (jour)    │ 1.8%  │ ≤ 5%  │ 🟢
│     ├─ BR Print DDA       │ 2.3%  │ ≤ 5%  │ 🟢
│     ├─ BR Care Label (jour)│ 4.5% │ ≤ 5%  │ 🟠
│     ├─ BR Care Label DDA  │ 3.9%  │ ≤ 5%  │ 🟢
│     ├─ BR Accessoires (jour)│2.7% │ ≤ 5%  │ 🟢
│     ├─ BR Accessoires DDA │ 3.1%  │ ≤ 5%  │ 🟢
│     ├─ BR Compo (jour)    │ 1.2%  │ ≤ 5%  │ 🟢
│     ├─ BR Compo DDA       │ 1.8%  │ ≤ 5%  │ 🟢
│     └─ BR Commande (DDA)  │ 3.2%  │ ≤ 5%  │ 🟢
│
└─ footer: "Dernière sync: 10:30" (from kpis.synced_at)
```

**Value rendering:** `r[2] != null ? \`${(r[2] as number).toFixed(1)}%\` : '—'`
**Status rendering:** `<TrafficBadge status={r[3]} />` — colored dot (green/orange/red)

---

# Annual Trend Data — How It Works (end-to-end)

## 1. Server

```
QualityController::annualTrend()
  ├─ RFT trend:
  │  DB::table('pieces_ok_jour as j1')
  │    ->join('pieces_produites_jour as j2', 'j1.date', '=', 'j2.date')
  │    ->whereYear('j1.date', year)
  │    ->groupBy('month')
  │    → SUM(first_pass_today) / SUM(produced_today) × 100 = rft
  │
  └─ BR GTD trend:
     DB::table('check_pass_qte')->whereYear('log_date', year)
       ->groupBy('month')
       → AVG(defect_pct) = br_gtd

  Merge by month → sorted array
```

## 2. API Response

```json
GET /quality/annual-trend →
{
  "data": [
    { "month": "2026-01", "rft": 97.8, "br_gtd": 4.2 },
    { "month": "2026-02", "rft": 98.1, "br_gtd": 3.9 },
    { "month": "2026-03", "rft": 97.5, "br_gtd": 4.5 },
    { "month": "2026-04", "rft": 98.3, "br_gtd": 3.7 },
    { "month": "2026-05", "rft": 98.0, "br_gtd": 4.0 },
    { "month": "2026-06", "rft": 97.5, "br_gtd": 3.8 }
  ]
}
```

## 3. Usage

- `br_gtd_jour` / `br_gtd_dda` cards → sparkline shows `br_gtd` monthly values
- `rft_jour` / `rft_annee` cards → sparkline shows `rft` monthly values
- Detail modal trend section → last 7 months of the relevant metric

---

# Data Fetch Summary

| API Call | State Variable | Used By Sections |
|---|---|---|
| `fetchQualityKpis(filters)` | `kpis` | A (cards), F (table), B (alerts) |
| `fetchQualityBrChart(filters)` | `brChart` | B (chart + alerts) |
| `fetchQualityQpTeams(filters)` | `qpTeams` | C (podiums) |
| `fetchQualityAnnualTrend()` | `trend` | A (card sparklines), Modal (trend) |
| `fetchQualityParetoRft(filters)` | `paretoRft` | D (tab 1) |
| `fetchQualityParetoInspection(filters)` | `paretoInsp` | D (tab 2) |
| `fetchQualityParetoFg(filters)` | `paretoFg` | D (tab 3) |
