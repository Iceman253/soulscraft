import { create } from 'zustand'
import type {
  EconomyData, MarketProfile, MarketListing, Good, Faction, EconomicEvent,
} from '../../types'
import { newId } from '../../lib/id'
import { useCampaignStore } from '../campaigns/store'
import { useCharacterStore } from '../characters/store'
import { log } from '../log/store'
import { GOODS_CATALOG } from '../../lib/goods'
import { emptyEconomy, tickEconomyDay } from '../../lib/economyEngine'
import { toCopper, fromCopper, addToWallet, formatCopper } from '../../lib/currency'

interface BuyOpts {
  /** GM override: complete the sale even if the buyer can't afford it —
   *  their wallet is emptied and the difference is forgiven (or owed). */
  force?: boolean
}

interface EconomyStore {
  economy: EconomyData
  hydrate: (economy: EconomyData | undefined) => void

  // Markets
  addMarket: (market: Omit<MarketProfile, 'id'>) => string
  updateMarket: (id: string, patch: Partial<MarketProfile>) => void
  deleteMarket: (id: string) => void
  upsertListing: (marketId: string, listing: MarketListing) => void
  removeListing: (marketId: string, goodId: string) => void
  /** Replace or merge the market's stock with engine suggestions (GM-reviewed). */
  applyListings: (marketId: string, listings: MarketListing[], mode: 'replace' | 'merge') => void

  // Goods
  addCustomGood: (good: Omit<Good, 'id' | 'custom'>) => string
  updateCustomGood: (id: string, patch: Partial<Good>) => void
  deleteCustomGood: (id: string) => void
  setBasePriceOverride: (goodId: string, copper: number | null) => void

  // Factions & reputation
  addFaction: (faction: Omit<Faction, 'id'>) => string
  updateFaction: (id: string, patch: Partial<Faction>) => void
  deleteFaction: (id: string) => void
  setReputation: (factionId: string, value: number) => void
  adjustReputation: (factionId: string, delta: number) => void

  // Events
  addEvent: (event: Omit<EconomicEvent, 'id'>) => void
  removeEvent: (id: string) => void

  // Transactions — prices are FINAL copper amounts the GM confirmed.
  buy: (marketId: string, goodId: string, qty: number, characterId: string, unitPriceCopper: number, opts?: BuyOpts) => { ok: boolean; reason?: string }
  sell: (marketId: string, characterId: string, itemId: string, qty: number, unitPriceCopper: number) => { ok: boolean; reason?: string }

  // Time
  endDayTick: () => void
}

function save(economy: EconomyData) {
  useCampaignStore.getState().updateCampaignData({ economy })
}

/** Built-in catalog + GM-authored goods. */
export function allGoods(economy: EconomyData): Good[] {
  return [...GOODS_CATALOG, ...economy.customGoods]
}

export const useEconomyStore = create<EconomyStore>((set, get) => {
  /** Apply a mutation to the economy blob, then persist. */
  const update = (fn: (e: EconomyData) => EconomyData) => {
    const economy = fn(get().economy)
    set({ economy }); save(economy)
  }
  const updateMarketById = (id: string, fn: (m: MarketProfile) => MarketProfile) =>
    update(e => ({ ...e, markets: e.markets.map(m => m.id === id ? fn(m) : m) }))

  return {
    economy: emptyEconomy(),

    hydrate(economy) { set({ economy: economy ?? emptyEconomy() }) },

    addMarket(market) {
      const id = newId()
      update(e => ({ ...e, markets: [...e.markets, { ...market, id }] }))
      log('manual', `🏪 Market "${market.name}" established.`)
      return id
    },

    updateMarket(id, patch) {
      updateMarketById(id, m => ({ ...m, ...patch }))
    },

    deleteMarket(id) {
      update(e => ({ ...e, markets: e.markets.filter(m => m.id !== id) }))
    },

    upsertListing(marketId, listing) {
      updateMarketById(marketId, m => {
        const exists = m.listings.some(l => l.goodId === listing.goodId)
        return {
          ...m,
          listings: exists
            ? m.listings.map(l => l.goodId === listing.goodId ? { ...l, ...listing } : l)
            : [...m.listings, listing],
        }
      })
    },

    removeListing(marketId, goodId) {
      updateMarketById(marketId, m => ({ ...m, listings: m.listings.filter(l => l.goodId !== goodId) }))
    },

    applyListings(marketId, listings, mode) {
      updateMarketById(marketId, m => {
        if (mode === 'replace') {
          // Keep GM-locked lines exactly as they are; replace the rest.
          const lockedLines = m.listings.filter(l => l.locked)
          const lockedIds = new Set(lockedLines.map(l => l.goodId))
          return { ...m, listings: [...lockedLines, ...listings.filter(l => !lockedIds.has(l.goodId))] }
        }
        // Merge: only add goods the market doesn't already carry.
        const have = new Set(m.listings.map(l => l.goodId))
        return { ...m, listings: [...m.listings, ...listings.filter(l => !have.has(l.goodId))] }
      })
    },

    addCustomGood(good) {
      const id = newId()
      update(e => ({ ...e, customGoods: [...e.customGoods, { ...good, id, custom: true }] }))
      return id
    },

    updateCustomGood(id, patch) {
      update(e => ({ ...e, customGoods: e.customGoods.map(g => g.id === id ? { ...g, ...patch } : g) }))
    },

    deleteCustomGood(id) {
      update(e => ({
        ...e,
        customGoods: e.customGoods.filter(g => g.id !== id),
        // Drop dangling listings so markets never reference a deleted good.
        markets: e.markets.map(m => ({ ...m, listings: m.listings.filter(l => l.goodId !== id) })),
      }))
    },

    setBasePriceOverride(goodId, copper) {
      update(e => {
        const basePriceOverrides = { ...e.basePriceOverrides }
        if (copper === null) delete basePriceOverrides[goodId]
        else basePriceOverrides[goodId] = copper
        return { ...e, basePriceOverrides }
      })
    },

    addFaction(faction) {
      const id = newId()
      update(e => ({ ...e, factions: [...e.factions, { ...faction, id }], reputation: { ...e.reputation, [id]: 0 } }))
      return id
    },

    updateFaction(id, patch) {
      update(e => ({ ...e, factions: e.factions.map(f => f.id === id ? { ...f, ...patch } : f) }))
    },

    deleteFaction(id) {
      update(e => {
        const reputation = { ...e.reputation }
        delete reputation[id]
        return {
          ...e,
          factions: e.factions.filter(f => f.id !== id),
          reputation,
          markets: e.markets.map(m => m.factionId === id ? { ...m, factionId: null } : m),
        }
      })
    },

    setReputation(factionId, value) {
      const clamped = Math.max(-100, Math.min(100, Math.round(value)))
      update(e => ({ ...e, reputation: { ...e.reputation, [factionId]: clamped } }))
    },

    adjustReputation(factionId, delta) {
      const current = get().economy.reputation[factionId] ?? 0
      get().setReputation(factionId, current + delta)
      const faction = get().economy.factions.find(f => f.id === factionId)
      if (faction && delta !== 0) {
        log('manual', `${delta > 0 ? '🤝' : '💢'} Standing with ${faction.name}: ${delta > 0 ? '+' : ''}${delta} → ${get().economy.reputation[factionId]}.`)
      }
    },

    addEvent(event) {
      update(e => ({ ...e, events: [...e.events, { ...event, id: newId() }] }))
      log('manual', `📈 Economic event: ${event.name} (${event.scope === 'global' ? 'everywhere' : 'local'}).`)
    },

    removeEvent(id) {
      const ev = get().economy.events.find(e => e.id === id)
      update(e => ({ ...e, events: e.events.filter(x => x.id !== id) }))
      if (ev) log('manual', `📉 Economic event ended: ${ev.name}.`)
    },

    buy(marketId, goodId, qty, characterId, unitPriceCopper, opts) {
      const { economy } = get()
      const market = economy.markets.find(m => m.id === marketId)
      const good = allGoods(economy).find(g => g.id === goodId)
      const charStore = useCharacterStore.getState()
      const char = charStore.characters.find(c => c.id === characterId)
      if (!market || !good || !char) return { ok: false, reason: 'Market, good, or character not found.' }
      if (qty < 1) return { ok: false, reason: 'Quantity must be at least 1.' }

      const listing = market.listings.find(l => l.goodId === goodId)
      if (listing && listing.stock >= 0 && listing.stock < qty) {
        return { ok: false, reason: `Only ${listing.stock} in stock.` }
      }

      const total = Math.round(unitPriceCopper * qty)
      const have = toCopper(char.currency)
      if (have < total && !opts?.force) {
        return { ok: false, reason: `${char.name} has ${formatCopper(have)} — needs ${formatCopper(total)}.` }
      }

      // Pay (force empties the wallet when short) and re-coin the remainder.
      charStore.setCurrency(characterId, fromCopper(Math.max(0, have - total)))
      charStore.addOnHandItem(characterId, { name: good.name, quantity: qty, isBlock: false })

      if (listing && listing.stock > 0) {
        get().upsertListing(marketId, { ...listing, stock: Math.max(0, listing.stock - qty) })
      }

      const forced = have < total ? ' (GM waived the shortfall)' : ''
      log('item-purchase', `🛒 ${char.name} bought ${qty}× ${good.name} at ${market.name} for ${formatCopper(total)}${forced}.`)
      return { ok: true }
    },

    sell(marketId, characterId, itemId, qty, unitPriceCopper) {
      const { economy } = get()
      const market = economy.markets.find(m => m.id === marketId)
      const charStore = useCharacterStore.getState()
      const char = charStore.characters.find(c => c.id === characterId)
      if (!market || !char) return { ok: false, reason: 'Market or character not found.' }
      const item = char.onHand.items.find(i => i.id === itemId)
      if (!item) return { ok: false, reason: 'Item not found in on-hand inventory.' }
      if (qty < 1 || qty > item.quantity) return { ok: false, reason: `Quantity must be 1–${item.quantity}.` }

      const total = Math.round(unitPriceCopper * qty)

      if (qty >= item.quantity) charStore.removeOnHandItem(characterId, itemId)
      else charStore.updateOnHandItem(characterId, itemId, { quantity: item.quantity - qty })

      charStore.setCurrency(characterId, addToWallet(char.currency, total))

      // If the merchant recognises the item as a known good, it joins their stock.
      const good = allGoods(economy).find(g => g.name.toLowerCase() === item.name.toLowerCase())
      if (good) {
        const listing = market.listings.find(l => l.goodId === good.id)
        if (listing && listing.stock >= 0) {
          get().upsertListing(marketId, { ...listing, stock: listing.stock + qty })
        } else if (!listing) {
          get().upsertListing(marketId, { goodId: good.id, stock: qty })
        }
      }

      log('item-purchase', `💰 ${char.name} sold ${qty}× ${item.name} at ${market.name} for ${formatCopper(total)}.`)
      return { ok: true }
    },

    endDayTick() {
      const { economy } = get()
      if (economy.markets.length === 0 && economy.events.length === 0) return
      update(e => tickEconomyDay(e, allGoods(e)))
      log('manual', '🌅 Markets turned over with the new day — stock and prices shifted.')
    },
  }
})
