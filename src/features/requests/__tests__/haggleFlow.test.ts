// A whole haggle across the stores: offer, counter, then the player buys.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeChar } from '../../../test/fixtures'
import type { EconomyData, MarketProfile } from '../../../types'

vi.mock('../../campaigns/store', () => ({
  useCampaignStore: { getState: () => ({ updateCampaignData: vi.fn(), activeCampaign: null }) },
}))
vi.mock('../../log/store', () => ({ log: vi.fn() }))
vi.mock('../../map/store', () => ({ useWorldStore: { getState: () => ({}) } }))

import { useRequestStore } from '../store'
import { useEconomyStore } from '../../economy/store'
import { useCharacterStore } from '../../characters/store'
import { countersFor, haggleRequest } from '../../../lib/economy/haggle'

const market = { id: 'm', name: 'Smithy', listings: [{ goodId: 'iron-sword', stock: 2 }] } as unknown as MarketProfile
const requests = () => useRequestStore.getState()
const steve = () => useCharacterStore.getState().characters[0]

beforeEach(() => {
  useRequestStore.setState({ requests: [] })
  useEconomyStore.setState({ economy: { markets: [market], events: [], customGoods: [] } as unknown as EconomyData })
  useCharacterStore.setState({ characters: [makeChar({ currency: { copper: 0, iron: 0, gold: 10, emeralds: 0, diamonds: 0 } })], xpLog: [] })
})

function offer(unit: number) {
  const made = haggleRequest(steve(), market, { id: 'iron-sword', name: 'Iron Sword' }, 800, 1, unit)
  if (!made.ok) throw new Error(made.reason)
  requests().addRequest(made.request)
  return requests().requests[0]
}

describe('a haggle', () => {
  it('waits for the GM with the offer on the table', () => {
    const req = offer(600)
    expect(req.status).toBe('pending')
    expect(req.payload.unitPriceCopper).toBe(600)
  })

  it('goes back to the player at the GM’s counter price', () => {
    const req = offer(600)
    requests().counterRequest(req.id, 700)
    const countered = requests().requests[0]
    expect(countered.status).toBe('countered')
    expect(countered.payload).toMatchObject({ unitPriceCopper: 700, offerUnitCopper: 600, listedUnitCopper: 800 })
    expect(countersFor(requests().requests, 'c1')).toHaveLength(1)
  })

  it('completes when the player takes the counter', () => {
    const req = offer(600)
    requests().counterRequest(req.id, 700)
    const result = useEconomyStore.getState().buy('m', 'iron-sword', 1, 'c1', 700)
    expect(result.ok).toBe(true)
    requests().approveRequest(req.id)
    expect(steve().currency).toEqual({ copper: 0, iron: 0, gold: 3, emeralds: 0, diamonds: 0 })
    expect(steve().onHand.items).toEqual([expect.objectContaining({ name: 'Iron Sword', quantity: 1 })])
    expect(useEconomyStore.getState().economy.markets[0].listings[0].stock).toBe(1)
    expect(countersFor(requests().requests, 'c1')).toEqual([])
  })

  it('leaves the purse alone when the player walks away', () => {
    const req = offer(600)
    requests().counterRequest(req.id, 700)
    requests().denyRequest(req.id)
    expect(requests().requests[0].status).toBe('denied')
    expect(steve().currency.gold).toBe(10)
    expect(steve().onHand.items).toEqual([])
  })
})

describe('buying straight away', () => {
  it('pays the listed price and takes the stock with no request', () => {
    expect(useEconomyStore.getState().buy('m', 'iron-sword', 2, 'c1', 450)).toEqual({ ok: true })
    expect(steve().currency).toEqual({ copper: 0, iron: 0, gold: 1, emeralds: 0, diamonds: 0 })
    expect(useEconomyStore.getState().economy.markets[0].listings[0].stock).toBe(0)
    expect(requests().requests).toEqual([])
  })

  it('refuses when the purse is short', () => {
    const result = useEconomyStore.getState().buy('m', 'iron-sword', 2, 'c1', 800)
    expect(result.ok).toBe(false)
    expect(steve().currency.gold).toBe(10)
  })
})
