// Map layer names to a descriptive string to show in the infobox
// These are matched by longest prefix
const friendlyNames: { [key: string]: string } = {
  power_transformer: 'Transformer',
  power_tower: 'Power tower',
  power_pole: 'Power pole',
  power_generator: 'Generator',
  power_wind_turbine: 'Wind turbine',
  power_substation: 'Substation',
  power_switch: 'Switch',
  power_compensator: 'Compensator',
  power_converter: 'DC converter substation',
  power_cable: 'Cable',
  power_line: 'Power line',
  power_line_underground: 'Underground power line',
  power_line_case: 'Underground power line',
  power_line_label: 'Power line',
  power_solar_panel: 'Solar panel',
  power_plant: 'Power plant',
  telecoms_communication_line: 'Telecoms line',
  telecoms_mast: 'Telecoms mast',
  telecoms_data_center: 'Telecoms building',
  petroleum_pipeline: 'Pipeline',
  petroleum_well: 'Well',
  water_pipeline: 'Water pipeline',
  water_sewage_treatment_plant: 'Sewage treatment plant',
  water_treatment_plant: 'Water treatment plant',
  water_pumping_station: 'Pumping station'
}

export default friendlyNames
