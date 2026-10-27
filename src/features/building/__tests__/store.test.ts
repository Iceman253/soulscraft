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
    useCharacterStore.setState({ characters: [makeChar({ storage: { items: [blocks('Stone', 30)] }, onHand: { items: [blocks('Dirt', 5)] } })] })
    const id = build().addStructure({ tier: 'small', areaId: null, position: at })
    expect(build().commitBlocks(id, 'c1', 32)).toBe(32)
    expect(structure(id).blocksCommitted).toBe(32)
    expect(char().storage.items).toEqual([])
    expect(char().onHand.items).toEqual([blocks('Dirt', 3)])
    expect(log).toHaveBeenCalledWith('building', '🧱 Steve put 32 blocks into New Small Project.')
  })

  it('only commits what the character actually has', () => {
    useCharacterStore.setState({ characters: [makeChar({ storage: { items: [blocks('Stone', 7)] } })] })
    const id = build().addStructure({ tier: 'small', areaId: null, position: at })
    expect(build().commitBlocks(id, 'c1', 50)).toBe(7)
    expect(structure(id).blocksCommitted).toBe(7)
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
  it('adds the awarded blocks to storage and logs the trip', () => {
    useCharacterStore.setState({ characters: [makeChar()] })
    build().mine({ characterId: 'c1', areaName: 'Ravine', materials: ['Stone', 'Iron'], requested: 100, total: 13, gained: 110, destination: 'storage' })
    expect(char().storage.items).toEqual([expect.objectContaining({ name: 'Stone & Iron blocks', quantity: 110, isBlock: true })])
    expect(char().onHand.items).toEqual([])
    expect(log).toHaveBeenCalledWith('building',
      '⛏️ Steve mined for 100 blocks of Stone & Iron at Ravine — rolled 13 (success), 2 days: gained 110 blocks (to storage).')
  })

  it('stacks onto existing blocks of the same material', () => {
    useCharacterStore.setState({ characters: [makeChar({ storage: { items: [blocks('Stone blocks', 10)] } })] })
    build().mine({ characterId: 'c1', materials: ['Stone'], requested: 25, total: 8, gained: 25, destination: 'storage' })
    expect(char().storage.items).toEqual([blocks('Stone blocks', 35)])
  })

  it('can put blocks on hand instead', () => {
    useCharacterStore.setState({ characters: [makeChar()] })
    build().mine({ characterId: 'c1', materials: ['Wood'], requested: 25, total: 10, gained: 10, destination: 'onHand' })
    expect(char().onHand.items).toEqual([expect.objectContaining({ name: 'Wood blocks', quantity: 10 })])
    expect(char().storage.items).toEqual([])
  })

  it('logs a failed trip without adding anything', () => {
    useCharacterStore.setState({ characters: [makeChar()] })
    build().mine({ characterId: 'c1', materials: ['Diamond'], requested: 50, total: 5, gained: 0, destination: 'storage' })
    expect(char().storage.items).toEqual([])
    expect(log).toHaveBeenCalledWith('building', expect.stringContaining('rolled 5 (failure), 1 day: gained 0 blocks.'))
  })

  it('ignores an unknown character', () => {
    build().mine({ characterId: 'ghost', materials: [], requested: 25, total: 10, gained: 25, destination: 'storage' })
    expect(log).not.toHaveBeenCalled()
  })
})
