import type { Skill, Trait, Ability } from '../../../types'
import { newId } from '../../../lib/platform/id'
import { committer } from './helpers'
import type { CharacterSlice } from './types'

/** Skills, traits and abilities on the character sheet. */
export interface SheetActions {
  addSkill: (id: string, skill: Omit<Skill, 'id'>) => void
  updateSkill: (id: string, skillId: string, patch: Partial<Skill>) => void
  deleteSkill: (id: string, skillId: string) => void
  addTrait: (id: string, trait: Omit<Trait, 'id'>) => void
  updateTrait: (id: string, traitId: string, patch: Partial<Trait>) => void
  deleteTrait: (id: string, traitId: string) => void
  addAbility: (id: string, ability: Omit<Ability, 'id'>) => void
  updateAbility: (id: string, abilityId: string, patch: Partial<Ability>) => void
  deleteAbility: (id: string, abilityId: string) => void
}

export const createSheetSlice: CharacterSlice<SheetActions> = (set, get) => {
  const { update } = committer(set, get)
  return {
    addSkill: (id, skill) => update(id, c => ({ ...c, skills: [...c.skills, { ...skill, id: newId() }] })),
    updateSkill: (id, skillId, patch) => update(id, c => ({ ...c, skills: c.skills.map(s => s.id === skillId ? { ...s, ...patch } : s) })),
    deleteSkill: (id, skillId) => update(id, c => ({ ...c, skills: c.skills.filter(s => s.id !== skillId) })),

    addTrait: (id, trait) => update(id, c => ({ ...c, traits: [...c.traits, { ...trait, id: newId() }] })),
    updateTrait: (id, traitId, patch) => update(id, c => ({ ...c, traits: c.traits.map(t => t.id === traitId ? { ...t, ...patch } : t) })),
    deleteTrait: (id, traitId) => update(id, c => ({ ...c, traits: c.traits.filter(t => t.id !== traitId) })),

    addAbility: (id, ability) => update(id, c => ({ ...c, abilities: [...c.abilities, { ...ability, id: newId() }] })),
    updateAbility: (id, abilityId, patch) => update(id, c => ({ ...c, abilities: c.abilities.map(a => a.id === abilityId ? { ...a, ...patch } : a) })),
    deleteAbility: (id, abilityId) => update(id, c => ({ ...c, abilities: c.abilities.filter(a => a.id !== abilityId) })),
  }
}
