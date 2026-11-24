import maplibregl from 'maplibre-gl'
import { t } from 'i18next'
import { el } from 'redom'
import isEqual from 'lodash.isequal'
import type { FilterSpecification } from 'maplibre-gl'
import {
  POWER_PLANT_LAYER_IDS,
  SUBSTATION_LAYER_IDS,
  POWER_LINE_LAYER_IDS,
  SOURCE_OPTIONS,
  SUBSTATION_OPTIONS,
  VOLTAGE_BAND_OPTIONS,
  applyPlantFilters,
  applySubstationFilters,
  applyPowerLineFilters,
  DEFAULT_PLANT_SELECTED,
  DEFAULT_SUBSTATION_SELECTED,
  DEFAULT_VOLTAGE_BAND_SELECTED
} from './power-plant-filter.js'

/** Single layer option for URL hash and visibility (id, prefix, optional groupId for radio groups) */
interface LayerSpec {
  id: string
  title: string
  prefix: string
  groupId?: string
  defaultVisible: boolean
}

function layerSpec(
  id: string,
  title: string,
  prefix: string,
  groupIdOrVisible: string | boolean,
  defaultVisible = false
): LayerSpec {
  if (typeof groupIdOrVisible === 'string') {
    return { id, title, prefix, groupId: groupIdOrVisible, defaultVisible }
  }
  return { id, title, prefix, defaultVisible: groupIdOrVisible }
}

function getLayerSpecs(): LayerSpec[] {
  return [
    ...[
      layerSpec('A', t('openstreetmap'), 'osm_', 'background', true),
      layerSpec('M', t('layers.satellite'), 'satellite_', 'background', false),
      layerSpec('N', t('layers.nighttime-lights'), 'black_marble', 'background', false)
    ],
    ...[
      layerSpec('L', t('layers.labels'), 'label_', true),
      layerSpec('B', t('layers.borders'), 'boundaries_', true)
    ],
    ...[layerSpec('S', t('layers.solar-generation'), 'heatmap_', false)],
    ...[
      layerSpec('P', t('layers.power'), 'power_', true),
      layerSpec('T', t('layers.telecoms'), 'telecoms_', false),
      layerSpec('O', t('layers.petroleum'), 'petroleum_', false),
      layerSpec('I', t('layers.other-pipelines'), 'pipeline_', false),
      layerSpec('W', t('layers.water'), 'water_', false)
    ],
    ...[layerSpec('E', t('layers.osmose-power'), 'osmose_errors_power', false)]
  ]
}

/** URLHash from the package assigns to .urlhash; type for that reference */
interface URLHashLike {
  _updateHash?: () => void
}

export default class UnifiedMapOptionsControl implements maplibregl.IControl {
  getDefaultPosition = (): string => 'top-right'

  _map?: maplibregl.Map
  _container!: HTMLDivElement
  _panel!: HTMLDivElement
  _header!: HTMLButtonElement
  _specs: LayerSpec[]
  _layerIndex: Record<string, LayerSpec>
  _visible: string[]
  _defaultVisible: string[]
  urlhash?: URLHashLike
  _panelOpen = false

  _plantSelected: Set<string>
  _substationSelected: Set<string>
  _voltageBandSelected: Set<string>
  /** When false, entire category is hidden; granular selection is preserved */
  _plantsCategoryEnabled = true
  _substationsCategoryEnabled = true
  _powerLinesCategoryEnabled = true
  _plantOriginalFilters: Record<string, FilterSpecification | undefined> = {}
  _substationOriginalFilters: Record<string, FilterSpecification | undefined> = {}
  _powerLineOriginalFilters: Record<string, FilterSpecification | undefined> = {}

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

  constructor() {
    this._specs = getLayerSpecs()
    this._layerIndex = {}
    for (const spec of this._specs) {
      if (this._layerIndex[spec.id]) throw new Error(`Duplicate layer ID "${spec.id}"`)
      this._layerIndex[spec.id] = spec
    }
    this._defaultVisible = this._specs.filter((s) => s.defaultVisible).map((s) => s.id)
    this._visible = [...this._defaultVisible]
    this._plantSelected = new Set(DEFAULT_PLANT_SELECTED)
    this._substationSelected = new Set(DEFAULT_SUBSTATION_SELECTED)
    this._voltageBandSelected = new Set(DEFAULT_VOLTAGE_BAND_SELECTED)
  }

  setInitialVisibility(style: { layers?: { id: string; layout?: Record<string, unknown> }[] }): void {
    const layers = style.layers ?? []
    for (const styleLayer of layers) {
      for (const [ctrlId, spec] of Object.entries(this._layerIndex)) {
        if (styleLayer.id.startsWith(spec.prefix) && !this._visible.includes(ctrlId)) {
          const layout = styleLayer.layout ?? {}
          ;(layout as Record<string, string>)['visibility'] = 'none'
          styleLayer.layout = layout
          break
        }
      }
    }
  }

  getURLString(): string {
    if (!isEqual([...this._visible].sort(), [...this._defaultVisible].sort())) {
      return [...this._visible].sort().join(',')
    }
    return ''
  }

  setURLString(string: string): void {
    if (string) {
      const ids = string.split(',')
      this._visible = ids.filter((id) => this._layerIndex[id]).map((id) => id)
    } else {
      this._visible = [...this._defaultVisible]
    }
    if (this._map?.isStyleLoaded()) {
      this._updateLayerVisibility()
    }
    this._syncPanelFromState()
  }

  getLayers(): LayerSpec[] {
    return [...this._specs]
  }

  setVisibility(layerId: string, visible: boolean): void {
    if (visible) {
      if (!this._visible.includes(layerId)) this._visible.push(layerId)
    } else {
      this._visible = this._visible.filter((id) => id !== layerId)
    }
    this._updateLayerVisibility()
    if (this.urlhash?._updateHash) this.urlhash._updateHash()
  }

  _updateLayerVisibility(): void {
    if (!this._map) return
    const style = this._map.getStyle()
    if (!style?.layers) return
    for (const layer of style.layers) {
      const name = layer.id
      for (const [ctrlId, spec] of Object.entries(this._layerIndex)) {
        if (name.startsWith(spec.prefix)) {
          this._map!.setLayoutProperty(
            name,
            'visibility',
            this._visible.includes(ctrlId) ? 'visible' : 'none'
          )
          break
        }
      }
    }
  }

  _captureOriginalFilters(): void {
    if (!this._map) return
    for (const layerId of POWER_PLANT_LAYER_IDS) {
      const layer = this._map.getLayer(layerId)
      this._plantOriginalFilters[layerId] =
        layer && 'filter' in layer && layer.filter ? (layer.filter as FilterSpecification) : undefined
    }
    for (const layerId of SUBSTATION_LAYER_IDS) {
      const layer = this._map.getLayer(layerId)
      this._substationOriginalFilters[layerId] =
        layer && 'filter' in layer && layer.filter ? (layer.filter as FilterSpecification) : undefined
    }
    for (const layerId of POWER_LINE_LAYER_IDS) {
      const layer = this._map.getLayer(layerId)
      this._powerLineOriginalFilters[layerId] =
        layer && 'filter' in layer && layer.filter ? (layer.filter as FilterSpecification) : undefined
    }
  }

  _applyPowerFilters(): void {
    if (!this._map) return
    applyPlantFilters(
      this._map,
      this._plantOriginalFilters,
      this._plantsCategoryEnabled ? this._plantSelected : new Set()
    )
    applySubstationFilters(
      this._map,
      this._substationOriginalFilters,
      this._substationsCategoryEnabled ? this._substationSelected : new Set()
    )
    applyPowerLineFilters(
      this._map,
      this._powerLineOriginalFilters,
      this._powerLinesCategoryEnabled ? this._voltageBandSelected : new Set()
    )
  }

  _syncPanelFromState(): void {
    if (!this._panel) return
    // Sync layer checkboxes/radios
    this._panel.querySelectorAll<HTMLInputElement>('[data-layer-id]').forEach((input) => {
      const id = input.getAttribute('data-layer-id')
      if (id) input.checked = this._visible.includes(id)
    })
    // Sync power filter checkboxes
    this._panel.querySelectorAll<HTMLInputElement>('[data-plant-id]').forEach((input) => {
      const id = input.getAttribute('data-plant-id')
      if (id) input.checked = this._plantSelected.has(id)
    })
    this._panel.querySelectorAll<HTMLInputElement>('[data-substation-id]').forEach((input) => {
      const id = input.getAttribute('data-substation-id')
      if (id) input.checked = this._substationSelected.has(id)
    })
    this._panel.querySelectorAll<HTMLInputElement>('[data-voltage-id]').forEach((input) => {
      const id = input.getAttribute('data-voltage-id')
      if (id) input.checked = this._voltageBandSelected.has(id)
    })
    // Sync category toggles (checked = hide category)
    this._panel.querySelectorAll<HTMLInputElement>('[data-category]').forEach((input) => {
      const cat = input.getAttribute('data-category')
      if (cat === 'plants') input.checked = !this._plantsCategoryEnabled
      else if (cat === 'substations') input.checked = !this._substationsCategoryEnabled
      else if (cat === 'voltage') input.checked = !this._powerLinesCategoryEnabled
    })
  }

  _detachDismissListeners(): void {
    document.removeEventListener('pointerdown', this._onDocumentPointerDown, true)
    document.removeEventListener('keydown', this._onDocumentKeyDown, true)
  }

  _setPanelOpen(open: boolean): void {
    this._panelOpen = open
    this._panel.classList.toggle('oim-unified-panel-collapsed', !open)
    this._header.setAttribute('aria-expanded', String(open))
    this._detachDismissListeners()
    if (open) {
      this._applySectionDefaults()
      this._syncTallMode()
      document.addEventListener('pointerdown', this._onDocumentPointerDown, true)
      document.addEventListener('keydown', this._onDocumentKeyDown, true)
    } else {
      this._container.classList.remove('oim-unified-options--tall')
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
    const topSections = this._panel.querySelectorAll<HTMLElement>(':scope > .oim-unified-section')
    topSections.forEach((section, index) => {
      const list = section.querySelector(':scope > .oim-unified-list')
      const header = section.querySelector(':scope > .oim-unified-section-header')
      if (!list || !header) return
      const expand = index === 0 || index === 1
      list.classList.toggle('oim-unified-list-collapsed', !expand)
      header.setAttribute('aria-expanded', String(expand))
    })

    this._panel.querySelectorAll<HTMLElement>('.oim-unified-subsection').forEach((section) => {
      const list = section.querySelector(':scope > .oim-unified-list')
      const header = section.querySelector(':scope > .oim-unified-section-header')
      if (!list || !header) return
      list.classList.add('oim-unified-list-collapsed')
      header.setAttribute('aria-expanded', 'false')
    })
  }

  onAdd(map: maplibregl.Map): HTMLElement {
    this._map = map

    if (map.isStyleLoaded()) {
      this._updateLayerVisibility()
      this._captureOriginalFilters()
      this._applyPowerFilters()
    } else {
      map.once('style.load', () => {
        this._updateLayerVisibility()
        this._captureOriginalFilters()
        this._applyPowerFilters()
      })
    }

    /* Icon-only button (layers stack), same pattern as Key – panel unfurls below on click */
    const layersIconSvg =
      'data:image/svg+xml,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="#e5e5e7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>'
      )
    const header = el('button', {
      class: 'maplibregl-ctrl oim-unified-header oim-unified-header-icon',
      type: 'button',
      'aria-expanded': 'false',
      'aria-label': t('layers.title', 'Layers')
    }) as HTMLButtonElement
    header.style.backgroundImage = `url("${layersIconSvg}")`
    header.style.backgroundRepeat = 'no-repeat'
    header.style.backgroundPosition = 'center'
    header.style.backgroundSize = '20px 20px'
    this._header = header
    this._panel = el('div', { class: 'oim-unified-panel oim-unified-panel-collapsed' })
    this._panelOpen = false

    // Background (radio group)
    const bgSpecs = this._specs.filter((s) => s.groupId === 'background')
    const bgSection = this._addSection(t('layers.background'), true)
    const bgList = bgSection.querySelector('.oim-unified-list')!
    for (const spec of bgSpecs) {
      const input = el('input', {
        type: 'radio',
        name: 'oim-bg',
        value: spec.id,
        'data-layer-id': spec.id,
        'aria-label': spec.title
      }) as HTMLInputElement
      input.checked = this._visible.includes(spec.id)
      input.addEventListener('change', () => {
        bgSpecs.forEach((s) => this.setVisibility(s.id, false))
        this.setVisibility(spec.id, true)
      })
      bgList.appendChild(
        el('label', input, document.createTextNode(` ${spec.title}`), { class: 'oim-unified-row' })
      )
    }
    this._panel.appendChild(bgSection)

    // Infrastructure: Power (with nested filters) + Pipelines & utilities – show early so it’s visible without scrolling
    const infraSection = this._addSection(t('layers.infrastructure'), true)
    const infraList = infraSection.querySelector('.oim-unified-list')!
    const powerSpec = this._specs.find((s) => s.prefix === 'power_')!
    const powerRow = el('label', { class: 'oim-unified-row' })
    const powerCheck = el('input', {
      type: 'checkbox',
      'data-layer-id': powerSpec.id,
      'aria-label': powerSpec.title
    }) as HTMLInputElement
    powerCheck.checked = this._visible.includes(powerSpec.id)
    powerCheck.addEventListener('change', () => this.setVisibility(powerSpec.id, powerCheck.checked))
    powerRow.appendChild(powerCheck)
    powerRow.appendChild(document.createTextNode(` ${powerSpec.title}`))
    infraList.appendChild(powerRow)

    const powerFiltersWrap = el('div', { class: 'oim-unified-sublist' })
    powerFiltersWrap.appendChild(
      this._addPowerSubsection(
        'filters.power-plants',
        SOURCE_OPTIONS,
        'plant',
        (id, checked) => {
          if (checked) this._plantSelected.add(id)
          else this._plantSelected.delete(id)
          this._applyPowerFilters()
        },
        { labelKey: 'filters.power-plants', dataCategory: 'plants' }
      )
    )
    powerFiltersWrap.appendChild(
      this._addPowerSubsection(
        'filters.substations',
        SUBSTATION_OPTIONS,
        'substation',
        (id, checked) => {
          if (checked) this._substationSelected.add(id)
          else this._substationSelected.delete(id)
          this._applyPowerFilters()
        },
        { labelKey: 'filters.substations', dataCategory: 'substations' }
      )
    )
    powerFiltersWrap.appendChild(
      this._addPowerSubsection(
        'filters.power-lines',
        VOLTAGE_BAND_OPTIONS,
        'voltage',
        (id, checked) => {
          if (checked) this._voltageBandSelected.add(id)
          else this._voltageBandSelected.delete(id)
          this._applyPowerFilters()
        },
        { labelKey: 'filters.power-lines', dataCategory: 'voltage' }
      )
    )
    infraList.appendChild(powerFiltersWrap)

    /* Pipelines & utilities: Telecoms, Oil & gas, Other pipelines, Water – same subsection pattern as Power */
    const otherInfra = this._specs.filter(
      (s) =>
        s.prefix === 'telecoms_' ||
        s.prefix === 'petroleum_' ||
        s.prefix === 'pipeline_' ||
        s.prefix === 'water_'
    )
    const otherSectionLabel = el('span', t('layers.pipelines-and-utilities'), {
      class: 'oim-unified-section-label'
    })
    const otherSectionHeader = el('button', otherSectionLabel, {
      class: 'maplibregl-ctrl oim-unified-section-header oim-unified-subsection-header',
      type: 'button',
      'aria-expanded': 'false'
    })
    const otherList = el('div', { class: 'oim-unified-list oim-unified-list-collapsed' })
    for (const spec of otherInfra) {
      const row = el('label', { class: 'oim-unified-row' })
      const input = el('input', {
        type: 'checkbox',
        'data-layer-id': spec.id,
        'aria-label': spec.title
      }) as HTMLInputElement
      input.checked = this._visible.includes(spec.id)
      input.addEventListener('change', () => this.setVisibility(spec.id, input.checked))
      row.appendChild(input)
      row.appendChild(document.createTextNode(` ${spec.title}`))
      otherList.appendChild(row)
    }
    otherSectionHeader.addEventListener('click', () => {
      otherList.classList.toggle('oim-unified-list-collapsed')
      otherSectionHeader.setAttribute(
        'aria-expanded',
        String(!otherList.classList.contains('oim-unified-list-collapsed'))
      )
    })
    const otherSectionWrap = el('div', [otherSectionHeader, otherList], {
      class: 'oim-unified-section oim-unified-subsection'
    })
    infraList.appendChild(otherSectionWrap)
    this._panel.appendChild(infraSection)

    // Overlays
    const overlaySpecs = this._specs.filter((s) => s.prefix === 'label_' || s.prefix === 'boundaries_')
    this._panel.appendChild(this._addLayerSection(t('layers.overlays'), overlaySpecs, false))

    // Heatmaps
    const heatSpecs = this._specs.filter((s) => s.prefix === 'heatmap_')
    this._panel.appendChild(this._addLayerSection(t('layers.heatmaps'), heatSpecs, false))

    // Validation
    const valSpecs = this._specs.filter((s) => s.prefix === 'osmose_errors_power')
    this._panel.appendChild(this._addLayerSection(t('layers.validation'), valSpecs, false))

    header.addEventListener('click', (e) => {
      e.stopPropagation()
      this._setPanelOpen(!this._panelOpen)
    })

    this._container = el('div', [header, this._panel], {
      class: 'maplibregl-ctrl oim-unified-options'
    })
    this._syncPanelFromState()
    return this._container
  }

  _addSection(titleKey: string, _collapsible: boolean, startExpanded = true): HTMLDivElement {
    const sectionLabel = el('span', t(titleKey), { class: 'oim-unified-section-label' })
    const header = el('button', sectionLabel, {
      class: 'maplibregl-ctrl oim-unified-section-header',
      type: 'button',
      'aria-expanded': startExpanded ? 'true' : 'false'
    })
    const list = el('div', {
      class: startExpanded ? 'oim-unified-list' : 'oim-unified-list oim-unified-list-collapsed'
    })
    const wrap = el('div', [header, list], { class: 'oim-unified-section' })
    header.addEventListener('click', () => {
      list.classList.toggle('oim-unified-list-collapsed')
      header.setAttribute('aria-expanded', String(!list.classList.contains('oim-unified-list-collapsed')))
    })
    return wrap as HTMLDivElement
  }

  _addLayerSection(titleKey: string, specs: LayerSpec[], startExpanded = true): HTMLDivElement {
    const wrap = this._addSection(titleKey, true, startExpanded)
    const list = wrap.querySelector('.oim-unified-list')!
    for (const spec of specs) {
      const row = el('label', { class: 'oim-unified-row' })
      const input = el('input', {
        type: 'checkbox',
        'data-layer-id': spec.id,
        'aria-label': spec.title
      }) as HTMLInputElement
      input.checked = this._visible.includes(spec.id)
      input.addEventListener('change', () => this.setVisibility(spec.id, input.checked))
      row.appendChild(input)
      row.appendChild(document.createTextNode(` ${spec.title}`))
      list.appendChild(row)
    }
    return wrap as HTMLDivElement
  }

  _addPowerSubsection(
    titleKey: string,
    options: { id: string; labelKey: string }[],
    dataPrefix: string,
    onToggle: (id: string, checked: boolean) => void,
    category?: { labelKey: string; dataCategory: 'plants' | 'substations' | 'voltage' }
  ): HTMLDivElement {
    const sectionLabel = el('span', t(titleKey), { class: 'oim-unified-section-label' })
    const header = el('button', sectionLabel, {
      class: 'maplibregl-ctrl oim-unified-section-header oim-unified-subsection-header',
      type: 'button',
      'aria-expanded': 'false'
    })
    const list = el('div', { class: 'oim-unified-list oim-unified-list-collapsed' })
    if (category) {
      const getEnabled = () =>
        category.dataCategory === 'plants'
          ? this._plantsCategoryEnabled
          : category.dataCategory === 'substations'
            ? this._substationsCategoryEnabled
            : this._powerLinesCategoryEnabled
      const setHidden = (hide: boolean) => {
        const v = !hide
        if (category.dataCategory === 'plants') this._plantsCategoryEnabled = v
        else if (category.dataCategory === 'substations') this._substationsCategoryEnabled = v
        else this._powerLinesCategoryEnabled = v
        this._applyPowerFilters()
      }
      const hideLabel = `${t('filters.hide')} ${t(category.labelKey)}`
      const catCheck = el('input', {
        type: 'checkbox',
        'data-category': category.dataCategory,
        'aria-label': hideLabel
      }) as HTMLInputElement
      catCheck.checked = !getEnabled()
      catCheck.addEventListener('change', () => setHidden(catCheck.checked))
      list.appendChild(
        el('label', catCheck, document.createTextNode(` ${hideLabel}`), {
          class: 'oim-unified-row oim-unified-category-row'
        })
      )
    }
    const dataAttr =
      dataPrefix === 'plant'
        ? 'data-plant-id'
        : dataPrefix === 'substation'
          ? 'data-substation-id'
          : 'data-voltage-id'
    for (const opt of options) {
      const label = t(opt.labelKey)
      const input = el('input', {
        type: 'checkbox',
        [dataAttr]: opt.id,
        'aria-label': label
      }) as HTMLInputElement
      const selected =
        dataPrefix === 'plant'
          ? this._plantSelected
          : dataPrefix === 'substation'
            ? this._substationSelected
            : this._voltageBandSelected
      input.checked = selected.has(opt.id)
      input.addEventListener('change', () => onToggle(opt.id, input.checked))
      list.appendChild(el('label', input, document.createTextNode(` ${label}`), { class: 'oim-unified-row' }))
    }
    header.addEventListener('click', () => {
      list.classList.toggle('oim-unified-list-collapsed')
      header.setAttribute('aria-expanded', String(!list.classList.contains('oim-unified-list-collapsed')))
      this._syncTallMode()
    })
    const sectionAttrs: Record<string, string> = {
      class: 'oim-unified-section oim-unified-subsection'
    }
    if (category) {
      sectionAttrs['data-power-subsection'] = category.dataCategory
    }
    const section = el('div', [header, list], sectionAttrs)
    return section as HTMLDivElement
  }

  onRemove(): void {
    this._detachDismissListeners()
    this._container?.classList.remove('oim-unified-options--tall')
    this._map = undefined
    this._container?.remove()
  }
}
