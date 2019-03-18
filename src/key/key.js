import {el, text, mount, list, setStyle} from 'redom';
import {
  default as power_layers,
  voltage_scale,
  special_voltages,
  plant_types,
} from '../style/style_oim_power.js';
import comms_layers from '../style/style_oim_telecoms.js';
import water_layers from '../style/style_oim_water.js';
import {
  default as petroleum_layers,
  colour_oil,
  colour_gas,
} from '../style/style_oim_petroleum.js';
import {svgLine, svgLineFromLayer, svgRectFromLayer} from './svg.js';
import './key.css';

class Td {
  constructor() {
    this.el = el('td');
  }
  update(data) {
    if (typeof data != 'object') {
      this.el.textContent = data;
    } else if (data === null) {
      return;
    } else {
      mount(this.el, data);
    }
  }
}

const Tr = list.extend('tr', Td);

class KeyControl {
  onAdd(map) {
    this._map = map;

    this._control = el('button', {
      class: 'mapboxgl-ctrl-icon oim-key-control',
    });

    this._container = el('div', {class: 'mapboxgl-ctrl oim-key-panel'});

    this.populate();

    this._control.onclick = e => {
      this._container.style.display = 'block';
      this._control.style.display = 'none';
    };

    setTimeout(e => this.resize(), 100);
    this._map.on('resize', e => this.resize());
    return el('div', this._control, this._container, {
      class: 'mapboxgl-ctrl mapboxgl-ctrl-group',
    });
  }

  resize() {
    // Set max-height of key depending on window style
    let map_style = window.getComputedStyle(this._map.getContainer());
    let cont_style;
    if (this._control.style.display != 'none') {
      cont_style = this._control.getBoundingClientRect();
    } else {
      cont_style = this._container.getBoundingClientRect();
    }
    let height = parseInt(map_style.height) - cont_style.top - 80 + 'px';
    setStyle(this._pane, {'max-height': height});
  }

  header() {
    const close_button = el('.oim-key-close', '×');

    close_button.onclick = e => {
      this._container.style.display = 'none';
      this._control.style.display = 'block';
    };
    return el('.oim-key-header', el('h2', 'Key'), close_button);
  }

  populate() {
    mount(this._container, this.header());

    let pane = el('.oim-key-pane');
    pane.appendChild(el('h3', 'Power Lines'));
    mount(pane, this.voltageTable());
    pane.appendChild(el('h3', 'Power Plants'));
    mount(pane, this.plantTable());
    pane.appendChild(el('h3', 'Power Generators'));
    mount(pane, this.generatorTable());
    pane.appendChild(el('h3', 'Other Power'));
    mount(pane, this.towerTable());
    pane.appendChild(el('h3', 'Telecoms'));
    mount(pane, this.telecomTable());
    pane.appendChild(el('h3', 'Petroleum'));
    mount(pane, this.petroleumTable());
    pane.appendChild(el('h3', 'Water'));
    mount(pane, this.waterTable());
    this._pane = pane;

    mount(this._container, pane);
  }

  voltageTable() {
    let rows = [];
    for (let row of voltage_scale) {
      let label = row[0];
      if (label === null) {
        label = '< 10 kV';
      } else {
        label = `≥ ${label} kV`;
      }

      rows.push([label, row[1]]);
    }

    for (const [key, value] of Object.entries(special_voltages)) {
      rows.push([key, value]);
    }

    rows = rows.map(row => [row[0], svgLine(row[1], 4)]);

    rows.push(['Underground', svgLine('#7A7A85', 2, '3 2')]);
    rows.push(['Line Reference', this.sprite('power_line_ref')]);

    let table = list('table', Tr);
    table.update(rows);
    return table;
  }

  sprite(name, size = 25) {
    let spriteDiv = el('img.oim-plant-sprite', {
      src: `/style/sprites/${name}.svg`,
      height: size,
    });
    setStyle(spriteDiv, {
      'max-width': size + 'px',
    });
    return spriteDiv;
  }

  plantTable() {
    let rows = [];
    for (const [key, value] of Object.entries(plant_types)) {
      rows.push([
        key.charAt(0).toUpperCase() + key.slice(1),
        this.sprite(value),
      ]);
    }
    let table = list('table', Tr);
    table.update(rows);
    return table;
  }

  generatorTable() {
    let rows = [
      ['Wind Turbine', this.sprite('power_wind')],
      ['Solar Panel', svgRectFromLayer(power_layers, 'power_solar_panel')],
    ];
    let table = list('table', Tr);
    table.update(rows);
    return table;
  }

  towerTable() {
    let rows = [
      ['Tower/Pylon', this.sprite('power_tower')],
      ['Transition Tower', this.sprite('power_tower_transition')],
      ['Pole', this.sprite('power_pole', 8)],
      ['Transition Pole', this.sprite('power_pole_transition')],
      ['Transformer', this.sprite('power_transformer')],
      ['Switch', this.sprite('power_switch')],
      ['Compensator', this.sprite('power_compensator')],
    ];
    let table = list('table', Tr);
    table.update(rows);
    return table;
  }

  telecomTable() {
    let rows = [
      ['Cable', svgLineFromLayer(comms_layers, 'communication_line')],
      ['Tower/Mast', this.sprite('comms_tower')],
      ['Datacenter/Exchange', svgRectFromLayer(comms_layers, 'data_center')],
    ];
    let table = list('table', Tr);
    table.update(rows);
    return table;
  }

  petroleumTable() {
    let rows = [
      ['Oil Pipeline', svgLine(colour_oil, 2)],
      ['Gas Pipeline', svgLine(colour_gas, 2)],
      [
        'Petroleum Facility',
        svgRectFromLayer(petroleum_layers, 'petroleum_site'),
      ],
    ];
    let table = list('table', Tr);
    table.update(rows);
    return table;
  }

  waterTable() {
    let rows = [
      ['Water Pipeline', svgLineFromLayer(water_layers, 'water_pipeline')],
    ];
    let table = list('table', Tr);
    table.update(rows);
    return table;
  }
}

export {KeyControl as default};
