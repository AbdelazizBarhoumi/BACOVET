# Cross-Endpoint Smart Filtering — Situation, Critique, and Test Plan

**Source:** derived from `data.json` (84 endpoint probes, Novacity API — sources SDT, QCM, DIVATEX, DRIVE, LOCAL, COMMON)
**Purpose:** hand this to the AI agent building/fixing the filter pane. It defines the model, the failure modes to guard against, and the tests that prove the feature actually works.

---

## 1. The situation, restated precisely

You're building a Power BI-style dashboard where each visual is backed by a different REST endpoint (23 of your 84 probed endpoints return real tabular schemas; the rest are either auth, health, or currently-500ing "query" endpoints). Power BI's filter pane works because Power BI has an explicit **data model**: tables, relationships, cardinality, all defined up front by a human or auto-detected from a real database's foreign keys.

Your API gives you none of that. Each endpoint returns a flat `columns` array with **no PK/FK metadata, no types, no cardinality**. So "smart filtering" has to be reconstructed from column names alone — which is possible (your data shows real, usable patterns) but only if the matching is deliberate, not naive.

There are two distinct features you're asking for, and they need to be designed together but tested separately:

1. **Auto cross-filtering** — filter pane on the right, user picks a value, every *related* visual/endpoint updates. This requires an inferred **relationship graph**.
2. **Custom filter builder** — user manually picks columns from 2+ endpoints, the tool merges/joins them into a new filtered result, and that result should still propagate back to the source endpoints where a relationship exists.

Both depend on the same underlying thing: a correct join graph. If the graph is wrong, both features are wrong, even if the UI looks fine.

---

## 2. The relationship graph, built from your real schema

### 2.1 Genuine relationship keys (safe to auto-link)

| Key | Endpoints sharing it | Nature |
|---|---|---|
| `ShiftCode` + `ProdGroup` + `LogDate` | ItemTrxEnq, vwItemTrx, LostTimeTrx, Production, EmpDefectEff, vwDefect, reject_qte, InlineVsEndlineComparison | **Composite grain key** — the real join is all three together, not any one alone |
| `TransactionID` | ItemTrxEnq, vwItemTrx | Direct 1:1 transaction key (SDT) |
| `TerminalNo` | ItemTrxEnq, LostTimeTrx, qcmdefecttrx, vwItemTrx | Machine/terminal dimension |
| `IDMP` | mp, mpconteneur, articlescolis, detailcolis, diva_stock, vue_stock | Material master → fact tables (1:N) |
| `IDMPFamille` | mp_famille, mp, mpconteneur | Material family dimension |
| `IDOFabrication` | ofabrication, articlescolis, diva_stock, mouvement, mpconteneur | Work-order master → fact tables (1:N) |
| `IDCommande` | ofabrication, articlescolis, diva_stock, expeditions, mouvement | Order master → fact tables (1:N) |
| `IDArticle` | mp, ofabrication, articlescolis, diva_stock | Article dimension |
| `MONo` | LostTimeTrx, EmpDefectEff, codestyle | Manufacturing order — note casing varies (`MONo` vs `MONO`) |
| `SONo` | ItemTrxEnq, codestyle | Sales order |
| `IDColis` / `IDArticleColis` | articlescolis, detailcolis | Packing hierarchy |
| `LostTypeID` | LostTimeTrx, LostType | Classic dimension/fact FK |

### 2.2 The multi-hop case you specifically asked about

This is real in your data, not hypothetical:

```
ItemTrxEnq  --(TransactionID)-->  vwItemTrx  --(ShiftCode+ProdGroup+LogDate)-->  EmpDefectEff
```

`ItemTrxEnq` and `EmpDefectEff` share **no column directly**. A filter on `ItemTrxEnq.TransactionID` cannot reach `EmpDefectEff` by column-name matching — it can only get there by first resolving which `(ShiftCode, ProdGroup, LogDate)` rows that TransactionID touches in `vwItemTrx`, then using *those values* to filter `EmpDefectEff`. That's a **derived transitive filter**, not a graph edge — and it's the exact case in your prompt ("1st two share a key, the 3rd shares a different key with the 2nd, not the 1st"). Section 4.2 covers how to test this correctly, because it's the part most implementations get wrong or skip silently.

Another real 3+ hop chain in your data:
```
mp_famille --(IDMPFamille)--> mp --(IDMP)--> mpconteneur --(IDMP)--> diva_stock
```

### 2.3 Dangerous false positives (must NOT auto-link on name alone)

These columns repeat across 3-6 unrelated DIVATEX endpoints purely because they're generic audit/metadata fields:

`Etat`, `Type`, `Ordre`, `Description`, `Date`, `Document`, `Valeur`, `Unite`, `Reference`, `Couleur`, `SaisiPar`, `SaisiLe`, `ModifiePar`, `ModifieLe`, `NumInterne`, `Observations`

If your engine links tables on these, filtering `Etat = "Actif"` on `mp_famille` would try to filter `ofabrication`, `mouvement`, `expeditions` too — tables with no real relationship to a material family's status flag. This produces either silent wrong results or a filter pane that visibly "does something" to unrelated visuals, which is very likely what's making you distrust the feature right now.

**Rule to encode:** any column name below a length/specificity threshold, or on an explicit blacklist (audit fields, generic nouns), requires either (a) a second corroborating shared column between the same two endpoints, or (b) explicit human confirmation, before it's used as a join edge. `IDMPFamille` alone is enough. `Etat` alone is not.

---

## 3. What "the filter button" is supposed to do — spec it explicitly

Right now you can't tell if it's broken because it's probably not clear, even to the implementation, what "working" means. Nail these down:

1. **Direct filter (1 hop, exact key):** user filters `ProdGroup = "Chaine 12"` on the `Production` visual → every endpoint that has `ProdGroup` in its own schema (EmpDefectEff, ItemTrxEnq, LostTimeTrx, vwDefect, vwItemTrx) is filtered to rows matching that value, automatically, without the user touching those visuals.
2. **Non-applicable filter:** user filters a column that exists in only one endpoint (e.g. `SAM`, unique to ItemTrxEnq) → nothing else changes, and the UI should say so (see §5), not silently do nothing with no feedback.
3. **Transitive filter (2+ hops):** covered in §2.2 — must be an explicit, testable behavior, not an accident of whatever the graph traversal happens to do.
4. **Multiple simultaneous filters (AND across columns):** filtering `ProdGroup = X` AND `ShiftCode = Y` at once must apply both constraints together to every connected endpoint — a common bug is the second filter silently replacing the first instead of combining.
5. **Clear/reset:** clearing one filter chip must re-widen only the endpoints that were narrowed by that specific filter, not wipe unrelated filters.
6. **Cardinality awareness:** filtering a fact table by a dimension's key (e.g. `IDMP` in `diva_stock`) should narrow the dimension table (`mp`) to the matching row(s) — but filtering the dimension table by `IDMP` should fan out to *all* matching fact rows, not just one. If your join logic treats every relationship as 1:1, this will silently truncate results in one direction.

If the current filter button does none of 1-6 above and just filters the single visual it's attached to, that's not broken — it's simply not built yet, which is a different (much simpler) thing to tell the AI agent to fix versus "debug the smart filtering."

---

## 4. Custom filter builder — what "merged filtered result" should mean

You want: user selects columns from N endpoints → tool figures out the join path → returns one merged, filtered result → and (if applicable) pushes the filter back down to each source endpoint.

### 4.1 Required behavior

- **Path discovery first, merge second.** Before touching data, the tool must find a connected path through the relationship graph (§2) linking all selected columns' endpoints. If no path exists between two selected endpoints, tell the user explicitly ("No known relationship between X and Y") instead of returning a cross-join or empty result with no explanation.
- **Join type must be explicit**, not implicit. For dimension→fact (1:N) relationships, default to a left join from the "many" side so you don't lose fact rows. For fact→fact with no direct shared key (transitive case), the merge goes through the intermediate table, and duplicate/fan-out rows are expected and should be labeled, not hidden.
- **Selective push-down.** The resulting merged filter only propagates back to a source endpoint if that endpoint is actually connected — mirroring §3 rule 2. Don't push the merged filter onto every open visual indiscriminately.

### 4.2 The specific 3-endpoint case you described, testable

Given endpoints A, B, C where A↔B share key K1 and B↔C share key K2 (A and C share nothing):

- Selecting a filter value on A's K1 column → must narrow B (direct match on K1) → and only then narrow C, using the K2 values *present in the already-narrowed B rows* — not the full unfiltered B.
- Test explicitly that C's result set is smaller than or equal to what you'd get by filtering C via B without A's constraint. If it's the same, the transitive constraint from A isn't actually being applied — it's a common bug where the UI shows "3 filters active" but only the last one actually did anything.

---

## 5. Filter pane UX requirements (so "is the filter button broken" has a visible answer)

- Each filter chip should show which endpoints it actually affected (e.g. a small "5 of 12 visuals" indicator), so a no-op filter is visibly a no-op instead of looking identical to a working one.
- Hovering a cross-filtered visual should show *why* it was filtered — which key, which source column — especially important given the composite-key and transitive cases above.
- Auto-detected relationships below the blacklist confidence bar (§2.3) should be surfaced to the user as "possible relationship, not applied" so they can manually confirm it into a real edge instead of the system guessing silently.

---

## 6. Test plan for the AI agent

Build these as automated tests against the join-graph module first (pure logic, no UI), then as integration tests against the live filter pane.

### 6.1 Graph construction (unit)

| # | Test | Expected |
|---|---|---|
| 1 | Feed schemas for ItemTrxEnq + vwItemTrx | Edge created on `TransactionID` |
| 2 | Feed schemas for `mp_famille`, `mouvement`, `ofabrication` | No edge created on `Etat`/`Type` alone |
| 3 | Feed `ofabrication` + `mpconteneur`, sharing both `IDOFabrication` and `Etat` | Edge created (real key present), but `Etat` is not itself treated as a separate valid join column |
| 4 | Feed ItemTrxEnq, vwItemTrx, EmpDefectEff, LostTimeTrx, Production, vwDefect | `ShiftCode`+`ProdGroup`+`LogDate` recognized as one composite edge, not 3 independent ones |
| 5 | Feed two endpoints with no shared columns at all | No edge, and querying a path between them returns "no relationship" not an error/crash |
| 6 | Case sensitivity: `MONo` vs `MONO`, `LogDate` vs `LOGDATE` | Still matched (case-insensitive), but flagged if underlying value formats differ (see #11) |

### 6.2 Direct (1-hop) filtering (integration)

| # | Test | Expected |
|---|---|---|
| 7 | Filter `ProdGroup = X` on Production | EmpDefectEff, ItemTrxEnq, LostTimeTrx, vwDefect, vwItemTrx all narrow to ProdGroup = X |
| 8 | Filter a column unique to one endpoint (`SAM`) | No other visual changes; pane indicates "0 other visuals affected" |
| 9 | Apply `ProdGroup = X` then `ShiftCode = Y` | Both constraints active together (AND), verify row counts reflect the intersection, not just the last filter |
| 10 | Clear the `ProdGroup` filter only | ShiftCode filter remains active; ProdGroup constraint removed everywhere it was applied |

### 6.3 Transitive (multi-hop) filtering (integration)

| # | Test | Expected |
|---|---|---|
| 11 | Filter `TransactionID = T` on ItemTrxEnq | vwItemTrx narrows directly; EmpDefectEff narrows *only* via the ShiftCode/ProdGroup/LogDate values found in the now-narrowed vwItemTrx rows for T — verify EmpDefectEff's result is a subset of what an unfiltered ShiftCode/ProdGroup/LogDate query would return |
| 12 | Filter `IDMPFamille = F` on mp_famille | mp narrows to that family; mpconteneur and diva_stock narrow further via `IDMP` values from the *narrowed* mp set, not the full mp table |
| 13 | Break the chain: remove/disable the middle endpoint (B) in an A-B-C path | A can no longer cross-filter C; system reports "relationship unavailable," doesn't silently skip the constraint and show unfiltered C data |

### 6.4 Cardinality / fan-out

| # | Test | Expected |
|---|---|---|
| 14 | Filter `IDMP = X` on `mp` (dimension) | `mpconteneur`, `diva_stock`, `articlescolis` all show every matching row (fan-out), not truncated to one |
| 15 | Filter `IDMP = X` on `diva_stock` (fact) | `mp` narrows to exactly the one matching material row |

### 6.5 Custom filter builder

| # | Test | Expected |
|---|---|---|
| 16 | Select columns from A, B, C connected via A-B-C chain | Merged result built via correct path; filtering the merged view pushes down to A, B, and C individually |
| 17 | Select columns from two endpoints with no path between them | Tool refuses/warns instead of returning a silent cross-join |
| 18 | Select columns from A and C only (no direct edge, only via B) | Tool still finds the path through B even though B wasn't explicitly selected by the user |

### 6.6 Resilience (relevant given your data — ~35 of your 84 endpoints currently return HTTP 500)

| # | Test | Expected |
|---|---|---|
| 19 | Source endpoint for a cross-filter target returns 500 | Filter pane shows that visual as "unavailable," other visuals still filter correctly |
| 20 | Filter pane populates distinct values only from the currently loaded page (`limit=100&offset=0` as seen throughout your API) | Verify whether filtering on a value outside the first 100 rows works at all — if the pane only lists values from page 1, this is a real, likely bug worth checking first since every one of your endpoints paginates at 100 |

---

## 7. Suggested build order for the AI agent

1. Build the relationship graph module in isolation (§2, tests 1-6) — no UI yet.
2. Wire 1-hop filtering only (§3 rule 1, tests 7-10) and confirm the filter pane reflects real state per §5.
3. Add transitive resolution (§4.2, tests 11-13) — this is the part most likely to be missing or faked today.
4. Add the custom filter builder on top of the same graph module (tests 16-18) — it should reuse the graph, not duplicate join logic.
5. Only then chase resilience/pagination edge cases (§6.6) — they matter, but they'll mask whether the core join logic works if tackled first.

If you can export your actual current filter-pane implementation (the React/JS component and whatever builds the "relationships"), I can review it directly against this spec line by line rather than working from the schema alone.