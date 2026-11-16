import type { Character, DisciplineEdge, XpEvent } from '../../../types'
import { newId } from '../../../lib/platform/id'
import { log } from '../../log/store'
import { CLASS_DAMAGE_DICE, CLASS_DISCIPLINES, DISCIPLINE_EDGES, DEFAULT_CLASS_SKILLS, SPECIES_DATA } from '../../../lib/rules/constants'
import { defaultClassFeatureState } from '../../../lib/rules/newCharacter'
import { migrateStorage } from '../../../lib/world/stashes'
import { committer, mapChar, save, settleCarry } from './helpers'
import { migrateCharacter } from './migrate'
import type { CharacterSlice } from './types'

export interface CoreActions {
  hydrate: (characters: Character[], xpLog: XpEvent[]) => void
  addCharacter: (c: Omit<Character, 'id'>) => string
  updateCharacter: (id: string, patch: Partial<Character>) => void
  deleteCharacter: (id: string) => void
  changeClass: (id: string, newClass: string) => void
  changeDiscipline: (id: string, discipline: string) => void
  changeSpeciesVariant: (id: string, species: string, variant: string) => void
}

/** A fresh, unused Discipline Edge from the rulebook table (blank if unknown). */
function edgeFor(discipline: string): DisciplineEdge {
  const edge = DISCIPLINE_EDGES[discipline]
  return edge
    ? { name: edge.name, description: edge.description, combatRoles: edge.combatRoles, appliedEffects: edge.appliedEffects, used: false }
    : { name: '', description: '', used: false }
}

/** Every species and variant trait name, so a species change can swap those out
 *  and keep the traits the player added. */
function knownSpeciesTraitNames(): Set<string> {
  const names = new Set<string>()
  Object.values(SPECIES_DATA).forEach(sd => {
    names.add(sd.speciesTrait.name)
    sd.variants.forEach(v => names.add(v.trait.name))
  })
  return names
}

export const createCoreSlice: CharacterSlice<CoreActions> = (set, get) => {
  const { commit, update } = committer(set, get)
  return {
    hydrate(characters, xpLog) {
      const migrated = characters.map(c => migrateStorage(migrateCharacter(c)))
      set({ characters: migrated, xpLog })
      // Persist the migrated shape so we don't repeat work on every page load.
      if (migrated.length > 0) save(migrated, xpLog)
    },

    addCharacter(c) {
      const id = newId()
      commit([...get().characters, { ...c, id }])
      log('character-move', `🧙 ${c.name} added to the campaign.`)
      return id
    },

    updateCharacter(id, patch) {
      const updated = mapChar(get().characters, id, c => ({ ...c, ...patch }))
      commit(patch.onHand ? settleCarry(get().characters, updated, id) : updated)
    },

    deleteCharacter(id) {
      commit(get().characters.filter(c => c.id !== id))
    },

    changeClass(id, newClass) {
      const firstDiscipline = CLASS_DISCIPLINES[newClass]?.[0] ?? ''
      const skills = (DEFAULT_CLASS_SKILLS[newClass] ?? []).map(s => ({
        id: newId(), name: s.name, bonus: 1 as const, description: s.description, combatRoles: s.combatRoles,
      }))
      update(id, c => ({
        ...c,
        class: newClass,
        damageDie: CLASS_DAMAGE_DICE[newClass] ?? c.damageDie,
        classFeatureState: defaultClassFeatureState(newClass),
        discipline: firstDiscipline,
        disciplineEdge: edgeFor(firstDiscipline),
        skills,
      }))
    },

    changeDiscipline(id, discipline) {
      update(id, c => ({ ...c, discipline, disciplineEdge: edgeFor(discipline) }))
    },

    changeSpeciesVariant(id, species, variant) {
      const known = knownSpeciesTraitNames()
      const speciesInfo = SPECIES_DATA[species]
      const variantData = speciesInfo?.variants.find(v => v.name === variant) ?? speciesInfo?.variants[0]
      const newTraits = [
        ...(speciesInfo ? [{ id: newId(), name: speciesInfo.speciesTrait.name, description: speciesInfo.speciesTrait.description, combatRoles: speciesInfo.speciesTrait.combatRoles }] : []),
        ...(variantData ? [{ id: newId(), name: variantData.trait.name, description: variantData.trait.description, combatRoles: variantData.trait.combatRoles }] : []),
      ]
      update(id, c => ({
        ...c, species, variant,
        traits: [...c.traits.filter(t => !known.has(t.name)), ...newTraits],
      }))
    },
  }
}
