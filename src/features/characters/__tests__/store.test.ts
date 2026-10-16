import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ActiveEffect, Character } from '../../../types'
import { queueMathRolls } from '../../../test/rng'

// The store persists through the campaign store and logs through the log store;
// stub both so no server, localStorage or WebSocket is touched.
const { updateCampaignData, log } = vi.hoisted(() => ({
  updateCampaignData: vi.fn(),
  log: vi.fn(),
}))
vi.mock('../../campaigns/store', () => ({
  useCampaignStore: { getState: () => ({ updateCampaignData, activeCampaign: null }) },
}))
vi.mock('../../log/store', () => ({ log }))
vi.mock('../../map/store', () => ({ useWorldStore: { getState: () => ({}) } }))

import { useCharacterStore } from '../store'

function makeChar(overrides: Partial<Character> = {}): Character {
  return {
    id: 'c1',
    name: 'Steve',
    species: 'Human',
    variant: '',
    class: 'Warrior',
    discipline: '',
    level: 1,
    maxHp: 10,
    currentHp: 10,
    maxSd: 6,
    currentSd: 0,
    xp: 0,
    damageDie: 'd6',
    classFeatureState: { class: 'custom', state: null },
    disciplineEdge: { name: '', description: '', used: false },
    armorLoadout: {} as Character['armorLoadout'],
    weaponLoadout: {} as Character['weaponLoadout'],
    skills: [],
    traits: [],
    abilities: [],
    activeEffects: [],
    missedRests: 0,
    locationId: null,
    subLocationId: null,
    currency: { copper: 0, iron: 0, gold: 0, emeralds: 0, diamonds: 0 },
    onHand: { items: [] },
    storage: { items: [] },
    rations: 0,
    notes: '',
    ...overrides,
  }
}

let effectSeq = 0
function effect(overrides: Partial<ActiveEffect> = {}): ActiveEffect {
  return { id: `e${++effectSeq}`, name: 'Effect', durationType: 'scenes', remaining: 3, ...overrides }
}

const poison = (dice = '1d6', remaining = 3) => effect({ name: 'Poison', damagePerRound: dice, remaining })
const regen = (dice = '1d6', remaining = 3) => effect({ name: 'Regeneration', healPerRound: dice, remaining })

function setChars(...characters: Character[]) {
  useCharacterStore.setState({ characters, xpLog: [] })
}
const char = (id = 'c1') => useCharacterStore.getState().characters.find(c => c.id === id)!

beforeEach(() => {
  updateCampaignData.mockClear()
  log.mockClear()
  setChars()
})

describe('advanceEffectTime', () => {
  it('applies a damage tick and counts the effect down', () => {
    setChars(makeChar({ currentHp: 10, activeEffects: [poison('1d6', 3)] }))
    queueMathRolls(6, 4)
    useCharacterStore.getState().advanceEffectTime('scenes')
    expect(char().currentHp).toBe(6)
    expect(char().activeEffects[0].remaining).toBe(2)
    expect(log).toHaveBeenCalledWith('character-move', expect.stringContaining('takes 4 damage from Poison'))
  })

  it('applies a heal tick', () => {
    setChars(makeChar({ currentHp: 4, activeEffects: [regen('1d4')] }))
    queueMathRolls(4, 3)
    useCharacterStore.getState().advanceEffectTime('scenes')
    expect(char().currentHp).toBe(7)
    expect(log).toHaveBeenCalledWith('character-move', expect.stringContaining('regenerates 3 HP'))
  })

  it('caps healing at maxHp', () => {
    setChars(makeChar({ currentHp: 9, maxHp: 10, activeEffects: [regen('1d6')] }))
    queueMathRolls(6, 5)
    useCharacterStore.getState().advanceEffectTime('scenes')
    expect(char().currentHp).toBe(10)
    expect(log).toHaveBeenCalledWith('character-move', expect.stringContaining('regenerates 1 HP'))
  })

  it('does not log a regeneration that gains nothing at full HP', () => {
    setChars(makeChar({ currentHp: 10, maxHp: 10, activeEffects: [regen('1d6')] }))
    queueMathRolls(6, 5)
    useCharacterStore.getState().advanceEffectTime('scenes')
    expect(char().currentHp).toBe(10)
    expect(log).not.toHaveBeenCalledWith('character-move', expect.stringContaining('regenerates'))
  })

  it('applies damage before healing', () => {
    // Regeneration is listed first, but damage still lands first:
    // 9 - 3 = 6, then +6 → 10 (capped). Heal-first would give min(10, 15) - 3 = 7.
    setChars(makeChar({ currentHp: 9, maxHp: 10, activeEffects: [regen('1d6'), poison('1d6')] }))
    queueMathRolls(6, 6, 3)
    useCharacterStore.getState().advanceEffectTime('scenes')
    expect(char().currentHp).toBe(10)
  })

  it('sums damage from several effects', () => {
    setChars(makeChar({ currentHp: 10, activeEffects: [poison('1d6'), effect({ name: 'Bleeding', damagePerRound: '2d4' })] }))
    queueMathRolls(6, 2)
    queueMathRolls(4, 1, 3)
    useCharacterStore.getState().advanceEffectTime('scenes')
    expect(char().currentHp).toBe(4)
  })

  it('does not heal a character this tick dropped to 0 HP', () => {
    setChars(makeChar({ currentHp: 3, currentSd: 2, activeEffects: [poison('1d6'), regen('1d6')] }))
    queueMathRolls(6, 5, 4)
    useCharacterStore.getState().advanceEffectTime('scenes')
    expect(char().currentHp).toBe(0)
    expect(log).not.toHaveBeenCalledWith('character-move', expect.stringContaining('regenerates'))
  })

  it('never takes HP below 0', () => {
    setChars(makeChar({ currentHp: 2, currentSd: 1, activeEffects: [poison('3d6')] }))
    queueMathRolls(6, 6, 6, 6)
    useCharacterStore.getState().advanceEffectTime('scenes')
    expect(char().currentHp).toBe(0)
  })

  it('gives dead and ghost characters no HP change but still runs their timers', () => {
    setChars(
      makeChar({ id: 'dead', isDead: true, currentHp: 0, activeEffects: [regen('1d6', 1), poison('1d6', 2)] }),
      makeChar({ id: 'ghost', isGhost: true, currentHp: 5, activeEffects: [poison('1d6', 2), regen('1d6', 1)] }),
    )
    const rng = queueMathRolls(6)
    useCharacterStore.getState().advanceEffectTime('scenes')

    expect(rng).not.toHaveBeenCalled()
    expect(char('dead').currentHp).toBe(0)
    expect(char('ghost').currentHp).toBe(5)
    // Regeneration (remaining 1) expired and was removed; Poison counted down.
    expect(char('dead').activeEffects.map(e => [e.name, e.remaining])).toEqual([['Poison', 1]])
    expect(char('ghost').activeEffects.map(e => [e.name, e.remaining])).toEqual([['Poison', 1]])
    expect(log).toHaveBeenCalledWith('effect-expired', '✨ Regeneration on Steve expired.')
  })

  it('leaves effects of a different interval untouched', () => {
    const daily = effect({ name: 'Rot', durationType: 'days', remaining: 2, damagePerRound: '1d6' })
    const manual = effect({ name: 'Curse', durationType: 'manual', damagePerRound: '1d6', remaining: undefined })
    setChars(makeChar({ currentHp: 10, activeEffects: [daily, manual] }))
    const rng = queueMathRolls(6)
    useCharacterStore.getState().advanceEffectTime('scenes')

    expect(rng).not.toHaveBeenCalled()
    expect(char().currentHp).toBe(10)
    expect(char().activeEffects).toEqual([daily, manual])
  })

  it('ticks only the effects matching the interval', () => {
    const daily = effect({ name: 'Rot', durationType: 'days', remaining: 2, damagePerRound: '1d6' })
    setChars(makeChar({ currentHp: 10, activeEffects: [daily, poison('1d6', 3)] }))
    queueMathRolls(6, 2)
    useCharacterStore.getState().advanceEffectTime('days')
    // 'days' tick: Rot rolls, Poison (scenes) doesn't.
    expect(char().currentHp).toBe(8)
    expect(char().activeEffects.map(e => [e.name, e.remaining])).toEqual([['Rot', 1], ['Poison', 3]])
  })

  it('removes effects that reach 0 remaining and logs their expiry', () => {
    setChars(makeChar({ currentHp: 10, activeEffects: [effect({ name: 'Blinded', remaining: 1 }), effect({ name: 'Slowed', remaining: 2 })] }))
    useCharacterStore.getState().advanceEffectTime('scenes')
    expect(char().activeEffects.map(e => e.name)).toEqual(['Slowed'])
    expect(log).toHaveBeenCalledWith('effect-expired', '✨ Blinded on Steve expired.')
  })

  it('still applies the final tick of an expiring effect', () => {
    setChars(makeChar({ currentHp: 10, activeEffects: [poison('1d6', 1)] }))
    queueMathRolls(6, 3)
    useCharacterStore.getState().advanceEffectTime('scenes')
    expect(char().currentHp).toBe(7)
    expect(char().activeEffects).toEqual([])
  })

  it('persists the result to campaign data', () => {
    setChars(makeChar({ activeEffects: [poison()] }))
    queueMathRolls(6, 1)
    useCharacterStore.getState().advanceEffectTime('scenes')
    expect(updateCampaignData).toHaveBeenCalledWith({ characters: useCharacterStore.getState().characters, xpLog: [] })
  })

  describe('death resolution when a tick drops HP to 0', () => {
    it('keeps a character with SD left alive at 0 HP (they may Avoid Death)', () => {
      setChars(makeChar({ currentHp: 2, currentSd: 3, activeEffects: [poison()] }))
      queueMathRolls(6, 6)
      useCharacterStore.getState().advanceEffectTime('scenes')
      expect(char().currentHp).toBe(0)
      expect(char().isDead).toBeFalsy()
    })

    it('ejects a character in the Tower of Trials with 1 HP', () => {
      setChars(makeChar({ currentHp: 2, currentSd: 0, inTower: true, activeEffects: [poison()] }))
      queueMathRolls(6, 6)
      useCharacterStore.getState().advanceEffectTime('scenes')
      expect(char().currentHp).toBe(1)
      expect(char().inTower).toBe(false)
      expect(char().isDead).toBeFalsy()
      expect(log).toHaveBeenCalledWith('character-move', expect.stringContaining('ejected from the Tower of Trials'))
    })

    it('kills a character with no SD outside the Tower', () => {
      setChars(makeChar({ currentHp: 2, currentSd: 0, activeEffects: [poison()] }))
      queueMathRolls(6, 6)
      useCharacterStore.getState().advanceEffectTime('scenes')
      expect(char().currentHp).toBe(0)
      expect(char().isDead).toBe(true)
      expect(log).toHaveBeenCalledWith('character-move', expect.stringContaining('has fallen'))
    })

    it('only resolves characters this tick dropped, not ones already at 0', () => {
      // Already at 0 with SD 0 (e.g. mid Avoid-Death decision) — no damage tick,
      // so nothing new should happen to them.
      setChars(makeChar({ currentHp: 0, currentSd: 0, activeEffects: [effect({ name: 'Slowed' })] }))
      useCharacterStore.getState().advanceEffectTime('scenes')
      expect(char().isDead).toBeFalsy()
    })

    it('resolves each dropped character independently', () => {
      setChars(
        makeChar({ id: 'a', name: 'A', currentHp: 1, currentSd: 0, activeEffects: [poison()] }),
        makeChar({ id: 'b', name: 'B', currentHp: 1, currentSd: 0, inTower: true, activeEffects: [poison()] }),
        makeChar({ id: 'c', name: 'C', currentHp: 1, currentSd: 1, activeEffects: [poison()] }),
      )
      queueMathRolls(6, 3, 3, 3)
      useCharacterStore.getState().advanceEffectTime('scenes')
      expect(char('a').isDead).toBe(true)
      expect(char('b')).toMatchObject({ currentHp: 1, inTower: false })
      expect(char('b').isDead).toBeFalsy()
      expect(char('c')).toMatchObject({ currentHp: 0 })
      expect(char('c').isDead).toBeFalsy()
    })
  })
})

describe('addEffect', () => {
  it('drains SD to 0 when Withering is applied', () => {
    setChars(makeChar({ currentSd: 5 }))
    useCharacterStore.getState().addEffect('c1', { name: 'Withering', durationType: 'manual', damagePerRound: '1d4' })
    expect(char().currentSd).toBe(0)
    expect(char().activeEffects).toHaveLength(1)
    expect(char().activeEffects[0]).toMatchObject({ name: 'Withering', damagePerRound: '1d4' })
    expect(char().activeEffects[0].id).toEqual(expect.any(String))
    expect(log).toHaveBeenCalledWith('effect-applied', expect.stringContaining('SD drained to 0'))
  })

  it('matches Withering case-insensitively', () => {
    setChars(makeChar({ currentSd: 4 }))
    useCharacterStore.getState().addEffect('c1', { name: 'curse of withering', durationType: 'manual' })
    expect(char().currentSd).toBe(0)
  })

  it('leaves SD alone for other effects', () => {
    setChars(makeChar({ currentSd: 5 }))
    useCharacterStore.getState().addEffect('c1', { name: 'Poison', durationType: 'scenes', remaining: 3, damagePerRound: '1d6' })
    expect(char().currentSd).toBe(5)
    expect(char().activeEffects.map(e => e.name)).toEqual(['Poison'])
    expect(log).toHaveBeenCalledWith('effect-applied', '🧪 Poison applied to Steve (3 scenes).')
  })

  it('only touches the target character', () => {
    setChars(makeChar({ id: 'a', currentSd: 5 }), makeChar({ id: 'b', currentSd: 5 }))
    useCharacterStore.getState().addEffect('a', { name: 'Withering', durationType: 'manual' })
    expect(char('a').currentSd).toBe(0)
    expect(char('b').currentSd).toBe(5)
    expect(char('b').activeEffects).toEqual([])
  })
})
