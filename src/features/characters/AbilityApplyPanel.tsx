/**
 * Shared "apply ability/skill" panel used by the Dice Roller and Combat AttackModal.
 *
 * GM-driven: surfaces every applicable Skill, Trait, Class Maneuver/Voice/Evasion,
 * Discipline Edge, and SD-cost Ability for the active character. Clicking an item
 * stages it for the upcoming roll — bonuses sum, special damage effects flag, SD
 * costs queue up, and charges are marked used **only on commit** (when the roll
 * actually happens). Until then, clicking again un-applies the item.
 *
 * The panel itself is a controlled component; parents own the `applied` array and
 * call `commitAppliedModifiers` when the roll fires.
 */

import { useCharacterStore } from './store'
import type { Character } from '../../types'

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
}

// ── Enumeration: what's available for this character + context ─────────
/**
 * Returns every modifier the character could plausibly apply in this context.
 * Filters out spent charges and abilities the character can't afford.
 *
 * We're permissive on context — skills and traits show up everywhere because
 * the manual lets the GM apply them to any thematically-fitting roll.
 */
export function getCharacterModifiers(c: Character, context: ModifierContext): AppliedModifier[] {
  const items: AppliedModifier[] = []

  // ── Skills — always available; one per roll per manual p.5 ─────────
  // (Don't expose on raw damage rolls — damage doesn't take skill bonuses.)
  if (context !== 'damage') {
    c.skills.forEach(s => {
      items.push({
        key: `skill-${s.id}`,
        source: 'skill',
        name: s.name,
        detail: s.description,
        bonus: s.bonus,
        sdCost: 0,
        context,
      })
    })
  }

  // ── Traits — always available; each adds +1 ────────────────────────
  if (context !== 'damage') {
    c.traits.forEach(t => {
      items.push({
        key: `trait-${t.id}`,
        source: 'trait',
        name: t.name,
        detail: t.description,
        bonus: 1,
        sdCost: 0,
        context,
      })
    })
  }

  // ── Class features (maneuvers / voices / evasions) ─────────────────
  const fs = c.classFeatureState

  if (fs.class === 'Warrior') {
    fs.state.maneuvers.forEach(m => {
      if (m.used) return
      // Mechanical mapping per Soulscraft 3.1e manual pp.37–38:
      //  - Charge        → positional "cross Far distance, knock aside" — no roll bonus,
      //                    no damage mod; declared at attack time. Marks used.
      //  - Hold Ground   → positional defensive stance "creatures cannot pass within Reach";
      //                    no automatic damage reduction. Declared on defender's side. Marks used.
      //  - Deadly Strike → "double the damage dealt"; declared before rolling damage.
      let bonus = 0
      let damageMod: AppliedModifier['damageMod']
      let preferredContext: ModifierContext = 'general'

      if (m.id === 'charge')        { preferredContext = 'attack'  /* purely positional */ }
      if (m.id === 'hold-ground')   { preferredContext = 'defense' /* purely positional */ }
      if (m.id === 'deadly-strike') { damageMod = 'double'; preferredContext = 'attack' }

      // Strict context match — Charge / Deadly Strike never appear on the defender side,
      // Hold Ground never appears on the attacker side, etc.
      if (context !== 'general' && context !== preferredContext) return

      items.push({
        key: `maneuver-${m.id}`,
        source: 'maneuver',
        name: m.name,
        detail: m.description,
        bonus,
        sdCost: 0,
        chargeKind: 'maneuver',
        chargeId: m.id,
        damageMod,
        context: preferredContext,
      })
    })
  }

  if (fs.class === 'Vindicator') {
    // Voices are purely social (Charm / Persuade / Intimidate / Deceive) — only surface
    // them in 'general' (the freeform Dice Roller). They never appear in attack/defense/damage.
    if (context === 'general') {
      fs.state.voices.forEach(v => {
        if (v.used) return
        items.push({
          key: `voice-${v.id}`,
          source: 'voice',
          name: v.name,
          detail: v.description,
          bonus: 2,
          sdCost: 0,
          chargeKind: 'voice',
          chargeId: v.id,
          context: 'general',
        })
      })
    }
  }

  if (fs.class === 'Delver') {
    // Evasions are defensive reactions
    fs.state.evasions.forEach(e => {
      if (e.used) return
      let damageMod: AppliedModifier['damageMod']
      if (e.id === 'dodge')    damageMod = 'no-damage'
      if (e.id === 'block')    damageMod = 'half-incoming'
      if (e.id === 'redirect') damageMod = 'half-incoming'
      if (context !== 'general' && context !== 'defense') return
      items.push({
        key: `evasion-${e.id}`,
        source: 'evasion',
        name: e.name,
        detail: e.description,
        bonus: 0,
        sdCost: 0,
        chargeKind: 'evasion',
        chargeId: e.id,
        damageMod,
        context: 'defense',
      })
    })
  }

  // ── Discipline Edge — single per-rest charge ───────────────────────
  // Free-form effect — we treat it as a +1 (GM decides how it shapes the roll).
  if (c.disciplineEdge && c.disciplineEdge.name && !c.disciplineEdge.used) {
    items.push({
      key: 'edge',
      source: 'edge',
      name: `${c.disciplineEdge.name} (Edge)`,
      detail: c.disciplineEdge.description,
      bonus: 1,
      sdCost: 0,
      chargeKind: 'edge',
      context,
    })
  }

  // ── SD-cost abilities — filtered by their declared combatRole ─────
  // - 'attack'  : attacker-side panel only
  // - 'defense' : defender-side panel only
  // - 'general' : both attacker and defender panels (combat-applicable utility)
  // - 'utility' : Dice Roller's 'general' context only — NEVER in attack/defense/damage
  //   Abilities with no combatRole default to 'utility' (safest — they only show outside combat).
  c.abilities.forEach(a => {
    if (a.sdCost > c.currentSd) return  // can't afford
    if (a.sdCost === 0) return          // no charge to track for free abilities

    const role = a.combatRole ?? 'utility'
    const allowed =
      context === 'general'                                                                 ? true
      : context === 'attack'                                                                ? (role === 'attack'  || role === 'general')
      : context === 'defense'                                                               ? (role === 'defense' || role === 'general')
      : /* context === 'damage' */                                                            false
    if (!allowed) return

    items.push({
      key: `ability-${a.id}`,
      source: 'ability',
      name: a.name,
      detail: a.description,
      bonus: 0,
      sdCost: a.sdCost,
      context,
    })
  })

  return items
}

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
 * Commits all applied modifiers — marks charges used, deducts SD, logs to session log.
 * Call this once when the actual roll/attack is executed.
 */
export function commitAppliedModifiers(characterId: string, applied: AppliedModifier[]) {
  const store = useCharacterStore.getState()
  const character = store.characters.find(c => c.id === characterId)
  if (!character) return

  applied.forEach(mod => {
    if (mod.sdCost > 0) {
      store.adjustSd(characterId, -mod.sdCost)
    }
    if (mod.chargeKind === 'maneuver' || mod.chargeKind === 'voice' || mod.chargeKind === 'evasion') {
      if (mod.chargeId) store.useRestCharge(characterId, mod.chargeId)
    }
    if (mod.chargeKind === 'edge') {
      store.setEdgeUsed(characterId, true)
    }
  })
}

// ── Component ──────────────────────────────────────────────────────────
interface AbilityApplyPanelProps {
  character: Character
  context: ModifierContext
  applied: AppliedModifier[]
  onApplied: (next: AppliedModifier[]) => void
  /** Collapse by default to save space. */
  initiallyOpen?: boolean
  /** Optional override title. */
  title?: string
}

export function AbilityApplyPanel({
  character: c,
  context,
  applied,
  onApplied,
  title,
}: AbilityApplyPanelProps) {
  const available = getCharacterModifiers(c, context)
  if (available.length === 0) return null

  // Group by source for clean section headers
  const groups: Array<{ label: string; items: AppliedModifier[] }> = [
    { label: 'Skills',     items: available.filter(m => m.source === 'skill')   },
    { label: 'Traits',     items: available.filter(m => m.source === 'trait')   },
    { label: 'Maneuvers',  items: available.filter(m => m.source === 'maneuver')},
    { label: 'Voices',     items: available.filter(m => m.source === 'voice')   },
    { label: 'Evasions',   items: available.filter(m => m.source === 'evasion') },
    { label: 'Edge',       items: available.filter(m => m.source === 'edge')    },
    { label: 'Abilities',  items: available.filter(m => m.source === 'ability') },
  ].filter(g => g.items.length > 0)

  const appliedKeys = new Set(applied.map(a => a.key))

  const toggle = (mod: AppliedModifier) => {
    if (appliedKeys.has(mod.key)) {
      onApplied(applied.filter(a => a.key !== mod.key))
      return
    }
    // Manual p.5: only one Skill per roll. Replace existing skill.
    if (mod.source === 'skill') {
      onApplied([...applied.filter(a => a.source !== 'skill'), mod])
      return
    }
    onApplied([...applied, mod])
  }

  // Styling by source
  const colorFor = (src: AppliedModifier['source'], isOn: boolean) => {
    if (!isOn) return 'bg-stone-700/60 border-stone-600 text-stone-300 hover:border-stone-400 hover:text-stone-100'
    switch (src) {
      case 'skill':    return 'bg-blue-900/40 border-blue-500/70 text-blue-200'
      case 'trait':    return 'bg-teal-900/40 border-teal-500/70 text-teal-200'
      case 'maneuver': return 'bg-redstone/30 border-redstone/70 text-red-200'
      case 'voice':    return 'bg-purple-900/40 border-purple-500/70 text-purple-200'
      case 'evasion':  return 'bg-emerald/20 border-emerald/70 text-emerald'
      case 'edge':     return 'bg-gold/20 border-gold/70 text-gold'
      case 'ability':  return 'bg-amber-900/40 border-amber-500/70 text-amber-200'
    }
  }

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900/50">
      <div className="px-3 py-1.5 border-b border-stone-700 text-xs font-heading uppercase tracking-wider text-stone-300">
        {title ?? 'Apply Ability / Skill'}
        {applied.length > 0 && (
          <span className="ml-2 text-gold normal-case tracking-normal">
            ({applied.length} staged · {totalBonus(applied) >= 0 ? `+${totalBonus(applied)}` : totalBonus(applied)}
            {totalSdCost(applied) > 0 ? ` · −${totalSdCost(applied)} SD` : ''})
          </span>
        )}
      </div>

      <div className="p-2 space-y-2">
        {groups.map(g => (
          <div key={g.label}>
            <div className="text-[10px] uppercase tracking-wider text-stone-400 mb-1 font-heading">{g.label}</div>
            <div className="flex flex-wrap gap-1.5">
              {g.items.map(mod => {
                const isOn = appliedKeys.has(mod.key)
                const bonusLabel = mod.bonus !== 0
                  ? ` ${mod.bonus > 0 ? `+${mod.bonus}` : mod.bonus}`
                  : ''
                const sdLabel = mod.sdCost > 0 ? ` · ${mod.sdCost}SD` : ''
                const modLabel = mod.damageMod === 'double'        ? ' · ×2 dmg'
                              : mod.damageMod === 'half-incoming' ? ' · ½ incoming'
                              : mod.damageMod === 'no-damage'     ? ' · no dmg'
                              : ''
                return (
                  <button
                    key={mod.key}
                    type="button"
                    onClick={() => toggle(mod)}
                    title={mod.detail ?? ''}
                    className={`px-2 py-1 rounded border text-xs font-medium transition-colors ${colorFor(mod.source, isOn)}`}
                  >
                    {isOn ? '✓ ' : ''}{mod.name}
                    <span className="font-mono tabular-nums">{bonusLabel}{sdLabel}</span>
                    <span className="opacity-80">{modLabel}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        <div className="text-[10px] text-stone-500 italic pt-1">
          Tap to stage · tap again to remove. Marks charges used &amp; spends SD only when the roll fires.
        </div>
      </div>
    </div>
  )
}
