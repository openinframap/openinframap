// @ts-expect-error No type hints
import browserLanguage from 'in-browser-language'

/* List of supported languages in the OpenInfraMap layer.
 * This should be kept up to date with the list in tegola/layers.yml.
 */
const layer_supported_languages: string[] = ['en', 'es', 'de', 'fr', 'hi', 'ur', 'zh', 'ru', 'pt', 'ja']

/* List of name tags to check, in order */
const local_name_tags: string[] = (browserLanguage.list() as string[])
  .filter((code: string) => layer_supported_languages.includes(code))
  .map((code: string) => `name_${code}`)
  .concat(['name'])

export { layer_supported_languages, local_name_tags }
