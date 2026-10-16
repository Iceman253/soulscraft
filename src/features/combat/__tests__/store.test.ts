import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ActiveEffect, Combatant, CombatSession } from '../../../types'
import { queueCryptoRolls } from '../../../test/rng'

// Stub persistence, logging and the character store so nextTurn runs in isolation.
const { updateCampaignData, log, syncCombatHp } = vi.hoisted(() => ({
  updateCampaignData: vi.fn(),
  log: vi.fn(),
  syncCombatHp: vi.fn(),
}))
vi.mock('../../campaigns/store', () => ({
  useCampaignStore: { getState: () => ({ updateCampaignData, activeCampaign: null }) },
}))
vi.mock('../../log/store', () => ({ log }))
vi.mock('../../characters/store', () => ({
  useCharacterStore: { getState: () => ({ syncCombatHp }) },
}))

import { useCombatStore } from '../store'

let effectSeq = 0
function effect(overrides: Partial<ActiveEffect> = {}): ActiveEffect {
  return { id: `e${++effectSeq}`, name: 'Effect', durationType: 'manual', ...overrides }
}
const poison = (dice = '1d6') => effect({ name: 'Poison', damagePerRound: dice })
const regen = (dice = '1d6') => effect({ name: 'Regeneration', healPerRound: dice })

function combatant(id: string, overrides: Partial<Combatant> = {}): Combatant {
  return {
    id,
    name: id.toUpperCase(),
    initiative: 10,
    maxHp: 10,
    currentHp: 10,
    def: 0,
    kind: 'creature',
    sourceId: `src-${id}`,
    activeEffects: [],
    notes: '',
    ...overrides,
  }
}

function setSession(combatants: Combatant[], activeIndex = 0, round = 1) {
  const session: CombatSession = { id: 's1', startedAt: 0, combatants, round, activeIndex, ended: false }
  useCombatStore.setState({ session })
}
const session = () => useCombatStore.getState().session!
const hp = (id: string) => session().combatants.find(c => c.id === id)!.currentHp

beforeEach(() => {
  useCombatStore.setState({ session: null })
  updateCampaignData.mockClear()
  log.mockClear()
  syncCombatHp.mockClear()
})

describe('combat nextTurn', () => {
  it('advances to the next combatant', () => {
    setSession([combatant('a'), combatant('b'), combatant('c')])
    useCombatStore.getState().nextTurn()
    expect(session().activeIndex).toBe(1)
    expect(session().round).toBe(1)
  })

  it('starts a new round when wrapping past the end', () => {
    setSession([combatant('a'), combatant('b')], 1, 3)
    useCombatStore.getState().nextTurn()
    expect(session().activeIndex).toBe(0)
    expect(session().round).toBe(4)
  })

  it('applies damage to the combatant whose turn starts', () => {
    setSession([combatant('a', { activeEffects: [poison()] }), combatant('b', { activeEffects: [poison()] })])
    queueCryptoRolls(6, 4)
    useCombatStore.getState().nextTurn()
    expect(hp('b')).toBe(6)
    expect(hp('a')).toBe(10) // not their turn
    expect(log).toHaveBeenCalledWith('combat-end', expect.stringContaining('B takes 4 damage'))
  })

  it('applies healing to the combatant whose turn starts', () => {
    setSession([combatant('a'), combatant('b', { currentHp: 3, activeEffects: [regen('1d4')] })])
    queueCryptoRolls(4, 4)
    useCombatStore.getState().nextTurn()
    expect(hp('b')).toBe(7)
    expect(log).toHaveBeenCalledWith('combat-end', expect.stringContaining('B regenerates 4 HP'))
  })

  it('applies damage before healing', () => {
    // Regeneration listed first, damage still lands first: 9 - 3 = 6, +6 → 10 (cap).
    // Heal-first would give min(10, 15) - 3 = 7.
    setSession([combatant('a'), combatant('b', { currentHp: 9, activeEffects: [regen(), poison()] })])
    queueCryptoRolls(6, 3, 6)
    useCombatStore.getState().nextTurn()
    expect(hp('b')).toBe(10)
  })

  it('does not heal a combatant dropped to 0 HP this turn', () => {
    setSession([combatant('a'), combatant('b', { currentHp: 2, activeEffects: [poison(), regen()] })])
    const rng = queueCryptoRolls(6, 5, 6)
    useCombatStore.getState().nextTurn()
    expect(hp('b')).toBe(0)
    expect(rng).toHaveBeenCalledTimes(1) // regeneration never rolled
    expect(log).not.toHaveBeenCalledWith('combat-end', expect.stringContaining('regenerates'))
  })

  it('caps healing at maxHp', () => {
    setSession([combatant('a'), combatant('b', { currentHp: 8, maxHp: 10, activeEffects: [regen()] })])
    queueCryptoRolls(6, 6)
    useCombatStore.getState().nextTurn()
    expect(hp('b')).toBe(10)
    expect(log).toHaveBeenCalledWith('combat-end', expect.stringContaining('regenerates 2 HP'))
  })

  it('stacks several heals up to the cap', () => {
    setSession([combatant('a'), combatant('b', { currentHp: 2, maxHp: 10, activeEffects: [regen(), regen()] })])
    queueCryptoRolls(6, 5, 6)
    useCombatStore.getState().nextTurn()
    expect(hp('b')).toBe(10)
  })

  it('skips defeated combatants', () => {
    setSession([combatant('a'), combatant('b', { currentHp: 0, activeEffects: [regen()] }), combatant('c')])
    const rng = queueCryptoRolls(6)
    useCombatStore.getState().nextTurn()
    expect(session().activeIndex).toBe(2)
    expect(hp('b')).toBe(0)
    expect(rng).not.toHaveBeenCalled()
  })

  it('skips defeated combatants across the round boundary', () => {
    setSession([combatant('a', { currentHp: 0 }), combatant('b'), combatant('c')], 2, 1)
    useCombatStore.getState().nextTurn()
    expect(session().activeIndex).toBe(1)
    expect(session().round).toBe(2)
  })

  it('does not advance when everyone is defeated', () => {
    setSession([combatant('a', { currentHp: 0 }), combatant('b', { currentHp: 0 })], 0, 2)
    const before = session()
    useCombatStore.getState().nextTurn()
    expect(session()).toBe(before)
  })

  it('does not crash on an empty session', () => {
    setSession([])
    const before = session()
    expect(() => useCombatStore.getState().nextTurn()).not.toThrow()
    expect(session()).toBe(before)
  })

  it('does not crash with no session at all', () => {
    expect(() => useCombatStore.getState().nextTurn()).not.toThrow()
    expect(useCombatStore.getState().session).toBeNull()
  })

  it("mirrors a PC's new HP onto their character sheet", () => {
    setSession([combatant('a'), combatant('pc', { kind: 'character', sourceId: 'char-1', currentHp: 5, activeEffects: [poison()] })])
    queueCryptoRolls(6, 2)
    useCombatStore.getState().nextTurn()
    expect(syncCombatHp).toHaveBeenCalledWith('char-1', 3)
  })

  it('does not touch the character store for creatures', () => {
    setSession([combatant('a'), combatant('b', { activeEffects: [poison()] })])
    queueCryptoRolls(6, 2)
    useCombatStore.getState().nextTurn()
    expect(syncCombatHp).not.toHaveBeenCalled()
  })

  it('persists the session to campaign data', () => {
    setSession([combatant('a'), combatant('b')])
    updateCampaignData.mockClear()
    useCombatStore.getState().nextTurn()
    expect(updateCampaignData).toHaveBeenCalledWith({ combat: session() })
  })
})
