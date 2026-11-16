import { describe, it, expect } from 'vitest'
import { coinName, coinWords, formatCopper, fromCoin, fromCopper, inCoin, toCopper } from './currency'

describe('coin words', () => {
  it('names each coin in a price, biggest first', () => {
    expect(coinWords(250)).toBe('2 Gold 5 Iron')
    expect(coinWords(12_345)).toBe('1 Diamond 2 Emeralds 3 Gold 4 Iron 5 Copper')
  })

  it('uses singular and plural names', () => {
    expect(coinWords(1_000)).toBe('1 Emerald')
    expect(coinWords(20_000)).toBe('2 Diamonds')
    expect(coinName('emeralds', 1)).toBe('Emerald')
    expect(coinName('emeralds', 0)).toBe('Emeralds')
    expect(coinName('gold', 7)).toBe('Gold')
  })

  it('says nothing costs 0 Copper', () => {
    expect(coinWords(0)).toBe('0 Copper')
  })

  it('agrees with the short form', () => {
    expect(formatCopper(250)).toBe('2g 5i')
  })
})

describe('typing a price in a chosen coin', () => {
  it('converts copper to that coin, fractions included', () => {
    expect(inCoin(250, 'gold')).toBe(2.5)
    expect(inCoin(250, 'copper')).toBe(250)
    expect(inCoin(30_000, 'diamonds')).toBe(3)
  })

  it('converts back to whole copper', () => {
    expect(fromCoin(2.5, 'gold')).toBe(250)
    expect(fromCoin(3, 'emeralds')).toBe(3_000)
    expect(fromCoin(1.234, 'iron')).toBe(12)
  })

  it('never goes below nothing', () => {
    expect(fromCoin(-4, 'gold')).toBe(0)
  })

  it('round-trips through any coin', () => {
    for (const key of ['copper', 'iron', 'gold', 'emeralds', 'diamonds'] as const) {
      expect(fromCoin(inCoin(4_321, key), key)).toBe(4_321)
    }
  })
})

describe('wallets', () => {
  it('makes change with the fewest coins', () => {
    expect(fromCopper(1_234)).toEqual({ copper: 4, iron: 3, gold: 2, emeralds: 1, diamonds: 0 })
    expect(toCopper({ copper: 4, iron: 3, gold: 2, emeralds: 1, diamonds: 0 })).toBe(1_234)
  })
})
