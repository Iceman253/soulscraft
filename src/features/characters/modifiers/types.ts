// A staged skill, trait, maneuver, Edge or ability, and what committing it returns.
import type { AppliedStatusEffectSpec } from '../../../types'

// ── Types ──────────────────────────────────────────────────────────────
export type ModifierContext = 'general' | 'attack' | 'damage' | 'defense'

export type ChargeKind = 'maneuver' | 'voice' | 'evasion' | 'edge'

/** A staged modifier, ready to be committed on the next roll. */
export interface AppliedModifier {
  /** Unique key — used to detect duplicates and toggle off. */
  key: string
  source: 'skill' | 'trait' | 'maneuver' | 'voice' | 'evasion' | 'edge' | 'ability'
  /** Short display name. */
  name: string
  /** Optional clarifying tooltip / description. */
  detail?: string
  /** Additive bonus to the roll total. Always integer (positive or negative). */
  bonus: number
  /** SD to spend on commit. */
  sdCost: number
  /** Identifies the per-rest charge to mark used on commit. */
  chargeKind?: ChargeKind
  chargeId?: string
  /** Special damage-roll modifier (only meaningful when context === 'damage'). */
  damageMod?: 'double' | 'half-incoming' | 'no-damage'
  /** Where this modifier is intended to apply. Used for filtering. */
  context: ModifierContext
  /** Status effects to auto-apply on commit (skills and abilities can carry these). */
  appliedEffects?: AppliedStatusEffectSpec[]
}

/** Effects that need to be routed by the caller after commit (target/ally). */
export interface CommitResult {
  /** Status effects whose target requires combat context to resolve. */
  pendingTargetEffects: AppliedStatusEffectSpec[]
  pendingAllyEffects: AppliedStatusEffectSpec[]
}
