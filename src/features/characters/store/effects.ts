import type { ActiveEffect, Character } from '../../../types'
import { newId } from '../../../lib/platform/id'
import { log } from '../../log/store'
import { rollDiceSpec } from '../../../lib/rules/dice'
import { committer, resolveDeathAtZero } from './helpers'
import type { CharacterSlice } from './types'

/** Status effects on a character outside combat. */
export interface EffectActions {
  addEffect: (id: string, effect: Omit<ActiveEffect, 'id'>) => void
  removeEffect: (id: string, effectId: string) => void
  /** End of a scene or day: roll damage/healing for effects on that clock, count
   *  them down, and expire the ones that run out. */
  advanceEffectTime: (durationType: 'scenes' | 'days') => void
}

/** One character's effects for one tick. Rolls per-tick damage (Poison,
 *  Withering…) and healing (Regeneration…) for effects on this clock, then counts
 *  them down and drops the expired ones. Only effects still present roll, so a
 *  cured effect never deals damage.
 *
 *  Damage applies before healing; a character this tick dropped to 0 is not
 *  healed (they need death resolution first), and healing caps at max HP. The
 *  dead and ghosts take no HP changes, but their timers still run down. */
export function tickEffects(c: Character, durationType: 'scenes' | 'days'): { character: Character; expired: string[]; logs: string[] } {
  const skipHp = !!c.isDead || !!c.isGhost
  const expired: string[] = []
  const logs: string[] = []
  let damage = 0
  let heal = 0
  const activeEffects = c.activeEffects
    .map(e => {
      if (e.durationType !== durationType || e.remaining == null) return e
      if (!skipHp && e.damagePerRound) {
        const dmg = rollDiceSpec(e.damagePerRound)
        if (dmg > 0) {
          damage += dmg
          logs.push(`🩸 ${c.name} takes ${dmg} damage from ${e.name} (${e.damagePerRound}).`)
        }
      }
      if (!skipHp && e.healPerRound) {
        const amt = rollDiceSpec(e.healPerRound)
        if (amt > 0) heal += amt
      }
      return { ...e, remaining: e.remaining - 1 }
    })
    .filter(e => {
      if (e.durationType === durationType && e.remaining != null && e.remaining <= 0) {
        expired.push(`${e.name} on ${c.name}`)
        return false
      }
      return true
    })

  const afterDamage = Math.max(0, c.currentHp - damage)
  let currentHp = afterDamage
  if (heal > 0 && afterDamage > 0) {
    currentHp = Math.min(c.maxHp, afterDamage + heal)
    const gained = currentHp - afterDamage
    if (gained > 0) logs.push(`💚 ${c.name} regenerates ${gained} HP.`)
  }
  return { character: { ...c, activeEffects, currentHp }, expired, logs }
}

function durationLabel(effect: Omit<ActiveEffect, 'id'>): string {
  if (effect.durationType === 'scenes') return `${effect.remaining} scenes`
  if (effect.durationType === 'days') return `${effect.remaining} days`
  return effect.durationType
}

export const createEffectSlice: CharacterSlice<EffectActions> = (set, get) => {
  const { commit, update } = committer(set, get)
  return {
    addEffect(id, effect) {
      // Withering ("0 Souls Dice until removed") drains SD when applied, the same
      // as in the combat tracker. The GM restores SD when the curse is lifted.
      const isWithering = /wither/i.test(effect.name)
      update(id, c => ({
        ...c,
        activeEffects: [...c.activeEffects, { ...effect, id: newId() }],
        currentSd: isWithering ? 0 : c.currentSd,
      }))
      const char = get().characters.find(c => c.id === id)
      if (char) log('effect-applied', `🧪 ${effect.name} applied to ${char.name} (${durationLabel(effect)})${isWithering ? ' — SD drained to 0' : ''}.`)
    },

    removeEffect(id, effectId) {
      const char = get().characters.find(c => c.id === id)
      const effect = char?.activeEffects.find(e => e.id === effectId)
      update(id, c => ({ ...c, activeEffects: c.activeEffects.filter(e => e.id !== effectId) }))
      if (char && effect) log('effect-expired', `✨ ${effect.name} expired on ${char.name}.`)
    },

    advanceEffectTime(durationType) {
      const before = get().characters
      const expired: string[] = []
      const logs: string[] = []
      let characters = before.map(c => {
        const tick = tickEffects(c, durationType)
        expired.push(...tick.expired)
        logs.push(...tick.logs)
        return tick.character
      })
      // Resolve death / Tower-eject for anyone this tick dropped to 0 HP.
      for (const c of characters) {
        const prev = before.find(x => x.id === c.id)
        if (prev && prev.currentHp > 0 && c.currentHp === 0) {
          const resolved = resolveDeathAtZero(characters, c.id)
          characters = resolved.characters
          if (resolved.message) logs.push(resolved.message)
        }
      }
      commit(characters)
      logs.forEach(l => log('character-move', l))
      expired.forEach(name => log('effect-expired', `✨ ${name} expired.`))
    },
  }
}
