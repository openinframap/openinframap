import { t } from 'i18next'

// Map layer names to a descriptive string to show in the infobox
// These are matched by longest prefix
const friendlyNames: { [key: string]: string } = {
  power_transformer: t('names.power.transformer', 'Transformer'),
  power_tower: t('names.power.tower', 'Power tower'),
  power_pole: t('names.power.pole', 'Power pole'),
  power_generator: t('names.power.generator', 'Generator'),
  power_generator_solar: t('names.power.generator_solar', 'Solar generator'),
  power_wind_turbine: t('names.power.wind_turbine', 'Wind turbine'),
  power_substation: t('names.power.substation', 'Substation'),
  power_switch: t('names.power.switch', 'Switch'),
  power_compensator: t('names.power.compensator', 'Compensator'),
  power_converter: t('names.power.converter', 'DC converter'),
  power_cable: t('names.power.cable', 'Power cable'),
  power_line: t('names.power.line', 'Power line'),
  power_line_underground: t('names.power.line_underground', 'Underground power line'),
  power_line_case: t('names.power.line_case', 'Underground power line'),
  power_line_label: t('names.power.line_label', 'Power line'),
  power_solar_panel: t('names.power.solar_panel', 'Solar panel'),
  power_plant: t('names.power.plant', 'Power plant'),
  telecoms_communication_line: t('names.telecoms.communication_line', 'Telecoms line'),
  telecoms_mast: t('names.telecoms.mast', 'Telecoms mast'),
  telecoms_data_center: t('names.telecoms.data_center', 'Telecoms building'),
  telecoms_exchange: t('names.telecoms.exchange', 'Telephone exchange'),
  telecoms_cabinet: t('names.telecoms.cabinet', 'Telecoms cabinet'),
  petroleum_pipeline: t('names.petroleum.pipeline', 'Pipeline'),
  petroleum_well: t('names.petroleum.well', 'Well'),
  water_pipeline: t('names.water.pipeline', 'Water pipeline'),
  water_sewage_treatment_plant: t('names.water.sewage_treatment_plant', 'Sewage treatment plant'),
  water_treatment_plant: t('names.water.treatment_plant', 'Water treatment plant'),
  water_pumping_station: t('names.water.pumping_station', 'Pumping station'),
  water_well: t('names.water.well', 'Water well'),
  water_reservoir: t('names.water.reservoir', 'Water reservoir')
}

export default friendlyNames
