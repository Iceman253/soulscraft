import type { Character } from '../types'

/** A minimal valid character for store tests. */
export function makeChar(overrides: Partial<Character> = {}): Character {
  return {
    id: 'c1',
    name: 'Steve',
    species: 'Human',
    variant: '',
    class: 'Warrior',
    discipline: '',
    level: 1,
    maxHp: 10,
    currentHp: 10,
    maxSd: 6,
    currentSd: 0,
    xp: 0,
    damageDie: 'd6',
    classFeatureState: { class: 'custom', state: null },
    disciplineEdge: { name: '', description: '', used: false },
    armorLoadout: {} as Character['armorLoadout'],
    weaponLoadout: {} as Character['weaponLoadout'],
    skills: [],
    traits: [],
    abilities: [],
    activeEffects: [],
    missedRests: 0,
    locationId: null,
    subLocationId: null,
    currency: { copper: 0, iron: 0, gold: 0, emeralds: 0, diamonds: 0 },
    onHand: { items: [] },
    storage: { items: [] },
    rations: 0,
    notes: '',
    ...overrides,
  }
}
