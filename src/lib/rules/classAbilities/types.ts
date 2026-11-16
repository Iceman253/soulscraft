import type { AppliedStatusEffectSpec } from '../../../types'

/** Where an ability is contextually relevant in combat.
 *  - 'attack' : ONLY appears in the attacker panel (boosts/enables attacks, damage mods).
 *  - 'defense': ONLY appears in the defender panel (DEF buffs, evasion, damage mitigation).
 *  - 'general': appears in both attack AND defense panels (combat-applicable utility).
 *  - 'utility': non-combat — only surfaces in the freeform Dice Roller, never in AttackModal
 *               (informational queries, exploration, social, crafting). */
export type CombatRole = 'attack' | 'defense' | 'general' | 'utility'

export interface ClassAbility {
  name: string
  sdCost: number
  hpCostAlt?: number     // Evoker abilities cost "1 SD OR X HP" — set this for them
  description: string
  tier: 'level1' | 'levelUp'  // level1 = starting abilities; levelUp = choose on level-up
  requiresRoll?: boolean  // true if the ability says "Roll to succeed"
  /** @deprecated Use combatRoles. Kept for legacy data. */
  combatRole?: CombatRole
  /** Where this ability surfaces. Strict filtering — see Ability.combatRoles for semantics.
   *  Defaults to ['utility'] if both fields omitted. */
  combatRoles?: CombatRole[]
  /** Status effects this ability auto-applies on commit. */
  appliedEffects?: AppliedStatusEffectSpec[]
}
