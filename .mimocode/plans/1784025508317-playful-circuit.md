# Plan: Add "None" option to Endpoint column dropdown

## Problem
In the Data page, the Endpoint column dropdown (`EndpointSelector`) currently only shows available endpoint slugs. There's no way to clear/deselect an endpoint once selected — the user wants to be able to select "nothing" (null).

## Approach: Add `clearable` prop to `LightDropdown`

The `LightDropdown` component (aliased as `DataSelect`) is a generic dropdown used throughout the data page. We'll add a `clearable` prop that renders a "no selection" item at the top of the dropdown.

### Changes

#### 1. `resources/js/components/LightDropdown.tsx`
- Add `clearable?: boolean` prop to `LightDropdown`
- When `clearable` is true, render an additional option at the top of the dropdown content:
  ```
  ┌──────────────────────┐
  │ — Aucun —            │  ← new "none" option (value="")
  │ api/data/endpoint1   │
  │ api/data/endpoint2   │
  │ ...                  │
  └──────────────────────┘
  ```
- When the "none" option is clicked, call `onValueChange("")` and close the dropdown
- The trigger button should show the placeholder text when value is empty/undefined (already works since `!value` check uses the placeholder)

#### 2. `resources/js/routes-v1/pages/data.tsx` (~line 707)
- Add `clearable` to the `DataSelect` inside `EndpointSelector`:
  ```tsx
  <DataSelect
    value={row.endpoint ?? undefined}
    onValueChange={(val) => onEndpointChange(val || null)}
    clearable          // ← add this
    className={...}
    placeholder="— sélectionner —"
  >
  ```

### Why this works end-to-end
1. User opens endpoint dropdown → sees "— Aucun —" at top + all endpoint slugs
2. User clicks "— Aucun —" → `onValueChange("")` fires
3. `EndpointSelector` receives `""` → `val || null` maps it to `null`
4. `onEndpointChange(null)` clears the endpoint in the row state
5. The trigger button shows "— sélectionner —" (placeholder) since value is now empty

### Files to modify
1. `resources/js/components/LightDropdown.tsx` — add `clearable` prop + "none" option rendering
2. `resources/js/routes-v1/pages/data.tsx` — pass `clearable` to `EndpointSelector`'s `DataSelect`

### Verification
- Open the data page at `/data`
- In any row's Endpoint column, open the dropdown
- Verify "— Aucun —" appears at the top of the dropdown list
- Select "— Aucun —" → verify the endpoint is cleared and the dropdown shows "— sélectionner —"
- Verify existing endpoint selection still works normally
- Verify the search filter doesn't affect the "— Aucun —" option (it should always show)
