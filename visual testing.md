## Your Optimized Prompt

**Target:** Claude  
**Mode:** DETAIL  
**Task type:** Full implementation, testing, debugging, and verification

You are a senior QA automation engineer, Playwright expert, and Power BI-style analytics application specialist.

Work directly in the existing BACOVET repository. Do not stop after writing a plan. Create the plan, implement the tests, run them, investigate failures, fix the application or tests when appropriate, and continue until the complete test campaign is finished.

### Objective

Perform a complete functional verification of the V5 report editor, focusing on everything exposed under:

- **Filters**
- **Visualizations**
- **Data**

The goal is to verify that the editor behaves correctly for all supported data types, chart types, field combinations, filters, aggregations, interactions, saved states, and edge cases.

Use real Playwright browser tests for UI behavior and lower-level unit/component tests where they provide faster and more reliable coverage.

Do not test or modify the head/ribbon banner in this task. Leave it untouched for future testing.

### Repository context

The project is located at:

BACOVET

Relevant areas include:

- Panes.tsx
- Canvas.tsx
- VisualView.tsx
- model.ts
- store.tsx
- datasets.ts
- [slug].tsx
- BuilderPageV5Test.php

The application uses React, TypeScript, Laravel, Vite, Vitest, and Playwright/browser automation.

### Important rules

1. Do not assume that a feature works because the UI renders.
2. Test the actual resulting state, data, labels, filtering, aggregation, and persistence.
3. Do not use only the existing `test` report if modifying it could destroy useful data. Create a dedicated isolated test report or fixture when possible.
4. If a dedicated fixture cannot be created, snapshot the current state before testing and restore it afterward.
5. Never leave test-created visuals, pages, filters, bookmarks, or slicer selections in the user’s report.
6. Use a deterministic dataset containing:
   - Text columns
   - Numeric columns
   - Integer values
   - Decimal values
   - Zero values
   - Negative values
   - Null values
   - Boolean values
   - Date values
   - Empty datasets
   - Duplicate column names in different tables
   - Long strings
   - Special characters
   - Whitespace values
7. Use table-qualified field identity everywhere.
8. Verify both light and empty states.
9. Verify every important behavior after a full page reload.
10. Do not claim that a test passed without actual evidence.
11. Do not provide time estimates. Use phases and completion criteria instead.

## Required execution process

### Phase 1 — Repository and feature audit

Before editing anything:

1. Inspect the current implementation of:
   - Panes.tsx
   - Canvas.tsx
   - VisualView.tsx
   - store.tsx
   - model.ts
   - datasets.ts
   - V5 page loading and persistence
2. Enumerate every visible control under:
   - Filters
   - Visualizations
   - Data
3. Map each control to:
   - Its UI element
   - Its state
   - Its mutation function
   - Its rendering path
   - Its persistence behavior
4. Identify unsupported, placeholder, incomplete, or misleading features.
5. Compare the current behavior with:
   - The intended project behavior
   - Reasonable Power BI expectations
6. Do not force Power BI parity for intentionally simplified placeholder visuals. Clearly classify each feature as:
   - Fully implemented
   - Partially implemented
   - Placeholder
   - Broken
   - Not supported by design

### Phase 2 — Deterministic test fixture

Create or reuse an isolated fixture containing:

```text
Tables:
- sales
- sales_duplicate
- dates
- empty_table

Fields:
- Category: text
- Region: text
- Product: text
- Amount: integer
- DecimalAmount: decimal
- Quantity: integer
- SaleDate: date
- IsReturned: boolean
- NullableValue: nullable numeric
- DuplicateName: same field name in at least two tables
```

Include known rows with manually calculable expected results.

Create at least:

- Two report pages
- One Cartesian chart
- One table
- One matrix
- One card
- One KPI
- One gauge
- One slicer
- One list slicer
- One input slicer
- One date slicer
- One tooltip page

Reset the fixture before each independent test group.

### Phase 3 — Data pane testing

Test all Data functionality.

#### Field groups

Verify:

- Measures group appears
- Every dataset group appears
- Tables expand and collapse
- Fields appear only when their group is open
- Empty groups are handled correctly
- Duplicate field names show table identity
- Field type icons are correct:
  - Number
  - Text
  - Date
  - Boolean
  - Measure
- Field tooltips show the correct table and field

#### Search

Test:

- Empty search
- Lowercase search
- Uppercase search
- Partial field search
- Table-name search
- No results
- Clearing the search
- Special characters
- Search after expanding and collapsing groups

#### Field insertion

Test every field type:

- Text field
- Numeric field
- Decimal field
- Date field
- Boolean field
- Measure

Verify default placement:

- Normal chart:
  - Dimensions → Axis
  - Numeric fields → Values
  - Measures → Values
- Slicer:
  - All fields → Field/Axis

#### Data checkboxes

Verify:

- Unchecked field adds correctly
- Checked field is displayed as checked
- Clicking again removes it
- Removal works from every well
- Same-name fields from different tables remain independent
- Repeated clicks do not create duplicates

#### Drag/drop

Test dragging fields into:

- X-axis/Rows
- Legend/Columns
- Values
- Tooltips
- Small multiples
- Drill fields
- Existing visuals
- Empty canvas

Use:

- Valid JSON payload
- Plain text payload
- Malformed JSON
- Missing field name
- Missing table
- Unknown table
- Duplicate field
- Same-name fields across tables

Confirm:

- Valid fields are normalized
- Invalid fields are rejected safely
- Raw JSON never appears in the UI or saved state

#### Double-click behavior

Verify:

- Text/date fields can add filters
- Numeric fields follow the documented behavior
- Boolean fields follow the documented behavior
- Measures are not incorrectly added as filters
- Duplicate filters are not created

### Phase 4 — Filters testing

Test all filter controls and behaviors.

#### Filter field list

Verify:

- Text fields are available
- Date fields are available
- Numeric fields follow the intended product rule
- Boolean fields follow the intended product rule
- Table-qualified duplicate fields appear correctly
- Empty tables do not crash the pane

#### Adding filters

Add filters using:

- The Filters dropdown
- Data field double-click

Verify:

- A filter card appears
- The selected table is correct
- `(All)` appears when no values are selected
- Duplicate filter insertion is prevented

#### Filter values

Test:

- Selecting one value
- Selecting multiple values
- Removing one selected value
- Removing all selected values
- Values containing spaces
- Empty/null values
- Special characters
- Long values
- Values after another filter is active

#### Filter scope

Test:

- All pages
- Current page
- Switching from all pages to current page
- Switching from current page to all pages
- Navigating between pages
- Save/reload behavior

#### Filter effects

Verify filters update:

- Column charts
- Bar charts
- Line charts
- Area charts
- Combo charts
- Pie/donut charts
- Tables
- Matrices
- Cards
- KPIs
- Gauges
- Slicers
- Tooltips
- Small multiples
- Special visuals that consume filtered rows

Verify unrelated tables do not receive incorrect filters.

#### Removing filters

Verify:

- Remove button deletes the filter
- All rows return
- Slicer options return
- Aggregates return to original values
- No stale filter remains after reload

### Phase 5 — Visualizations / Build visual

Test every visual type exposed by the editor.

#### Cartesian visuals

Test:

- Column
- Stacked column
- 100% stacked column
- Bar
- Stacked bar
- 100% stacked bar
- Line
- Area
- Stacked area
- Combo
- Ribbon
- Waterfall

#### Distribution visuals

Test:

- Pie
- Donut
- Treemap
- Funnel
- Scatter
- Bubble

#### Single-value and table visuals

Test:

- Card
- KPI
- Gauge
- Table
- Matrix

#### Maps

Test:

- Map
- Filled map
- Shape map

If maps are placeholders, verify their current documented placeholder behavior and ensure they do not crash.

#### Slicers

Test:

- Checkbox slicer
- Button slicer
- List slicer
- Input slicer
- Date slicer

#### Special visuals

Test:

- Decomposition tree
- Key influencers
- Smart narrative
- Q&A
- R visual
- Python visual
- Text box
- Image
- Button

For every visual type verify:

- It can be created
- It can be selected
- It can be removed
- It renders its empty state
- It renders with valid data
- It does not produce raw JSON labels
- It does not throw browser errors
- It can be saved and reloaded
- It behaves safely with empty data
- It behaves safely with null data

### Phase 6 — Field wells

Test:

- X-axis/Rows
- Field for slicers
- Legend/Columns
- Values
- Small multiples
- Tooltips
- Extraction/drill fields

Verify:

- Axis allows the intended number of fields
- Legend replacement works
- Values supports multiple fields
- Duplicate prevention works
- Remove buttons work
- Drag/drop works
- Saved wells reload correctly
- Malformed fields are discarded safely
- Table identity is preserved

### Phase 7 — Aggregations

Test all aggregation options:

- Sum
- Average
- Count
- Distinct count
- Minimum
- Maximum

Test with:

- Positive values
- Zero values
- Negative values
- Decimal values
- Null values
- Empty rows
- Text fields
- Date fields
- Boolean fields
- Built-in measures such as Row Count

Verify:

- Numeric result
- Displayed label
- Chart series key
- Tooltip label
- Card label
- KPI label
- Gauge value
- Table header
- Matrix header
- Saved aggregation
- Reloaded aggregation

Expected labels should be checked exactly:

```text
Sum of Amount
Average of Amount
Count of Amount
Distinct count of Amount
Min of Amount
Max of Amount
```

### Phase 8 — Format tab

Test all controls:

- Title
- Show title
- Text content
- Button content
- Image URL
- Show legend
- Data labels
- Border
- Shadow
- Conditional formatting
- Totals/subtotals
- Palette offset from 0 through 7
- Alt text
- X position
- Y position
- Width
- Height

Test:

- Minimum values
- Zero values
- Negative values
- Very large values
- Invalid numeric input
- Save/reload behavior

Verify type-specific controls:

- Text appears only for text/button visuals
- Image URL appears only for image visuals
- Chart controls do not break text/image visuals
- Table controls work only where supported

### Phase 9 — Page format

When no visual is selected, test:

- 16:9 preset
- 4:3 preset
- Letter preset
- Tooltip preset
- Custom preset
- Width
- Height
- Background
- Tooltip page flag
- Hidden page flag
- Page navigation
- Save/reload

Verify invalid dimensions are rejected or safely clamped.

### Phase 10 — Analytics

Test:

- Constant line
- Average line
- Trend line
- Forecast line

Test on:

- Column
- Bar
- Line
- Area
- Stacked charts
- Combo
- Empty data
- Negative data
- Multiple series
- Unsupported visual types

Verify:

- Toggle on
- Toggle off
- Repeated toggle is idempotent
- Line renders correctly
- Save/reload works
- No runtime error occurs

If trend and forecast are placeholders rather than real calculations, document that clearly and test the actual supported behavior.

### Phase 11 — Slicers

#### Checkbox and list slicers

Test:

- Option population
- Single selection
- Multiple selection
- Clear
- Selected styling
- Empty data
- Null values
- Long option values
- Same-name fields across tables

#### Button slicer

Test:

- Button rendering
- Selection styling
- Multiple selection
- Clear behavior
- Filter propagation

#### Input slicer

Test:

- Search text
- Case-insensitive search
- No-match search
- Clearing search
- Selecting a result
- Multiple selected values
- Filter propagation

#### Date slicer

Test:

- From date
- To date
- From only
- To only
- Full range
- Invalid/reversed range
- Clear
- Save/reload
- Page sync

Verify the date range affects all relevant visuals.

### Phase 12 — Cross-filtering and interactions

Test chart-originated cross-filtering from:

- Column
- Bar
- Line
- Combo
- Pie
- Donut
- Map
- Scatter
- Bubble
- Table where supported

Verify:

- Clicking a category filters compatible target visuals
- Clicking the same category clears the filter
- Context-menu clear works
- Slicer and chart filters work together
- Same-name fields from different tables do not collide
- Cross-filter is cleared after normal reload
- Bookmark restore works if intentionally supported

Test interaction modes:

- Filter
- Highlight
- None

Verify the selected target visual behaves according to the chosen mode.

If highlight is intended to preserve all rows and visually emphasize only a subset, verify that behavior explicitly. Do not accept ordinary filtering as true highlighting without documenting it.

### Phase 13 — Tooltip pages and drill behavior

Test:

- Default tooltip page
- Selecting each page as a tooltip page
- Hover popup
- Tooltip filtering
- Different source and tooltip tables
- Missing tooltip page
- Deleted tooltip page
- Save/reload

Test drill fields:

- Add multiple drill fields
- Drill down
- Drill up
- Boundary levels
- Empty drill fields
- Save/reload

### Phase 14 — Persistence

Test save/reload for:

- Visual types
- Visual titles
- Field wells
- Aggregations
- Filters
- Filter scope
- Slicer selections
- Date ranges
- Tooltips
- Analytics
- Format settings
- Page format
- Bookmarks
- Sync slicers
- Hidden visuals
- Visual order
- Cross-filter transient state
- Legacy malformed field state

Verify no state is silently lost.

### Phase 15 — Automated test implementation

Create or extend:

- Model tests
- Store/provider tests
- Filter tests
- Component tests
- Playwright browser tests
- Laravel layout API tests

Use stable selectors and accessible labels.

Every feature must have:

1. A unit/store assertion where appropriate.
2. A Playwright browser test for the user-visible behavior.
3. A save/reload assertion when state is persistent.
4. Edge-case coverage.
5. Evidence in the final report.

### Phase 16 — Execution rules

Run tests in phases:

1. Fixture and data loading
2. Data pane
3. Filters
4. Build visual
5. Field wells and aggregation
6. Format
7. Page format
8. Analytics
9. Slicers
10. Cross-filtering
11. Tooltip/drill behavior
12. Persistence
13. Full regression suite

After each phase:

- Run the focused tests.
- Inspect browser console errors.
- Inspect failed network requests.
- Review screenshots or DOM evidence.
- Fix application defects where appropriate.
- Re-run the failed test.
- Continue until the phase is green.

Then run:

```text
npm run types
npm test
npm run build
npm run lint
php artisan test --filter=BuilderPageV5Test
```

Do not stop after discovering failures. Classify each failure as:

- Application defect
- Test defect
- Fixture/data defect
- Unsupported-by-design behavior
- Pre-existing unrelated failure

Fix defects in the application or tests, then rerun the relevant phase.

### Final report requirements

Produce a detailed final report containing:

- Files changed
- Tests added
- Tests executed
- Features tested
- Passed scenarios
- Failed scenarios
- Known limitations
- Unsupported-by-design features
- Browser screenshots/evidence
- Console/network errors
- Persistence results
- Remaining blockers
- Exact commands used
- Final regression status

Do not use time estimates. Report progress by phase completion only.

Do not claim complete Power BI parity for placeholder visuals. Compare behavior against Power BI expectations, clearly identify differences, and verify that each difference is either implemented, intentionally supported, or documented as unsupported.

### Success criteria

The campaign is complete only when:

- Every control under Filters, Visualizations, and Data has been tested.
- Every visual type has been instantiated and checked.
- Every data type has been tested.
- Every aggregation has been tested.
- Every filter and slicer mode has been tested.
- Cross-filtering and interaction modes have been tested.
- Save/reload behavior has been tested.
- Invalid and empty states have been tested.
- No raw JSON field labels appear.
- No unclassified browser/runtime errors remain.
- The full test report clearly separates supported behavior from placeholders and intentional limitations.
- The head banner remains untouched and is listed as deferred future coverage.

## Key improvements

- Converted the request into an executable phased workflow.
- Added explicit Playwright coverage.
- Added data-type and edge-case matrices.
- Added persistence and reload testing.
- Added failure classification and retry requirements.
- Added Power BI comparison without falsely requiring unsupported parity.
- Added fixture isolation to protect the existing report.
- Removed ambiguity around “test everything” by defining completion criteria.
- Prevented the AI from stopping after writing only a plan.