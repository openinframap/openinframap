# Map-first Layers panel

## Goal

Make the map the primary surface on first load. The unified Layers control should start as an icon, open into a compact panel, and only grow tall when the user drills into power filters.

## Background

The fork already unifies background layers, infrastructure toggles, and power filters in `UnifiedMapOptionsControl`. Today the panel starts expanded at ~70vh, which covers a large share of the map before the user has interacted. This change keeps that single-panel model and adjusts open/close and height behavior only.

## Behavior

### Initial state

- Layers starts **collapsed** (29×29 icon button), matching the Key control footprint.
- The map is unobstructed on load.
- URL hash layer visibility still applies; hash sync must **not** auto-open the panel.

### Open (compact)

- Clicking the icon opens the panel in **compact** mode.
- Compact max-height is approximately **42vh**.
- Compact mode uses slightly denser row and section-header padding than the current panel.
- Panel width remains ~15rem (existing `min-width`); no new colors or chrome.

### Tall mode

- Expanding any of the power subsections — **Power plants**, **Substations**, or **Power lines** — adds a tall-mode class (e.g. `oim-unified-options--tall`).
- Tall max-height is approximately **70vh** (current behavior).
- Tall mode restores the current (less dense) spacing so long filter lists stay readable.
- Collapsing **all three** power subsections returns the panel to compact height.
- Expanding/collapsing non-power sections (Background, Infrastructure, Pipelines & utilities, Overlays, Heatmaps, Validation) does **not** by itself trigger tall mode.

### Close

- Close via:
  - Clicking the Layers icon again
  - **Escape** (only while the panel is open)
  - **Pointer down outside** the Layers control
- Outside-click handlers must ignore events whose target is inside the Layers control.
- Closing clears tall mode so the next open is always compact.

### Section defaults when opened

On each open (and as the constructed default state):

| Section | Default |
| --- | --- |
| Background | Expanded |
| Infrastructure | Expanded |
| Power plants / Substations / Power lines | Collapsed |
| Pipelines & utilities | Collapsed |
| Overlays | Collapsed |
| Heatmaps | Collapsed |
| Validation | Collapsed |

## Visual density

- Compact-only tighter spacing: row vertical padding ~4px (vs ~6px), section headers ~6px.
- Icon header stays icon-only (no chevron on the 29×29 button). Height mode is expressed only through max-height / scroll / spacing classes.
- Reuse existing `--oim-*` design tokens. No theme or brand changes.

## Architecture

### Files to change

- `web/src/unified-map-options.ts` — start collapsed; apply section defaults; track power-subsection expansion for tall mode; Esc + outside-click close; clear tall mode on close.
- `web/src/index.css` — compact vs tall max-height; denser compact spacing; tall-mode class styles.

### Files not in scope

- `web/src/power-plant-filter.ts` and legacy `.oim-plant-filter*` CSS — leave unused unless they block this work.
- URL hash filter encoding, mobile layout pass, light theme, “Hide …” checkbox UX rewrite.

### Control surface

Keep a single `UnifiedMapOptionsControl` instance. Height mode is a CSS class on the existing container, toggled from subsection expand/collapse handlers. No second nested panel or drawer.

### Outside click / Esc

Register listeners when the panel opens; remove them when it closes (or when the control is removed). Prefer `pointerdown` on `document` with capture or bubble that checks `event.target` against the control root. Esc handler calls the same close path as the icon toggle.

## Error handling and edge cases

- If the map style reloads, panel open/closed and height mode follow the control’s own state (do not force-open).
- `_syncPanelFromState` continues to sync checkbox/radio checked state only; it does not open the panel.
- Rapid toggle of power subsections should not leave a stale tall class when all three are collapsed.
- Closing while a power subsection is expanded still clears tall mode. **On each open, reset section expand/collapse state to the defaults table** so compact-first is predictable.

## Testing

Extend `web/tests/puppeteer.test.ts` (or a sibling test file under `web/tests/`) to cover:

1. Layers control is collapsed on initial page load (panel not visible / has collapsed class).
2. Opening Layers yields compact mode (tall class absent).
3. Expanding a power subsection applies the tall class.
4. Escape closes the panel.

Keep existing page-load smoke tests green. Manual check: compact ↔ tall ↔ close ↔ reopen compact.

## Success criteria

- First viewport is map-first: only the Layers icon appears among the unified options chrome until the user opens it.
- Opening Layers does not cover most of the map unless the user expands power filters.
- Close via icon, Esc, and outside click all work without breaking map panning afterward.
- No regressions to layer visibility toggles or power filter application.
