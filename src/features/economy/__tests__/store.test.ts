import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeChar } from '../../../test/fixtures'
import type { EconomyData, Good, MarketProfile } from '../../../types'

const { updateCampaignData } = vi.hoisted(() => ({ updateCampaignData: vi.fn() }))
vi.mock('../../campaigns/store', () => ({
  useCampaignStore: { getState: () => ({ updateCampaignData, activeCampaign: null }) },
}))
vi.mock('../../log/store', () => ({ log: vi.fn() }))
vi.mock('../../map/store', () => ({ useWorldStore: { getState: () => ({}) } }))

import { useEconomyStore } from '../store'
import { useCharacterStore } from '../../characters/store'

const market = { id: 'm', name: 'Mason', listings: [{ goodId: 'stone-blocks', stock: 5 }] } as unknown as MarketProfile
const char = () => useCharacterStore.getState().characters[0]
const economy = () => useEconomyStore.getState()
const stock = () => economy().economy.markets[0].listings.find(l => l.goodId === 'stone-blocks')?.stock

beforeEach(() => {
  useEconomyStore.setState({ economy: { markets: [market], events: [], customGoods: [] as Good[] } as unknown as EconomyData })
  useCharacterStore.setState({ characters: [makeChar({ currency: { copper: 0, iron: 0, gold: 10, emeralds: 0, diamonds: 0 } })], xpLog: [] })
})

describe('buying blocks', () => {
  it('turns a stack into real blocks a build can use', () => {
    expect(economy().buy('m', 'stone-blocks', 2, 'c1', 50)).toEqual({ ok: true })
    expect(char().onHand.items).toEqual([expect.objectContaining({ name: 'Stone Blocks', quantity: 20, isBlock: true })])
    expect(stock()).toBe(3)
  })

  it('leaves goods that are not blocks alone', () => {
    useEconomyStore.setState({
      economy: { markets: [{ ...market, listings: [] }], events: [], customGoods: [{ id: 'rope', name: 'Rope', basePriceCopper: 5, unit: 'each' }] } as unknown as EconomyData,
    })
    economy().buy('m', 'rope', 3, 'c1', 5)
    expect(char().onHand.items).toEqual([expect.objectContaining({ name: 'Rope', quantity: 3, isBlock: false })])
  })
})

describe('selling blocks', () => {
  const hold = (quantity: number) => useCharacterStore.setState({
    characters: [makeChar({ onHand: { items: [{ id: 'b', name: 'Stone Blocks', quantity, isBlock: true }] } })],
  })

  it('returns only whole stacks to the market stock', () => {
    hold(25)
    economy().sell('m', 'c1', 'b', 25, 4)
    expect(stock()).toBe(7)
    expect(char().onHand.items).toEqual([])
  })

  it('adds no stock for less than a stack', () => {
    hold(4)
    economy().sell('m', 'c1', 'b', 4, 4)
    expect(stock()).toBe(5)
  })
})
