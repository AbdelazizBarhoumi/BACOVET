---
name: spec-compliance-audit
description: Audit a BACOVET dashboard page against its CDC/finalspecs.md specification to find and fix missing KPIs, wrong formulas, wrong layout, or missing features.
---

# Spec Compliance Audit

Audit a single BACOVET dashboard page against its CDC/finalspecs.md specification. Identifies every KPI, feature, and layout element that is missing, extra, or incorrect in the code, then fixes all gaps.

## When to use

- User says "check page X against spec", "CDC compliance for X", "verify X against finalspecs"
- User says "adherence to specs", "follow the spec strictly", "KPI audit"
- After adding or restructuring a page, verify it matches the spec
- When the user provides a per-tab KPI table, use that as the ground truth instead of finalspecs.md page definitions

## Inputs

- **Spec document**: `finalspecs.md` or user-provided CDC spec text (may be pasted in chat)
- **Page name**: which page to audit (quality, production, admin, logistics, methodes, development)
- **Per-tab overrides** (optional): if the user provides explicit KPI tables per tab, those override the page-level spec definitions

## Procedure

### Step 1 — Extract the spec's KPI/feature list

1. Read the spec document (finalspecs.md or user-provided text).
2. For the target page, extract every KPI code (F-REQ-XXX) with its:
   - Formula / calculation description
   - Source data field(s) from Novacity API
   - Display type (card, gauge, chart, table, etc.)
   - Any special notes (e.g., conditional visibility, tab-specific)
3. If per-tab overrides exist, use those instead of the page-level list.

### Step 2 — Find the page component files

1. Search for the page component:
   ```
   glob(**/*<page-name>*.tsx)
   grep("<page-name>|<PageName>") in resources/js/pages/ or resources/js/routes-v1/pages/
   ```
2. Also locate the KPI configuration file(s):
   ```
   glob(**/kpi-rows.ts)
   grep("F-REQ-") in relevant files
   ```
3. Read both the page component and the KPI config.

### Step 3 — Map spec KPIs to code

For each KPI in the spec list, check:
- Is there a corresponding row/entry in the code?
- Does the formula in code match the spec?
- Is the display type correct (card vs gauge vs chart)?
- Is it visible on the correct tab?

Build a gap list:
- **Missing in code**: KPI exists in spec but not in the page component or kpi-rows config
- **Extra in code**: KPI exists in code but NOT in spec (flag for removal unless user confirms)
- **Wrong formula**: Formula in code doesn't match spec
- **Wrong display**: Type (card/gauge/chart) doesn't match spec
- **Wrong tab**: KPI appears on wrong tab or is missing from its expected tab

### Step 4 — Fix all gaps

Apply fixes in order:
1. Remove extra KPIs not in spec (unless flagged by user as needed)
2. Add missing KPIs with correct formula, source, and display type
3. Fix incorrect formulas
4. Fix wrong display types
5. Fix tab visibility

### Step 5 — Verify

1. Run typecheck: `npx tsc --noEmit --pretty 2>&1`
2. Run build: `npx vite build 2>&1 | Select-String -Pattern "built in|error"`
3. If tests exist for this page: `php artisan test tests/Feature/Api/<Page>Test.php 2>&1`

### Step 6 — Report

Summarize what was found and fixed:
- List of KPIs that were missing (and now added)
- List of KPIs that were extra (and now removed)
- List of formula/display fixes
- Any KPIs you could NOT fix (missing source data, ambiguous spec)

## Key rules from MEMORY.md

- **Zero mock/localStorage across ALL pages**: No page may import from `@/lib/mock`. All data comes from Laravel backend API only.
- **Each KPI = one row in kpi-rows.ts**: No split numerator/denominator rows. The `variable` field contains the full formula description.
- **Dashboard is CONSULTATION-ONLY**: No edit/update modals. KPI detail modals are read-only.
- **User's per-tab KPI tables override finalspecs.md**: When the user provides explicit per-tab tables, those are authoritative.
- **Per-tab grid layouts must be fully separate**: Don't use conditional rendering inside shared grid; duplicate the full grid per tab.

## Common pitfalls

- `MySQL JSON columns cannot have default values`: Remove `->default()` from migrations, handle in model/seeder.
- `Laravel validation: use nullable|string` for optional text fields, not `sometimes|string`.
- Missing `SelectLabel` must be inside `SelectGroup` — use plain `<div>` instead.
- JSX ternary removal pitfall: when replacing `{condition ? A : B}` with just `A`, remove the closing `)}` too.
