import i18next, { t } from 'i18next'

/* List of supported languages in the OpenInfraMap layer.
 * This should be kept up to date with the list in tegola/layers.yml.
 */
export const layer_supported_languages: string[] = [
  'en',
  'es',
  'el',
  'de',
  'fr',
  'hi',
  'ur',
  'zh',
  'ru',
  'pt',
  'ja',
  'it',
  'nl'
]

/* List of name tags to check, in order */
export function local_name_tags(): string[] {
  const lang = i18next.language.split('-')[0]
  if (layer_supported_languages.includes(lang)) {
    return [`name_${lang}`, 'name']
  }
  return ['name']
}

export function formatVoltage(value: number | number[]): string {
  if (!Array.isArray(value)) {
    value = [value]
  }

  const formatter = new Intl.NumberFormat(i18next.language, { maximumFractionDigits: 2 })

  let text = [...value]
    .sort((a, b) => a - b)
    .reverse()
    .map((val) => formatter.format(val))
    .join('/')
  text += ' ' + t('units.kV', 'kV')
  return text
}

export function formatFrequency(value: number | number[]): string {
  if (!Array.isArray(value)) {
    value = [value]
  }

  const formatter = new Intl.NumberFormat(i18next.language, { maximumFractionDigits: 2 })

  let text = [...value]
    .sort((a, b) => a - b)
    .reverse()
    .map((val) => formatter.format(val))
    .join('/')
  text += ' ' + t('units.Hz', 'Hz')
  return text
}

export function formatPower(value: number): string {
  const formatter = new Intl.NumberFormat(i18next.language, { maximumFractionDigits: 2 })
  if (value < 1) {
    return formatter.format(value * 1000) + ' ' + t('units.kW', 'kW')
  } else {
    return formatter.format(value) + ' ' + t('units.MW', 'MW')
  }
}
