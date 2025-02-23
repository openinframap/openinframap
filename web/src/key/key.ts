import { IControl } from 'maplibre-gl'
import { t } from 'i18next'
import { el, mount, list, setStyle, RedomElement } from 'redom'
import { default as power_layers, voltage_scale, special_voltages } from '../style/style_oim_power.ts'
import comms_layers from '../style/style_oim_telecoms.js'
import {
  default as petroleum_layers,
  colour_oil,
  colour_gas,
  colour_fuel,
  colour_intermediate,
  colour_hydrogen
} from '../style/style_oim_petroleum.js'
import {
  colour_beer,
  colour_co2,
  colour_nitrogen,
  colour_other_pipeline_unknown,
  colour_oxygen
} from '../style/style_oim_other_pipelines.js'
import {
  colour_freshwater,
  colour_wastewater,
  colour_hotwater,
  colour_steam
} from '../style/style_oim_water.js'
import { svgLine, svgLineFromLayer, svgRectFromLayer } from './svg.js'
import './key.css'
import { manifest } from 'virtual:render-svg'

const line_thickness = 6

class Td {
  el: HTMLTableCellElement
  constructor() {
    this.el = el('td')
  }
  update(data: string | RedomElement) {
    if (typeof data == 'string') {
      this.el.innerHTML = data
    } else if (!data) {
      return
    } else {
      mount(this.el, data)
    }
  }
}

const Tr = list.extend('tr', Td)

class KeyControl implements IControl {
  _map: maplibregl.Map | undefined
  _control!: HTMLButtonElement
  _container!: HTMLDivElement
  _pane: RedomElement | undefined
  onAdd(map: maplibregl.Map) {
    this._map = map

    this._control = el('button', {
      class: 'maplibregl-ctrl-icon oim-key-control',
      title: t('key.name'),
      ariaLabel: t('key.name')
    })

    this._container = el('div', { class: 'oim-key-panel' })

    this.populate()
    mount(document.body, this._container)

    this._control.onclick = () => {
      const button_position = this._control.getBoundingClientRect()
      this._container.style.top = button_position.top + 'px'
      this._container.style.right = document.documentElement.clientWidth - button_position.right + 'px'
      this._container.classList.add('visible')
    }

    return el('div', this._control, {
      class: 'maplibregl-ctrl maplibregl-ctrl-group'
    })
  }

  onRemove(): void {
    this._map = undefined
    this._container.remove()
    this._control.remove()
    this._pane = undefined
  }

  header() {
    const close_button = el('button.oim-key-close', '×')

    close_button.onclick = () => {
      this._container.classList.remove('visible')
    }
    return el('.oim-key-header', el('h2', t('key.name', 'Key')), close_button)
  }

  async populate() {
    mount(this._container, this.header())

    const pane = el('.oim-key-body')
    pane.appendChild(el('h3', t('key.power-lines', 'Power Lines')))
    mount(pane, await this.voltageTable())
    pane.appendChild(el('h3', t('key.power-plants', 'Power Plants')))
    mount(pane, await this.plantTable())
    pane.appendChild(el('h3', t('key.power-generators', 'Power Generators')))
    mount(pane, await this.generatorTable())
    pane.appendChild(el('h3', t('key.power-line-supports', 'Power Line Supports')))
    mount(pane, await this.towerTable())
    pane.appendChild(el('h3', t('key.switchgear', 'Switchgear')))
    mount(pane, await this.switchgearTable())
    pane.appendChild(el('h3', t('key.telecoms', 'Telecoms')))
    mount(pane, await this.telecomTable())
    pane.appendChild(el('h3', t('key.petroleum', 'Petroleum')))
    mount(pane, this.petroleumTable())
    pane.appendChild(el('h3', t('key.water', 'Water')))
    mount(pane, await this.waterTable())
    pane.appendChild(el('h3', t('layers.other-pipelines', 'Other Pipelines')))
    mount(pane, this.otherPipelineTable())
    this._pane = pane

    mount(this._container, pane)
  }

  async voltageTable() {
    let rows = []
    for (const row of voltage_scale) {
      let label = row[0]?.toString()
      if (!label) {
        label = t('units.below_10kv', '< 10 kV')
      } else {
        label = t('units.ge_kv', '≥ {{voltage}} kV', { voltage: label })
      }

      rows.push([label, row[1]])
    }

    rows.push([t('names.power.hvdc', 'HVDC'), special_voltages.hvdc])
    rows.push([t('key.traction', 'Traction (< 50 Hz)'), special_voltages.traction])

    rows = rows.map((row) => [row[0], svgLine(row[1], line_thickness)])

    rows.push([t('location.underground', 'Underground'), svgLine('#7A7A85', line_thickness, '3 2')])
    rows.push([t('names.power.line-reference', 'Line reference'), await this.sprite('power_line_ref')])

    const table = list('table', Tr)
    table.update(rows)
    return table
  }

  async sprite(name: string, size = 25) {
    const spriteDiv = el('img.oim-key-symbol', {
      src: manifest['svg'][name],
      height: size
    })
    setStyle(spriteDiv, {
      'max-width': size + 'px'
    })
    return spriteDiv as unknown as SVGElement
  }

  async plantTable() {
    const plant_entries: { [name: string]: string } = {}
    plant_entries[t('power.source.coal')] = 'power_plant_coal'
    plant_entries[t('power.source.geothermal')] = 'power_plant_geothermal'
    plant_entries[t('power.source.hydro')] = 'power_plant_hydro'
    plant_entries[t('power.source.nuclear')] = 'power_plant_nuclear'
    plant_entries[t('power.source.oil-gas')] = 'power_plant_oilgas'
    plant_entries[t('power.source.solar')] = 'power_plant_solar'
    plant_entries[t('power.source.wind')] = 'power_plant_wind'
    plant_entries[t('power.source.biomass')] = 'power_plant_biomass'
    plant_entries[t('power.source.waste')] = 'power_plant_waste'
    plant_entries[t('power.source.battery')] = 'power_plant_battery'

    const rows = []
    for (const [key, value] of Object.entries(plant_entries)) {
      rows.push([key, await this.sprite(value)])
    }
    const table = list('table', Tr)
    table.update(rows)
    return table
  }

  async generatorTable() {
    const rows = [
      [t('names.power.wind-turbine'), await this.sprite('power_wind', 14)],
      [t('names.power.solar-panel'), svgRectFromLayer(power_layers(), 'power_solar_panel')],
      [t('names.power.solar-panel-node', 'Solar panel (node)'), await this.sprite('power_generator_solar')],
      [t('names.power.other-generator', 'Other generator'), await this.sprite('power_generator')]
    ]
    const table = list('table', Tr)
    table.update(rows)
    return table
  }

  async towerTable() {
    const rows = [
      [t('names.power.tower-pylon', 'Tower/Pylon'), await this.sprite('power_tower', 10)],
      [
        t('names.power.tower-transition', 'Transition tower'),
        await this.sprite('power_tower_transition', 10)
      ],
      [t('names.power.pole'), await this.sprite('power_pole', 8)],
      [t('names.power.pole-transition', 'Transition pole'), await this.sprite('power_pole_transition', 8)]
    ]
    const table = list('table', Tr)
    table.update(rows)
    return table
  }

  async switchgearTable() {
    const rows = [
      [t('names.power.transformer'), await this.sprite('power_transformer')],
      [
        t('names.power.transformer-3', 'Transformer (3 windings)'),
        await this.sprite('power_transformer_3_winding')
      ],
      [t('names.power.current-transformer'), await this.sprite('power_transformer_current')],
      [t('names.power.potential-transformer'), await this.sprite('power_transformer_potential')],
      [t('names.power.switch-disconnector', 'Disconnector'), await this.sprite('power_switch_disconnector')],
      [t('names.power.switch-breaker', 'Circuit breaker'), await this.sprite('power_switch_circuit_breaker')],
      [t('names.power.switch-other', 'Other switch'), await this.sprite('power_switch')],
      [t('names.power.reactor-series', 'Series reactor'), await this.sprite('power_reactor')],
      [t('names.power.reactor-shunt', 'Shunt reactor'), await this.sprite('power_reactor_shunt')],
      [t('names.power.capacitor-series', 'Series capacitor'), await this.sprite('power_capacitor')],
      [t('names.power.capacitor-shunt', 'Shunt capacitor'), await this.sprite('power_capacitor_shunt')],
      [t('names.power.filter', 'Filter'), await this.sprite('power_filter')],
      [t('names.power.compensator-other', 'Other compensator'), await this.sprite('power_compensator_frame')],
      [t('names.power.converter', 'DC converter'), await this.sprite('converter')]
    ]
    const table = list('table', Tr)
    table.update(rows)
    return table
  }

  async telecomTable() {
    const rows = [
      [t('names.cable', 'Cable'), svgLineFromLayer(comms_layers(), 'telecoms_line')],
      [t('names.telecom.tower-mast', 'Tower/Mast'), await this.sprite('comms_tower')],
      [t('names.telecom.datacenter', 'Datacenter'), await this.sprite('telecom_datacenter')],
      [t('names.telecoms.exchange', 'Exchange'), await this.sprite('telecom_exchange')],
      [t('names.cabinet', 'Cabinet'), await this.sprite('cabinet')]
    ]
    const table = list('table', Tr)
    table.update(rows)
    return table
  }

  petroleumTable() {
    const rows = [
      [t('names.substance.oil', 'Oil'), svgLine(colour_oil, line_thickness)],
      [t('names.substance.gas', 'Gas'), svgLine(colour_gas, line_thickness)],
      [
        t('names.substance.petroleum-intermediate', 'Petroleum intermediate'),
        svgLine(colour_intermediate, line_thickness)
      ],
      [t('names.substance.fuel', 'Fuel'), svgLine(colour_fuel, line_thickness)],
      [t('names.substance.hydrogen', 'Hydrogen'), svgLine(colour_hydrogen, line_thickness)],
      [
        t('names.petroleum.facility', 'Petroleum facility'),
        svgRectFromLayer(petroleum_layers(), 'petroleum_site')
      ]
    ]
    const table = list('table', Tr)
    table.update(rows)
    return table
  }

  otherPipelineTable() {
    const rows = [
      [t('names.substance.oxygen', 'Oxygen'), svgLine(colour_oxygen, line_thickness)],
      [t('names.substance.co2', 'CO<sub>2</sub>'), svgLine(colour_co2, line_thickness)],
      [t('names.substance.nitrogen', 'Nitrogen'), svgLine(colour_nitrogen, line_thickness)],
      [t('names.substance.beer', 'Beer'), svgLine(colour_beer, line_thickness)],
      [t('other', 'Other'), svgLine(colour_other_pipeline_unknown, line_thickness)]
    ]
    const table = list('table', Tr)
    table.update(rows)
    return table
  }

  async waterTable() {
    const rows = [
      [t('names.substance.fresh-water', 'Fresh water'), svgLine(colour_freshwater, line_thickness)],
      [t('names.substance.hot-water', 'Hot water'), svgLine(colour_hotwater, line_thickness)],
      [t('names.substance.steam', 'Steam'), svgLine(colour_steam, line_thickness)],
      [t('names.substance.wastewater', 'Wastewater'), svgLine(colour_wastewater, line_thickness)],
      [t('names.water.treatment-plant', 'Water treatment plant'), await this.sprite('water_treatment_plant')],
      [
        t('names.water.water-pumping-station', 'Water pumping station'),
        await this.sprite('water_pumping_station')
      ],
      [
        t('names.water.sewage-treatment-plant', 'Sewage treatment plant'),
        await this.sprite('sewage_treatment_plant')
      ],
      [
        t('names.water.sewage-pumping-station', 'Sewage pumping station'),
        await this.sprite('sewage_pumping_station')
      ],
      [t('names.other-pumping-station', 'Other pumping station'), await this.sprite('pumping_station')]
    ]
    const table = list('table', Tr)
    table.update(rows)
    return table
  }
}

export { KeyControl as default }
