export class OpenInfraMapAPI {
  url: string

  constructor(url: string) {
    this.url = url
  }

  async fetch(path: string) {
    return fetch(this.url + path).then((response) => {
      if (response.status == 200) {
        return response.json()
      }
    })
  }

  async fetchWikidata(qid: string) {
    return this.fetch(`/wikidata/${qid}`)
  }

  async circuitDetail(circuitId: number) {
    return this.fetch(`/api/circuit/${circuitId}`)
  }
}
