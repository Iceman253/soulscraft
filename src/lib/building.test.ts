import { describe, it, expect } from 'vitest'
import type { CharacterItem, WeaponMaterial, WeaponType } from '../types'
import {
  BLOCK_CARRY_LIMIT, countBlocks, MINING_AMOUNTS, miningDays, TOOL_BONUS,
  carriedMiningTools, resolveMiningTool, miningToolOptions, miningToolBonus, miningToolLabel, toolKey, toolSuits, OFF_TOOL_PENALTY,
  buildCondition, repairLeft, sheltersRest, restBuilds, tectonBuilders, tectonBuildBonus,
  actionOutcome, PROJECT_TIERS, projectRequirements, isArchitect, structureProgress,
  takeBlocks, addBlocks, minedStackName, miningTraits, suggestedMiningBlocks, rollMiningCheck,
  canBoostWithSd, miningEffectNotes, miningBreakdown, carryRoom, enforceCarryLimit, blocksPerUnit, looksLikeBlocks,
  carryLimitOf, nextCarryLimit, parseCarryLimit, moveBlocks,
  countRedstone, takeRedstone, parseBuildProposal, countBlocksIn,
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
  it('never makes having no tool better than having any tool', () => {
    const { none, ...tools } = TOOL_BONUS
    expect(none).toBeLessThan(Math.min(...Object.values(tools)))
  })
  const carrying = (...items: CharacterItem[]) => ({ onHand: { items }, weaponLoadout: { mainHand: null, offHand: null } })
  const inSlot = (type: WeaponType, material: WeaponMaterial, name: string) =>
    ({ id: name, name, type, material, baseDamageBonus: 0, currentDamageBonus: 0, enchantments: [] })

  const pick = (tier: string, kind = 'pickaxe') => expect.objectContaining({ tier, kind })

  it('reads the tool and its material from what is carried', () => {
    expect(carriedMiningTools(carrying(item('Iron Pickaxe')))).toEqual([{ tier: 'iron', kind: 'pickaxe', itemName: 'Iron Pickaxe' }])
    expect(carriedMiningTools(carrying(item('Golden Pickaxe')))[0].tier).toBe('gold')
    expect(carriedMiningTools(carrying(item('Wooden Shovel')))[0]).toEqual(pick('wooden', 'shovel'))
    expect(carriedMiningTools(carrying(item('Iron Axe')))[0]).toEqual(pick('iron', 'axe'))
    expect(carriedMiningTools(carrying(item('Diamond Hoe')))[0]).toEqual(pick('diamond', 'hoe'))
  })

  it('does not mistake a pickaxe for an axe', () => {
    expect(carriedMiningTools(carrying(item('Stone Pickaxe')))[0].kind).toBe('pickaxe')
    expect(carriedMiningTools(carrying(item('Stone Pick')))[0].kind).toBe('pickaxe')
  })

  it('lists every carried tool, best material first, once per kind and material', () => {
    const tools = carriedMiningTools(carrying(item('Stone Pickaxe'), item('Diamond Pickaxe'), item('Iron Axe'), item('Stone Shovel'), item('Stone Pickaxe', 1, false, 'dupe')))
    expect(tools.map(toolKey)).toEqual(['pickaxe:diamond', 'axe:iron', 'pickaxe:stone', 'shovel:stone'])
  })

  it('ignores non-tools and tools with no known material', () => {
    expect(carriedMiningTools(carrying(item('Iron Sword'), item('Diamond'), item('Pickaxe')))).toEqual([])
  })

  it('reads custom names', () => {
    expect(carriedMiningTools(carrying({ ...item('Pickaxe'), customName: 'Netherite Pick "Old Faithful"' }))[0])
      .toEqual({ tier: 'netherite', kind: 'pickaxe', itemName: 'Netherite Pick "Old Faithful"' })
  })

  it('counts mining equipment in either weapon slot', () => {
    const c = { onHand: { items: [] }, weaponLoadout: { mainHand: inSlot('pickaxe', 'diamond', 'Diamond Pickaxe'), offHand: inSlot('axe', 'wood', 'Wooden Axe') } }
    expect(carriedMiningTools(c)).toEqual([
      { tier: 'diamond', kind: 'pickaxe', itemName: 'Diamond Pickaxe' },
      { tier: 'wooden', kind: 'axe', itemName: 'Wooden Axe' },
    ])
  })

  it('never counts real weapons, on hand or in a weapon slot', () => {
    expect(carriedMiningTools(carrying(item('Diamond Sword'), item('Netherite Mace'), item('Iron Trident')))).toEqual([])
    const c = { onHand: { items: [] }, weaponLoadout: { mainHand: inSlot('sword', 'diamond', 'Diamond Sword'), offHand: inSlot('mace', 'netherite', 'Netherite Mace') } }
    expect(carriedMiningTools(c)).toEqual([])
  })

  it('lists a tool once when it is both carried and equipped', () => {
    const c = { onHand: { items: [item('Iron Pickaxe')] }, weaponLoadout: { mainHand: inSlot('pickaxe', 'iron', 'Iron Pickaxe'), offHand: null } }
    expect(carriedMiningTools(c)).toHaveLength(1)
  })

  it('copes with a character saved without weapon slots', () => {
    expect(carriedMiningTools({ onHand: { items: [item('Iron Pickaxe')] } } as never)).toHaveLength(1)
  })

  it('does not count tools left in storage', () => {
    const c = { ...carrying(), stashes: { camp: { items: [item('Diamond Pickaxe')] }, ender: { items: [item('Netherite Pickaxe')] } } }
    expect(carriedMiningTools(c)).toEqual([])
  })

  it('only offers tools the character has, plus no tool', () => {
    const tools = carriedMiningTools(carrying(item('Iron Pickaxe')))
    expect(miningToolOptions(tools, ['Stone'])).toEqual([
      { value: 'pickaxe:iron', label: 'Iron Pickaxe (+1)' },
      { value: 'none', label: 'No tool (−3)' },
    ])
    expect(miningToolOptions([])).toEqual([{ value: 'none', label: 'No tool (−3)' }])
  })

  it('defaults to the best tool for the job, or no tool without one', () => {
    const tools = carriedMiningTools(carrying(item('Stone Pickaxe'), item('Iron Pickaxe')))
    expect(resolveMiningTool(null, tools, ['Stone'])).toEqual(pick('iron'))
    expect(resolveMiningTool(null, [], ['Stone'])).toBeNull()
  })

  it('keeps a choice the character can make, including no tool', () => {
    const tools = carriedMiningTools(carrying(item('Stone Pickaxe'), item('Iron Pickaxe')))
    expect(resolveMiningTool('pickaxe:stone', tools)).toEqual(pick('stone'))
    expect(resolveMiningTool('none', tools)).toBeNull()
  })

  it('refuses a tool the character does not have', () => {
    const tools = carriedMiningTools(carrying(item('Stone Pickaxe')))
    expect(resolveMiningTool('pickaxe:netherite', tools)).toEqual(pick('stone'))
    expect(resolveMiningTool('pickaxe:diamond', [])).toBeNull()
  })
})

describe('axes, shovels and hoes', () => {
  const axe = { kind: 'axe' as const, tier: 'iron' as const }
  const carry = (...names: string[]) => carriedMiningTools({ onHand: { items: names.map(n => item(n)) }, weaponLoadout: { mainHand: null, offHand: null } })

  it('gives an axe its full bonus on wood', () => {
    expect(miningToolBonus(axe, ['Oak Logs'])).toBe(1)
    expect(miningToolBonus(axe, ['wood', 'Spruce planks'])).toBe(1)
    expect(miningToolBonus({ kind: 'axe', tier: 'diamond' }, ['Birch'])).toBe(3)
  })

  it('makes an axe far worse than a pickaxe on anything else', () => {
    expect(miningToolBonus({ kind: 'axe', tier: 'netherite' }, ['Stone'])).toBe(4 - OFF_TOOL_PENALTY)
    expect(miningToolBonus({ kind: 'axe', tier: 'diamond' }, ['Iron ore'])).toBe(0)
    expect(miningToolBonus({ kind: 'pickaxe', tier: 'diamond' }, ['Iron ore'])).toBe(3)
  })

  it('never makes a tool worse than having none', () => {
    expect(miningToolBonus({ kind: 'axe', tier: 'wooden' }, ['Stone'])).toBe(TOOL_BONUS.none)
    expect(miningToolBonus({ kind: 'axe', tier: 'stone' }, ['Stone'])).toBe(TOOL_BONUS.none)
    expect(miningToolBonus(axe, ['Stone'])).toBe(-2)
  })

  it('needs everything mined to be wood', () => {
    expect(miningToolBonus(axe, ['Oak', 'Stone'])).toBe(-2)
    expect(miningToolBonus(axe, [])).toBe(-2)
  })

  it('lets a pickaxe mine anything', () => {
    expect(toolSuits('pickaxe', ['Oak'])).toBe(true)
    expect(toolSuits('pickaxe', [])).toBe(true)
  })

  it('suits shovels to dirt and sand, and hoes to leaves', () => {
    expect(toolSuits('shovel', ['Sand', 'Gravel'])).toBe(true)
    expect(toolSuits('shovel', ['Stone'])).toBe(false)
    expect(toolSuits('hoe', ['Oak leaves'])).toBe(true)
  })

  it('picks the axe for wood and the pickaxe for stone', () => {
    const tools = carry('Iron Pickaxe', 'Diamond Axe')
    expect(resolveMiningTool(null, tools, ['Oak'])?.kind).toBe('axe')
    expect(resolveMiningTool(null, tools, ['Stone'])?.kind).toBe('pickaxe')
  })

  it('shows the cost of the wrong tool in the picker', () => {
    expect(miningToolOptions(carry('Iron Axe'), ['Stone'])[0].label).toBe('Iron Axe (−2, best on wood)')
    expect(miningToolOptions(carry('Iron Axe'), ['Oak'])[0].label).toBe('Iron Axe (+1)')
  })

  it('spells out the wrong tool in the roll', () => {
    expect(miningToolLabel({ ...axe, itemName: 'Iron Axe' }, ['Stone'])).toBe('−2 Iron axe (not wood)')
    expect(miningToolLabel({ ...axe, itemName: 'Iron Axe' }, ['Oak'])).toBe('+1 Iron axe')
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
    stashes: {
      camp: { items: [item('Stone', 30, true, 's1'), item('Chest', 1, false, 's2')] },
      far: { items: [item('Sand', 64, true, 'f1')] },
    },
    onHand: { items: [item('Dirt', 8, true, 'h1'), item('Iron Pickaxe', 1, false, 'h2')] },
  }
  const reach = ['camp', 'onHand']
  it('takes from the first section given and keeps the remainder of a stack', () => {
    const r = takeBlocks(c, reach, 20)
    expect(r.taken).toBe(20)
    expect(r.patch.stashes?.camp.items).toEqual([item('Stone', 10, true, 's1'), item('Chest', 1, false, 's2')])
    expect(r.patch.onHand).toBeUndefined()
  })
  it('moves on to on-hand blocks and removes emptied stacks', () => {
    const r = takeBlocks(c, reach, 35)
    expect(r.taken).toBe(35)
    expect(r.patch.stashes?.camp.items.map(i => i.name)).toEqual(['Chest'])
    expect(r.patch.onHand?.items).toEqual([item('Dirt', 3, true, 'h1'), item('Iron Pickaxe', 1, false, 'h2')])
  })
  it('takes only what the character can reach', () => {
    const r = takeBlocks(c, reach, 100)
    expect(r.taken).toBe(38)
    expect(r.patch.stashes?.far).toEqual(c.stashes.far)
  })
  it('drops a store once it is empty', () => {
    const r = takeBlocks({ ...c, stashes: { camp: { items: [item('Stone', 5, true)] } } }, ['camp'], 5)
    expect(r.patch.stashes).toEqual({})
  })
  it('never touches non-block items and ignores non-positive amounts', () => {
    expect(takeBlocks(c, reach, 0).taken).toBe(0)
    expect(takeBlocks(c, reach, -5).taken).toBe(0)
    expect(takeBlocks(c, reach, 100).patch.onHand?.items.map(i => i.name)).toEqual(['Iron Pickaxe'])
  })
  it('counts only the sections given', () => {
    expect(countBlocksIn(c, reach)).toBe(38)
    expect(countBlocksIn(c, ['far'])).toBe(64)
    expect(countBlocksIn(c, ['nowhere'])).toBe(0)
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

describe('mining on a phone', () => {
  it('finds traits that sound like mining', () => {
    const trait = (name: string) => ({ id: name, name, description: '' })
    expect(miningTraits([trait('Miner'), trait('Excavator'), trait('Silver Tongue'), trait('Mining Lore')]).map(t => t.name))
      .toEqual(['Miner', 'Excavator', 'Mining Lore'])
  })

  it('suggests the blocks asked for, or none on a failure', () => {
    expect(suggestedMiningBlocks(10, 100)).toBe(100)
    expect(suggestedMiningBlocks(7, 100)).toBe(100)
    expect(suggestedMiningBlocks(6, 100)).toBe(0)
  })

  it('does not mistake other words for mining traits', () => {
    const trait = (name: string) => ({ id: name, name, description: '' })
    expect(miningTraits([trait('Dignified'), trait('Prodigy'), trait('Minor Noble'), trait('Digger'), trait('Mine Foreman')]).map(t => t.name))
      .toEqual(['Digger', 'Mine Foreman'])
  })

  it('rolls 2d6 plus bonuses', () => {
    const roll = (spec: string) => { expect(spec).toBe('2d6'); return 8 }
    expect(rollMiningCheck(3, 0, { roll })).toEqual({ dice: 8, sdBoost: 0, penalty: 0, total: 11, doubleSix: false })
  })

  it('takes 1d4 per missed rest off the roll', () => {
    const roll = (spec: string) => spec === '2d4' ? 5 : 9
    expect(rollMiningCheck(1, 2, { roll })).toMatchObject({ dice: 9, penalty: 5, total: 5 })
  })

  it('adds 1d4 only when a Souls Die was spent', () => {
    const roll = (spec: string) => spec === '1d4' ? 3 : 7
    expect(rollMiningCheck(0, 0, { roll, boost: true })).toMatchObject({ sdBoost: 3, total: 10 })
    expect(rollMiningCheck(0, 0, { roll })).toMatchObject({ sdBoost: 0, total: 7 })
  })

  it('spots double 6s on the dice alone, whatever the bonuses', () => {
    expect(rollMiningCheck(-2, 0, { roll: () => 12 }).doubleSix).toBe(true)
    expect(rollMiningCheck(5, 0, { roll: () => 11 }).doubleSix).toBe(false)
  })

  it('blocks a Souls Die boost with no SD or while Fatigued', () => {
    const fatigue = { id: 'f', name: 'Fatigue', durationType: 'manual' as const }
    expect(canBoostWithSd({ currentSd: 1, activeEffects: [] })).toBe(true)
    expect(canBoostWithSd({ currentSd: 0, activeEffects: [] })).toBe(false)
    expect(canBoostWithSd({ currentSd: 3, activeEffects: [fatigue] })).toBe(false)
  })

  it('flags effects that change the roll for the GM', () => {
    const fx = (name: string) => ({ id: name, name, durationType: 'manual' as const })
    expect(miningEffectNotes({ activeEffects: [fx('Poison'), fx('Cursed'), fx('Luck'), fx('Fatigue')] })).toEqual(['Cursed', 'Luck', 'Fatigue'])
  })

  it('spells out the roll', () => {
    const tool = (tier: 'diamond' | 'wooden') => ({ tier, kind: 'pickaxe' as const, itemName: 'x' })
    expect(miningBreakdown({ dice: 9, tool: tool('diamond'), traits: ['Miner'], skill: { name: 'Delving', bonus: 2 }, other: 1, sdBoost: 3, penalty: 2 }))
      .toBe('9 (2d6) +3 Diamond pickaxe +1 Miner +2 Delving +1 other +3 SD −2 missed rest')
    expect(miningBreakdown({ dice: 5, tool: tool('wooden'), traits: [] })).toBe('5 (2d6) −2 Wooden pickaxe')
    expect(miningBreakdown({ dice: 5, tool: null, traits: [] })).toBe('5 (2d6) −3 no tool')
  })

  it('knows how many more blocks can be carried', () => {
    expect(carryRoom({ onHand: { items: [item('Stone', 8, true), item('Torch', 5)] } })).toBe(2)
    expect(carryRoom({ onHand: { items: [item('Stone', 10, true)] } })).toBe(0)
    expect(carryRoom({ onHand: { items: [item('Stone', 40, true)] } })).toBe(0)
    expect(carryRoom({ onHand: { items: [item('Stone', 12, true)] }, carryLimit: 30 })).toBe(18)
  })
})

describe('enforcing the carry limit', () => {
  const ids = () => 'new-id'
  const at = { locationId: 'town', subLocationId: 'inn' }

  it('leaves 10 or fewer blocks alone', () => {
    const onHand = { items: [item('Stone', 10, true), item('Torch', 50)] }
    const result = enforceCarryLimit({ ...at, onHand }, ids)
    expect(result).toEqual({ onHand, stashes: undefined, moved: 0 })
    expect(result.onHand).toBe(onHand)
  })

  it('leaves everything past 10 where the character is, so nothing is lost', () => {
    const { onHand, stashes, moved } = enforceCarryLimit({ ...at, onHand: { items: [item('Stone', 25, true)] } }, ids)
    expect(moved).toBe(15)
    expect(onHand.items).toEqual([item('Stone', 10, true)])
    expect(stashes).toEqual({ inn: { items: [{ id: 'new-id', name: 'Stone', quantity: 15, isBlock: true }] } })
  })

  it('leaves them at a place it is given instead', () => {
    const { stashes } = enforceCarryLimit({ ...at, onHand: { items: [item('Stone', 12, true)] } }, ids, 'mine')
    expect(Object.keys(stashes ?? {})).toEqual(['mine'])
  })

  it('has nowhere in particular to put them out on the road', () => {
    const { stashes } = enforceCarryLimit({ locationId: null, subLocationId: null, onHand: { items: [item('Stone', 12, true)] } }, ids)
    expect(stashes?.unplaced.items[0].quantity).toBe(2)
  })

  it('takes the newest stacks first and removes emptied ones', () => {
    const { onHand, stashes } = enforceCarryLimit({ ...at, onHand: { items: [item('Stone', 8, true), item('Dirt', 4, true), item('Sand', 3, true)] } }, ids)
    expect(onHand.items).toEqual([item('Stone', 8, true), item('Dirt', 2, true)])
    expect(stashes?.inn.items.map(i => [i.name, i.quantity])).toEqual([['Sand', 3], ['Dirt', 2]])
  })

  it('stacks onto matching blocks already stored there, and leaves other stores alone', () => {
    const ender = { items: [item('Stone', 1, true)] }
    const { stashes } = enforceCarryLimit({ ...at, onHand: { items: [item('Stone', 12, true)] }, stashes: { inn: { items: [item('Stone', 5, true)] }, ender } }, ids)
    expect(stashes?.inn.items).toEqual([item('Stone', 7, true)])
    expect(stashes?.ender).toBe(ender)
  })

  it('never touches items that are not blocks', () => {
    const { onHand } = enforceCarryLimit({ ...at, onHand: { items: [item('Stone', 11, true), item('Torch', 99)] } }, ids)
    expect(onHand.items).toEqual([item('Stone', 10, true), item('Torch', 99)])
  })
})

describe('temporary carry limit', () => {
  it('defaults to 10', () => {
    expect(carryLimitOf({})).toBe(10)
    expect(carryLimitOf({ carryLimit: 25 })).toBe(25)
  })

  it('lets a raised limit hold more before anything moves to storage', () => {
    const c = { onHand: { items: [item('Stone', 25, true)] }, locationId: 'camp', subLocationId: null, carryLimit: 25 }
    expect(enforceCarryLimit(c, () => 'id').moved).toBe(0)
    expect(enforceCarryLimit({ ...c, carryLimit: 20 }, () => 'id').moved).toBe(5)
  })

  it('ends the moment the blocks carried drop below 10', () => {
    expect(nextCarryLimit(30, 15, 9)).toBeUndefined()
    expect(nextCarryLimit(30, 10, 9)).toBeUndefined()
    expect(nextCarryLimit(30, 30, 0)).toBeUndefined()
  })

  it('holds at exactly 10 and above', () => {
    expect(nextCarryLimit(30, 15, 10)).toBe(30)
    expect(nextCarryLimit(30, 20, 15)).toBe(30)
    expect(nextCarryLimit(30, 12, 28)).toBe(30)
  })

  it('does not end for someone who was under 10 when it was granted', () => {
    expect(nextCarryLimit(30, 3, 3)).toBe(30)
    expect(nextCarryLimit(30, 3, 8)).toBe(30)
    expect(nextCarryLimit(30, 8, 3)).toBe(30)
  })

  it('stays clear with no limit set', () => {
    expect(nextCarryLimit(undefined, 12, 5)).toBeUndefined()
  })

  it('only accepts a limit that raises the usual 10', () => {
    expect(parseCarryLimit(25)).toBe(25)
    expect(parseCarryLimit('25')).toBe(25)
    expect(parseCarryLimit(11)).toBe(11)
    expect(parseCarryLimit(10)).toBeNull()
    expect(parseCarryLimit(5)).toBeNull()
    expect(parseCarryLimit('')).toBeNull()
    expect(parseCarryLimit(undefined)).toBeNull()
  })
})

describe('moving blocks between sections', () => {
  const ids = () => 'new'

  it('moves what it can, stacking by name', () => {
    const { from, to, moved } = moveBlocks({ items: [item('Stone', 8, true)] }, { items: [item('Stone', 2, true)] }, 5, ids)
    expect(moved).toBe(5)
    expect(from.items).toEqual([item('Stone', 3, true)])
    expect(to.items).toEqual([item('Stone', 7, true)])
  })

  it('stops at what is there and leaves other items', () => {
    const { from, to, moved } = moveBlocks({ items: [item('Torch', 4), item('Stone', 3, true)] }, { items: [] }, 50, ids)
    expect(moved).toBe(3)
    expect(from.items).toEqual([item('Torch', 4)])
    expect(to.items).toEqual([{ id: 'new', name: 'Stone', quantity: 3, isBlock: true }])
  })

  it('moves nothing for a zero or negative amount', () => {
    expect(moveBlocks({ items: [item('Stone', 3, true)] }, { items: [] }, 0, ids).moved).toBe(0)
    expect(moveBlocks({ items: [item('Stone', 3, true)] }, { items: [] }, -2, ids).moved).toBe(0)
  })
})

describe('recognizing blocks', () => {
  it('reads how many blocks a market unit holds', () => {
    expect(blocksPerUnit('stack of 10 blocks')).toBe(10)
    expect(blocksPerUnit('block')).toBe(1)
    expect(blocksPerUnit('each')).toBe(0)
    expect(blocksPerUnit(undefined)).toBe(0)
  })

  it('reads block names from free text', () => {
    expect(looksLikeBlocks('Stone Blocks')).toBe(true)
    expect(looksLikeBlocks('stone block')).toBe(true)
    expect(looksLikeBlocks('Blockade Runner Map')).toBe(false)
    expect(looksLikeBlocks('Iron Sword')).toBe(false)
  })
})

describe('redstone dust', () => {
  const c = {
    stashes: { camp: { items: [item('Redstone Dust', 6), item('Redstone Block', 4, true)] } },
    onHand: { items: [item('Redstone', 3), item('Torch', 2)] },
  }
  const reach = ['camp', 'onHand']

  it('counts dust, not redstone blocks', () => {
    expect(countRedstone(c, reach)).toBe(9)
    expect(countRedstone(c, ['onHand'])).toBe(3)
  })

  it('takes from the first section first and only as much as there is', () => {
    const { patch, taken } = takeRedstone(c, reach, 7)
    expect(taken).toBe(7)
    expect(patch.stashes?.camp.items).toEqual([item('Redstone Block', 4, true)])
    expect(patch.onHand?.items).toEqual([item('Redstone', 2), item('Torch', 2)])
    expect(takeRedstone(c, reach, 99).taken).toBe(9)
    expect(takeRedstone(c, ['onHand'], 99).taken).toBe(3)
  })
})

describe('reading a build proposal', () => {
  const good = {
    name: 'Keep', description: 'Holds the pass', tier: 'large', icon: 'a'.repeat(256),
    areaId: 'town', subNodeId: 'market', position: { x: 5, y: 6 }, builderIds: ['c2'],
  }

  it('keeps a good proposal and always counts the proposer as a builder', () => {
    expect(parseBuildProposal(good, 'c1')).toEqual({ ...good, builderIds: ['c1', 'c2'] })
  })

  it('does not list the proposer twice', () => {
    expect(parseBuildProposal({ ...good, builderIds: ['c1', 'c1'] }, 'c1').builderIds).toEqual(['c1'])
  })

  it('keeps the difference between beside an area and inside it', () => {
    expect('subNodeId' in parseBuildProposal({ ...good, subNodeId: undefined }, 'c1')).toBe(false)
    expect(parseBuildProposal({ ...good, subNodeId: null }, 'c1').subNodeId).toBeNull()
  })

  it('falls back safely on bad data', () => {
    expect(parseBuildProposal({ tier: 'colossal', icon: 'nope', position: 'x', builderIds: 'x' }, 'c1')).toEqual({
      name: '', description: '', tier: 'small', icon: '.'.repeat(256), areaId: null,
      position: { x: 0, y: 0 }, builderIds: ['c1'],
    })
  })
})

const finished = { blocksRequired: 50, blocksCommitted: 50, daysRequired: 2, daysWorked: 2, redstoneRequired: 0, redstoneCommitted: 0, completedAt: 1 }

describe('damaged and destroyed builds', () => {
  it('reads the condition', () => {
    expect(buildCondition({ ...finished, completedAt: undefined, blocksCommitted: 0, daysWorked: 0 })).toBe('planned')
    expect(buildCondition(finished)).toBe('complete')
    expect(buildCondition({ ...finished, damage: { needed: 10, repaired: 0 } })).toBe('damaged')
    expect(buildCondition({ ...finished, destroyedAt: 2 })).toBe('destroyed')
    expect(buildCondition({ ...finished, damage: { needed: 10, repaired: 0 }, destroyedAt: 2 })).toBe('destroyed')
  })

  it('counts the blocks left to repair', () => {
    expect(repairLeft({ damage: { needed: 10, repaired: 4 } })).toBe(6)
    expect(repairLeft({})).toBe(0)
  })

  it('only shelters a rest when finished and whole', () => {
    expect(sheltersRest(finished)).toBe(true)
    expect(sheltersRest({ ...finished, damage: { needed: 10, repaired: 0 } })).toBe(false)
    expect(sheltersRest({ ...finished, destroyedAt: 2 })).toBe(false)
    expect(sheltersRest({ ...finished, completedAt: undefined, daysWorked: 1 })).toBe(false)
  })

  it("lists builds to rest at, the party's area first, without ruins or unfinished ones", () => {
    const b = (name: string, areaId: string | null, extra = {}) => ({ ...finished, name, areaId, ...extra })
    const list = restBuilds([
      b('Zed hut', 'far'), b('Abbey', 'far'), b('Home', 'here'),
      b('Shed', 'here', { damage: { needed: 5, repaired: 0 } }),
      b('Ruin', 'here', { destroyedAt: 1 }), b('Plan', 'here', { completedAt: undefined, daysWorked: 0 }),
    ], new Set(['here']))
    expect(list.map(x => [x.structure.name, x.shelters])).toEqual([['Home', true], ['Shed', false], ['Abbey', true], ['Zed hut', true]])
  })
})

describe('Tecton builds (Prime Order, p.62)', () => {
  const people = [{ id: 't', class: 'Tecton' }, { id: 'w', class: 'Warrior' }]

  it('finds the Tectons who built it', () => {
    expect(tectonBuilders({ builderIds: ['t', 'w'] }, people).map(c => c.id)).toEqual(['t'])
    expect(tectonBuilders({ builderIds: ['w'] }, people)).toEqual([])
  })

  it('gives +1 to anyone and +2 to the Tecton', () => {
    const s = { ...finished, builderIds: ['t', 'w'] }
    expect(tectonBuildBonus(s, people)).toBe(1)
    expect(tectonBuildBonus(s, people, 'w')).toBe(1)
    expect(tectonBuildBonus(s, people, 't')).toBe(2)
  })

  it('gives nothing without a Tecton builder, before it is finished, or once destroyed', () => {
    expect(tectonBuildBonus({ ...finished, builderIds: ['w'] }, people, 'w')).toBe(0)
    expect(tectonBuildBonus({ ...finished, builderIds: ['t'], completedAt: undefined, daysWorked: 0 }, people, 't')).toBe(0)
    expect(tectonBuildBonus({ ...finished, builderIds: ['t'], destroyedAt: 2 }, people, 't')).toBe(0)
  })

  it('still counts while damaged', () => {
    expect(tectonBuildBonus({ ...finished, builderIds: ['t'], damage: { needed: 5, repaired: 0 } }, people)).toBe(1)
  })
})
