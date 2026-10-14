export class OpenInfraMapAPI {
  url: string

  constructor(url: string) {
    this.url = url
  }

  async fetch(path: string) {
    // Resolve to undefined (rather than throwing) when the backend is unreachable,
    // so popups still open when running offline.
    return fetch(this.url + path)
      .then((response) => {
        if (response.status == 200) {
          return response.json()
        }
      })
      .catch(() => undefined)
  }

  async fetchWikidata(qid: string) {
    return this.fetch(`/wikidata/${qid}`)
  }

  async circuitDetail(circuitId: number) {
    return this.fetch(`/api/circuit/${circuitId}`)
  }
}
