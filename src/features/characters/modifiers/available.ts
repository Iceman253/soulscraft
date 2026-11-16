// Every modifier a character could apply to a roll in a given context.
import type { Character, CombatRole } from '../../../types'
import type { ModifierContext, AppliedModifier } from './types'

/** Strict role-matching. A skill/ability surfaces ONLY in contexts whose role tag
 *  it explicitly carries — no permissive fall-through. This is what keeps the
 *  attacker and defender panels visibly different.
 *
 *  Semantics:
 *   - 'attack'  → attacker panel only (combat)
 *   - 'defense' → defender panel only (combat)
 *   - 'general' → dice roller only (out-of-combat catch-all)
 *   - 'utility' → dice roller only
 *  A two-sided ability is tagged `['attack','defense']`. */
function rolesMatchContext(roles: CombatRole[] | undefined, ctx: ModifierContext): boolean {
  if (ctx === 'damage') return false  // damage rolls take no skill/ability bonuses (manual)
  const r = roles && roles.length > 0 ? roles : ['utility']  // unknown defaults to non-combat
  if (ctx === 'general') return r.includes('general') || r.includes('utility')
  if (ctx === 'attack')  return r.includes('attack')
  if (ctx === 'defense') return r.includes('defense')
  return false
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

  // ── Skills — strict role matching. A skill tagged ['attack'] never appears
  //    in the defender panel and vice versa. Manual p.5: one Skill bonus per roll.
  c.skills.forEach(s => {
    if (!rolesMatchContext(s.combatRoles, context)) return
    items.push({
      key: `skill-${s.id}`,
      source: 'skill',
      name: s.name,
      detail: s.description,
      bonus: s.bonus,
      sdCost: 0,
      context,
      appliedEffects: s.appliedEffects,
    })
  })

  // ── Traits — each grants +1 when narratively applicable. Traits are
  //    species-flavor by default but many have clear combat applicability
  //    (e.g. Thick Skin → defense, Strong → attack). Surface based on the
  //    trait's tagged combatRoles; default to ['general'] if untagged.
  c.traits.forEach(t => {
    const traitRoles: CombatRole[] = t.combatRoles && t.combatRoles.length > 0 ? t.combatRoles : ['general']
    if (!rolesMatchContext(traitRoles, context)) return
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
      const bonus = 0
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

  // ── Discipline Edge — single per-rest charge. Each Edge is tagged with the
  //    combat side(s) it actually applies to (e.g. Mercenary Edge → 'attack',
  //    Soldier Edge → 'defense'). Free-form effect; we model the bonus as +1
  //    (GM decides the narrative shape).
  if (c.disciplineEdge && c.disciplineEdge.name && !c.disciplineEdge.used) {
    const edgeRoles: CombatRole[] = c.disciplineEdge.combatRoles && c.disciplineEdge.combatRoles.length > 0
      ? c.disciplineEdge.combatRoles
      : ['general']
    if (rolesMatchContext(edgeRoles, context)) {
      items.push({
        key: 'edge',
        source: 'edge',
        name: `${c.disciplineEdge.name} (Edge)`,
        detail: c.disciplineEdge.description,
        bonus: 1,
        sdCost: 0,
        chargeKind: 'edge',
        context,
        appliedEffects: c.disciplineEdge.appliedEffects,
      })
    }
  }

  // ── SD-cost abilities — strict role matching. An ability tagged 'attack'
  //    NEVER appears in the defender panel, and vice versa. An ability that
  //    works in both sides must be tagged `['attack','defense']`. 'general'
  //    means "dice roller only".
  c.abilities.forEach(a => {
    if (a.sdCost > c.currentSd) return  // can't afford
    if (a.sdCost === 0) return          // free abilities have no commit cost; skip charge UI

    // Resolve role tags — prefer the multi-select; fall back to legacy single.
    const roles: CombatRole[] = a.combatRoles && a.combatRoles.length > 0
      ? a.combatRoles
      : (a.combatRole ? [a.combatRole] : ['utility'])

    if (!rolesMatchContext(roles, context)) return

    items.push({
      key: `ability-${a.id}`,
      source: 'ability',
      name: a.name,
      detail: a.description,
      bonus: 0,
      sdCost: a.sdCost,
      context,
      appliedEffects: a.appliedEffects,
    })
  })

  return items
}

/** True if a modifier has any auto-applied status effects targeting non-self entities. */
export function hasPendingTargetEffects(applied: AppliedModifier[]): boolean {
  return applied.some(m =>
    (m.appliedEffects ?? []).some(e => e.target === 'target' || e.target === 'ally' || e.target === 'all-allies')
  )
}
