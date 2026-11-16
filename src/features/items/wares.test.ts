import { describe, it, expect } from 'vitest'
import { catalogWares, itemFromWare, marketWeaponWares, wholeCoinPrice, worldItemWares } from './wares'
import type { Good, Item } from '../../types'

const spec = { type: 'sword' as const, material: 'diamond' as const, damageBonus: 3, enchantments: [] }

describe('wares', () => {
  it('lists only economy goods that carry weapon stats', () => {
    const goods = [
      { id: 'a', name: 'Frostbrand', category: 'weapon', basePriceCopper: 2500, tags: [], weapon: spec, description: 'Cold' },
      { id: 'b', name: 'Iron Sword', category: 'weapon', basePriceCopper: 800, tags: [] },
    ] as unknown as Good[]
    expect(marketWeaponWares(goods)).toEqual([
      { key: 'good:a', name: 'Frostbrand', weapon: spec, basePriceCopper: 2500, description: 'Cold' },
    ])
  })

  it('keys catalog and world items so names never collide', () => {
    expect(catalogWares(['Bow'], 'weapon')).toEqual([{ key: 'weapon:Bow', name: 'Bow' }])
    const items = [{ id: 'x', name: 'Bow', quantity: 1, location: { type: 'world' } }] as unknown as Item[]
    expect(worldItemWares(items)).toEqual([{ key: 'item:x', name: 'Bow' }])
  })

  it('delivers a weapon with its stats and never as blocks', () => {
    expect(itemFromWare({ key: 'good:a', name: 'Stone Blade', weapon: spec }, 1))
      .toEqual({ name: 'Stone Blade', quantity: 1, isBlock: false, weapon: spec })
  })

  it('still spots blocks in plain wares', () => {
    expect(itemFromWare({ key: 'item:s', name: 'Stone Blocks' }, 5)).toMatchObject({ isBlock: true, quantity: 5 })
  })
})

describe('wholeCoinPrice', () => {
  it('uses the biggest coin that divides the price evenly', () => {
    expect(wholeCoinPrice(2500)).toEqual({ currency: 'gold', amount: 25 })
    expect(wholeCoinPrice(30000)).toEqual({ currency: 'diamonds', amount: 3 })
    expect(wholeCoinPrice(15)).toEqual({ currency: 'copper', amount: 15 })
  })

  it('falls back to copper for nothing', () => {
    expect(wholeCoinPrice(0)).toEqual({ currency: 'copper', amount: 0 })
  })
})
