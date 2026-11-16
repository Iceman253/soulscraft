// Choices offered when proposing a new skill at level-up.
import type { CombatRole, StatusEffectTarget, EffectDuration } from '../../types'

export const ALL_ROLES: { role: CombatRole; label: string; hint: string }[] = [
  { role: 'attack',  label: 'Attack',  hint: 'Surfaces when this character is attacking' },
  { role: 'defense', label: 'Defense', hint: 'Surfaces when this character is being attacked' },
  { role: 'general', label: 'General', hint: 'Surfaces on both combat sides + the dice roller' },
  { role: 'utility', label: 'Utility', hint: 'Out-of-combat only (skill checks, social, exploration)' },
]

export const ALL_TARGETS: { target: StatusEffectTarget; label: string }[] = [
  { target: 'self',        label: 'Self' },
  { target: 'target',      label: 'Target' },
  { target: 'ally',        label: 'Ally' },
  { target: 'all-allies',  label: 'All allies' },
]

export const DURATION_OPTIONS: { value: EffectDuration; label: string; needsCount: boolean }[] = [
  { value: 'manual',     label: 'Manual',     needsCount: false },
  { value: 'scenes',     label: 'Scenes',     needsCount: true  },
  { value: 'days',       label: 'Days',       needsCount: true  },
  { value: 'until-rest', label: 'Until rest', needsCount: false },
  { value: 'permanent',  label: 'Permanent',  needsCount: false },
]

// Skill bonus per class at character creation
export const CLASS_SKILL_BONUS: Record<string, 1 | 2 | 3> = {
  Warrior:     1,
  Vindicator:  1,
  Hunter:      2,
  Evoker:      2,
  Delver:      3,
  Wildspeaker: 3,
  Enchanter:   3,
  Tecton:      3,
  Alchemist:   3,
}
