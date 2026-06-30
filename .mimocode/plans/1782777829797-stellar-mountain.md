# Plan: Fix All Gaps in v1 Confection Page — Every Value from API

## File to Modify
- `resources/js/routes-v1/pages/production-confection.tsx`

## Complete Audit: Field → API Source → Status

### WORKING (already correct)
| Field | Source | Line(s) |
|---|---|---|
| `d.of` | `OrderTrackingItem.orderId` / `ChainInfo.of` | 242 |
| `d.designation` | `OrderTrackingItem.designation` / `ChainInfo.designation` | 243 |
| `d.efficienceJ1` | `OrderTrackingItem.priorEff` | 244 |
| `d.oweJ1` | `OrderTrackingItem.priorOwe` | 245 |
| `d.ofProgressPct` | `OrderTrackingItem.overallPct` | 250, 390 |
| `d.wip1Pct` | `ChainInfo.wip` | 257 |
| `d.effectif` | `ChainInfo.effectif` | 262, 308 |
| `d.sot` | `ChainInfo.sot` | 309, 395 |
| `d.sam` | `ChainInfo.sam` | 310, 399 |
| `d.qteCde` | `OrderTrackingItem.qtyOrdered` | 391 |
| `d.bpd` | `OrderTrackingItem.bpd` / `ChainInfo.bpd` | 409 |
| `d.epd` | `OrderTrackingItem.epd` / `ChainInfo.epd` | 413 |
| `d.ehd` | `OrderTrackingItem.ehd` / `ChainInfo.ehd` | 429 |
| `d.objectifJour` | `OrderTrackingItem.dailyTarget` / `ChainInfo.objectif` | 417, 453 |
| `d.gtd` | `ChainInfo.br_gtd` (formatted) / `OrderTrackingItem.gtd` | 277, 451 |
| `d.objectifsAM` | `OrderTrackingItem.amObjective` | 285 |
| `d.objectifsOJ` | `OrderTrackingItem.soObjective` | 292 |
| `d.gapSamSot` | `OrderTrackingItem.gapSamSo` | 302, 452 |
| `d.progressionRealise` | `OrderTrackingItem.overallPct` | 356 |

### BROKEN — Needs Fix

#### 1. `efficienceSerie` (LineKpi chart, line 351)
- **Current**: hardcoded `[]` → chart always empty
- **Fix**: Call `fetchProductionTrend()` which returns `TrendItem[]` with `{ jour, eff }`. Map to `{ x: jour, v: eff }`.
- **Import needed**: `fetchProductionTrend`, `TrendItem`

#### 2. `hourlySchedule` (lines 327-345, 365, 370)
- **Current**: Only first slot has `qteDemandee/actual/cumulEff` from `OrderTrackingItem`. All other 7 slots are zeros.
- **Fix**: The API provides `OrderTrackingItem.qteDemandee` (daily target), `cumulQty` (total produced), `cumulEff` (efficiency), and `dailyTarget`. We can distribute `cumulQty` across the elapsed time slots based on current hour. Use the chain's `ChainInfo.hp` (heures prod) and `ChainInfo.hs` (heures standards) for hourly efficiency calculation.
- **Approach**: Calculate current hour from `new Date()`. Distribute `cumulQty` across slots up to current hour. Each slot gets `dailyTarget / totalSlots` for demand, and distributed `cumulQty` for actual. Efficiency per slot = `(reel / dem) * 100` if dem > 0.
- **Also needed**: Import `ChainInfo` (already imported) — use `chain.hp` and `chain.hs` for efficiency.

#### 3. `samMidPct` (line 260)
- **Current**: hardcoded `null` → always "N/A"
- **Fix**: No direct API equivalent. This is a derived metric. Remove the field from the interface and show `"N/A"` in the template. This is acceptable — it's a GPRO-specific field that the API doesn't compute.

#### 4. `problemes` and `detail` (lines 433-435)
- **Current**: hardcoded `"—"`
- **Fix**: These are qualitative fields. The closest API data is `fetchProductionStoppages()` which returns `StoppageItem[]` with `{ chaine, motif, duration, start }`. Use the most recent stoppage's `motif` as the problem description. Show `"Aucun arrêt"` if no stoppages.
- **Import needed**: `fetchProductionStoppages`, `StoppageItem`

#### 5. Footer "QTE demandée" / "QTE réalisée" / "Efficience" / "Production du jour" / "Ecart vs objectif" (lines 454-458)
- **Current**: Uses `d.hourlySchedule[0]` which may be zeros for most fields
- **Fix**: Once hourlySchedule is fixed (fix #2), these will automatically populate. Additionally:
  - "Production du jour" should use `OrderTrackingItem.cumulQty` directly
  - "Ecart vs objectif jour" = `cumulQty - dailyTarget`

## Implementation Steps

### Step 1: Add new API imports
```ts
import {
  fetchProductionChainInfo,
  fetchOrderTracking,
  fetchProductionTrend,       // NEW
  fetchProductionStoppages,   // NEW
  type ChainInfo,
  type OrderTrackingItem,
  type TrendItem,             // NEW
  type StoppageItem,          // NEW
} from "@/services/productionApi";
```

### Step 2: Update `fetchData` to call trend + stoppages
Add to `Promise.allSettled`:
```ts
const [chainsRes, orderRes, trendRes, stoppagesRes] = await Promise.allSettled([
  fetchProductionChainInfo(),
  fetchOrderTracking(),
  fetchProductionTrend(),
  fetchProductionStoppages(),
]);
```

### Step 3: Map trend data to `efficienceSerie`
```ts
const trend = trendRes.status === "fulfilled"
  ? (trendRes.value as { data: TrendItem[] }).data
  : [];

const efficienceSerie = trend.map((t) => ({ x: t.jour, v: t.eff }));
```

### Step 4: Fix hourlySchedule with real distribution
```ts
const now = new Date();
const currentHour = now.getHours();
const currentMinute = now.getMinutes();

// Calculate how many work hours have elapsed (7:30 start)
const workStart = 7.5; // 7:30
const elapsed = Math.max(0, (currentHour + currentMinute / 60) - workStart);
const totalSlots = 8;
const cumulQty = order?.cumulQty ?? 0;
const dailyTarget = order?.dailyTarget ?? chain?.objectif ?? 0;

const plages = [
  "7:30-8:30", "8:30-9:30", "9:30-10:30", "10:30-11:30",
  "11:30-12:30", "13:00-14:00", "14:00-15:00", "15:00-16:00",
];

const hourlySchedule = plages.map((plage, i) => {
  const slotStart = i < 5 ? 7.5 + i : 13 + (i - 5);
  const slotEnd = slotStart + 1;
  const inSlot = elapsed >= slotEnd ? 1 : elapsed > slotStart ? elapsed - slotStart : 0;

  const dem = dailyTarget > 0 ? Math.round(dailyTarget / totalSlots) : 0;
  const reel = inSlot > 0 ? Math.round(cumulQty * inSlot / elapsed) : 0;
  const eff = dem > 0 ? Math.round((reel / dem) * 100) : 0;

  return { plage, dem, reel, eff };
});
```

### Step 5: Map stoppages to problemes/detail
```ts
const stoppages = stoppagesRes.status === "fulfilled"
  ? (stoppagesRes.value as { data: StoppageItem[] }).data
  : [];

const lastStop = stoppages[stoppages.length - 1];
const problemes = lastStop ? lastStop.motif : "Aucun arrêt";
const detail = lastStop ? `${lastStop.duration * 60} min — chaine ${lastStop.chaine}` : "—";
```

### Step 6: Fix footer footer cards
Replace the footer section to use `OrderTrackingItem` fields directly:
```tsx
<FootCard label="Production du jour" value={order?.cumulQty ?? "—"} unit="pièces" color="#f97316" />
<FootCard label="Ecart vs objectif jour" value={order ? `+${order.cumulQty - order.dailyTarget}` : "—"} unit="pièces" color="#14b8a6" />
```

### Step 7: Update `ConfectionData` interface
Remove `samMidPct` (always N/A), or keep it but document it's unmappable.

## Verification
1. Navigate to `/v1/production-confection`
2. Check each section:
   - **Main table**: OF, designation, efficienceJ1, OWE J-1, progress bar, WIP, effectif all from API
   - **GTD card**: GTD %, OBJECTIFS AM/OJ from API
   - **GAP SAM/SOT**: from API
   - **MetricBig cards**: Effectif, SOT, SAM from API
   - **Hourly table**: Distributed from cumulQty/dailyTarget
   - **LineKpi (EFFICIENCE %)**: populated from `fetchProductionTrend`
   - **DonutKpi (PROGRESSION)**: from overallPct
   - **BarKpi charts**: from hourlySchedule (distributed)
   - **Right sidebar**: %/QTÉ CDE, BPD/EPD/Objectif from API
   - **EHD card**: from API, problemes from stoppages
   - **Footer strip**: all 8 cards from API
3. Auto-refresh works via `useLiveData` interval
