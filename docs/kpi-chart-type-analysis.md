# KPI Chart Type Analysis — Production Pages

Comparing each KPI's assigned `graph_types` from `config/data-mappings.php` against the actual data structure from `storage/app/public/page-data.json`.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Chart type is appropriate for the data |
| ⚠️ | Chart type works but could be improved |
| ❌ | Chart type is NOT appropriate for the data |
| 🔴 | No endpoint configured (no data source) |

---

## Production KPIs

### F-REQ-102 — BR GTD
- **graph_types:** `['Big Number avec couleur']`
- **Data:** 2 vars, both `Direct`, 1-row endpoint (`colis_total_3var`). Single scalar value.
- **Verdict:** ✅ **Big Number is perfect.** Formula computes a single percentage from 2 scalar values. No time series, no breakdown.
- **Data available:** `Total_rejetes: 17`, `Total_colis: 187` → computed: 9.1%

### F-REQ-104 — RFT
- **graph_types:** `['Big Number avec couleur']`
- **Data:** 2 vars, both `Direct`, 1-row endpoints. Single scalar value.
- **Verdict:** ✅ **Big Number is perfect.** Ratio of two daily counts → single percentage.
- **Data available:** `FirstPassToday: 30703`, `ProducedToday: 10072` → but this data looks wrong (produced < OK?)

### F-REQ-106 — BR Bundling
- **graph_types:** `['Big Number avec couleur']`
- **Data:** 2 vars, both `Direct`, 1-row endpoints. Single scalar value.
- **Verdict:** ✅ **Big Number is perfect.** Ratio → single percentage.
- **Data available:** `BundleRejectToday: 0`, `BundleInspectedToday: 0` → 0% (or undefined)

### F-REQ-108 — BR Print
- **graph_types:** `['Big Number avec couleur']`
- **Data:** 2 vars, **BOTH endpoints are null**. No data source.
- **Verdict:** 🔴 **No data source.** Big Number is correct type, but card will always show grey/pending. Need to configure endpoints from Google Drive.

### F-REQ-201 — Efficience par OPERATEUR
- **graph_types:** `['Combo Bar/Line']`
- **Data:** 2 vars, both `Complex`, 100-row tables (`minutes_produites`, `minutes_presence`). Per-employee data.
- **Verdict:** ✅ **Combo Bar/Line is appropriate.** Multiple employees = multiple bars. Line can show efficiency target. Data has per-operator breakdown.
- **Improvement:** Could also use Horizontal Bar Chart for ranking operators.

### F-REQ-202 — Efficience PAR CHAINE
- **graph_types:** `['Gauge Chart (Jauge)']`
- **Data:** 4 vars, 2 with endpoints (8-row + 100-row tables), 2 without (SOT, Effectif). Formula needs all 4.
- **Verdict:** ⚠️ **Gauge works for a single value, but formula is broken** because 2 variables have no endpoint. The computed value will always be null/incomplete.
- **Issue:** SOT and Effectif have no data source → formula can't compute.

### F-REQ-203 — Efficience Cumulée
- **graph_types:** `['Line Chart (Courbe)']`
- **Data:** 3 vars, 2 with 100-row tables, 1 without (Mois en cours). Formula needs all 3.
- **Verdict:** ⚠️ **Line Chart is conceptually right** (cumulative over time), but the "Mois en cours" variable has no endpoint → formula incomplete.
- **Issue:** Missing endpoint for month filter.

### F-REQ-204 — OWE par chaine
- **graph_types:** `['Big Number avec couleur']`
- **Data:** 4 vars, 3 with endpoints (8-row, 33-row, 100-row tables), 1 without (Effectif). Complex formula.
- **Verdict:** ⚠️ **Big Number works for a computed percentage**, but the formula is broken because Effectif has no endpoint.
- **Issue:** Missing endpoint for "Effectif de la chaîne".

### F-REQ-205 — WIP par chaine
- **graph_types:** `['Gauge Chart (Jauge)']`
- **Data:** 2 vars, 1 with 33-row endpoint, 1 without (Quantite sortie). No formula.
- **Verdict:** ⚠️ **Gauge works for a single value**, but only 1 of 2 variables has data. The gauge will show engagement only, not the actual WIP ratio.
- **Improvement:** Could use Big Number if it's just a single value.

### F-REQ-206 — WIP OPTIMAL
- **graph_types:** `['Area Chart (Graph. aires)']`
- **Data:** 2 vars, both with endpoints (27-row + 37-row tables). Two time-series-like datasets.
- **Verdict:** ✅ **Area Chart is perfect.** Two overlapping series (engagement vs sortie) over time = ideal for area chart showing gap.

### F-REQ-207 — Arrêts non planifiés
- **graph_types:** `['Chronologie (Timeline)', 'Big Number avec couleur']`
- **Data:** 3 vars, 2 with endpoints (12-row lost_time + 21-row losttype), 1 without. Lost time per type.
- **Verdict:** ✅ **Both are appropriate.** Timeline shows stops over time, Big Number shows total lost minutes.
- **Improvement:** Data has per-type breakdown → could also use Pareto Chart (top stop reasons).

### F-REQ-208 — Efficience Départage
- **graph_types:** `['Combo Bar/Line']`
- **Data:** 2 vars, both `Complex`, 100-row tables. Filtered by EmployeeName.
- **Verdict:** ⚠️ **Combo Bar/Line works** but data is filtered to a single employee (Latest) → might only show 1 value, not a series.
- **Improvement:** If filtered to one person, Big Number might be better. If showing all operators, Combo works.

### F-REQ-209 — Efficience Vignettes
- **graph_types:** `['Combo Bar/Line']`
- **Data:** 2 vars, both `Complex`, 100-row tables. Filtered by EmployeeName.
- **Verdict:** ⚠️ **Same issue as F-REQ-208.** Filtered to single employee → single value, not a combo chart.

### F-REQ-210 — Top opérateurs
- **graph_types:** `['Horizontal Bar Chart']`
- **Data:** 3 vars, all `Complex`, 100-row tables. Per-employee efficiency.
- **Verdict:** ✅ **Horizontal Bar is perfect.** Ranking operators by efficiency = horizontal bars sorted by value.

### F-REQ-211 — SAM par chaine
- **graph_types:** `['Big Number avec couleur']`
- **Data:** 1 var, `Complex`, 33-row table. Single value per chain.
- **Verdict:** ✅ **Big Number is correct.** Raw value (time standard), no formula.

### F-REQ-212 — SOT par chaine
- **graph_types:** `['Big Number avec couleur']`
- **Data:** 1 var, endpoint exists but **variable_key is null**. Can't extract value.
- **Verdict:** 🔴 **Variable key missing.** Big Number is correct type, but value can't be extracted. Need to configure `variable_key` for `api/data/production`.

### F-REQ-213 — Effectifs par chaine
- **graph_types:** `['Big Number avec couleur']`
- **Data:** 1 var, **endpoint is null**. No data source.
- **Verdict:** 🔴 **No data source.** Big Number is correct type, but no data.

### F-REQ-214 — Code article par chaine
- **graph_types:** `['Big Number avec couleur']`
- **Data:** 1 var, `Complex`, 100-row table. Single value (article code).
- **Verdict:** ✅ **Big Number is correct.** Shows a code/string value, not a number chart.

### F-REQ-215 — Designation d'article
- **graph_types:** `['Big Number avec couleur']`
- **Data:** 1 var, `Complex` endpoint. Single text value.
- **Verdict:** ✅ **Big Number is correct.** Shows a description string.

### F-REQ-301 — OF confection par CHAINE
- **graph_types:** `['Big Number avec couleur', 'Liste de OF en cours non soldés']`
- **Data:** 2 vars, both `Complex`, 100-row tables (`ofabrication`). Multiple OFs.
- **Verdict:** ✅ **Both are appropriate.** Big Number shows count/first OF, List shows all active OFs with progress.

### F-REQ-302 — OF encours coupe
- **graph_types:** `['Big Number avec couleur', 'Liste de OF en cours non soldés']`
- **Data:** 3 vars, 1 with endpoint, 2 without. Incomplete.
- **Verdict:** ⚠️ **Types are correct, but 2/3 variables have no endpoint.** Data is incomplete.

### F-REQ-303 — Quantité OF par ARTICLE
- **graph_types:** `['Big Number avec couleur', 'Liste de OF en cours non soldés']`
- **Data:** 1 var, `Complex`, 100-row table. Filtered by IDArticle.
- **Verdict:** ✅ **Both are appropriate.** Shows quantity + list of OFs for that article.

### F-REQ-304 — SO Progress par OF
- **graph_types:** `['Bar Chart (par chaîne)']`
- **Data:** 2 vars, 1 with 100-row endpoint (`etat_avancement`), 1 without. **variable_key is null** on the first var.
- **Verdict:** ❌ **Bar Chart requires per-chain data, but variable_key is null** → can't extract values. Also, "par chaîne" doesn't match "par OF" semantics.
- **Improvement:** Should be Big Number or Donut if showing single OF progress. Need to configure `variable_key`.

### F-REQ-305 — Taux avancement OF
- **graph_types:** `['Donut Chart (Anneau)']`
- **Data:** 2 vars, 1 with endpoint (100-row), 1 without. **variable_key is null** on first var. Formula: `produite / OF * 100`.
- **Verdict:** ⚠️ **Donut works for a percentage**, but variable_key is null → can't extract value. Formula incomplete due to missing second var.
- **Issue:** Need to configure `variable_key` for `etat_avancement`.

### F-REQ-306 — BPD par OF
- **graph_types:** `['Big Number avec couleur']`
- **Data:** 1 var, `Complex`, 100-row table. Single date value.
- **Verdict:** ✅ **Big Number is correct.** Shows a date (Beginning Production Date).

### F-REQ-307 — EPD par OF
- **graph_types:** `['Big Number avec couleur']`
- **Data:** 3 vars, 2 with 100-row endpoints, 1 without (Cadence allouée). Single date value.
- **Verdict:** ✅ **Big Number is correct.** Shows a date (End Production Date). Cadence is supplementary.

### F-REQ-308 — EHD par OF
- **graph_types:** `['Big Number avec couleur']`
- **Data:** 2 vars, 1 with endpoint (`expeditions`), 1 without. Single date value.
- **Verdict:** ✅ **Big Number is correct.** Shows a date (Estimated Handover Date).

### F-REQ-309 — Couverture Sérigraphie
- **graph_types:** `['Bar Chart (par chaîne)']`
- **Data:** 2 vars, both with endpoints (10-row + 8-row tables). Per-chain quantities.
- **Verdict:** ✅ **Bar Chart is appropriate.** Multiple chains with input/output quantities = bars comparing chains.

### F-REQ-310 — Couverture chaîne
- **graph_types:** `['Bar Chart (par chaîne)']`
- **Data:** 3 vars, 1 with 42-row endpoint, 2 without (planifiée, cadence). Incomplete.
- **Verdict:** ⚠️ **Bar Chart is conceptually right** but formula can't compute without planifiée and cadence.

### F-REQ-311 — Couverture Coupe
- **graph_types:** `['Big Number avec couleur']`
- **Data:** 3 vars, 2 with endpoints (42-row + 37-row), 1 without (cadence). Formula: `(lancée - coupée) / cadence`.
- **Verdict:** ⚠️ **Big Number works** but formula is incomplete (cadence missing). Shows raw gap value.

### F-REQ-312 — Objectif par chaîne
- **graph_types:** `['Big Number avec couleur']`
- **Data:** 1 var, **endpoint is null**. No data source.
- **Verdict:** 🔴 **No data source.** Big Number is correct type, but no data.

---

## Summary: Issues Found

### KPIs with missing data sources (will always show grey)
| KPI | Issue |
|-----|-------|
| F-REQ-108 | Both endpoints null (Google Drive source) |
| F-REQ-212 | variable_key is null |
| F-REQ-213 | Endpoint is null |
| F-REQ-312 | Endpoint is null |

### KPIs with incomplete formulas (missing variables)
| KPI | Missing Variable |
|-----|-----------------|
| F-REQ-202 | SOT + Effectif (no endpoints) |
| F-REQ-203 | Mois en cours (no endpoint) |
| F-REQ-204 | Effectif (no endpoint) |
| F-REQ-205 | Quantite sortie (no endpoint) |
| F-REQ-304 | variable_key is null |
| F-REQ-305 | variable_key is null + Quantite OF missing |
| F-REQ-310 | Quantite planifiée + Cadence (no endpoints) |
| F-REQ-311 | Cadence hebdomadaire (no endpoint) |

### KPIs where chart type could be improved
| KPI | Current Type | Suggested | Reason |
|-----|-------------|-----------|--------|
| F-REQ-201 | Combo Bar/Line | Horizontal Bar | Shows operator ranking, not time series |
| F-REQ-208 | Combo Bar/Line | Big Number | Filtered to single employee → 1 value |
| F-REQ-209 | Combo Bar/Line | Big Number | Filtered to single employee → 1 value |
| F-REQ-304 | Bar Chart (par chaîne) | Donut Chart | Shows single OF progress %, not per-chain |
| F-REQ-207 | Timeline + Big Number | + Pareto | Has per-type breakdown → Pareto adds value |

### KPIs where chart type is ✅ perfect
| KPI | Type | Why |
|-----|------|-----|
| F-REQ-102 | Big Number | Single computed percentage |
| F-REQ-104 | Big Number | Single computed percentage |
| F-REQ-106 | Big Number | Single computed percentage |
| F-REQ-206 | Area Chart | Two overlapping time series |
| F-REQ-207 | Timeline + Big Number | Stops + total lost time |
| F-REQ-210 | Horizontal Bar | Operator ranking |
| F-REQ-211 | Big Number | Raw time value |
| F-REQ-214 | Big Number | Text/code value |
| F-REQ-215 | Big Number | Text description |
| F-REQ-301 | Big Number + List | Count + active OF list |
| F-REQ-303 | Big Number + List | Quantity + OF list |
| F-REQ-306 | Big Number | Date value |
| F-REQ-307 | Big Number | Date value |
| F-REQ-308 | Big Number | Date value |
| F-REQ-309 | Bar Chart | Per-chain input/output |

---

## Recommendations

1. **Fix missing endpoints** for F-REQ-108, 212, 213, 312 — these KPIs can never show data.
2. **Fix missing variable_keys** for F-REQ-202 (SOT, Effectif), F-REQ-304, F-REQ-305 — formulas are broken.
3. **Change chart type** for F-REQ-208, 209 from Combo Bar/Line to Big Number (filtered to single employee = 1 value).
4. **Add Pareto Chart** to F-REQ-207 alongside Timeline and Big Number (has per-type breakdown data).
5. **Consider Big Number** for F-REQ-304 instead of Bar Chart (shows single OF progress, not per-chain comparison).
