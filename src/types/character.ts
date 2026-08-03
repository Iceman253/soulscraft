import type { ArmorLoadout, WeaponLoadout } from './gear'

// ── Class Feature State ────────────────────────────────────────────────
export interface RestCharge {
  id: string
  name: string
  description?: string
  used: boolean
}

export interface WarriorState { maneuvers: RestCharge[] }
export interface HunterState  { preyType: string | null }

export interface VindicatorState {
  voices: RestCharge[]
  activeCause: string
}

export interface EnchanterState {
  tomeEntries: string[]   // list of active sign names
  lapisCount: number
  magicCircleActive: boolean
}

export interface DelverState {
  evasions: RestCharge[]
  relicActivations: number
}

export type PrimalForce = 'Earth' | 'Fire' | 'Water' | 'Air' | 'Ice' | 'Plant-life' | 'Rot'
export type TetherBonus = '+5 max HP' | '+1 action rolls' | '+1 damage rolls'
export interface TetherSlot { force: PrimalForce | null; bonus: TetherBonus | null }
export interface WildspeakerState {
  tethers: [TetherSlot, TetherSlot]
  beastshaperUsed: boolean
  shamanUsed: boolean
}

export type WardType = 'Burning' | 'Drowning' | 'Bludgeoning' | 'Withering' | 'Poison' | 'Bleeding'
export interface SummonedUnit { id: string; label: string }
export interface EvokerState {
  wardType: WardType | null
  vex: SummonedUnit[]
  fangs: SummonedUnit[]
  soulmenderUsed: boolean
  reaperUsed: boolean
  soulAnchorUsed: boolean
}

export interface TectonState {
  instantCraftsRemaining: number
  mechanistCharges: number
}

export interface EssenceInventory {
  vitality: number
  transformation: number
  element: number
  sense: number
  decay: number
}
export interface AlchemistState { essences: EssenceInventory }

export type ClassFeatureState =
  | { class: 'Warrior';     state: WarriorState }
  | { class: 'Hunter';      state: HunterState }
  | { class: 'Vindicator';  state: VindicatorState }
  | { class: 'Enchanter';   state: EnchanterState }
  | { class: 'Delver';      state: DelverState }
  | { class: 'Wildspeaker'; state: WildspeakerState }
  | { class: 'Evoker';      state: EvokerState }
  | { class: 'Tecton';      state: TectonState }
  | { class: 'Alchemist';   state: AlchemistState }
  | { class: 'custom';      state: null }

export interface DisciplineEdge {
  name: string
  description: string
  used: boolean
  /** Where this Edge surfaces in the AbilityApplyPanel. Same semantics as
   *  Ability.combatRoles (strict). Defaults to ['general'] if omitted —
   *  Edges fall back to dice-roller-only for unknown disciplines. */
  combatRoles?: CombatRole[]
  /** Status effects this Edge auto-applies when staged. */
  appliedEffects?: AppliedStatusEffectSpec[]
}

// ── Characters ─────────────────────────────────────────────────────────
export interface Currency {
  copper: number
  iron: number
  gold: number
  emeralds: number
  diamonds: number
}

export interface CharacterItem {
  id: string
  name: string
  customName?: string        // player's personal label (e.g. "My Lucky Sword")
  quantity: number
  description?: string
  isBlock?: boolean
  gearSlot?: 'mainHand' | 'offHand' | 'armor' | 'shield'
}

export interface InventorySection { items: CharacterItem[] }

export type EffectDuration = 'scenes' | 'days' | 'until-rest' | 'permanent' | 'manual'

/** Where an ability/skill is contextually relevant in combat.
 *  See lib/classAbilities.ts for canonical definition. */
export type CombatRole = 'attack' | 'defense' | 'general' | 'utility'

/** Who an auto-applied status effect lands on when an ability/skill commits. */
export type StatusEffectTarget = 'self' | 'target' | 'ally' | 'all-allies'

/** Declares a status effect that an ability or skill applies on use.
 *  Effect name must match a STATUS_EFFECTS[].name (see features/combat/statusEffects.ts). */
export interface AppliedStatusEffectSpec {
  effectName: string
  target: StatusEffectTarget
  /** Defaults to 'manual' (GM removes when appropriate) if omitted. */
  durationType?: EffectDuration
  /** Scene/day count when durationType is 'scenes' or 'days'. */
  remaining?: number
  /** If true, only apply when the parent roll succeeds (total ≥ 10). */
  onSuccess?: boolean
}

export interface Skill {
  id: string
  name: string
  bonus: 1 | 2 | 3
  description?: string
  /** Combat contexts where this skill surfaces in the AbilityApplyPanel.
   *  Multi-select; empty/omitted = ['general','utility'] (works everywhere outside combat). */
  combatRoles?: CombatRole[]
  /** Status effects this skill auto-applies when staged & committed. */
  appliedEffects?: AppliedStatusEffectSpec[]
}

export interface Trait {
  id: string
  name: string
  description: string
  /** Where this trait surfaces in the AbilityApplyPanel. Strict — see CombatRole.
   *  Defaults to ['general'] (dice roller only) if omitted. */
  combatRoles?: CombatRole[]
}

export interface Ability {
  id: string
  name: string
  description: string
  sdCost: number
  recharge: 'rest' | 'scene' | 'day' | 'none'
  materials?: string
  /** @deprecated Use combatRoles (array). Kept for migration; treated as `[combatRole]`. */
  combatRole?: CombatRole
  /** Combat applicability — multi-select. Strict filtering:
   *  - 'attack'  → attacker panel only
   *  - 'defense' → defender panel only
   *  - 'general' → dice roller only (NOT shown in combat panels)
   *  - 'utility' → dice roller only
   *  An ability that works in both combat sides should be `['attack','defense']`. */
  combatRoles?: CombatRole[]
  /** Status effects this ability auto-applies on commit. */
  appliedEffects?: AppliedStatusEffectSpec[]
}

export interface ActiveEffect {
  id: string
  name: string
  description?: string
  durationType: EffectDuration
  remaining?: number
  damagePerRound?: string  // e.g. '1d6' — applied automatically at start of each turn
}

export interface Character {
  id: string
  name: string
  species: string
  variant: string
  class: string
  discipline: string
  level: number
  maxHp: number
  currentHp: number
  maxSd: number
  currentSd: number
  xp: number
  damageDie: string
  classFeatureState: ClassFeatureState
  disciplineEdge: DisciplineEdge
  armorLoadout: ArmorLoadout
  weaponLoadout: WeaponLoadout
  skills: Skill[]
  traits: Trait[]
  abilities: Ability[]
  activeEffects: ActiveEffect[]
  missedRests: number
  locationId: string | null
  subLocationId: string | null
  currency: Currency
  onHand: InventorySection
  storage: InventorySection
  rations: number
  notes: string
  // Death state (rulebook p.74)
  isDead?: boolean    // character has died (HP 0, SD 0)
  isGhost?: boolean   // in ghost mode during Tower of Trials attempt
  /** Inside the Tower of Trials: cannot die — reaching 0 HP with no SD ejects
   *  them with 1 HP instead. Auto-set when the GM drags their token onto the
   *  Tower location; the player can still spend SD to keep going first. */
  inTower?: boolean
}
