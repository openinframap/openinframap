import './warning-box.css'
import { el, unmount } from 'redom'

class WarningBox {
  content: HTMLDivElement
  el: HTMLDivElement
  constructor(title: string) {
    this.content = el('div', { class: 'infobox-content' })
    const closeButton = el('a', '×')
    const header = el('div', title, closeButton, { class: 'infobox-header' })

    this.el = el('div', el('div', header, this.content, { class: 'infobox' }), { class: 'infobox-container' })

    closeButton.onclick = (e) => this.closeHandler(e)
    this.el.onclick = (e) => this.closeHandler(e)
  }

  closeHandler(e: MouseEvent) {
    unmount(document.body, this.el)
    e.preventDefault()
  }

  update(data: string) {
    this.content.innerHTML = data
  }
}

export default WarningBox
