import './index.css'
import i18next from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import resources from 'virtual:i18next-loader'

await i18next.use(LanguageDetector).init({
  fallbackLng: {
    no: ['nb-NO'],
    default: ['en']
  },
  supportedLngs: ['en', 'de', 'fr', 'el', 'no', 'nb-NO'],
  resources: resources,
  debug: import.meta.env.DEV,
  detection: {
    // Don't save language locally. This may need to change if we add a language switcher.
    order: ['querystring', 'navigator'],
    caches: []
  }
})

document.documentElement.lang = i18next.language

// Translate HTML elements.
document.querySelectorAll('[data-i18n]').forEach((element) => {
  const key = element.getAttribute('data-i18n')
  if (key) {
    ;(element as HTMLElement).innerText = i18next.t(key)
  }
})

import OpenInfraMap from './openinframap'

export const openinframap = new OpenInfraMap()

if (document.readyState != 'loading') {
  openinframap.init()
} else {
  document.addEventListener('DOMContentLoaded', openinframap.init)
}
