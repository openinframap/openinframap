import './index.css'
import OpenInfraMap from './openinframap'

export const openinframap = new OpenInfraMap()

if (document.readyState != 'loading') {
  openinframap.init()
} else {
  document.addEventListener('DOMContentLoaded', openinframap.init)
}
