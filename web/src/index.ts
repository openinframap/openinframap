import './index.css'
import i18next from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import resources from 'virtual:i18next-loader'

await i18next.use(LanguageDetector).init({
  lng: 'en',
  fallbackLng: 'en',
  supportedLngs: ['en'],
  resources: resources,
  debug: import.meta.env.DEV
})

import OpenInfraMap from './openinframap'

export const openinframap = new OpenInfraMap()

if (document.readyState != 'loading') {
  openinframap.init()
} else {
  document.addEventListener('DOMContentLoaded', openinframap.init)
}
