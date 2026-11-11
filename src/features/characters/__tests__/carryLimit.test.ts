import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeChar as baseChar } from '../../../test/fixtures'
import type { Character, CharacterItem } from '../../../types'

// Everyone stands at the camp unless a test says otherwise, so overflow has a place.
const makeChar = (o: Partial<Character> = {}) => baseChar({ locationId: 'camp', ...o })

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
const inStash = (key: string, id = 'c1') => char(id).stashes?.[key]?.items.filter(i => i.isBlock).reduce((n, i) => n + i.quantity, 0) ?? 0
const stored = (id = 'c1') => inStash('camp', id)

beforeEach(() => {
  log.mockClear()
  useCharacterStore.setState({ characters: [makeChar(), makeChar({ id: 'c2', name: 'Alex' })], xpLog: [] })
})

describe('temporary carry limit', () => {
  const carrying = (quantity: number, extra = {}) =>
    useCharacterStore.setState({ characters: [makeChar({ onHand: { items: [block('Stone', quantity)] }, ...extra })] })

  it('lets a character pick up more once granted', () => {
    carrying(10)
    store().setCarryLimit('c1', 30)
    store().addOnHandItem('c1', { name: 'Dirt', quantity: 25, isBlock: true })
    expect(held()).toBe(30)
    expect(stored()).toBe(5)
  })

  it('does not end the moment it is granted to someone under 10', () => {
    carrying(3)
    store().setCarryLimit('c1', 30)
    expect(char().carryLimit).toBe(30)
    store().addOnHandItem('c1', { name: 'Dirt', quantity: 20, isBlock: true })
    expect(char().carryLimit).toBe(30)
    expect(held()).toBe(23)
  })

  it.each([
    ['using up blocks', () => store().updateOnHandItem('c1', 'Stone', { quantity: 9 })],
    ['trashing them', () => store().removeOnHandItem('c1', 'Stone')],
    ['putting them in storage', () => store().moveItem('c1', 'Stone', 'onHand', 'camp')],
    ['giving them away', () => store().giveItemToCharacter('c1', 'Stone', 'onHand', 'c2')],
    ['leaving them somewhere', () => store().leaveBlocks('c1', 'shaft', 11)],
  ])('reverts to 10 at once after %s', (_label, act) => {
    useCharacterStore.setState({ characters: [makeChar({ carryLimit: 30, onHand: { items: [block('Stone', 20)] } }), makeChar({ id: 'c2', name: 'Alex' })] })
    act()
    expect(char().carryLimit).toBeUndefined()
    expect(log).toHaveBeenCalledWith('character-move', "📦 Steve's carry limit is back to 10 blocks.")
  })

  it('holds at exactly 10', () => {
    carrying(20, { carryLimit: 30 })
    store().updateOnHandItem('c1', 'Stone', { quantity: 10 })
    expect(char().carryLimit).toBe(30)
  })

  it('needs a new grant after it ends', () => {
    carrying(20, { carryLimit: 30 })
    store().updateOnHandItem('c1', 'Stone', { quantity: 5 })
    store().addOnHandItem('c1', { name: 'Dirt', quantity: 20, isBlock: true })
    expect(held()).toBe(10)
    expect(stored()).toBe(15)
  })

  it('can be ended early, sending the extra to storage', () => {
    carrying(25, { carryLimit: 30 })
    store().setCarryLimit('c1', null)
    expect(char().carryLimit).toBeUndefined()
    expect(held()).toBe(10)
    expect(stored()).toBe(15)
  })
})

describe('leaving and picking up blocks', () => {
  const stash = (key = 'shaft') => inStash(key)

  it('leaves on-hand blocks behind', () => {
    useCharacterStore.setState({ characters: [makeChar({ onHand: { items: [block('Stone', 8), { id: 't', name: 'Torch', quantity: 2 }] } })] })
    expect(store().leaveBlocks('c1', 'shaft', 5)).toBe(5)
    expect(held()).toBe(3)
    expect(stash()).toBe(5)
    expect(char().onHand.items.find(i => i.id === 't')?.quantity).toBe(2)
  })

  it('never leaves more than is carried', () => {
    useCharacterStore.setState({ characters: [makeChar({ onHand: { items: [block('Stone', 4)] } })] })
    expect(store().leaveBlocks('c1', 'shaft', 50)).toBe(4)
    expect(store().leaveBlocks('c1', 'shaft', 5)).toBe(0)
  })

  it('does not take from other storage', () => {
    useCharacterStore.setState({ characters: [makeChar({ stashes: { camp: { items: [block('Stone', 40)] } } })] })
    expect(store().leaveBlocks('c1', 'shaft', 5)).toBe(0)
    expect(stored()).toBe(40)
  })

  it('keeps each place separate', () => {
    useCharacterStore.setState({ characters: [makeChar({ onHand: { items: [block('Stone', 8)] } })] })
    store().leaveBlocks('c1', 'a', 3)
    store().leaveBlocks('c1', 'b', 2)
    expect(stash('a')).toBe(3)
    expect(stash('b')).toBe(2)
  })

  it('picks up only what fits the carry limit', () => {
    useCharacterStore.setState({ characters: [makeChar({ onHand: { items: [block('Dirt', 7)] }, stashes: { shaft: { items: [block('Stone', 100)] } } })] })
    expect(store().pickUpBlocks('c1', 'shaft', 50)).toBe(3)
    expect(held()).toBe(10)
    expect(stash()).toBe(97)
    expect(stored()).toBe(0)
  })

  it('picks up more under a temporary limit', () => {
    useCharacterStore.setState({ characters: [makeChar({ carryLimit: 40, stashes: { shaft: { items: [block('Stone', 100)] } } })] })
    expect(store().pickUpBlocks('c1', 'shaft', 100)).toBe(40)
  })

  it('takes nothing when full', () => {
    useCharacterStore.setState({ characters: [makeChar({ onHand: { items: [block('Dirt', 10)] }, stashes: { shaft: { items: [block('Stone', 5)] } } })] })
    expect(store().pickUpBlocks('c1', 'shaft', 5)).toBe(0)
    expect(stash()).toBe(5)
  })

  it('clears an emptied store', () => {
    useCharacterStore.setState({ characters: [makeChar({ stashes: { shaft: { items: [block('Stone', 5)] } } })] })
    store().pickUpBlocks('c1', 'shaft', 5)
    expect(char().stashes).toEqual({})
  })

  it('ignores a place with nothing left there', () => {
    expect(store().pickUpBlocks('c1', 'nope', 5)).toBe(0)
  })
})

describe('10-block carry limit', () => {
  it('caps blocks added on hand and stores the rest', () => {
    store().addOnHandItem('c1', { name: 'Stone Blocks', quantity: 50, isBlock: true })
    expect(held()).toBe(10)
    expect(stored()).toBe(40)
    expect(log).toHaveBeenCalledWith('character-move', '📦 Steve can only carry 10 blocks, so 40 went into storage here.')
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
    useCharacterStore.setState({ characters: [makeChar({ stashes: { camp: { items: [block('Stone', 60)] } } })] })
    store().moveItem('c1', 'Stone', 'camp', 'onHand')
    expect(held()).toBe(10)
    expect(stored()).toBe(50)
  })

  it('moves nothing out of storage when already full', () => {
    useCharacterStore.setState({ characters: [makeChar({ onHand: { items: [block('Dirt', 10)] }, stashes: { camp: { items: [block('Stone', 6)] } } })] })
    store().moveItem('c1', 'Stone', 'camp', 'onHand')
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
    store().addStoredItem('c1', 'camp', { name: 'Stone', quantity: 400, isBlock: true })
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

describe('somewhere with no place', () => {
  it('leaves what will not fit behind, out on the road', () => {
    useCharacterStore.setState({ characters: [makeChar({ locationId: null })] })
    store().addOnHandItem('c1', { name: 'Stone', quantity: 14, isBlock: true })
    expect(held()).toBe(10)
    expect(inStash('unplaced')).toBe(4)
    expect(log).toHaveBeenCalledWith('character-move', '📦 Steve can only carry 10 blocks, so 4 were left behind.')
  })

  it('stores at the exact sub-location they are in', () => {
    useCharacterStore.setState({ characters: [makeChar({ subLocationId: 'inn' })] })
    store().addOnHandItem('c1', { name: 'Stone', quantity: 12, isBlock: true })
    expect(inStash('inn')).toBe(2)
    expect(stored()).toBe(0)
  })
})

describe('storage with a place', () => {
  const item = (name: string, quantity = 1): CharacterItem => ({ id: name, name, quantity })

  it('puts any item into the Ender Chest only when asked to', () => {
    useCharacterStore.setState({ characters: [makeChar({ onHand: { items: [item('Diamond', 3), block('Stone', 14)] } })] })
    expect(char().stashes?.ender).toBeUndefined()
    store().moveItem('c1', 'Diamond', 'onHand', 'ender')
    expect(char().stashes?.ender.items).toEqual([item('Diamond', 3)])
    expect(char().stashes?.camp.items).toEqual([expect.objectContaining({ name: 'Stone', quantity: 4 })])
  })

  it('takes a whole non-block stack out of storage', () => {
    useCharacterStore.setState({ characters: [makeChar({ stashes: { ender: { items: [item('Torch', 64)] } } })] })
    store().moveItem('c1', 'Torch', 'ender', 'onHand')
    expect(char().onHand.items).toEqual([item('Torch', 64)])
    expect(char().stashes).toEqual({})
  })

  it('lets the GM say where a store really is, merging into what is there', () => {
    useCharacterStore.setState({ characters: [makeChar({ stashes: { unplaced: { items: [item('Bread')] }, inn: { items: [item('Rope')] } } })] })
    store().moveStore('c1', 'unplaced', 'inn')
    expect(char().stashes).toEqual({ inn: { items: [item('Rope'), item('Bread')] } })
  })

  it('ignores moving an empty store or onto itself', () => {
    useCharacterStore.setState({ characters: [makeChar({ stashes: { inn: { items: [item('Rope')] } } })] })
    const before = char()
    store().moveStore('c1', 'nowhere', 'inn')
    store().moveStore('c1', 'inn', 'inn')
    expect(char()).toBe(before)
  })

  it('gives an item straight out of storage', () => {
    useCharacterStore.setState({ characters: [makeChar({ stashes: { ender: { items: [item('Diamond', 2)] } } }), makeChar({ id: 'c2', name: 'Alex' })] })
    store().giveItemToCharacter('c1', 'Diamond', 'ender', 'c2')
    expect(char().stashes).toEqual({})
    expect(char('c2').onHand.items).toEqual([expect.objectContaining({ name: 'Diamond', quantity: 2 })])
  })

  it('brings old storage up to date when a campaign loads', () => {
    store().hydrate([makeChar({ subLocationId: 'inn', storage: { items: [item('Bread')] }, mineStashes: { shaft: { items: [block('Iron', 9)] } } })], [])
    expect(char().stashes).toEqual({ inn: { items: [item('Bread')] }, shaft: { items: [block('Iron', 9)] } })
    expect(char().storage).toBeUndefined()
    expect(char().mineStashes).toBeUndefined()
  })
})
