import { describe, it, expect } from 'vitest'
import { countersFor, gmDecision, haggleLabel, haggleRequest, isHaggle, isValidOffer, marketAt } from './haggle'
import type { MarketProfile, PlayerRequest } from '../../types'

const market = { id: 'm', name: 'Mason' }
const steve = { id: 'c1', name: 'Steve' }
const sword = { id: 'iron-sword', name: 'Iron Sword' }

describe('marketAt', () => {
  const markets = [{ id: 'a', areaId: 'town' }, { id: 'b', areaId: null }] as unknown as MarketProfile[]
  it('finds the market in the character’s area', () => expect(marketAt(markets, 'town')?.id).toBe('a'))
  it('finds none elsewhere or when unplaced', () => {
    expect(marketAt(markets, 'wilds')).toBeNull()
    expect(marketAt(markets, null)).toBeNull()
    expect(marketAt(markets, undefined)).toBeNull()
  })
})

describe('isValidOffer', () => {
  it('takes whole copper from 1 up to just under the listed price', () => {
    expect(isValidOffer(1, 100)).toBe(true)
    expect(isValidOffer(99, 100)).toBe(true)
  })
  it('refuses the listed price or more, nothing, and fractions', () => {
    expect(isValidOffer(100, 100)).toBe(false)
    expect(isValidOffer(150, 100)).toBe(false)
    expect(isValidOffer(0, 100)).toBe(false)
    expect(isValidOffer(-5, 100)).toBe(false)
    expect(isValidOffer(50.5, 100)).toBe(false)
  })
  it('leaves nothing to haggle over at 1 copper', () => expect(isValidOffer(1, 1)).toBe(false))
})

describe('gmDecision', () => {
  it('settles at or under the player’s offer', () => {
    expect(gmDecision(80, 80)).toBe('approve')
    expect(gmDecision(60, 80)).toBe('approve')
  })
  it('sends anything higher back to the player', () => expect(gmDecision(81, 80)).toBe('counter'))
})

describe('haggleRequest', () => {
  it('builds a buy request priced at the offer', () => {
    const made = haggleRequest(steve, market, sword, 800, 2, 600)
    expect(made).toEqual({
      ok: true,
      request: {
        characterId: 'c1', characterName: 'Steve', type: 'buy-item',
        label: haggleLabel({ quantity: 2, goodName: 'Iron Sword', offerUnitCopper: 600, listedUnitCopper: 800 }, 'Mason'),
        payload: {
          haggle: true, marketId: 'm', goodId: 'iron-sword', goodName: 'Iron Sword', quantity: 2,
          listedUnitCopper: 800, offerUnitCopper: 600, unitPriceCopper: 600,
        },
      },
    })
  })

  it('names the coins in its label', () => {
    expect(haggleLabel({ quantity: 2, goodName: 'Iron Sword', offerUnitCopper: 600, listedUnitCopper: 800 }, 'Mason'))
      .toBe('asks for a better price on 2× Iron Sword at Mason: offers 6g each (listed 8g)')
  })

  it('refuses an offer that is not below the listed price', () => {
    const made = haggleRequest(steve, market, sword, 800, 1, 800)
    expect(made.ok).toBe(false)
  })

  it('refuses no quantity', () => {
    expect(haggleRequest(steve, market, sword, 800, 0, 600)).toEqual({ ok: false, reason: 'Pick how many you want.' })
  })
})

describe('finding haggles', () => {
  const req = (over: Partial<PlayerRequest>): PlayerRequest => ({
    id: 'r', characterId: 'c1', characterName: 'Steve', type: 'buy-item', label: '', status: 'pending', createdAt: 0,
    payload: { haggle: true }, ...over,
  })

  it('tells a haggle from a plain buy request', () => {
    expect(isHaggle(req({}))).toBe(true)
    expect(isHaggle(req({ payload: {} }))).toBe(false)
    expect(isHaggle(req({ type: 'sell-item' }))).toBe(false)
  })

  it('lists only this character’s countered haggles', () => {
    const list = [
      req({ id: 'mine', status: 'countered' }),
      req({ id: 'pending' }),
      req({ id: 'theirs', status: 'countered', characterId: 'c2' }),
      req({ id: 'plain', status: 'countered', payload: {} }),
    ]
    expect(countersFor(list, 'c1').map(r => r.id)).toEqual(['mine'])
  })
})
