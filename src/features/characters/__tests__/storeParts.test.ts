import { describe, it, expect, afterEach, vi } from 'vitest'
import { makeChar } from '../../../test/fixtures'
import { queueMathRolls } from '../../../test/rng'
import type { ActiveEffect, ClassFeatureState, GearEnchantment } from '../../../types'

vi.mock('../../campaigns/store', () => ({ useCampaignStore: { getState: () => ({ updateCampaignData: vi.fn() }) } }))
vi.mock('../../log/store', () => ({ log: vi.fn() }))

import { tickEffects } from '../store/effects'
import { countDownEnchantments } from '../store/gear'
import { resetClassState } from '../store/classFeatures'

afterEach(() => vi.restoreAllMocks())

const effect = (over: Partial<ActiveEffect>): ActiveEffect =>
  ({ id: 'e', name: 'Poison', durationType: 'scenes', remaining: 2, ...over })

describe('tickEffects', () => {
  it('rolls damage, counts down, and keeps an effect with time left', () => {
    queueMathRolls(6, 4)
    const c = makeChar({ activeEffects: [effect({ damagePerRound: '1d6' })] })
    const { character, expired, logs } = tickEffects(c, 'scenes')
    expect(character.currentHp).toBe(6)
    expect(character.activeEffects[0].remaining).toBe(1)
    expect(expired).toEqual([])
    expect(logs).toEqual(['🩸 Steve takes 4 damage from Poison (1d6).'])
  })

  it('expires an effect on its last tick', () => {
    const c = makeChar({ activeEffects: [effect({ remaining: 1 })] })
    const { character, expired } = tickEffects(c, 'scenes')
    expect(character.activeEffects).toEqual([])
    expect(expired).toEqual(['Poison on Steve'])
  })

  it('leaves effects on the other clock alone', () => {
    const c = makeChar({ activeEffects: [effect({ durationType: 'days', damagePerRound: '1d6' })] })
    const { character } = tickEffects(c, 'scenes')
    expect(character.currentHp).toBe(10)
    expect(character.activeEffects[0].remaining).toBe(2)
  })

  it('heals up to max HP after damage', () => {
    queueMathRolls(6, 6)
    const c = makeChar({ currentHp: 7, activeEffects: [effect({ name: 'Regeneration', healPerRound: '1d6' })] })
    const { character, logs } = tickEffects(c, 'scenes')
    expect(character.currentHp).toBe(10)
    expect(logs).toEqual(['💚 Steve regenerates 3 HP.'])
  })

  it('does not heal someone the same tick dropped to 0', () => {
    queueMathRolls(6, 6, 6)
    const c = makeChar({ currentHp: 3, activeEffects: [
      effect({ id: 'p', damagePerRound: '1d6' }),
      effect({ id: 'r', name: 'Regeneration', healPerRound: '1d6' }),
    ] })
    expect(tickEffects(c, 'scenes').character.currentHp).toBe(0)
  })

  it('changes no HP for the dead, but still runs their timers down', () => {
    const roll = vi.spyOn(Math, 'random')
    const c = makeChar({ isDead: true, currentHp: 0, activeEffects: [effect({ damagePerRound: '1d6', healPerRound: '1d6' })] })
    const { character } = tickEffects(c, 'scenes')
    expect(roll).not.toHaveBeenCalled()
    expect(character.currentHp).toBe(0)
    expect(character.activeEffects[0].remaining).toBe(1)
  })
})

describe('countDownEnchantments', () => {
  const enc = (over: Partial<GearEnchantment>): GearEnchantment => ({ id: 'x', name: 'Sharpness', durationType: 'scenes', remaining: 2, ...over })

  it('counts down only enchantments on this clock and reports the ones that end', () => {
    const ended: string[] = []
    const out = countDownEnchantments([
      enc({ id: 'a', remaining: 2 }),
      enc({ id: 'b', name: 'Fire Aspect', remaining: 1 }),
      enc({ id: 'c', durationType: 'days', remaining: 1 }),
      enc({ id: 'd', durationType: 'permanent', remaining: undefined }),
    ], 'scenes', name => ended.push(name))
    expect(out.map(e => [e.id, e.remaining])).toEqual([['a', 1], ['c', 1], ['d', undefined]])
    expect(ended).toEqual(['Fire Aspect'])
  })
})

describe('resetClassState', () => {
  it('refreshes Warrior maneuvers', () => {
    const fs: ClassFeatureState = { class: 'Warrior', state: { maneuvers: [{ id: 'm', name: 'Cleave', used: true }] } }
    const out = resetClassState(fs)
    expect(out.class === 'Warrior' && out.state.maneuvers[0].used).toBe(false)
  })

  it('restores Tecton charges to their rest values', () => {
    const fs: ClassFeatureState = { class: 'Tecton', state: { instantCraftsRemaining: 0, mechanistCharges: 0 } }
    expect(resetClassState(fs)).toEqual({ class: 'Tecton', state: { instantCraftsRemaining: 3, mechanistCharges: 2 } })
  })

  it('leaves Enchanter state alone (their reset is at day end)', () => {
    const fs: ClassFeatureState = { class: 'Enchanter', state: { tomeEntries: [], lapisCount: 2, magicCircleActive: true } }
    expect(resetClassState(fs)).toBe(fs)
  })
})
