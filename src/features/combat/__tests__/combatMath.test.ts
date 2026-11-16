import { describe, it, expect } from 'vitest'
import type { AttackFlow } from '../AttackModal'
import { attackLogLine, attackOutcome, canSplitOnDeath, defenseOutcome, finalDamage, resolveDamage, type DamageInput } from '../combatMath'

const target = (over: Partial<DamageInput['target']> = {}): DamageInput['target'] =>
  ({ def: 1, isTough: false, kind: 'creature', currentHp: 20, activeEffects: [], ...over })
const hit = (over: Partial<DamageInput> = {}): DamageInput => ({
  raw: 6, die: 'd8', defReduction: 0, target: target(),
  attackerDouble: false, defenderHalves: false, defenderNoDamage: false, ...over,
})
const effect = (name: string) => ({ id: name, name, durationType: 'manual' as const })

describe('roll outcomes', () => {
  it('splits attack and defense rolls at 7 and 10', () => {
    expect([6, 7, 9, 10].map(attackOutcome)).toEqual(['failure', 'partial', 'partial', 'success'])
    expect([6, 7, 9, 10].map(defenseOutcome)).toEqual(['hit', 'reduce', 'reduce', 'dodge'])
  })
})

describe('canSplitOnDeath', () => {
  it('splits slimes and magma cubes but not small ones', () => {
    expect(canSplitOnDeath('Slime')).toBe(true)
    expect(canSplitOnDeath('Magma Cube')).toBe(true)
    expect(canSplitOnDeath('Small Slime')).toBe(false)
    expect(canSplitOnDeath('Zombie')).toBe(false)
  })
})

describe('resolveDamage', () => {
  it('takes DEF and a reduced defense off the roll', () => {
    expect(resolveDamage(hit({ defReduction: 1 })).dealt).toBe(4)
  })
  it('never goes below zero', () => {
    expect(resolveDamage(hit({ raw: 1, target: target({ def: 3 }) })).dealt).toBe(0)
  })
  it('doubles for Deadly Strike and Brittle, halves (rounding up) for Absorption and the defender', () => {
    expect(resolveDamage(hit({ attackerDouble: true })).dealt).toBe(10)
    expect(resolveDamage(hit({ target: target({ activeEffects: [effect('Brittle')] }) })).dealt).toBe(10)
    expect(resolveDamage(hit({ raw: 6, target: target({ def: 0, activeEffects: [effect('Absorption')] }), defenderHalves: true })).dealt).toBe(2)
  })
  it('deals nothing to a defender who dodges, and notes why', () => {
    const r = resolveDamage(hit({ defenderNoDamage: true }))
    expect(r.dealt).toBe(0)
    expect(r.instantKill).toBe(false)
    expect(r.effectNote).toBe('[Defender evades]')
  })
  it('kills outright when HP is within the die, except Tough creatures and characters', () => {
    expect(resolveDamage(hit({ target: target({ currentHp: 8 }) })).instantKill).toBe(true)
    expect(resolveDamage(hit({ target: target({ currentHp: 9 }) })).instantKill).toBe(false)
    expect(resolveDamage(hit({ target: target({ currentHp: 3, kind: 'character' }) })).instantKill).toBe(false)
    const tough = resolveDamage(hit({ target: target({ currentHp: 3, isTough: true }) }))
    expect(tough.instantKill).toBe(false)
    expect(tough.effectNote).toBe('[Tough — no instant kill]')
  })
  it('has no note when nothing changed the damage', () => {
    expect(resolveDamage(hit()).effectNote).toBeUndefined()
  })
})

describe('finalDamage', () => {
  const roll = { raw: 6, def: 1, defReduction: 0, dealt: 5, instantKill: false }
  it('knocks 1 off for a damage-reducing complication', () => {
    expect(finalDamage(roll, { reduceDamage: true, note: '' })).toBe(4)
    expect(finalDamage(roll)).toBe(5)
  })
  it('leaves an instant kill alone', () => {
    expect(finalDamage({ ...roll, instantKill: true }, { reduceDamage: true, note: '' })).toBe(5)
  })
})

describe('attackLogLine', () => {
  const attack: AttackFlow = {
    attackerId: 'a', targetId: 't', phase: 'done', skillBonus: 0,
    attackRoll: { d1: 5, d2: 4, total: 9, outcome: 'partial' },
    damageRoll: { raw: 6, def: 1, defReduction: 0, dealt: 5, instantKill: false },
    applied: [{ name: 'Deadly Strike' } as never],
  }
  it('sums up rolls, damage, the complication and abilities used', () => {
    expect(attackLogLine(attack, 'Steve', 'Zombie', { reduceDamage: true, note: 'sword slips' }))
      .toBe('⚔️ Steve → Zombie (roll: 9) → 6−1−1=4 dealt [⚡ Complication: sword slips] [Atk used: Deadly Strike]')
  })
  it('says instant defeat', () => {
    expect(attackLogLine({ ...attack, applied: [], damageRoll: { ...attack.damageRoll!, instantKill: true } }, 'Steve', 'Zombie'))
      .toBe('⚔️ Steve → Zombie (roll: 9) → instant defeat')
  })
})
