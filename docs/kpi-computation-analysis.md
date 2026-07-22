# KPI COMPUTATION PIPELINE — FULL ANALYSIS

## Overview

The KPI system has 4 stages:
1. **Config** (`config/data-mappings.php`) — defines KPI formula, variables, types, targets
2. **External API** — fetches raw data from Novacity endpoints
3. **Storage** (`kpi_data` table) — stores raw data and computed results
4. **Computing** (`KpiResultComputer`) — computes `scalar_value` and `mapped_rows`

## Variable Types

### Direct
- Single value per variable (e.g., `{Total_rejetes: 15}`)
- API returns a flat object with one row
- `variable_key` identifies which field to extract

### Complex
- Multiple rows per variable (e.g., 100 employees, 33 chains)
- API returns an array of objects
- `filter_key` identifies the join/grouping key (e.g., `EmployeeNo`, `ProdGroup`)

## Aggregation Functions

When `has_function=true` or `fn != "Latest"`:
- **Latest** — last value in the array
- **Sum** — sum of all values
- **Average** — mean of all values
- **Min** / **Max** — extremes
- **Count** — number of rows
- **First** — first value

## Computation Paths

### Path 1: Scalar Formula (Direct + no aggregation)
**When:** All variables are Direct type, no aggregation, formula exists
**Process:**
1. For each variable, call `aggregateRaw()` to get a single value
2. Feed values into `computeFormulaScalar()` to compute the result
**Result:** `scalar_value` = computed number, `mapped_rows` = null

**Example — F-REQ-102 (BR GTD):**
```
Config: Variables=[Total_rejetes, Total_colis], Formula=var0/var1*100
Raw: Total_rejetes=15, Total_colis=183
Compute: 15/183*100 = 8.20
scalar_value=8.20, mapped_rows=null, status=red (target <=5)
```

### Path 2: Row-by-Row Formula (Complex + no aggregation + multiple rows)
**When:** At least one variable is Complex type, no aggregation, multiple rows in raw data
**Process:**
1. Find join key (prefer `filter_key`, then shared keys not in variable_keys)
2. Build lookup from first variable's raw data
3. For each row in last variable, match by join key
4. Extract each variable's value from the matched rows
5. Compute formula per row
**Result:** `scalar_value` = average of all row values, `mapped_rows` = array of row results

**Example — F-REQ-201 (Efficience par OPÉRATEUR):**
```
Config: Variables=[MinuteProduite, TempsPresence_Min], both Complex
        Formula=var0/var1*100, filter_key=EmployeeNo
Raw: 100 employees, each with MinuteProduite and TempsPresence_Min
Join: on EmployeeNo
Compute per row: 
  Employee 6328: 129.6/0 = null (÷0)
  Employee 6374: 234/6*100 = 3900
  Employee 6388: 0/423*100 = 0
  ...
scalar_value = average of all valid row values = 704.92
mapped_rows = [{EmployeeNo:"6328", value:null}, {EmployeeNo:"6374", value:3900}, ...]
status = green (target >=90, but 704.92 >= 90)
```

### Path 3: Aggregated Formula (Complex + has aggregation)
**When:** Variables are Complex but have aggregation (has_function=true or fn != "Latest")
**Process:**
1. For each variable, call `aggregateRaw()` to get a single value
2. Feed values into `computeFormulaScalar()`
**Result:** `scalar_value` = computed number, `mapped_rows` = null

**Example — F-REQ-205 (WIP par chaine):**
```
Config: Variables=[WIP_Chaine(Complex,Sum), Direct]
        Formula exists but uses Sum aggregation
Raw: WIP_Chaine has 33 rows (one per chain)
Compute: aggregateRaw(Sum) → sum of all WIP values
scalar_value = -728, mapped_rows = null
```

### Path 4: Single Variable (1 variable, no formula)
**When:** Only one variable, no formula
**Process:**
1. Call `aggregateRaw()` on the single variable
**Result:** `scalar_value` = aggregated value, `mapped_rows` = null

**Example — F-REQ-211 (SAM par chaine):**
```
Config: 1 variable (TempsStandard, Complex, filtered by ProdGroup)
Raw: 33 rows (one per chain)
Compute: aggregateRaw(Latest) → last value
scalar_value = 1316.6, mapped_rows = null
```

## Decision Tree in KpiResultComputer

```
computeKpi(kpiDef):
  1. Gather raw_data for each variable
  2. Extract filter_options
  
  IF formula exists AND >= 2 variables:
    IF any variable is Complex AND no aggregation AND has multiple rows:
      → ROW-BY-ROW PATH (Path 2)
      → mapped_rows = computeRowByRow()
      → scalar_value = average of mapped_rows values
    ELSE:
      → SCALAR FORMULA PATH (Path 1)
      → scalar_value = computeFormulaScalar(aggregated values)
  ELSE:
    → SINGLE VARIABLE PATH (Path 4)
    → scalar_value = aggregateRaw(first variable)
  
  3. Compute status from scalar_value vs target
  4. Store on leader variable's row
```

## Status Computation

```php
computeStatus(value, operator, target):
  if value is null → grey
  if no operator or target → green
  
  '<=' → value <= target ? green : (value <= target*1.1 ? orange : red)
  '>=' → value >= target ? green : (value >= target*0.9 ? orange : red)
  '<'  → value < target ? green : red
  '>'  → value > target ? green : red
  '='  → value == target ? green : red
```

## Category Summary (from analysis)

| Category | Count | D/escription |
|----------|-------|-------------|
| Direct + Formula | 57 | Single-value variables with formula (e.g., BR GTD) |
| Complex + Row-by-Row | 27 | Multi-row variables, computed per row (e.g., Efficience) |
| Complex + Aggregated | 11 | Multi-row but aggregated first (e.g., WIP Sum) |
| Single Variable | 45 | One variable, no formula (e.g., SAM, OF numbers) |

## Real Examples Traced

### F-REQ-102 — BR GTD (Direct + Formula)
- **Config:** `Total_rejetes / Total_colis * 100`, target `<= 5%`
- **Raw:** 1 row: `{Total_rejetes:15, Total_colis:183}`
- **Compute:** `15/183*100 = 8.20`
- **Result:** `scalar_value=8.20`, `mapped_rows=null`, `status=red`
- **Logic check:** 8.20 > 5 → red ✓

### F-REQ-201 — Efficience par OPÉRATEUR (Complex + Row-by-Row)
- **Config:** `MinuteProduite / TempsPresence_Min * 100`, target `>= 90%`
- **Raw:** 100 employees, each with production and presence minutes
- **Compute:** Per-employee ratio, then average
- **Result:** `scalar_value=704.92`, `mapped_rows=100 rows`, `status=green`
- **Logic check:** 704.92 >= 90 → green ✓ (but value is unrealistically high due to data quality)

### F-REQ-205 — WIP par chaine (Complex + Aggregated)
- **Config:** WIP_Chaine with `Sum` aggregation, target `<= 0.5`
- **Raw:** 33 chains, each with WIP value
- **Compute:** `aggregateRaw(Sum)` → sum of all WIP
- **Result:** `scalar_value=-728`, `mapped_rows=null`, `status=green`
- **Logic check:** -728 <= 0.5 → green ✓

### F-REQ-211 — SAM par chaine (Single Variable)
- **Config:** TempsStandard (Complex, filtered by ProdGroup), no formula
- **Raw:** 33 chains
- **Compute:** `aggregateRaw(Latest)` → last value
- **Result:** `scalar_value=1316.6`, `mapped_rows=null`, `status=green`
- **Logic check:** No target operator → green ✓

### F-REQ-309 — COUVERTURE Sérigraphie (Complex + Row-by-Row + Filtered)
- **Config:** `Quantite_Entree_Serigraphie - Quantite_Produite`, target `> 0`
- **Raw:** 10 entries, 11 production rows, filtered by OF_No
- **Compute:** Per-OF subtraction
- **Result:** `scalar_value=640`, `mapped_rows=2 rows`, `status=green`
- **Logic check:** 640 > 0 → green ✓
