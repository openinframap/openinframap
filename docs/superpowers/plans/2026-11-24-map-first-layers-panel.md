# Map-first Layers Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Layers starts collapsed; opens compact (~42vh); grows tall (~70vh) only when a power filter subsection is expanded; closes via icon, Esc, or outside click.

**Architecture:** Keep a single `UnifiedMapOptionsControl`. Drive open/close and height with CSS classes on the existing container (`oim-unified-panel-collapsed`, `oim-unified-options--tall`, compact spacing). On each open, reset section expand/collapse to the defaults table. Register Esc/`pointerdown` listeners only while open.

**Tech Stack:** TypeScript, redom, MapLibre GL controls, CSS custom properties (`--oim-*`), Vitest + Puppeteer e2e.

## Global Constraints

- Touch only `web/src/unified-map-options.ts`, `web/src/index.css`, and `web/tests/puppeteer.test.ts` (or a sibling under `web/tests/`).
- Do not change URL hash encoding, mobile layout, light theme, or the “Hide …” checkbox UX.
- Do not rewrite or delete `power-plant-filter.ts` / legacy `.oim-plant-filter*` CSS unless they block this work.
- Reuse existing `--oim-*` tokens; no new brand colors.
- Tall class name must be exactly `oim-unified-options--tall`.
- Compact max-height ≈ 42vh; tall max-height ≈ 70vh.
- On each open, reset section expand/collapse to: Background + Infrastructure expanded; power subsections, Pipelines & utilities, Overlays, Heatmaps, Validation collapsed.
- Hash sync must not auto-open the panel.

---

### Task 1: Failing Puppeteer coverage for map-first Layers

**Files:**
- Modify: `web/tests/puppeteer.test.ts`
- Test: `web/tests/puppeteer.test.ts`

**Interfaces:**
- Consumes: DOM selectors `.oim-unified-options`, `.oim-unified-header-icon`, `.oim-unified-panel-collapsed`, `.oim-unified-options--tall`, `[data-power-subsection]` (added in Task 3)
- Produces: four e2e assertions matching the spec success criteria

- [ ] **Step 1: Append Layers describe block to the test file**

Add after the existing `Page structure` describe:

```ts
describe('Layers panel map-first behavior', () => {
  beforeAll(async () => {
    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 30000
    })
    await page.waitForSelector('.oim-unified-options')
  }, 30000)

  test('starts collapsed on load', async () => {
    const collapsed = await page.$eval('.oim-unified-options .oim-unified-panel', (el) =>
      el.classList.contains('oim-unified-panel-collapsed')
    )
    expect(collapsed).toBe(true)
    const tall = await page.$eval('.oim-unified-options', (el) =>
      el.classList.contains('oim-unified-options--tall')
    )
    expect(tall).toBe(false)
  })

  test('opens in compact mode without tall class', async () => {
    await page.click('.oim-unified-header-icon')
    const collapsed = await page.$eval('.oim-unified-options .oim-unified-panel', (el) =>
      el.classList.contains('oim-unified-panel-collapsed')
    )
    expect(collapsed).toBe(false)
    const tall = await page.$eval('.oim-unified-options', (el) =>
      el.classList.contains('oim-unified-options--tall')
    )
    expect(tall).toBe(false)
  })

  test('expanding a power subsection applies tall class', async () => {
    // Ensure open
    const isCollapsed = await page.$eval('.oim-unified-options .oim-unified-panel', (el) =>
      el.classList.contains('oim-unified-panel-collapsed')
    )
    if (isCollapsed) {
      await page.click('.oim-unified-header-icon')
    }
    await page.click('[data-power-subsection="plants"] .oim-unified-section-header')
    const tall = await page.$eval('.oim-unified-options', (el) =>
      el.classList.contains('oim-unified-options--tall')
    )
    expect(tall).toBe(true)
  })

  test('Escape closes the panel', async () => {
    const isCollapsed = await page.$eval('.oim-unified-options .oim-unified-panel', (el) =>
      el.classList.contains('oim-unified-panel-collapsed')
    )
    if (isCollapsed) {
      await page.click('.oim-unified-header-icon')
    }
    await page.keyboard.press('Escape')
    const collapsed = await page.$eval('.oim-unified-options .oim-unified-panel', (el) =>
      el.classList.contains('oim-unified-panel-collapsed')
    )
    expect(collapsed).toBe(true)
    const tall = await page.$eval('.oim-unified-options', (el) =>
      el.classList.contains('oim-unified-options--tall')
    )
    expect(tall).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify new cases fail (or are blocked by missing selectors)**

Run from `web/`:

```bash
npm run test:e2e
```

Expected: existing page-load tests may pass; new Layers tests FAIL (panel not collapsed, and/or `[data-power-subsection]` missing).

- [ ] **Step 3: Commit**

```bash
git add web/tests/puppeteer.test.ts
git commit -m "test: cover map-first Layers panel open/close and tall mode"
```

---

### Task 2: Compact vs tall CSS

**Files:**
- Modify: `web/src/index.css` (`.oim-unified-options` block ~276–499)

**Interfaces:**
- Consumes: class `oim-unified-options--tall` on the control root; absence means compact when open
- Produces: compact max-height 42vh + denser spacing; tall max-height 70vh + current spacing

- [ ] **Step 1: Replace the open-panel height defaults with compact, and add tall + compact density rules**

Change the open (non-collapsed) `.oim-unified-options` block from fixed `height/max-height: 70vh` to compact:

```css
.oim-unified-options {
  background: var(--oim-ctrl-bg) !important;
  border: 1px solid var(--oim-ctrl-border) !important;
  border-radius: var(--oim-ctrl-radius) !important;
  box-shadow: var(--oim-ctrl-shadow) !important;
  backdrop-filter: var(--oim-blur);
  overflow: hidden;
  min-width: 15rem;
  max-width: 90vw;
  height: auto;
  max-height: 42vh;
  display: flex;
  flex-direction: column;
}

.oim-unified-options.oim-unified-options--tall {
  max-height: 70vh;
  height: 70vh;
}

/* Compact density (not applied in tall mode) */
.oim-unified-options:not(.oim-unified-options--tall) .oim-unified-row {
  padding-top: 4px;
  padding-bottom: 4px;
}

.oim-unified-options:not(.oim-unified-options--tall) .oim-unified-section-header {
  padding-top: 6px;
  padding-bottom: 4px;
}
```

Keep the existing `:has(.oim-unified-panel-collapsed)` icon-only rules unchanged so collapsed state still shrinks to 29px.

- [ ] **Step 2: Commit**

```bash
git add web/src/index.css
git commit -m "style: compact default and tall mode for Layers panel"
```

---

### Task 3: Open/close, section defaults, tall mode, Esc / outside click

**Files:**
- Modify: `web/src/unified-map-options.ts`

**Interfaces:**
- Consumes: CSS classes from Task 2; power subsection headers marked `data-power-subsection`
- Produces:
  - `_panelOpen: boolean`
  - `_setPanelOpen(open: boolean): void` — toggles collapsed class, aria-expanded, dismiss listeners, resets sections on open, clears tall on close
  - `_syncTallMode(): void` — sets/removes `oim-unified-options--tall` from whether any `[data-power-subsection]` list is expanded
  - `_applySectionDefaults(): void` — expands Background + Infrastructure; collapses power subsections, pipelines, overlays, heatmaps, validation
  - `_onDocumentPointerDown` / `_onDocumentKeyDown` bound listeners registered only while open

- [ ] **Step 1: Add instance fields and dismiss helpers near the other private fields**

```ts
_header!: HTMLButtonElement
_panelOpen = false
_onDocumentPointerDown = (e: PointerEvent) => {
  if (!this._panelOpen || !this._container) return
  const target = e.target
  if (target instanceof Node && this._container.contains(target)) return
  this._setPanelOpen(false)
}
_onDocumentKeyDown = (e: KeyboardEvent) => {
  if (!this._panelOpen) return
  if (e.key === 'Escape') {
    e.stopPropagation()
    this._setPanelOpen(false)
  }
}
```

- [ ] **Step 2: Implement `_setPanelOpen`, `_syncTallMode`, `_applySectionDefaults`, and listener attach/detach**

```ts
_setPanelOpen(open: boolean): void {
  this._panelOpen = open
  this._panel.classList.toggle('oim-unified-panel-collapsed', !open)
  this._header.setAttribute('aria-expanded', String(open))
  if (open) {
    this._applySectionDefaults()
    this._syncTallMode()
    document.addEventListener('pointerdown', this._onDocumentPointerDown, true)
    document.addEventListener('keydown', this._onDocumentKeyDown, true)
  } else {
    this._container.classList.remove('oim-unified-options--tall')
    document.removeEventListener('pointerdown', this._onDocumentPointerDown, true)
    document.removeEventListener('keydown', this._onDocumentKeyDown, true)
  }
}

_syncTallMode(): void {
  if (!this._container || !this._panelOpen) {
    this._container?.classList.remove('oim-unified-options--tall')
    return
  }
  const anyPowerOpen = Array.from(
    this._panel.querySelectorAll<HTMLElement>('[data-power-subsection]')
  ).some((section) => {
    const list = section.querySelector('.oim-unified-list')
    return list !== null && !list.classList.contains('oim-unified-list-collapsed')
  })
  this._container.classList.toggle('oim-unified-options--tall', anyPowerOpen)
}

_applySectionDefaults(): void {
  // Top-level sections: expand Background + Infrastructure (first two), collapse the rest
  const topSections = this._panel.querySelectorAll<HTMLElement>(
    ':scope > .oim-unified-section'
  )
  topSections.forEach((section, index) => {
    const list = section.querySelector(':scope > .oim-unified-list')
    const header = section.querySelector(':scope > .oim-unified-section-header')
    if (!list || !header) return
    const expand = index === 0 || index === 1
    list.classList.toggle('oim-unified-list-collapsed', !expand)
    header.setAttribute('aria-expanded', String(expand))
  })

  // Power subsections + pipelines subsection: always collapsed on open
  this._panel.querySelectorAll<HTMLElement>('.oim-unified-subsection').forEach((section) => {
    const list = section.querySelector(':scope > .oim-unified-list')
    const header = section.querySelector(':scope > .oim-unified-section-header')
    if (!list || !header) return
    list.classList.add('oim-unified-list-collapsed')
    header.setAttribute('aria-expanded', 'false')
  })
}

_detachDismissListeners(): void {
  document.removeEventListener('pointerdown', this._onDocumentPointerDown, true)
  document.removeEventListener('keydown', this._onDocumentKeyDown, true)
}
```

- [ ] **Step 3: Wire `onAdd` — start collapsed, store header, replace header click, mark power subsections, collapse non-default sections at build time**

In `onAdd`:

1. After creating `header`, assign `this._header = header` and set `'aria-expanded': 'false'`.
2. After creating `this._panel`, add class `oim-unified-panel-collapsed` immediately (or call `_setPanelOpen(false)` after `_container` exists without attaching listeners twice — prefer building collapsed then calling `_setPanelOpen(false)` only for class/aria sync without double-remove; simplest: add collapsed class + `aria-expanded=false` at create time, set `_panelOpen = false`).
3. In `_addPowerSubsection`, add `data-power-subsection: category.dataCategory` (or the dataPrefix mapped to `plants` / `substations` / `voltage`) on the section root element. Call `this._syncTallMode()` inside the subsection header click handler after toggling collapsed.
4. For pipelines `otherSectionWrap`, start with `otherList` having `oim-unified-list-collapsed` and header `aria-expanded='false'`.
5. For overlay/heatmap/validation sections from `_addLayerSection`, start collapsed: after `_addLayerSection` / `_addSection`, add collapsed class to their lists (extend `_addSection` with optional `startExpanded = true` parameter).

Extend `_addSection`:

```ts
_addSection(titleKey: string, collapsible: boolean, startExpanded = true): HTMLDivElement {
  // ... existing create ...
  if (!startExpanded) {
    list.classList.add('oim-unified-list-collapsed')
    header.setAttribute('aria-expanded', 'false')
  }
  return wrap as HTMLDivElement
}
```

Call sites for Overlays / Heatmaps / Validation:

```ts
this._addLayerSection(t('layers.overlays'), overlaySpecs, false)
```

Update `_addLayerSection` to pass through `startExpanded`.

6. Replace header click:

```ts
header.addEventListener('click', (e) => {
  e.stopPropagation()
  this._setPanelOpen(!this._panelOpen)
})
```

7. In `onRemove`, call `_detachDismissListeners()` and clear tall class.

Power subsection marking example in `_addPowerSubsection` when `category` is present:

```ts
const section = el('div', [header, list], {
  class: 'oim-unified-section oim-unified-subsection',
  'data-power-subsection': category.dataCategory
})
// start collapsed
list.classList.add('oim-unified-list-collapsed')
header.setAttribute('aria-expanded', 'false')

header.addEventListener('click', () => {
  list.classList.toggle('oim-unified-list-collapsed')
  header.setAttribute(
    'aria-expanded',
    String(!list.classList.contains('oim-unified-list-collapsed'))
  )
  this._syncTallMode()
})
```

- [ ] **Step 4: Run e2e tests**

```bash
cd web && npm run test:e2e
```

Expected: all tests PASS, including the four Layers cases.

- [ ] **Step 5: Commit**

```bash
git add web/src/unified-map-options.ts
git commit -m "feat(web): map-first Layers panel with compact/tall modes"
```

---

### Task 4: PR update and smoke sanity

**Files:**
- None required beyond prior tasks (update PR description if needed)

- [ ] **Step 1: Push branch and update PR body to note implementation complete**

```bash
git push -u origin cursor/map-first-layers-panel-b124
```

- [ ] **Step 2: Manual sanity checklist (or browser smoke if available)**

- Load app → Layers is icon-only
- Open → compact height, Background + Infrastructure open, nested filters collapsed
- Expand Power plants → panel grows tall
- Collapse all three power subsections → compact again
- Esc / outside click → closed; reopen is compact with defaults

---

## Spec coverage checklist

| Spec requirement | Task |
| --- | --- |
| Start collapsed | Task 3 |
| Compact ~42vh + denser rows | Task 2 |
| Tall ~70vh when power subsection open | Tasks 2–3 |
| Close via icon / Esc / outside click | Task 3 |
| Section defaults on each open | Task 3 |
| Hash sync does not open panel | Task 3 (no open in `_syncPanelFromState`) |
| Puppeteer coverage | Task 1 |
| Out-of-scope items untouched | Global Constraints |
