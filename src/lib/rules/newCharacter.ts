/** Character creation — pure logic shared by the desktop modal and the
 *  phone wizard, kept out of component files so it's unit-testable. */
import {
  CLASS_DAMAGE_DICE, DISCIPLINE_EDGES, DISCIPLINE_INFO, DEFAULT_CLASS_SKILLS,
  SPECIES_DATA, WARRIOR_MANEUVERS, DELVER_EVASIONS, VINDICATOR_VOICES,
  calcMaxHp, calcMaxSd,
} from './constants'
import { CLASS_ABILITIES } from './classAbilities'
import { emptyLoadout } from './armor'
import { newId } from '../platform/id'
import type { Character, ClassFeatureState, Skill, Ability } from '../../types'

/** Skill bonus per class (rulebook class pages). */
export const CLASS_SKILL_BONUS: Record<string, 1 | 2 | 3> = {
  Warrior: 1, Vindicator: 1, Hunter: 2, Evoker: 2,
  Delver: 3, Wildspeaker: 3, Enchanter: 3, Tecton: 3, Alchemist: 3,
}

// ── Starting gear (class pages) ─────────────────────────────────────────
// Every class starts with: its signature item, 1 Crafting Table, 30 Iron,
// 5 Rations, and three player choices. The Enchanter's "5 Lapis Lazuli" goes
// into the class feature lapis counter (where enchanting spends it), not the
// item list.

export interface GearItem { name: string; quantity: number; description?: string }

export const CLASS_STARTING_ITEMS: Record<string, GearItem[]> = {
  Warrior:     [{ name: 'Weapon Repair Kit', quantity: 1, description: 'Can be used to mend broken weapons during a rest without using materials.' }],
  Hunter:      [{ name: 'Disguise or Camouflage Kit', quantity: 1 }],
  Vindicator:  [{ name: 'Symbol of Your Devotion', quantity: 1 }],
  Enchanter:   [],   // 5 Lapis Lazuli — tracked on the class feature panel
  Delver:      [{ name: 'Iron Pickaxe', quantity: 1 }],
  Wildspeaker: [{ name: 'Satchel of Herbs', quantity: 1, description: '3 roll-free medicinal uses during a rest.' }],
  Alchemist:   [{ name: 'Brewing Stand', quantity: 1 }],
  Evoker:      [{ name: 'Soul Lantern', quantity: 1 }],
  Tecton:      [{ name: 'Crowbar', quantity: 1 }],
}

const CRAFTING_TABLE: GearItem = {
  name: 'Crafting Table', quantity: 1,
  description: 'Instantly combines materials into new items, guided by the intent of the user (manual p.84).',
}

export interface GearChoiceOption {
  label: string
  items: GearItem[]
  gold?: number
  rations?: number
}

export interface StartingGearChoice {
  id: 'provisions' | 'protection' | 'sidearm'
  label: string
  options: GearChoiceOption[]
}

export const STARTING_GEAR_CHOICES: StartingGearChoice[] = [
  {
    id: 'provisions', label: '10 Gold or 5 more Rations',
    options: [
      { label: '10 Gold', items: [], gold: 10 },
      { label: '5 Rations', items: [], rations: 5 },
    ],
  },
  {
    id: 'protection', label: 'Leather Armor or an Iron weapon',
    options: [
      { label: 'Leather Armor', items: [{ name: 'Leather Armor', quantity: 1 }] },
      { label: 'Iron Sword',    items: [{ name: 'Iron Sword', quantity: 1 }] },
      { label: 'Iron Axe',      items: [{ name: 'Iron Axe', quantity: 1 }] },
      { label: 'Iron Dagger',   items: [{ name: 'Iron Dagger', quantity: 1 }] },
    ],
  },
  {
    id: 'sidearm', label: 'Shield or Bow and Arrows',
    options: [
      { label: 'Shield',         items: [{ name: 'Shield', quantity: 1 }] },
      { label: 'Bow and Arrows', items: [{ name: 'Bow', quantity: 1 }, { name: 'Arrows', quantity: 20 }] },
    ],
  },
]

/** choice id → picked option index. */
export type GearSelections = Partial<Record<StartingGearChoice['id'], number>>

export const DEFAULT_GEAR_SELECTIONS: GearSelections = { provisions: 0, protection: 0, sidearm: 0 }

export interface StartingGearBundle {
  items: GearItem[]
  iron: number
  gold: number
  rations: number
  /** Enchanter only — goes into the class feature lapis counter. */
  lapis: number
}

/** Everything a freshly made character of this class receives (class pages). */
export function startingGearFor(characterClass: string, selections: GearSelections = DEFAULT_GEAR_SELECTIONS): StartingGearBundle {
  const items: GearItem[] = [
    ...(CLASS_STARTING_ITEMS[characterClass] ?? []),
    CRAFTING_TABLE,
  ]
  let gold = 0
  let rations = 5
  for (const choice of STARTING_GEAR_CHOICES) {
    const picked = choice.options[selections[choice.id] ?? 0] ?? choice.options[0]
    items.push(...picked.items)
    gold += picked.gold ?? 0
    rations += picked.rations ?? 0
  }
  return { items, iron: 30, gold, rations, lapis: characterClass === 'Enchanter' ? 5 : 0 }
}

export function defaultClassFeatureState(characterClass: string): ClassFeatureState {
  switch (characterClass) {
    case 'Warrior':
      return {
        class: 'Warrior',
        state: {
          maneuvers: WARRIOR_MANEUVERS.map(m => ({ ...m, id: newId() })),
        },
      }
    case 'Hunter':
      return { class: 'Hunter', state: { preyType: null } }
    case 'Vindicator':
      return {
        class: 'Vindicator',
        state: {
          voices: VINDICATOR_VOICES.map(v => ({ ...v, id: newId() })),
          activeCause: '',
        },
      }
    case 'Enchanter':
      return {
        class: 'Enchanter',
        state: { tomeEntries: [], lapisCount: 0, magicCircleActive: false },
      }
    case 'Delver':
      return {
        class: 'Delver',
        state: {
          evasions: DELVER_EVASIONS.map(e => ({ ...e, id: newId() })),
          relicActivations: 2,
        },
      }
    case 'Wildspeaker':
      return {
        class: 'Wildspeaker',
        state: {
          tethers: [
            { force: null, bonus: null },
            { force: null, bonus: null },
          ],
          beastshaperUsed: false,
          shamanUsed: false,
        },
      }
    case 'Evoker':
      return {
        class: 'Evoker',
        state: {
          wardType: null,
          vex: [],
          fangs: [],
          soulmenderUsed: false,
          reaperUsed: false,
          soulAnchorUsed: false,
        },
      }
    case 'Tecton':
      return {
        class: 'Tecton',
        state: { instantCraftsRemaining: 3, mechanistCharges: 2 },
      }
    case 'Alchemist':
      return {
        class: 'Alchemist',
        state: {
          essences: {
            vitality: 0, transformation: 0, element: 0, sense: 0, decay: 0,
          },
        },
      }
    default:
      return { class: 'custom', state: null }
  }
}

export function buildNewCharacter(name: string, species: string, variantName: string, characterClass: string, discipline: string, gearSelections: GearSelections = DEFAULT_GEAR_SELECTIONS): Omit<Character, 'id'> {
  const skillBonus = CLASS_SKILL_BONUS[characterClass] ?? 1
  const defaultSkills: Skill[] = (DEFAULT_CLASS_SKILLS[characterClass] ?? []).map(s => ({
    id: newId(),
    name: s.name,
    bonus: skillBonus,
    description: s.description,
    combatRoles: s.combatRoles,
  }))

  // Discipline bonus skill (class pages: "This will provide a bonus Skill and
  // an Edge"). Skipped when a class skill of the same name already exists —
  // e.g. the Reaper's Lifesense, which Evokers get by default.
  const disciplineSkill = DISCIPLINE_INFO[discipline]?.skill
  if (disciplineSkill && !defaultSkills.some(s => s.name.toLowerCase() === disciplineSkill.name.toLowerCase())) {
    defaultSkills.push({
      id: newId(),
      name: disciplineSkill.name,
      bonus: skillBonus,
      description: disciplineSkill.description,
      combatRoles: disciplineSkill.combatRoles,
    })
  }

  const speciesInfo = SPECIES_DATA[species]
  const speciesVariants = speciesInfo?.variants ?? []
  const variant = speciesVariants.find(v => v.name === variantName) ?? speciesVariants[0]
  const defaultTraits = [
    ...(speciesInfo ? [{ id: newId(), name: speciesInfo.speciesTrait.name, description: speciesInfo.speciesTrait.description, combatRoles: speciesInfo.speciesTrait.combatRoles }] : []),
    ...(variant ? [{ id: newId(), name: variant.trait.name, description: variant.trait.description, combatRoles: variant.trait.combatRoles }] : []),
  ]
  const damageDie = CLASS_DAMAGE_DICE[characterClass] ?? 'd6'

  // Rulebook p.7: "You start with three available Special Abilities at Level 1"
  const startingAbilities: Ability[] = (CLASS_ABILITIES[characterClass] ?? [])
    .filter(a => a.tier === 'level1')
    .map(a => ({
      id: newId(),
      name: a.name,
      sdCost: a.sdCost,
      description: a.description,
      recharge: 'rest' as const,
      combatRole: a.combatRole,            // legacy single tag (compat)
      combatRoles: a.combatRoles ?? (a.combatRole ? [a.combatRole] : undefined),
      appliedEffects: a.appliedEffects,
    }))

  const maxHp = calcMaxHp(characterClass, 1)
  const maxSd = calcMaxSd(1)

  // Starting gear (class pages): signature item, Crafting Table, 30 Iron,
  // 5 Rations, plus the three player choices.
  const gear = startingGearFor(characterClass, gearSelections)
  const classFeatureState = defaultClassFeatureState(characterClass)
  if (gear.lapis > 0 && classFeatureState.class === 'Enchanter') {
    classFeatureState.state.lapisCount = gear.lapis
  }

  return {
    name,
    species,
    variant: variantName,
    class: characterClass,
    level: 1,
    xp: 0,
    maxHp,
    currentHp: maxHp,
    maxSd,
    currentSd: maxSd,
    damageDie,
    discipline,
    skills: defaultSkills,
    traits: defaultTraits,
    abilities: startingAbilities,
    disciplineEdge: DISCIPLINE_EDGES[discipline]
      ? {
          name: DISCIPLINE_EDGES[discipline].name,
          description: DISCIPLINE_EDGES[discipline].description,
          combatRoles: DISCIPLINE_EDGES[discipline].combatRoles,
          appliedEffects: DISCIPLINE_EDGES[discipline].appliedEffects,
          used: false,
        }
      : { name: '', description: '', used: false },
    classFeatureState,
    armorLoadout: emptyLoadout(),
    weaponLoadout: { mainHand: null, offHand: null },
    activeEffects: [],
    onHand: { items: gear.items.map(i => ({ ...i, id: newId() })) },
    storage: { items: [] },
    currency: { copper: 0, iron: gear.iron, gold: gear.gold, emeralds: 0, diamonds: 0 },
    rations: gear.rations,
    missedRests: 0,
    locationId: null,
    subLocationId: null,
    notes: '',
  }
}
