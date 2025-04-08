import './search.css'
import i18next, { t } from 'i18next'
import { el } from 'redom'
import { IControl } from 'maplibre-gl'
import OpenCageSearch from './opencage'
import CoordinatesSearch from './coordinates'
import OIMSearchProvider from './openinframap'

export type SearchResult = {
  latitude: number
  longitude: number
  name: string
  score: number
  description?: string
}

export interface ISearchProvider {
  search(query: string, limit?: number): Promise<SearchResult[]>
}

export default class OIMSearch implements IControl {
  map?: maplibregl.Map
  container: HTMLElement
  input: HTMLInputElement
  dropdown: HTMLElement
  clearButton: HTMLElement
  selectedIndex: number = -1
  debounceTimer?: number
  isLoading: boolean = false
  currentResults: SearchResult[] = []
  searchProviders: ISearchProvider[]
  currentQuery: string = ''

  constructor() {
    this.searchProviders = [
      new CoordinatesSearch(),
      // OpenCage API key will only work on openinframap.org or localhost. Thanks to OpenCage for sponsoring!
      new OpenCageSearch('oc_gs_a595f2059dee41d6b7073647aec5c303', i18next.language),
      new OIMSearchProvider(i18next.language)
    ]

    this.input = el('input', {
      type: 'text',
      className: 'oim-search-input'
    }) as HTMLInputElement

    this.clearButton = el(
      'button',
      {
        className: 'oim-search-clear',
        type: 'button',
        title: t('search.clear'),
        style: { display: 'none' }
      },
      '×'
    )

    this.dropdown = el('div', { className: 'oim-search-dropdown' })
    this.container = el(
      'div',
      { className: 'maplibregl-ctrl oim-search' },
      el('div', { className: 'oim-search-control' }, this.input, this.clearButton),
      this.dropdown
    )

    this.input.addEventListener('input', this.onInput.bind(this))
    this.input.addEventListener('keydown', this.onKeyDown.bind(this))
    this.clearButton.addEventListener('click', this.clearSearch.bind(this))
    this.dropdown.addEventListener('click', this.onDropdownClick.bind(this))
  }

  onAdd(map: maplibregl.Map): HTMLElement {
    this.map = map
    this.map.on('move', () => {
      this.clearSearch()
    })
    return this.container
  }

  onRemove(): void {
    this.container.parentNode?.removeChild(this.container)
    this.map = undefined
  }

  async onInput(event: Event): Promise<void> {
    const query = (event.target as HTMLInputElement).value.trim()

    this.clearButton.style.display = query ? 'block' : 'none'

    if (this.currentQuery === query) {
      return
    }

    this.currentQuery = query

    if (!query || query.length < 3) {
      this.clearDropdown()
      return
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = undefined
    }

    this.isLoading = true
    this.showLoadingIndicator()

    this.debounceTimer = window.setTimeout(async () => {
      try {
        const results = await this.search(query)
        if (this.currentQuery !== query) {
          return
        }
        this.isLoading = false
        this.currentResults = results
        this.updateDropdown(results)

        if (results.length > 0) {
          this.selectedIndex = 0
          this.highlightSelected()
        }
      } catch (error) {
        this.isLoading = false
        this.currentResults = []
        console.error('Search error:', error)
      }
    }, 300)
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key == 'Escape') {
      event.preventDefault()
      this.clearSearch()
      return
    }

    if (this.currentResults.length === 0) return

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.currentResults.length - 1)
        this.highlightSelected()
        break
      case 'ArrowUp':
        event.preventDefault()
        this.selectedIndex = Math.max(this.selectedIndex - 1, -1)
        this.highlightSelected()
        break
      case 'Enter':
        event.preventDefault()
        if (this.selectedIndex >= 0 && this.selectedIndex < this.currentResults.length) {
          this.selectItem(this.currentResults[this.selectedIndex])
        }
        break
    }
  }

  highlightSelected(): void {
    const items = this.dropdown.querySelectorAll('.oim-search-item')
    items.forEach((item) => {
      item.classList.remove('selected')
    })

    if (this.selectedIndex >= 0) {
      items[this.selectedIndex].classList.add('selected')
    }
  }

  selectItem(result: SearchResult): void {
    if (result) {
      this.map!.flyTo({ center: [result.longitude, result.latitude], zoom: 14 })
      this.input.value = result.name
      this.clearDropdown()
    }
  }

  onDropdownClick(event: MouseEvent): void {
    const target = event.target as HTMLElement
    const item = target.closest('.oim-search-item') as HTMLElement
    if (item && item.dataset.index) {
      const index = parseInt(item.dataset.index, 10)
      if (!isNaN(index) && index >= 0 && index < this.currentResults.length) {
        this.selectItem(this.currentResults[index])
      }
    }
  }

  clearSearch(): void {
    this.input.value = ''
    this.clearDropdown()
    this.clearButton.style.display = 'none'
    this.input.blur()
  }

  clearDropdown(): void {
    this.dropdown.innerHTML = ''
    this.selectedIndex = -1
    this.isLoading = false
    this.currentResults = []
  }

  showLoadingIndicator(): void {
    this.clearDropdown()
    const loadingEl = el('div.oim-search-status', '...')
    this.dropdown.appendChild(loadingEl)
  }

  updateDropdown(results: SearchResult[]): void {
    this.clearDropdown()
    this.currentResults = results

    if (results.length === 0) {
      const noResultsEl = el('div.oim-search-empty', t('search.no-results'))
      this.dropdown.appendChild(noResultsEl)
      return
    }

    const list = el('ol', { className: 'oim-search-list' })
    results.forEach((result, index) => {
      const item = el(
        'li',
        {
          className: 'oim-search-item',
          dataset: {
            index: index.toString()
          }
        },
        el('span.search-result-name', result.name),
        el('div', { className: 'oim-search-description' }, result.description || '')
      )
      list.appendChild(item)
    })

    this.dropdown.appendChild(list)
    this.dropdown.appendChild(
      el(
        'div',
        { className: 'oim-search-footer' },
        el('a', 'Place search powered by OpenCage', {
          href: 'https://opencagedata.com',
          target: '_blank',
          rel: 'noopener noreferrer'
        })
      )
    )
  }

  async search(query: string): Promise<SearchResult[]> {
    const results = await Promise.all(this.searchProviders.map((provider) => provider.search(query, 5)))

    return results
      .flat()
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
  }
}
