import { Definition, DocumentSelector, Location, LocationLink } from 'vscode-languageserver-protocol'
import { TextDocument } from 'vscode-languageserver-textdocument'
import workspace from '../workspace'
import window from '../window'
import { equals } from '../util/object'
const logger = require('../util/logger')('provider-manager')

export interface ProviderItem<T> {
  id: string
  selector: DocumentSelector
  provider: T
  [key: string]: any
}

export default class Manager<T> {
  protected providers: Set<ProviderItem<T>> = new Set()

  public hasProvider(document: TextDocument): boolean {
    return this.getProvider(document) != null
  }

  protected getProvider(document: TextDocument): ProviderItem<T> {
    let currScore = 0
    let providerItem: ProviderItem<T>
    for (let item of this.providers) {
      let { selector, priority } = item
      let score = workspace.match(selector, document)
      if (score == 0) continue
      if (typeof priority == 'number') {
        score = priority
      }
      if (score < currScore) continue
      currScore = score
      providerItem = item
    }
    return providerItem
  }

  protected poviderById(id): T {
    let item = Array.from(this.providers).find(o => o.id == id)
    return item ? item.provider : null
  }

  protected getProviders(document: TextDocument): ProviderItem<T>[] {
    let items = Array.from(this.providers)
    items = items.filter(item => workspace.match(item.selector, document) > 0)
    return items.sort((a, b) => workspace.match(b.selector, document) - workspace.match(a.selector, document))
  }

  protected toLocations(arr: (Definition | LocationLink[])[]): Location[] {
    let res: Location[] = []
    for (let def of arr) {
      if (!def) continue
      if (Location.is(def)) {
        addLocation(res, def)
      } else if (Array.isArray(def)) {
        for (let d of def) {
          if (Location.is(d)) {
            addLocation(res, d)
          } else if (LocationLink.is(d)) {
            let { targetUri, targetSelectionRange } = d
            addLocation(res, Location.create(targetUri, targetSelectionRange))
          }
        }
      } else {
        window.showMessage(`Bad definition ${JSON.stringify(def)}`, 'error')
      }
    }
    return res
  }
}

/**
 * Add location with unique ranges
 */
function addLocation(arr: Location[], location: Location): void {
  let { range } = location
  if (arr.find(o => equals(o.range, range)) != null) return
  arr.push(location)
}
