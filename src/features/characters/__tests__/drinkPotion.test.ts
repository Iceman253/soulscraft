import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { makeChar } from '../../../test/fixtures'
import { queueMathRolls } from '../../../test/rng'
import type { CharacterItem } from '../../../types'

vi.mock('../../campaigns/store', () => ({ useCampaignStore: { getState: () => ({ updateCampaignData: vi.fn() }) } }))
vi.mock('../../log/store', () => ({ log: vi.fn() }))

import { useCharacterStore } from '../store'
import { drinkPotion, drinkOngoingPotion } from '../drinkPotion'

const char = () => useCharacterStore.getState().characters[0]
const item = (name: string, quantity = 1): CharacterItem => ({ id: 'p', name, quantity })

beforeEach(() => {
  useCharacterStore.setState({ characters: [makeChar({ currentHp: 3, currentSd: 4 })], xpLog: [] })
})
afterEach(() => vi.restoreAllMocks())

const hold = (it: CharacterItem) =>
  useCharacterStore.setState({ characters: [{ ...char(), onHand: { items: [it] } }] })

describe('drinkPotion', () => {
  it('heals 2d6 and uses up the last potion', () => {
    hold(item('Potion of Healing'))
    queueMathRolls(6, 2, 3)
    expect(drinkPotion('c1', item('Potion of Healing'))).toEqual({ kind: 'done', message: '🧪 Potion of Healing: healed 5 HP (2d6)' })
    expect(char().currentHp).toBe(8)
    expect(char().onHand.items).toEqual([])
  })

  it('takes one from a stack', () => {
    hold(item('Potion of Harming', 3))
    queueMathRolls(12, 2)
    drinkPotion('c1', item('Potion of Harming', 3))
    expect(char().currentHp).toBe(1)
    expect(char().onHand.items[0].quantity).toBe(2)
  })

  it('asks for a duration before drinking an ongoing potion, and uses nothing yet', () => {
    hold(item('Potion of Swiftness'))
    expect(drinkPotion('c1', item('Potion of Swiftness'))).toEqual({ kind: 'choose-duration' })
    expect(char().onHand.items).toHaveLength(1)
  })

  it('refuses something that is not a potion', () => {
    expect(drinkPotion('c1', item('Bread'))).toEqual({ kind: 'not-a-potion' })
  })
})

describe('drinkOngoingPotion', () => {
  it('applies the effect for the chosen scenes', () => {
    hold(item('Potion of Swiftness'))
    expect(drinkOngoingPotion('c1', item('Potion of Swiftness'), 3)).toBe('🧪 Potion of Swiftness: active for 3 scenes')
    expect(char().activeEffects).toEqual([expect.objectContaining({ name: 'Swiftness', durationType: 'scenes', remaining: 3 })])
    expect(char().onHand.items).toEqual([])
  })

  it('drains SD with Wither', () => {
    hold(item('Potion of Wither'))
    drinkOngoingPotion('c1', item('Potion of Wither'), 1)
    expect(char().currentSd).toBe(0)
  })
})
