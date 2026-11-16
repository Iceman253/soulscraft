// Haggling: a player offers less than the listed price, the GM accepts or
// counters, and a counter goes back to the player to take or leave.
import { formatCopper } from './currency'
import type { Character, Good, MarketProfile, PlayerRequest } from '../../types'

/** What a "better price" request carries. `unitPriceCopper` is the price on the
 *  table: the player's offer, then the GM's counter. */
export interface HagglePayload {
  [key: string]: unknown
  haggle: true
  marketId: string
  goodId: string
  goodName: string
  quantity: number
  listedUnitCopper: number
  offerUnitCopper: number
  unitPriceCopper: number
}

/** The market at a character's location, if there is one. */
export function marketAt(markets: MarketProfile[], locationId: string | null | undefined): MarketProfile | null {
  return locationId ? markets.find(m => m.areaId === locationId) ?? null : null
}

/** An offer is worth sending when it's a whole number of copper below the listed price. */
export function isValidOffer(offerUnit: number, listedUnit: number): boolean {
  return Number.isInteger(offerUnit) && offerUnit >= 1 && offerUnit < listedUnit
}

/** A price at or under the player's offer they already agreed to, so the GM can
 *  settle it; anything higher has to go back to them. */
export function gmDecision(gmUnit: number, offerUnit: number): 'approve' | 'counter' {
  return gmUnit <= offerUnit ? 'approve' : 'counter'
}

export function haggleLabel(p: Pick<HagglePayload, 'quantity' | 'goodName' | 'offerUnitCopper' | 'listedUnitCopper'>, marketName: string): string {
  return `asks for a better price on ${p.quantity}× ${p.goodName} at ${marketName}: offers ${formatCopper(p.offerUnitCopper)} each (listed ${formatCopper(p.listedUnitCopper)})`
}

/** The request a player sends to ask for `offerUnit` each instead of the listed
 *  price, or why it can't be sent. */
export function haggleRequest(
  c: Pick<Character, 'id' | 'name'>, market: Pick<MarketProfile, 'id' | 'name'>,
  good: Pick<Good, 'id' | 'name'>, listedUnit: number, quantity: number, offerUnit: number,
): { ok: true; request: Omit<PlayerRequest, 'id' | 'status' | 'createdAt'> } | { ok: false; reason: string } {
  if (!isValidOffer(offerUnit, listedUnit)) return { ok: false, reason: `Offer at least 1 copper and less than ${formatCopper(listedUnit)}.` }
  if (!Number.isInteger(quantity) || quantity < 1) return { ok: false, reason: 'Pick how many you want.' }
  const payload: HagglePayload = {
    haggle: true, marketId: market.id, goodId: good.id, goodName: good.name, quantity,
    listedUnitCopper: listedUnit, offerUnitCopper: offerUnit, unitPriceCopper: offerUnit,
  }
  return { ok: true, request: { characterId: c.id, characterName: c.name, type: 'buy-item', label: haggleLabel(payload, market.name), payload } }
}

export const isHaggle =(r: Pick<PlayerRequest, 'type' | 'payload'>): boolean => r.type === 'buy-item' && r.payload.haggle === true

/** This character's haggles the GM has countered, waiting on their answer. */
export function countersFor(requests: PlayerRequest[], characterId: string): PlayerRequest[] {
  return requests.filter(r => r.characterId === characterId && r.status === 'countered' && isHaggle(r))
}
