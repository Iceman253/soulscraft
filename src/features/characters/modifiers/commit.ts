// Totals for staged modifiers, and committing them when the roll happens:
// SD is spent and charges are marked used only then.
import { useCharacterStore } from '../store'
import { STATUS_EFFECTS } from '../../combat/statusEffects'
import type { AppliedModifier, CommitResult } from './types'

// ── Helpers for parents ────────────────────────────────────────────────
export function totalBonus(applied: AppliedModifier[]): number {
  return applied.reduce((sum, m) => sum + m.bonus, 0)
}

export function totalSdCost(applied: AppliedModifier[]): number {
  return applied.reduce((sum, m) => sum + m.sdCost, 0)
}

export function hasDamageMod(applied: AppliedModifier[], mod: 'double' | 'half-incoming' | 'no-damage'): boolean {
  return applied.some(m => m.damageMod === mod)
}

/**
 * Commits all applied modifiers — marks charges used, deducts SD, auto-applies
 * any self-targeted status effects, and returns target/ally effects so the caller
 * can route them (e.g. apply to the combat target in CombatTracker, or log a GM hint
 * in the Dice Roller).
 *
 * @param rollSucceeded — true when the parent action roll hit 10+. Required for
 *   gating `onSuccess` effects. Pass `true` for non-rolled commits (e.g. passive
 *   utility abilities that always fire), or the actual success state.
 */
export function commitAppliedModifiers(
  characterId: string,
  applied: AppliedModifier[],
  rollSucceeded: boolean = true,
): CommitResult {
  const store = useCharacterStore.getState()
  const character = store.characters.find(c => c.id === characterId)
  const result: CommitResult = { pendingTargetEffects: [], pendingAllyEffects: [] }
  if (!character) return result

  applied.forEach(mod => {
    // 1. Deduct SD
    if (mod.sdCost > 0) {
      store.adjustSd(characterId, -mod.sdCost)
    }
    // 2. Mark charges used
    if (mod.chargeKind === 'maneuver' || mod.chargeKind === 'voice' || mod.chargeKind === 'evasion') {
      if (mod.chargeId) store.useRestCharge(characterId, mod.chargeId)
    }
    if (mod.chargeKind === 'edge') {
      store.setEdgeUsed(characterId, true)
    }
    // 3. Auto-apply status effects
    ;(mod.appliedEffects ?? []).forEach(spec => {
      if (spec.onSuccess && !rollSucceeded) return  // gated effect failed to trigger

      // Verify the effect name resolves to a known status (catches typos in custom skills)
      const template = STATUS_EFFECTS.find(s => s.name === spec.effectName)
      const description = template?.description
      const damagePerRound = template?.damagePerRound

      if (spec.target === 'self') {
        store.addEffect(characterId, {
          name: spec.effectName,
          description,
          durationType: spec.durationType ?? 'manual',
          remaining: spec.remaining,
          damagePerRound,
        })
      } else if (spec.target === 'target') {
        result.pendingTargetEffects.push(spec)
      } else {
        result.pendingAllyEffects.push(spec)
      }
    })
  })

  return result
}
