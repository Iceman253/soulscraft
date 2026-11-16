// What the GM merchant modal can sell, and the On Hand item a sale delivers.
import { looksLikeBlocks } from '../../lib/world/building'
import { COIN_VALUE, type CurrencyKey } from '../../lib/economy/currency'
import type { CharacterItem, Good, Item, WeaponSpec } from '../../types'

export interface Ware {
  key: string
  name: string
  description?: string
  weapon?: WeaponSpec
  /** Suggested price, from the economy's base price. */
  basePriceCopper?: number
}

export const WEAPONS_CATALOG = [
  'Wood Sword', 'Stone Sword', 'Iron Sword', 'Gold Sword', 'Diamond Sword',
  'Wood Axe', 'Stone Axe', 'Iron Axe', 'Gold Axe', 'Diamond Axe',
  'Bow', 'Crossbow', 'Iron Dagger',
]

export const ARMOR_CATALOG = [
  'Leather Armor', 'Chainmail Armor', 'Iron Armor', 'Gold Armor', 'Diamond Armor',
  'Leather Shield', 'Iron Shield',
]

export const catalogWares = (names: string[], prefix: string): Ware[] =>
  names.map(name => ({ key: `${prefix}:${name}`, name }))

export const worldItemWares = (items: Item[]): Ware[] =>
  items.map(i => ({ key: `item:${i.id}`, name: i.name, ...(i.description ? { description: i.description } : {}) }))

/** Economy goods that carry weapon stats: the GM's own named weapons. */
export const marketWeaponWares = (goods: Good[]): Ware[] =>
  goods.filter(g => g.weapon).map(g => ({
    key: `good:${g.id}`, name: g.name, weapon: g.weapon, basePriceCopper: g.basePriceCopper,
    ...(g.description ? { description: g.description } : {}),
  }))

export function itemFromWare(ware: Ware, quantity: number): Omit<CharacterItem, 'id'> {
  return {
    name: ware.name,
    quantity,
    isBlock: !ware.weapon && looksLikeBlocks(ware.name),
    ...(ware.description ? { description: ware.description } : {}),
    ...(ware.weapon ? { weapon: ware.weapon } : {}),
  }
}

const TIERS_HIGH_FIRST: CurrencyKey[] = ['diamonds', 'emeralds', 'gold', 'iron', 'copper']

/** A copper price in the biggest coin that divides it evenly, e.g. 2500 → 25 gold. */
export function wholeCoinPrice(copper: number): { currency: CurrencyKey; amount: number } {
  const currency = TIERS_HIGH_FIRST.find(k => copper > 0 && copper % COIN_VALUE[k] === 0) ?? 'copper'
  return { currency, amount: Math.max(0, Math.round(copper / COIN_VALUE[currency])) }
}
