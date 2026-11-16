import type { AppliedStatusEffectSpec, CombatRole, PlayerRequest } from '../../types'
import type { LevelUpInitialState } from '../characters/LevelUpModal'

/** A character's level-up proposal waiting on the GM, and the newest one the GM
 *  denied (shown with a retry while nothing is pending). */
export function skillApprovalStatus(requests: PlayerRequest[], characterId: string | undefined) {
  if (!characterId) return { pending: undefined, denied: undefined }
  const mine = requests.filter(r => r.type === 'skill-approval' && r.characterId === characterId)
  return {
    pending: mine.find(r => r.status === 'pending'),
    denied: mine.filter(r => r.status === 'denied').sort((a, b) => b.createdAt - a.createdAt)[0],
  }
}

/** Pre-fill the level-up modal from a denied proposal so the player adjusts it
 *  instead of starting over. Payload fields of the wrong type are ignored. */
export function levelUpInitialFrom(payload: PlayerRequest['payload']): LevelUpInitialState {
  return {
    abilityName: typeof payload.abilityName === 'string' ? payload.abilityName : null,
    skillName: typeof payload.skillName === 'string' ? payload.skillName : '',
    skillDescription: typeof payload.skillDescription === 'string' ? payload.skillDescription : '',
    skillRoles: Array.isArray(payload.skillCombatRoles) ? payload.skillCombatRoles as CombatRole[] : ['general'],
    skillEffects: Array.isArray(payload.skillAppliedEffects) ? payload.skillAppliedEffects as AppliedStatusEffectSpec[] : [],
  }
}
