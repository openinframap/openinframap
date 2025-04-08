/*
 * Open Infrastructure Map search provider
 */
import { SearchResult, ISearchProvider } from './search'
import { formatVoltage, formatPower } from '../l10n'
import { t } from 'i18next'

type OIMResult = {
  name: string
  type: string
  operator?: string
  voltage?: number
  output?: number
  source?: string
  country: string
  geometry: {
    coordinates: number[]
  }
}

type OIMResponse = {
  results: OIMResult[]
}

export default class OIMSearchProvider implements ISearchProvider {
  url = 'https://openinframap.org/search/typeahead'
  baseScore: number = 0.9
  language: string
  regionNames: Intl.DisplayNames

  constructor(language: string = 'en') {
    this.language = language
    this.regionNames = new Intl.DisplayNames([language], { type: 'region' })
  }

  async search(query: string, _limit: number = 5): Promise<SearchResult[]> {
    const searchParams = new URLSearchParams({
      q: query,
      lang: this.language,
      v: '2'
    })

    const result = await fetch(`${this.url}?${searchParams.toString()}`, {
      method: 'GET'
    })

    if (!result.ok) {
      throw new Error('Failed to fetch OIM search results')
    }

    const data = (await result.json()) as OIMResponse

    if (data.results.length === 0) {
      return []
    }

    return data.results.map((result: OIMResult, index: number) => ({
      latitude: result.geometry.coordinates[1],
      longitude: result.geometry.coordinates[0],
      name: result.name,
      description: this.description(result),
      score: this.baseScore - index * 0.1
    }))
  }

  description(result: OIMResult): string {
    var description = ''
    if (result.type === 'substation' && result.voltage) {
      description += `${t('names.power.substation')} (${formatVoltage(result.voltage / 1000)})`
    } else if (result.type === 'plant' && result.output) {
      description += `${t('names.power.plant')} (${formatPower(result.output / 1e6)})`
    } else {
      description += `${result.type}`
    }
    if (result.country) {
      const country = this.regionNames.of(result.country)
      if (country) {
        description += `, ${country}`
      }
    }
    return description
  }
}
