import './tab-pane.css'
import { el, mount } from 'redom'

export class TabPane {
  el: HTMLElement
  header?: HTMLElement

  constructor() {
    this.el = el('div.tab-pane')
  }

  addTab(title: string, content: HTMLElement) {
    let classes = ''
    if (!this.header) {
      this.header = el('div.tab-header')
      mount(this.el, this.header)
    }
    if (this.header.children.length === 0) {
      classes = 'active'
    }
    const tab = el('div.tab', title, { class: classes })
    const tabContent = el('div.tab-content', content, { class: classes })
    tab.addEventListener('click', () => {
      this.el.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'))
      tab.classList.add('active')

      this.el.querySelectorAll('.tab-content').forEach((t) => t.classList.remove('active'))
      tabContent.classList.add('active')
    })

    this.header.appendChild(tab)
    this.el.appendChild(tabContent)
  }
}
