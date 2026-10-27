import { describe, it, expect } from 'vitest'
import type { CharacterItem } from '../types'
import {
  BLOCK_CARRY_LIMIT, countBlocks, MINING_AMOUNTS, miningDays, TOOL_BONUS, detectMiningTool,
  actionOutcome, PROJECT_TIERS, projectRequirements, isArchitect, structureProgress,
  takeBlocks, addBlocks, minedStackName,
} from './building'

const item = (name: string, quantity = 1, isBlock = false, id = name): CharacterItem => ({ id, name, quantity, isBlock })

describe('block carry limit', () => {
  it('is 10 blocks on hand (Guidebook p.7)', () => {
    expect(BLOCK_CARRY_LIMIT).toBe(10)
  })
  it('counts block quantities, not stacks, and ignores non-blocks', () => {
    expect(countBlocks([item('Stone', 30, true), item('Dirt', 4, true), item('Torch', 10)])).toBe(34)
    expect(countBlocks([])).toBe(0)
  })
})

describe('mining time', () => {
  it('matches the rulebook table', () => {
    for (const { blocks, days } of MINING_AMOUNTS) expect(miningDays(blocks)).toBe(days)
    expect(MINING_AMOUNTS.map(m => [m.blocks, m.days])).toEqual([[25, 0.5], [50, 1], [100, 2], [200, 4], [400, 8]])
  })
  it('rounds off-table amounts up to the next half day', () => {
    expect(miningDays(10)).toBe(0.5)
    expect(miningDays(26)).toBe(1)
    expect(miningDays(60)).toBe(1.5)
  })
  it('is 0 for nothing or nonsense', () => {
    expect(miningDays(0)).toBe(0)
    expect(miningDays(-5)).toBe(0)
    expect(miningDays(NaN)).toBe(0)
  })
})

describe('mining tools', () => {
  it('has the rulebook bonuses', () => {
    expect(TOOL_BONUS).toMatchObject({ wooden: -2, stone: -1, copper: 0, iron: 1, gold: 2, diamond: 3, netherite: 4 })
  })
  it('detects the tier from a carried pickaxe', () => {
    expect(detectMiningTool([item('Iron Pickaxe')])).toEqual({ tier: 'iron', itemName: 'Iron Pickaxe' })
    expect(detectMiningTool([item('Golden Pickaxe')]).tier).toBe('gold')
    expect(detectMiningTool([item('Wooden Shovel')]).tier).toBe('wooden')
  })
  it('picks the best tool when carrying several', () => {
    expect(detectMiningTool([item('Stone Pickaxe'), item('Diamond Pickaxe'), item('Iron Axe')]).tier).toBe('diamond')
  })
  it('ignores non-tools and tools with no known material', () => {
    expect(detectMiningTool([item('Iron Sword'), item('Diamond'), item('Pickaxe')])).toEqual({ tier: 'none', itemName: null })
  })
  it('reads a player custom name', () => {
    expect(detectMiningTool([{ ...item('Pickaxe'), customName: 'Netherite Pick "Old Faithful"' }]).tier).toBe('netherite')
  })
})

describe('actionOutcome', () => {
  it('uses the 10+ / 7–9 / 6- bands', () => {
    expect(actionOutcome(13)).toBe('success')
    expect(actionOutcome(10)).toBe('success')
    expect(actionOutcome(9)).toBe('partial')
    expect(actionOutcome(7)).toBe('partial')
    expect(actionOutcome(6)).toBe('failure')
    expect(actionOutcome(-1)).toBe('failure')
  })
})

describe('project requirements', () => {
  it('match the rulebook table', () => {
    expect(Object.fromEntries(Object.entries(PROJECT_TIERS).map(([k, t]) => [k, [t.blocks, t.days, t.redstone]]))).toEqual({
      redstone: [25, 1, 10], tiny: [25, 1, 0], small: [50, 2, 0], medium: [100, 4, 0], large: [200, 8, 0], mega: [400, 16, 0],
    })
    expect(projectRequirements('mega')).toEqual({ blocks: 400, days: 16, redstone: 0 })
  })
  it('halves blocks and days, rounded down, for an Architect', () => {
    expect(projectRequirements('mega', true)).toEqual({ blocks: 200, days: 8, redstone: 0 })
    expect(projectRequirements('tiny', true)).toEqual({ blocks: 12, days: 0, redstone: 0 })
  })
  it('does not halve redstone dust for an Architect', () => {
    expect(projectRequirements('redstone', true)).toEqual({ blocks: 12, days: 0, redstone: 10 })
  })
  it('recognises a Tecton Architect only', () => {
    expect(isArchitect({ class: 'Tecton', discipline: 'Architect' })).toBe(true)
    expect(isArchitect({ class: 'Tecton', discipline: 'Artisan' })).toBe(false)
    expect(isArchitect({ class: 'Warrior', discipline: 'Architect' })).toBe(false)
  })
})

describe('structureProgress', () => {
  const base = { blocksRequired: 100, daysRequired: 4, redstoneRequired: 0, blocksCommitted: 0, daysWorked: 0, redstoneCommitted: 0 }
  it('is planned with nothing done', () => {
    expect(structureProgress(base)).toMatchObject({ status: 'planned', ready: false, fraction: 0 })
  })
  it('is building and averages blocks and days', () => {
    expect(structureProgress({ ...base, blocksCommitted: 100, daysWorked: 2 })).toMatchObject({ status: 'building', blocksMet: true, daysMet: false, ready: false, fraction: 0.75 })
  })
  it('caps over-delivery at 100% per requirement', () => {
    expect(structureProgress({ ...base, blocksCommitted: 500, daysWorked: 0 }).fraction).toBe(0.5)
  })
  it('is ready once every requirement is met, including redstone', () => {
    expect(structureProgress({ ...base, blocksCommitted: 100, daysWorked: 4 }).ready).toBe(true)
    const r = { ...base, redstoneRequired: 10, blocksCommitted: 100, daysWorked: 4 }
    expect(structureProgress(r).ready).toBe(false)
    expect(structureProgress({ ...r, redstoneCommitted: 10 }).ready).toBe(true)
  })
  it('treats zero requirements as met (Architect tiny project needs 0 days)', () => {
    expect(structureProgress({ ...base, blocksRequired: 12, daysRequired: 0, blocksCommitted: 12 })).toMatchObject({ ready: true, fraction: 1 })
  })
  it('is complete once marked, regardless of numbers', () => {
    expect(structureProgress({ ...base, completedAt: 1 })).toMatchObject({ status: 'complete', fraction: 1 })
  })
})

describe('takeBlocks', () => {
  const c = {
    storage: { items: [item('Stone', 30, true, 's1'), item('Chest', 1, false, 's2')] },
    onHand: { items: [item('Dirt', 8, true, 'h1'), item('Iron Pickaxe', 1, false, 'h2')] },
  }
  it('takes from storage first and keeps the remainder of a stack', () => {
    const r = takeBlocks(c, 20)
    expect(r.taken).toBe(20)
    expect(r.storage.items).toEqual([item('Stone', 10, true, 's1'), item('Chest', 1, false, 's2')])
    expect(r.onHand).toEqual(c.onHand)
  })
  it('moves on to on-hand blocks and removes emptied stacks', () => {
    const r = takeBlocks(c, 35)
    expect(r.taken).toBe(35)
    expect(r.storage.items.map(i => i.name)).toEqual(['Chest'])
    expect(r.onHand.items).toEqual([item('Dirt', 3, true, 'h1'), item('Iron Pickaxe', 1, false, 'h2')])
  })
  it('takes only what the character has', () => {
    const r = takeBlocks(c, 100)
    expect(r.taken).toBe(38)
    expect(countBlocks(r.storage.items) + countBlocks(r.onHand.items)).toBe(0)
  })
  it('never touches non-block items and ignores non-positive amounts', () => {
    expect(takeBlocks(c, 0).taken).toBe(0)
    expect(takeBlocks(c, -5).taken).toBe(0)
    expect(takeBlocks(c, 100).onHand.items.map(i => i.name)).toEqual(['Iron Pickaxe'])
  })
})

describe('addBlocks', () => {
  let n = 0
  const id = () => `new${++n}`
  it('creates a block stack', () => {
    expect(addBlocks({ items: [] }, 'Stone blocks', 25, id).items).toEqual([{ id: 'new1', name: 'Stone blocks', quantity: 25, isBlock: true }])
  })
  it('stacks onto a same-named block item (case-insensitive)', () => {
    const s = { items: [item('Stone blocks', 10, true, 'x')] }
    expect(addBlocks(s, 'stone Blocks', 5, id).items).toEqual([item('Stone blocks', 15, true, 'x')])
  })
  it('does not stack onto a same-named non-block item', () => {
    const s = { items: [item('Stone blocks', 1, false, 'x')] }
    expect(addBlocks(s, 'Stone blocks', 5, id).items).toHaveLength(2)
  })
  it('ignores zero quantity', () => {
    const s = { items: [] }
    expect(addBlocks(s, 'Stone', 0, id)).toBe(s)
  })
})

describe('minedStackName', () => {
  it('joins materials', () => {
    expect(minedStackName(['Stone', ' Iron '])).toBe('Stone & Iron blocks')
    expect(minedStackName([])).toBe('Blocks')
  })
})
