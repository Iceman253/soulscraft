import type { Character, CombatRole } from '../../../types'
import { DEFAULT_CLASS_SKILLS, DISCIPLINE_EDGES, SPECIES_DATA } from '../../../lib/rules/constants'
import type { DefaultSkill } from '../../../lib/rules/classes'
import { CLASS_ABILITIES } from '../../../lib/rules/classAbilities'

const BROAD_ROLES: CombatRole[] = ['attack', 'defense', 'general']

/** Runs on every hydrate. Re-syncs combatRoles and appliedEffects on stored
 *  abilities, skills, traits and the Discipline Edge against the live master
 *  tables (CLASS_ABILITIES, DEFAULT_CLASS_SKILLS, SPECIES_DATA, DISCIPLINE_EDGES).
 *  Characters created before the strict-role refactor have stale tags like
 *  `combatRole: 'general'` that now resolve to "dice-roller only" — without this
 *  pass those abilities never surface in attack/defense panels.
 *
 *  Matching is by name. Anything not found is a custom entry the GM added by hand
 *  and is left alone, except that untagged custom abilities and skills get broad
 *  roles so they still appear somewhere. */
export function migrateCharacter(c: Character): Character {
  const abilityByName = new Map<string, typeof CLASS_ABILITIES[string][number]>()
  Object.values(CLASS_ABILITIES).forEach(list => list.forEach(a => abilityByName.set(a.name, a)))

  const abilities = c.abilities.map(a => {
    const master = abilityByName.get(a.name)
    if (!master) return !a.combatRoles && !a.combatRole ? { ...a, combatRoles: BROAD_ROLES } : a
    return {
      ...a,
      combatRole: master.combatRole,         // keep legacy field in sync for safety
      combatRoles: master.combatRoles ?? (master.combatRole ? [master.combatRole] : undefined),
      appliedEffects: master.appliedEffects ?? a.appliedEffects,
    }
  })

  // Skills: rulebook descriptions and role tags for class-default skills; a
  // description the player wrote is kept.
  const skillByName = new Map<string, DefaultSkill>()
  Object.values(DEFAULT_CLASS_SKILLS).forEach(list => list.forEach(s => skillByName.set(s.name, s)))
  const skills = c.skills.map(s => {
    const master = skillByName.get(s.name)
    if (master) {
      return {
        ...s,
        description: s.description?.trim() ? s.description : master.description,
        combatRoles: s.combatRoles?.length ? s.combatRoles : master.combatRoles,
      }
    }
    return s.combatRoles?.length ? s : { ...s, combatRoles: BROAD_ROLES }
  })

  // Traits: backfill species and variant traits; personal traits are untouched.
  const traitByName = new Map<string, { description: string; combatRoles: CombatRole[] }>()
  Object.values(SPECIES_DATA).forEach(sd => {
    traitByName.set(sd.speciesTrait.name, { description: sd.speciesTrait.description, combatRoles: sd.speciesTrait.combatRoles })
    sd.variants.forEach(v => traitByName.set(v.trait.name, { description: v.trait.description, combatRoles: v.trait.combatRoles }))
  })
  const traits = c.traits.map(t => {
    const master = traitByName.get(t.name)
    if (!master) return t
    return {
      ...t,
      description: t.description?.trim() ? t.description : master.description,
      combatRoles: t.combatRoles?.length ? t.combatRoles : master.combatRoles,
    }
  })

  let disciplineEdge = c.disciplineEdge
  if (disciplineEdge?.name) {
    const edgeMaster = Object.values(DISCIPLINE_EDGES).find(e => e.name === disciplineEdge.name)
    if (edgeMaster) {
      disciplineEdge = { ...disciplineEdge, combatRoles: edgeMaster.combatRoles, appliedEffects: edgeMaster.appliedEffects }
    }
  }

  return { ...c, abilities, skills, traits, disciplineEdge }
}
