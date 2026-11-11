import { describe, it, expect } from 'vitest'
import type { Area, Character, CharacterItem, SubNode } from '../types'
import { makeChar } from '../test/fixtures'
import {
  ENDER, UNPLACED, placeOf, dropKey, placesAround, stashOf, withStash, sectionOf, setSection,
  carriesEnderChest, partyOf, enderReachable, reachableStores, moveItem, takeFrom, countIn,
  addBlocksTo, migrateStorage, placeExists, storeLabel,
} from './stashes'

const sub = (id: string, subNodes: SubNode[] = []): SubNode =>
  ({ id, name: id.toUpperCase(), type: 'other', position: { x: 0, y: 0 }, subNodes, subEdges: [] })
const area = (id: string, subNodes: SubNode[] = []): Area => ({
  id, name: id.toUpperCase(), type: 'settlement', realm: 'overworld', description: '',
  position: { x: 0, y: 0 }, subNodes, subEdges: [], revealed: true,
})
const areas = [area('town', [sub('market', [sub('stall')])]), area('forest')]

const item = (name: string, quantity = 1, isBlock = false, id = name): CharacterItem => ({ id, name, quantity, isBlock })
const enderChest = item('Ender Chest')
const at = (locationId: string | null, subLocationId: string | null = null) => ({ locationId, subLocationId })

describe('where a character is', () => {
  it('is their sub-location, else their area', () => {
    expect(placeOf(at('town', 'stall'))).toBe('stall')
    expect(placeOf(at('town'))).toBe('town')
    expect(placeOf(at(null))).toBeNull()
  })

  it('drops things there, or nowhere in particular on the road', () => {
    expect(dropKey(at('town', 'market'))).toBe('market')
    expect(dropKey(at(null))).toBe(UNPLACED)
  })

  it('can reach storage in the places around them, nearest first', () => {
    expect(placesAround(at('town', 'stall'), areas)).toEqual(['stall', 'market', 'town'])
    expect(placesAround(at('town'), areas)).toEqual(['town'])
    expect(placesAround(at(null), areas)).toEqual([])
  })

  it('still reaches a sub-location the map no longer knows about', () => {
    expect(placesAround(at('town', 'gone'), areas)).toEqual(['gone', 'town'])
    expect(placesAround(at('nowhere', 'gone'), areas)).toEqual(['nowhere'])
  })

  it('does not change the map while working it out', () => {
    placesAround(at('town', 'stall'), areas)
    expect(placesAround(at('town', 'stall'), areas)).toEqual(['stall', 'market', 'town'])
  })
})

describe('stores', () => {
  const c = { onHand: { items: [item('Torch')] }, stashes: { town: { items: [item('Bread')] } } }

  it('reads a store, empty if there is nothing there', () => {
    expect(stashOf(c, 'town').items).toEqual([item('Bread')])
    expect(stashOf(c, 'forest').items).toEqual([])
    expect(stashOf({}, 'town').items).toEqual([])
  })

  it('drops a store once it is emptied', () => {
    expect(withStash(c, 'town', { items: [] })).toEqual({})
    expect(withStash(c, 'forest', { items: [item('Rope')] })).toEqual({ town: c.stashes.town, forest: { items: [item('Rope')] } })
  })

  it('treats on hand as a section like the rest', () => {
    expect(sectionOf(c, 'onHand')).toBe(c.onHand)
    expect(sectionOf(c, 'town')).toBe(c.stashes.town)
    expect(setSection(c, 'onHand', { items: [] })).toEqual({ onHand: { items: [] } })
    expect(setSection(c, 'forest', { items: [item('Rope')] }).stashes?.forest.items).toEqual([item('Rope')])
  })

  it('stacks blocks added to a store by name', () => {
    const ids = () => 'new'
    const withStone = addBlocksTo({ stashes: { town: { items: [item('Stone', 5, true)] } } }, 'town', 'stone', 3, ids)
    expect(withStone.town.items).toEqual([item('Stone', 8, true)])
    expect(addBlocksTo({}, 'forest', 'Wood', 4, ids).forest.items).toEqual([{ id: 'new', name: 'Wood', quantity: 4, isBlock: true }])
  })
})

describe('the Ender Chest', () => {
  const steve = makeChar({ id: 's', ...at('town') })
  const alex = (o: Partial<Character> = {}) => makeChar({ id: 'a', name: 'Alex', ...at('town'), ...o })

  it('knows an Ender Chest when someone carries one', () => {
    expect(carriesEnderChest({ onHand: { items: [enderChest] } })).toBe(true)
    expect(carriesEnderChest({ onHand: { items: [item('ender chests', 2)] } })).toBe(true)
    expect(carriesEnderChest({ onHand: { items: [{ ...item('Chest'), customName: 'My Ender Chest' }] } })).toBe(true)
    expect(carriesEnderChest({ onHand: { items: [item('Chest'), item('Ender Pearl'), item('Enderchestplate')] } })).toBe(false)
  })

  it('counts everyone living at the same place as the party', () => {
    const party = partyOf(steve, [steve, alex(), alex({ id: 'far', ...at('forest') }), alex({ id: 'dead', isDead: true })])
    expect(party.map(c => c.id)).toEqual(['s', 'a'])
  })

  it('puts characters out on the world map together', () => {
    const roaming = makeChar({ id: 's', ...at(null) })
    expect(partyOf(roaming, [roaming, alex({ ...at(null) }), alex({ id: 'b' })]).map(c => c.id)).toEqual(['s', 'a'])
  })

  it('opens from anywhere, but only while someone with them carries one', () => {
    expect(enderReachable(steve, [steve, alex()])).toBe(false)
    expect(enderReachable(steve, [steve, alex({ onHand: { items: [enderChest] } })])).toBe(true)
    expect(enderReachable(steve, [steve, alex({ ...at('forest'), onHand: { items: [enderChest] } })])).toBe(false)
    expect(enderReachable(steve, [steve, alex({ isDead: true, onHand: { items: [enderChest] } })])).toBe(false)
    const carrying = { ...steve, onHand: { items: [enderChest] } }
    expect(enderReachable(carrying, [carrying])).toBe(true)
  })

  it('comes after the storage around them', () => {
    const c = makeChar({ id: 's', ...at('town', 'market'), onHand: { items: [enderChest] } })
    expect(reachableStores(c, [c], areas)).toEqual(['market', 'town', ENDER])
    expect(reachableStores(steve, [steve], areas)).toEqual(['town'])
  })
})

describe('moving things', () => {
  const c = { onHand: { items: [item('Torch', 3), item('Rope')] }, stashes: { town: { items: [item('Bread')] } } }

  it('moves a whole item between sections', () => {
    const patch = moveItem(c, 'Torch', 'onHand', ENDER)
    expect(patch?.onHand?.items).toEqual([item('Rope')])
    expect(patch?.stashes?.[ENDER].items).toEqual([item('Torch', 3)])
    expect(patch?.stashes?.town).toBe(c.stashes.town)
  })

  it('moves between two stores and clears the one left empty', () => {
    const patch = moveItem(c, 'Bread', 'town', 'forest')
    expect(patch?.stashes).toEqual({ forest: { items: [item('Bread')] } })
  })

  it('does nothing for a missing item or the same section', () => {
    expect(moveItem(c, 'nope', 'onHand', 'town')).toBeNull()
    expect(moveItem(c, 'Torch', 'onHand', 'onHand')).toBeNull()
  })
})

describe('taking from what they can reach', () => {
  const c = {
    onHand: { items: [item('Stone', 4, true), item('Torch')] },
    stashes: { town: { items: [item('Stone', 6, true)] }, forest: { items: [item('Stone', 50, true)] } },
  }
  const isBlock = (i: CharacterItem) => !!i.isBlock

  it('takes in the order given and leaves other places alone', () => {
    const { patch, taken } = takeFrom(c, ['town', 'onHand'], 8, isBlock)
    expect(taken).toBe(8)
    expect(patch.stashes).toEqual({ forest: c.stashes.forest })
    expect(patch.onHand?.items).toEqual([item('Stone', 2, true), item('Torch')])
  })

  it('leaves out sections it did not touch', () => {
    const { patch } = takeFrom(c, ['town', 'onHand'], 3, isBlock)
    expect(patch.onHand).toBeUndefined()
    expect(patch.stashes?.town.items).toEqual([item('Stone', 3, true)])
  })

  it('takes nothing for zero, a negative amount or nothing matching', () => {
    expect(takeFrom(c, ['town'], 0, isBlock)).toEqual({ patch: {}, taken: 0 })
    expect(takeFrom(c, ['town'], -3, isBlock).taken).toBe(0)
    expect(takeFrom(c, ['onHand'], 5, i => i.name === 'Diamond').taken).toBe(0)
  })

  it('rounds down a fractional amount', () => {
    expect(takeFrom(c, ['town'], 2.7, isBlock).taken).toBe(2)
  })

  it('counts only the sections given', () => {
    expect(countIn(c, ['town', 'onHand'], isBlock)).toBe(10)
    expect(countIn(c, ['forest'], isBlock)).toBe(50)
    expect(countIn(c, [], isBlock)).toBe(0)
  })
})

describe('bringing old saves up to date', () => {
  it('moves old storage to where the character is now', () => {
    const c = makeChar({ ...at('town', 'market'), storage: { items: [item('Bread')] } })
    const next = migrateStorage(c)
    expect(next.stashes).toEqual({ market: { items: [item('Bread')] } })
    expect('storage' in next).toBe(false)
  })

  it('leaves it with no place for someone out on the road', () => {
    const next = migrateStorage(makeChar({ storage: { items: [item('Bread')] } }))
    expect(next.stashes).toEqual({ [UNPLACED]: { items: [item('Bread')] } })
  })

  it('turns blocks left at mines into storage there, merging with what is already stored', () => {
    const c = makeChar({
      ...at('town'),
      storage: { items: [item('Bread')] },
      mineStashes: { shaft: { items: [item('Iron', 20, true)] }, empty: { items: [] } },
      stashes: { town: { items: [item('Rope')] } },
    })
    const next = migrateStorage(c)
    expect(next.stashes).toEqual({
      town: { items: [item('Rope'), item('Bread')] },
      shaft: { items: [item('Iron', 20, true)] },
    })
    expect('mineStashes' in next).toBe(false)
  })

  it('drops empty old fields without adding anything', () => {
    const next = migrateStorage(makeChar({ ...at('town'), storage: { items: [] } }))
    expect(next.stashes).toEqual({})
    expect('storage' in next).toBe(false)
  })

  it('leaves an up-to-date character exactly as it was', () => {
    const c = makeChar({ stashes: { town: { items: [item('Bread')] } } })
    expect(migrateStorage(c)).toBe(c)
  })
})

describe('naming stores', () => {
  it('knows which places still exist', () => {
    expect(placeExists('town', areas)).toBe(true)
    expect(placeExists('stall', areas)).toBe(true)
    expect(placeExists('gone', areas)).toBe(false)
  })

  it('names stores for people', () => {
    expect(storeLabel(ENDER, areas)).toBe('Ender Chest')
    expect(storeLabel(UNPLACED, areas)).toBe('Left behind, no place yet')
    expect(storeLabel('town', areas)).toBe('TOWN')
    expect(storeLabel('stall', areas)).toBe('TOWN › MARKET › STALL')
    expect(storeLabel('gone', areas)).toBe('A place that no longer exists')
  })
})
