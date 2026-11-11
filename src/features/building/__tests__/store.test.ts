import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeChar } from '../../../test/fixtures'
import type { CharacterItem } from '../../../types'

const { updateCampaignData, log } = vi.hoisted(() => ({
  updateCampaignData: vi.fn(),
  log: vi.fn(),
}))
vi.mock('../../campaigns/store', () => ({
  useCampaignStore: { getState: () => ({ updateCampaignData, activeCampaign: null }) },
}))
vi.mock('../../log/store', () => ({ log }))
vi.mock('../../map/store', () => ({ useWorldStore: { getState: () => ({}) } }))

import { useBuildStore } from '../store'
import { useCharacterStore } from '../../characters/store'

const blocks = (name: string, quantity: number, id = name): CharacterItem => ({ id, name, quantity, isBlock: true })
const char = (id = 'c1') => useCharacterStore.getState().characters.find(c => c.id === id)!
const structure = (id: string) => useBuildStore.getState().structures.find(s => s.id === id)!
const build = () => useBuildStore.getState()
const at = { x: 10, y: 20 }
const stash = (key: string, id = 'c1') => char(id).stashes?.[key]?.items ?? []
const atCamp = { locationId: 'camp' }

beforeEach(() => {
  updateCampaignData.mockClear()
  log.mockClear()
  useBuildStore.setState({ structures: [] })
  useCharacterStore.setState({ characters: [], xpLog: [] })
})

describe('addStructure', () => {
  it('starts with the rulebook requirements for the tier', () => {
    const id = build().addStructure({ tier: 'medium', areaId: 'a1', position: at })
    expect(structure(id)).toMatchObject({
      name: 'New Medium Project', tier: 'medium', areaId: 'a1', position: at,
      blocksRequired: 100, daysRequired: 4, redstoneRequired: 0,
      blocksCommitted: 0, daysWorked: 0, redstoneCommitted: 0,
    })
    expect(structure(id).completedAt).toBeUndefined()
    expect(updateCampaignData).toHaveBeenCalledWith({ structures: build().structures })
    expect(log).toHaveBeenCalledWith('building', expect.stringContaining('100 blocks, 4 days'))
  })

  it('needs redstone dust for a redstone project', () => {
    const id = build().addStructure({ tier: 'redstone', areaId: null, position: at })
    expect(structure(id)).toMatchObject({ blocksRequired: 25, daysRequired: 1, redstoneRequired: 10 })
  })

  it('halves blocks and days when a builder is a Tecton Architect', () => {
    useCharacterStore.setState({ characters: [makeChar({ id: 'arch', class: 'Tecton', discipline: 'Architect' })] })
    const id = build().addStructure({ tier: 'mega', areaId: null, position: at, builderIds: ['arch'] })
    expect(structure(id)).toMatchObject({ blocksRequired: 200, daysRequired: 8 })
  })

  it('uses the given name', () => {
    const id = build().addStructure({ name: '  Hilltop Castle ', tier: 'mega', areaId: null, position: at })
    expect(structure(id).name).toBe('Hilltop Castle')
  })
})

describe('a player-designed build', () => {
  it('keeps the icon, purpose and sub-location from the proposal', () => {
    const icon = 'a'.repeat(256)
    const id = build().addStructure({ name: 'Keep', tier: 'small', description: 'Guards the pass', icon, areaId: 'town', subNodeId: 'market', position: at, builderIds: ['c1'] })
    expect(structure(id)).toMatchObject({ description: 'Guards the pass', icon, areaId: 'town', subNodeId: 'market', builderIds: ['c1'] })
  })

  it('keeps null (inside the area) distinct from unset (on the world map)', () => {
    const inside = build().addStructure({ areaId: 'town', subNodeId: null, position: at })
    const beside = build().addStructure({ areaId: 'town', position: at })
    expect(structure(inside).subNodeId).toBeNull()
    expect('subNodeId' in structure(beside)).toBe(false)
  })
})

describe('tiers and requirements', () => {
  it('setTier resets requirements to the new tier', () => {
    const id = build().addStructure({ tier: 'small', areaId: null, position: at })
    build().updateStructure(id, { blocksRequired: 5 })
    build().setTier(id, 'large')
    expect(structure(id)).toMatchObject({ tier: 'large', blocksRequired: 200, daysRequired: 8 })
  })

  it('resetRequirements re-applies Architect halving after builders change', () => {
    useCharacterStore.setState({ characters: [makeChar({ id: 'arch', class: 'Tecton', discipline: 'Architect' })] })
    const id = build().addStructure({ tier: 'medium', areaId: null, position: at })
    build().updateStructure(id, { builderIds: ['arch'] })
    build().resetRequirements(id)
    expect(structure(id)).toMatchObject({ blocksRequired: 50, daysRequired: 2 })
  })

  it('lets the GM lower the time when the party optimizes progress', () => {
    const id = build().addStructure({ tier: 'mega', areaId: null, position: at })
    build().updateStructure(id, { daysRequired: 5 })
    expect(structure(id).daysRequired).toBe(5)
  })
})

describe('commitBlocks', () => {
  it("moves blocks out of the character's inventory into the build", () => {
    useCharacterStore.setState({ characters: [makeChar({ ...atCamp, stashes: { camp: { items: [blocks('Stone', 30)] } }, onHand: { items: [blocks('Dirt', 5)] } })] })
    const id = build().addStructure({ tier: 'small', areaId: null, position: at })
    expect(build().commitBlocks(id, 'c1', 32)).toBe(32)
    expect(structure(id).blocksCommitted).toBe(32)
    expect(char().stashes).toEqual({})
    expect(char().onHand.items).toEqual([blocks('Dirt', 3)])
    expect(log).toHaveBeenCalledWith('building', '🧱 Steve put 32 blocks into New Small Project.')
  })

  it('only commits what the character actually has', () => {
    useCharacterStore.setState({ characters: [makeChar({ ...atCamp, stashes: { camp: { items: [blocks('Stone', 7)] } } })] })
    const id = build().addStructure({ tier: 'small', areaId: null, position: at })
    expect(build().commitBlocks(id, 'c1', 50)).toBe(7)
    expect(structure(id).blocksCommitted).toBe(7)
  })

  it('cannot use storage somewhere else', () => {
    useCharacterStore.setState({ characters: [makeChar({ ...atCamp, stashes: { faraway: { items: [blocks('Stone', 40)] } }, onHand: { items: [blocks('Dirt', 2)] } })] })
    const id = build().addStructure({ tier: 'small', areaId: null, position: at })
    expect(build().commitBlocks(id, 'c1', 50)).toBe(2)
    expect(stash('faraway')).toEqual([blocks('Stone', 40)])
  })

  it('uses the Ender Chest only while someone there carries one', () => {
    const enderChest: CharacterItem = { id: 'ec', name: 'Ender Chest', quantity: 1 }
    const steve = makeChar({ ...atCamp, stashes: { ender: { items: [blocks('Obsidian', 20)] } } })
    useCharacterStore.setState({ characters: [steve, makeChar({ id: 'c2', name: 'Alex', locationId: 'elsewhere', onHand: { items: [enderChest] } })] })
    const id = build().addStructure({ tier: 'small', areaId: null, position: at })
    expect(build().commitBlocks(id, 'c1', 10)).toBe(0)
    useCharacterStore.setState({ characters: [steve, makeChar({ id: 'c2', name: 'Alex', ...atCamp, onHand: { items: [enderChest] } })] })
    expect(build().commitBlocks(id, 'c1', 10)).toBe(10)
    expect(stash('ender')).toEqual([blocks('Obsidian', 10)])
  })

  it('does nothing without blocks, a valid character, or a positive amount', () => {
    useCharacterStore.setState({ characters: [makeChar()] })
    const id = build().addStructure({ tier: 'small', areaId: null, position: at })
    expect(build().commitBlocks(id, 'c1', 10)).toBe(0)
    expect(build().commitBlocks(id, 'nobody', 10)).toBe(0)
    expect(build().commitBlocks(id, 'c1', 0)).toBe(0)
    expect(build().commitBlocks('nope', 'c1', 10)).toBe(0)
    expect(structure(id).blocksCommitted).toBe(0)
  })
})

describe('temporary carry limit and builds', () => {
  it('ends when putting blocks into a build drops the character below 10', () => {
    useCharacterStore.setState({ characters: [makeChar({ carryLimit: 30, onHand: { items: [blocks('Stone', 25)] } })] })
    const id = build().addStructure({ tier: 'small', areaId: null, position: at })
    build().commitBlocks(id, 'c1', 16)
    expect(char().carryLimit).toBeUndefined()
    expect(char().onHand.items).toEqual([blocks('Stone', 9)])
  })

  it('lasts while they still carry 10 or more', () => {
    useCharacterStore.setState({ characters: [makeChar({ carryLimit: 30, onHand: { items: [blocks('Stone', 25)] } })] })
    const id = build().addStructure({ tier: 'small', areaId: null, position: at })
    build().commitBlocks(id, 'c1', 15)
    expect(char().carryLimit).toBe(30)
  })
})

describe('commitRedstone', () => {
  const dust = (quantity: number): CharacterItem => ({ id: 'd', name: 'Redstone Dust', quantity })

  it('moves dust from the inventory and can finish a redstone project', () => {
    useCharacterStore.setState({ characters: [makeChar({ ...atCamp, stashes: { camp: { items: [dust(12)] } } })] })
    const id = build().addStructure({ tier: 'redstone', areaId: null, position: at })
    build().addProgress(id, { blocks: 25, days: 1 })
    expect(build().commitRedstone(id, 'c1', 10)).toBe(10)
    expect(structure(id).completedAt).toBeDefined()
    expect(stash('camp')).toEqual([dust(2)])
  })

  it('does nothing without dust', () => {
    useCharacterStore.setState({ characters: [makeChar()] })
    const id = build().addStructure({ tier: 'redstone', areaId: null, position: at })
    expect(build().commitRedstone(id, 'c1', 10)).toBe(0)
    expect(build().commitRedstone('nope', 'c1', 10)).toBe(0)
    expect(structure(id).redstoneCommitted).toBe(0)
  })
})

describe('joinBuild', () => {
  it('adds a builder once', () => {
    const id = build().addStructure({ tier: 'small', areaId: null, position: at, builderIds: ['c1'] })
    build().joinBuild(id, 'c2')
    build().joinBuild(id, 'c2')
    expect(structure(id).builderIds).toEqual(['c1', 'c2'])
  })
})

describe('progress and completion', () => {
  it('completes automatically once blocks and days are both met', () => {
    const id = build().addStructure({ tier: 'tiny', areaId: null, position: at })
    build().addProgress(id, { blocks: 25 })
    expect(structure(id).completedAt).toBeUndefined()
    build().addProgress(id, { days: 1 })
    expect(structure(id).completedAt).toEqual(expect.any(Number))
    expect(log).toHaveBeenCalledWith('building', '🏰 New Tiny Project is complete!')
  })

  it('waits for redstone dust on a redstone project', () => {
    const id = build().addStructure({ tier: 'redstone', areaId: null, position: at })
    build().addProgress(id, { blocks: 25, days: 1 })
    expect(structure(id).completedAt).toBeUndefined()
    build().addProgress(id, { redstone: 10 })
    expect(structure(id).completedAt).toBeDefined()
  })

  it('completes when the GM lowers requirements to what is already done', () => {
    const id = build().addStructure({ tier: 'mega', areaId: null, position: at })
    build().addProgress(id, { blocks: 400, days: 5 })
    expect(structure(id).completedAt).toBeUndefined()
    build().updateStructure(id, { daysRequired: 5 })
    expect(structure(id).completedAt).toBeDefined()
  })

  it('never lets progress go negative', () => {
    const id = build().addStructure({ tier: 'small', areaId: null, position: at })
    build().addProgress(id, { blocks: -10, days: -1 })
    expect(structure(id)).toMatchObject({ blocksCommitted: 0, daysWorked: 0 })
  })

  it('can be marked complete early and reopened', () => {
    const id = build().addStructure({ tier: 'mega', areaId: null, position: at })
    build().setCompleted(id, true)
    expect(structure(id).completedAt).toBeDefined()
    build().setCompleted(id, false)
    expect(structure(id).completedAt).toBeUndefined()
    expect('completedAt' in structure(id)).toBe(false)
  })

  it('logs completion only once', () => {
    const id = build().addStructure({ tier: 'tiny', areaId: null, position: at })
    build().addProgress(id, { blocks: 25, days: 1 })
    build().addProgress(id, { days: 1 })
    build().setCompleted(id, true)
    expect(log.mock.calls.filter(c => String(c[1]).includes('is complete'))).toHaveLength(1)
  })
})

describe('move and delete', () => {
  it('moves and deletes a structure', () => {
    const id = build().addStructure({ tier: 'small', areaId: null, position: at })
    build().moveStructure(id, { x: 99, y: 1 })
    expect(structure(id).position).toEqual({ x: 99, y: 1 })
    build().deleteStructure(id)
    expect(build().structures).toEqual([])
  })
})

describe('mine', () => {
  it('leaves the awarded blocks where they were mined and logs the trip', () => {
    useCharacterStore.setState({ characters: [makeChar(atCamp)] })
    build().mine({ characterId: 'c1', areaName: 'Ravine', materials: ['Stone', 'Iron'], requested: 100, total: 13, gained: 110, destination: 'storage', placeId: 'ravine' })
    expect(stash('ravine')).toEqual([expect.objectContaining({ name: 'Stone & Iron blocks', quantity: 110, isBlock: true })])
    expect(char().onHand.items).toEqual([])
    expect(log).toHaveBeenCalledWith('building',
      '⛏️ Steve mined for 100 blocks of Stone & Iron at Ravine — rolled 13 (success), 2 days: gained 110 blocks (stored at Ravine).')
  })

  it('stacks onto existing blocks of the same material there', () => {
    useCharacterStore.setState({ characters: [makeChar({ stashes: { shaft: { items: [blocks('Stone blocks', 10)] } } })] })
    build().mine({ characterId: 'c1', materials: ['Stone'], requested: 25, total: 8, gained: 25, destination: 'storage', placeId: 'shaft' })
    expect(stash('shaft')).toEqual([blocks('Stone blocks', 35)])
  })

  it('stores where the character is if no place was given', () => {
    useCharacterStore.setState({ characters: [makeChar(atCamp)] })
    build().mine({ characterId: 'c1', materials: ['Iron'], requested: 25, total: 10, gained: 25, destination: 'storage' })
    expect(stash('camp')).toEqual([expect.objectContaining({ quantity: 25 })])
    expect(log).toHaveBeenCalledWith('building', expect.stringContaining('gained 25 blocks (stored here).'))
  })

  it('leaves them behind with no place at all', () => {
    useCharacterStore.setState({ characters: [makeChar()] })
    build().mine({ characterId: 'c1', materials: ['Iron'], requested: 25, total: 10, gained: 25, destination: 'storage' })
    expect(stash('unplaced')).toEqual([expect.objectContaining({ quantity: 25 })])
    expect(log).toHaveBeenCalledWith('building', expect.stringContaining('gained 25 blocks (left behind).'))
  })

  it("treats an older request's 'mine' the same as storage", () => {
    useCharacterStore.setState({ characters: [makeChar()] })
    build().mine({ characterId: 'c1', materials: ['Iron'], requested: 25, total: 10, gained: 25, destination: 'mine', placeId: 'shaft' })
    expect(stash('shaft')).toEqual([expect.objectContaining({ quantity: 25 })])
  })

  it('leaves whatever will not fit on hand where it was mined', () => {
    useCharacterStore.setState({ characters: [makeChar({ ...atCamp, onHand: { items: [blocks('Stone blocks', 6)] } })] })
    build().mine({ characterId: 'c1', areaName: 'Shaft', materials: ['Stone'], requested: 100, total: 10, gained: 100, destination: 'onHand', placeId: 'shaft' })
    expect(char().onHand.items).toEqual([blocks('Stone blocks', 10)])
    expect(stash('shaft')).toEqual([expect.objectContaining({ name: 'Stone blocks', quantity: 96, isBlock: true })])
    expect(stash('camp')).toEqual([])
    expect(log).toHaveBeenCalledWith('building', expect.stringContaining('gained 100 blocks (4 on hand, 96 stored at Shaft).'))
  })

  it('leaves it all there when the character is already full', () => {
    useCharacterStore.setState({ characters: [makeChar({ onHand: { items: [blocks('Dirt', 10)] } })] })
    build().mine({ characterId: 'c1', areaName: 'Shaft', materials: ['Stone'], requested: 25, total: 10, gained: 25, destination: 'onHand', placeId: 'shaft' })
    expect(char().onHand.items).toEqual([blocks('Dirt', 10)])
    expect(stash('shaft')).toEqual([expect.objectContaining({ quantity: 25 })])
    expect(log).toHaveBeenCalledWith('building', expect.stringContaining('gained 25 blocks (stored at Shaft).'))
  })

  it('carries more under a temporary limit', () => {
    useCharacterStore.setState({ characters: [makeChar({ ...atCamp, carryLimit: 30 })] })
    build().mine({ characterId: 'c1', materials: ['Stone'], requested: 50, total: 10, gained: 50, destination: 'onHand' })
    expect(char().onHand.items).toEqual([expect.objectContaining({ quantity: 30 })])
    expect(stash('camp')).toEqual([expect.objectContaining({ quantity: 20 })])
  })

  it('can put blocks on hand instead', () => {
    useCharacterStore.setState({ characters: [makeChar()] })
    build().mine({ characterId: 'c1', materials: ['Wood'], requested: 25, total: 10, gained: 10, destination: 'onHand' })
    expect(char().onHand.items).toEqual([expect.objectContaining({ name: 'Wood blocks', quantity: 10 })])
    expect(char().stashes).toBeUndefined()
  })

  it('logs a failed trip without adding anything', () => {
    useCharacterStore.setState({ characters: [makeChar()] })
    build().mine({ characterId: 'c1', materials: ['Diamond'], requested: 50, total: 5, gained: 0, destination: 'storage' })
    expect(char().stashes).toBeUndefined()
    expect(log).toHaveBeenCalledWith('building', expect.stringContaining('rolled 5 (failure), 1 day: gained 0 blocks.'))
  })

  it('gives 1 XP for double 6s, even on a failed trip', () => {
    useCharacterStore.setState({ characters: [makeChar()] })
    build().mine({ characterId: 'c1', materials: ['Stone'], requested: 25, total: 8, gained: 0, destination: 'storage', doubleSix: true })
    expect(char().xp).toBe(1)
    expect(log).toHaveBeenCalledWith('building', '⭐ Steve rolled double 6s mining: +1 XP.')
  })

  it('gives no XP otherwise', () => {
    useCharacterStore.setState({ characters: [makeChar()] })
    build().mine({ characterId: 'c1', materials: ['Stone'], requested: 25, total: 10, gained: 25, destination: 'storage' })
    expect(char().xp).toBe(0)
  })

  it('ignores an unknown character', () => {
    build().mine({ characterId: 'ghost', materials: [], requested: 25, total: 10, gained: 25, destination: 'storage' })
    expect(log).not.toHaveBeenCalled()
  })
})

describe('damage, repair and ruins', () => {
  const finishedBuild = (extra = {}) => {
    const id = build().addStructure({ name: 'Hut', tier: 'small', areaId: 'a1', position: at, builderIds: ['c1'] })
    build().addProgress(id, { blocks: 50, days: 2 })
    if (Object.keys(extra).length) build().updateStructure(id, extra)
    return id
  }
  const carrying = (quantity: number) =>
    useCharacterStore.setState({ characters: [makeChar({ onHand: { items: [blocks('Stone', quantity)] } })] })

  it('damages a finished build', () => {
    const id = finishedBuild()
    build().damageStructure(id, 12, ' creeper blast ')
    expect(structure(id).damage).toEqual({ needed: 12, repaired: 0, note: 'creeper blast' })
    expect(log).toHaveBeenCalledWith('building', '💥 Hut was damaged (creeper blast): 12 blocks to repair.')
  })

  it('leaves unfinished builds, ruins and zero damage alone', () => {
    const planned = build().addStructure({ tier: 'small', areaId: 'a1', position: at })
    build().damageStructure(planned, 10)
    expect(structure(planned).damage).toBeUndefined()
    const id = finishedBuild()
    build().damageStructure(id, 0)
    expect(structure(id).damage).toBeUndefined()
    build().destroyStructure(id)
    build().damageStructure(id, 10)
    expect(structure(id).damage).toBeUndefined()
  })

  it('takes repair blocks from the character, capped at what is needed', () => {
    carrying(10)
    const id = finishedBuild()
    build().damageStructure(id, 6)
    expect(build().repairStructure(id, 'c1', 4)).toBe(4)
    expect(structure(id).damage).toMatchObject({ needed: 6, repaired: 4 })
    expect(build().repairStructure(id, 'c1', 50)).toBe(2)
    expect(structure(id).damage).toBeUndefined()
    expect(char().onHand.items[0].quantity).toBe(4)
    expect(log).toHaveBeenLastCalledWith('building', "🔨 Steve put 2 blocks into Hut. It's fully repaired.")
  })

  it('repairs nothing on a build that is not damaged, or without blocks', () => {
    carrying(10)
    const id = finishedBuild()
    expect(build().repairStructure(id, 'c1', 5)).toBe(0)
    useCharacterStore.setState({ characters: [makeChar()] })
    build().damageStructure(id, 5)
    expect(build().repairStructure(id, 'c1', 5)).toBe(0)
    expect(structure(id).damage?.repaired).toBe(0)
  })

  it('lets the GM call it repaired', () => {
    const id = finishedBuild()
    build().damageStructure(id, 5)
    build().markRepaired(id)
    expect(structure(id).damage).toBeUndefined()
    expect(structure(id).completedAt).toBeDefined()
  })

  it('destroys a build into ruins, dropping any damage', () => {
    const id = finishedBuild()
    build().damageStructure(id, 5)
    build().destroyStructure(id)
    expect(structure(id).destroyedAt).toBeDefined()
    expect(structure(id).damage).toBeUndefined()
    expect(log).toHaveBeenLastCalledWith('building', '🪨 Hut was destroyed.')
  })

  it('rebuilds ruins as a fresh project in the same place', () => {
    const id = finishedBuild()
    build().destroyStructure(id)
    build().rebuildStructure(id)
    expect(structure(id)).toMatchObject({ name: 'Hut', areaId: 'a1', position: at, blocksRequired: 50, blocksCommitted: 0, daysWorked: 0 })
    expect(structure(id).destroyedAt).toBeUndefined()
    expect(structure(id).completedAt).toBeUndefined()
  })

  it('only rebuilds what was destroyed', () => {
    const id = finishedBuild()
    build().rebuildStructure(id)
    expect(structure(id).blocksCommitted).toBe(50)
    expect(structure(id).completedAt).toBeDefined()
  })
})
