import i18next from 'i18next'

/* List of supported languages in the OpenInfraMap layer.
 * This should be kept up to date with the list in tegola/layers.yml.
 */
const layer_supported_languages: string[] = ['en', 'es', 'de', 'fr', 'hi', 'ur', 'zh', 'ru', 'pt', 'ja']

/* List of name tags to check, in order */
function local_name_tags(): string[] {
  const lang = i18next.language.split('-')[0]
  if (layer_supported_languages.includes(lang)) {
    return [`name_${lang}`, 'name']
  }
  return ['name']
}

export { layer_supported_languages, local_name_tags }
