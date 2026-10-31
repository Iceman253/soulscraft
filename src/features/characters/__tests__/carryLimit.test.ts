import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeChar } from '../../../test/fixtures'
import type { CharacterItem } from '../../../types'

const { log } = vi.hoisted(() => ({ log: vi.fn() }))
vi.mock('../../campaigns/store', () => ({
  useCampaignStore: { getState: () => ({ updateCampaignData: vi.fn(), activeCampaign: null }) },
}))
vi.mock('../../log/store', () => ({ log }))
vi.mock('../../map/store', () => ({ useWorldStore: { getState: () => ({}) } }))

import { useCharacterStore } from '../store'

const block = (name: string, quantity: number, id = name): CharacterItem => ({ id, name, quantity, isBlock: true })
const store = () => useCharacterStore.getState()
const char = (id = 'c1') => store().characters.find(c => c.id === id)!
const held = (id = 'c1') => char(id).onHand.items.filter(i => i.isBlock).reduce((n, i) => n + i.quantity, 0)
const stored = (id = 'c1') => char(id).storage.items.filter(i => i.isBlock).reduce((n, i) => n + i.quantity, 0)

beforeEach(() => {
  log.mockClear()
  useCharacterStore.setState({ characters: [makeChar(), makeChar({ id: 'c2', name: 'Alex' })], xpLog: [] })
})

describe('10-block carry limit', () => {
  it('caps blocks added on hand and stores the rest', () => {
    store().addOnHandItem('c1', { name: 'Stone Blocks', quantity: 50, isBlock: true })
    expect(held()).toBe(10)
    expect(stored()).toBe(40)
    expect(log).toHaveBeenCalledWith('character-move', '📦 Steve can only carry 10 blocks, so 40 went to storage.')
  })

  it('leaves room for what is already carried', () => {
    store().addOnHandItem('c1', { name: 'Stone', quantity: 7, isBlock: true })
    store().addOnHandItem('c1', { name: 'Dirt', quantity: 7, isBlock: true })
    expect(held()).toBe(10)
    expect(stored()).toBe(4)
  })

  it('stores everything when already full', () => {
    store().addOnHandItem('c1', { name: 'Stone', quantity: 10, isBlock: true })
    store().addOnHandItem('c1', { name: 'Dirt', quantity: 5, isBlock: true })
    expect(held()).toBe(10)
    expect(char().onHand.items.map(i => i.name)).toEqual(['Stone'])
    expect(stored()).toBe(5)
  })

  it('does not limit other items', () => {
    store().addOnHandItem('c1', { name: 'Torch', quantity: 64 })
    expect(char().onHand.items[0].quantity).toBe(64)
    expect(log).not.toHaveBeenCalled()
  })

  it('holds when a quantity is edited up', () => {
    useCharacterStore.setState({ characters: [makeChar({ onHand: { items: [block('Stone', 5)] } })] })
    store().updateOnHandItem('c1', 'Stone', { quantity: 30 })
    expect(held()).toBe(10)
    expect(stored()).toBe(20)
  })

  it('holds when a big stack is marked as blocks', () => {
    useCharacterStore.setState({ characters: [makeChar({ onHand: { items: [{ id: 'x', name: 'Stone', quantity: 30 }] } })] })
    store().updateOnHandItem('c1', 'x', { isBlock: true })
    expect(held()).toBe(10)
    expect(stored()).toBe(20)
  })

  it('only takes what fits when moving a stack out of storage', () => {
    useCharacterStore.setState({ characters: [makeChar({ storage: { items: [block('Stone', 60)] } })] })
    store().moveItemToHand('c1', 'Stone')
    expect(held()).toBe(10)
    expect(stored()).toBe(50)
  })

  it('moves nothing out of storage when already full', () => {
    useCharacterStore.setState({ characters: [makeChar({ onHand: { items: [block('Dirt', 10)] }, storage: { items: [block('Stone', 6)] } })] })
    store().moveItemToHand('c1', 'Stone')
    expect(char().onHand.items).toEqual([block('Dirt', 10)])
    expect(stored()).toBe(6)
  })

  it('applies to the receiver when blocks are given away', () => {
    useCharacterStore.setState({ characters: [makeChar({ onHand: { items: [block('Stone', 8)] } }), makeChar({ id: 'c2', name: 'Alex', onHand: { items: [block('Dirt', 5)] } })] })
    store().giveItemToCharacter('c1', 'Stone', 'onHand', 'c2')
    expect(held('c1')).toBe(0)
    expect(held('c2')).toBe(10)
    expect(stored('c2')).toBe(3)
  })

  it('leaves storage itself unlimited', () => {
    store().addStorageItem('c1', { name: 'Stone', quantity: 400, isBlock: true })
    expect(stored()).toBe(400)
    expect(held()).toBe(0)
  })

  it('still lets a character use up blocks', () => {
    useCharacterStore.setState({ characters: [makeChar({ onHand: { items: [block('Stone', 10)] } })] })
    store().updateOnHandItem('c1', 'Stone', { quantity: 4 })
    expect(held()).toBe(4)
    expect(stored()).toBe(0)
  })

  it('brings an old over-limit character back to 10 on their next change', () => {
    useCharacterStore.setState({ characters: [makeChar({ onHand: { items: [block('Stone', 58)] } })] })
    store().updateOnHandItem('c1', 'Stone', { customName: 'Good stone' })
    expect(held()).toBe(10)
    expect(stored()).toBe(48)
  })
})
