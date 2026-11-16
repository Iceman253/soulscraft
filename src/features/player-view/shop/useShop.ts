// What a player can do at a market: buy now at the listed price, ask the GM
// for a better one, and answer the GM's counter-offers.
import { useMemo } from 'react'
import { useEconomyStore, allGoods } from '../../economy/store'
import { useRequestStore } from '../../requests/store'
import { quoteGood } from '../../../lib/economy/economyEngine'
import { GOOD_CATEGORIES } from '../../../lib/economy/goods'
import { countersFor, haggleRequest } from '../../../lib/economy/haggle'
import type { Character, Good, MarketListing, MarketProfile, PlayerRequest } from '../../../types'

export interface ShelfRow { good: Good; listing: MarketListing; unitPrice: number }
export type ShopResult = { ok: true } | { ok: false; reason: string }

export function useShop(c: Character, market: MarketProfile) {
  const economy = useEconomyStore(s => s.economy)
  const { addRequest, approveRequest, denyRequest } = useRequestStore()
  const requests = useRequestStore(s => s.requests)

  const shelves = useMemo(() => {
    const goodsById = new Map(allGoods(economy).map(g => [g.id, g]))
    const rows: ShelfRow[] = market.listings.flatMap(listing => {
      const good = goodsById.get(listing.goodId)
      if (!good || listing.stock === 0) return []
      return [{ good, listing, unitPrice: quoteGood(good, market, economy, listing).final }]
    })
    return GOOD_CATEGORIES
      .map(cat => ({ ...cat, rows: rows.filter(r => r.good.category === cat.id) }))
      .filter(cat => cat.rows.length > 0)
  }, [market, economy])

  const buy = (goodId: string, qty: number, unitPrice: number): ShopResult => {
    const result = useEconomyStore.getState().buy(market.id, goodId, qty, c.id, unitPrice)
    return result.ok ? { ok: true } : { ok: false, reason: result.reason ?? 'The sale fell through.' }
  }

  const askBetterPrice = (row: ShelfRow, qty: number, offerUnit: number): ShopResult => {
    const made = haggleRequest(c, market, row.good, row.unitPrice, qty, offerUnit)
    if (!made.ok) return made
    addRequest(made.request)
    return { ok: true }
  }

  const counters = countersFor(requests, c.id).filter(r => r.payload.marketId === market.id)

  const acceptCounter = (req: PlayerRequest): ShopResult => {
    const result = buy(String(req.payload.goodId), Number(req.payload.quantity) || 1, Number(req.payload.unitPriceCopper) || 0)
    if (result.ok) approveRequest(req.id)
    return result
  }

  const waiting = requests.filter(r =>
    r.characterId === c.id && r.status === 'pending' && (r.type === 'buy-item' || r.type === 'sell-item'))

  return { shelves, buy, askBetterPrice, counters, acceptCounter, declineCounter: (req: PlayerRequest) => denyRequest(req.id), waiting }
}
