import { create } from 'zustand'
import type {
  Character, ArmorSlot, ArmorMaterial,
  Weapon, ActiveEffect, GearEnchantment, ClassFeatureState,
  Skill, Trait, Ability, CharacterItem, XpEvent, CombatRole,
} from '../../types'
import { newId } from '../../lib/id'
import { useCampaignStore } from '../campaigns/store'
import { useWorldStore } from '../map/store'
import { log } from '../log/store'
import { getBaseDef, fullSetLoadout } from '../../lib/armor'
import { WARRIOR_MANEUVERS, DELVER_EVASIONS, VINDICATOR_VOICES, CLASS_DAMAGE_DICE, CLASS_DISCIPLINES, DISCIPLINE_EDGES, DEFAULT_CLASS_SKILLS, SPECIES_DATA, calcMaxHp } from '../../lib/constants'
import type { DefaultSkill } from '../../lib/classes'
import { CLASS_ABILITIES } from '../../lib/classAbilities'

// ── One-time hydration migration ───────────────────────────────────────
// Re-syncs combatRoles and appliedEffects on stored abilities + the Discipline
// Edge against the live master tables (CLASS_ABILITIES, DISCIPLINE_EDGES).
// Characters created before the strict-role refactor have stale tags like
// `combatRole: 'general'` that now resolve to "dice-roller only" — without
// this pass those abilities never surface in attack/defense panels.
//
// Matching: ability by `name`, edge by `name`. Anything we can't find is
// left as-is (probably a custom ability the GM added by hand).
function migrateCharacter(c: Character): Character {
  // Build a name → master-ability map across every class.
  const byName = new Map<string, typeof CLASS_ABILITIES[string][number]>()
  Object.values(CLASS_ABILITIES).forEach(list => {
    list.forEach(a => byName.set(a.name, a))
  })

  const abilities = c.abilities.map(a => {
    const master = byName.get(a.name)
    if (!master) {
      // Custom ability the GM added by hand. If it has no role tags at all,
      // give it sensible defaults so it still appears somewhere — assume
      // SD-cost abilities are combat-applicable when in doubt.
      if (!a.combatRoles && !a.combatRole) {
        return { ...a, combatRoles: ['attack', 'defense', 'general'] as ('attack'|'defense'|'general'|'utility')[] }
      }
      return a
    }
    return {
      ...a,
      combatRole: master.combatRole,         // keep legacy field in sync for safety
      combatRoles: master.combatRoles ?? (master.combatRole ? [master.combatRole] : undefined),
      appliedEffects: master.appliedEffects ?? a.appliedEffects,
    }
  })

  // Skills — backfill from DEFAULT_CLASS_SKILLS where the name matches a
  // class-default skill. This gives existing characters rulebook-grounded
  // descriptions and correct role tags. Unknown / custom skills get a broad
  // fallback so they still appear in combat panels.
  const defaultSkillByName = new Map<string, DefaultSkill>()
  Object.values(DEFAULT_CLASS_SKILLS).forEach(list => {
    list.forEach(s => defaultSkillByName.set(s.name, s))
  })
  const skills = c.skills.map(s => {
    const master = defaultSkillByName.get(s.name)
    if (master) {
      return {
        ...s,
        // Only overwrite description if the character's skill has no description.
        description: s.description && s.description.trim() ? s.description : master.description,
        combatRoles: s.combatRoles && s.combatRoles.length > 0 ? s.combatRoles : master.combatRoles,
      }
    }
    if (s.combatRoles && s.combatRoles.length > 0) return s
    return { ...s, combatRoles: ['attack', 'defense', 'general'] as ('attack'|'defense'|'general'|'utility')[] }
  })

  // Traits — backfill from SPECIES_DATA where the name matches a species
  // or variant trait. Existing custom personal traits are left untouched.
  const traitMaster = new Map<string, { description: string; combatRoles: CombatRole[] }>()
  Object.values(SPECIES_DATA).forEach(sd => {
    traitMaster.set(sd.speciesTrait.name, { description: sd.speciesTrait.description, combatRoles: sd.speciesTrait.combatRoles })
    sd.variants.forEach(v => traitMaster.set(v.trait.name, { description: v.trait.description, combatRoles: v.trait.combatRoles }))
  })
  const traits = c.traits.map(t => {
    const master = traitMaster.get(t.name)
    if (master) {
      return {
        ...t,
        description: t.description && t.description.trim() ? t.description : master.description,
        combatRoles: t.combatRoles && t.combatRoles.length > 0 ? t.combatRoles : master.combatRoles,
      }
    }
    return t  // custom personal trait — leave as-is
  })

  // Discipline Edge — re-sync from master.
  let disciplineEdge = c.disciplineEdge
  if (disciplineEdge && disciplineEdge.name) {
    const edgeMaster = Object.values(DISCIPLINE_EDGES).find(e => e.name === disciplineEdge.name)
    if (edgeMaster) {
      disciplineEdge = {
        ...disciplineEdge,
        combatRoles: edgeMaster.combatRoles,
        appliedEffects: edgeMaster.appliedEffects,
      }
    }
  }

  return { ...c, abilities, skills, traits, disciplineEdge }
}

interface CharacterStore {
  characters: Character[]
  xpLog: XpEvent[]
  hydrate: (characters: Character[], xpLog: XpEvent[]) => void

  // CRUD
  addCharacter: (c: Omit<Character, 'id'>) => string
  updateCharacter: (id: string, patch: Partial<Character>) => void
  deleteCharacter: (id: string) => void
  changeClass: (id: string, newClass: string) => void
  changeDiscipline: (id: string, discipline: string) => void
  changeSpeciesVariant: (id: string, species: string, variant: string) => void

  // HP / SD / XP
  adjustHp: (id: string, delta: number) => void
  adjustSd: (id: string, delta: number) => void
  /** Set HP to an absolute value (used to mirror Combat Tracker damage to the
   *  sheet). Triggers the same death / Tower-eject resolution as adjustHp. */
  syncCombatHp: (id: string, currentHp: number) => void
  awardXp: (characterId: string, amount: number, source: XpEvent['source'], note?: string) => void
  levelUp: (id: string) => void

  // Death / resurrection (rulebook p.74)
  markDead: (id: string) => void
  setGhost: (id: string, isGhost: boolean) => void
  setInTower: (id: string, inTower: boolean) => void
  resurrect: (id: string) => void

  // Location
  setLocation: (id: string, locationId: string | null) => void
  setMapPos: (id: string, pos: { x: number; y: number } | null) => void
  setSubLocation: (id: string, subLocationId: string | null) => void

  // Skills / Traits / Abilities
  addSkill: (id: string, skill: Omit<Skill, 'id'>) => void
  updateSkill: (id: string, skillId: string, patch: Partial<Skill>) => void
  deleteSkill: (id: string, skillId: string) => void
  addTrait: (id: string, trait: Omit<Trait, 'id'>) => void
  updateTrait: (id: string, traitId: string, patch: Partial<Trait>) => void
  deleteTrait: (id: string, traitId: string) => void
  addAbility: (id: string, ability: Omit<Ability, 'id'>) => void
  updateAbility: (id: string, abilityId: string, patch: Partial<Ability>) => void
  deleteAbility: (id: string, abilityId: string) => void

  // Effects
  addEffect: (id: string, effect: Omit<ActiveEffect, 'id'>) => void
  removeEffect: (id: string, effectId: string) => void
  advanceEffectTime: (durationType: 'scenes' | 'days') => void

  // Armor
  equipArmorPiece: (id: string, slot: ArmorSlot, material: ArmorMaterial, onHandItemId?: string) => void
  unequipArmorPiece: (id: string, slot: ArmorSlot) => void
  equipFullSet: (id: string, material: ArmorMaterial) => void
  overrideArmorDef: (id: string, slot: ArmorSlot, value: number) => void
  resetArmorDef: (id: string, slot: ArmorSlot) => void
  addArmorEnchantment: (id: string, slot: ArmorSlot, enchantment: Omit<GearEnchantment, 'id'>) => void
  removeArmorEnchantment: (id: string, slot: ArmorSlot, enchantmentId: string) => void
  advanceArmorEnchantmentTime: (durationType: 'scenes' | 'days') => void

  // Weapons
  equipWeapon: (id: string, hand: 'mainHand' | 'offHand', weapon: Omit<Weapon, 'id'>, onHandItemId?: string) => void
  unequipWeapon: (id: string, hand: 'mainHand' | 'offHand') => void
  overrideWeaponBonus: (id: string, hand: 'mainHand' | 'offHand', value: number) => void
  resetWeaponBonus: (id: string, hand: 'mainHand' | 'offHand') => void
  addWeaponEnchantment: (id: string, hand: 'mainHand' | 'offHand', enchantment: Omit<GearEnchantment, 'id'>) => void
  removeWeaponEnchantment: (id: string, hand: 'mainHand' | 'offHand', enchantmentId: string) => void
  advanceWeaponEnchantmentTime: (durationType: 'scenes' | 'days') => void

  // Class features
  useRestCharge: (id: string, chargeId: string) => void
  resetClassFeatures: (id: string) => void
  resetAllClassFeaturesOnRest: (characterIds: string[]) => void
  resetMagicCirclesOnDayEnd: () => void
  updateClassState: (id: string, patch: Record<string, unknown>) => void
  setEdgeUsed: (id: string, used: boolean) => void

  // Inventory
  addOnHandItem: (id: string, item: Omit<CharacterItem, 'id'>) => string
  updateOnHandItem: (id: string, itemId: string, patch: Partial<CharacterItem>) => void
  removeOnHandItem: (id: string, itemId: string) => void
  addStorageItem: (id: string, item: Omit<CharacterItem, 'id'>) => void
  updateStorageItem: (id: string, itemId: string, patch: Partial<CharacterItem>) => void
  removeStorageItem: (id: string, itemId: string) => void
  moveItemToStorage: (id: string, itemId: string) => void
  moveItemToHand: (id: string, itemId: string) => void
  giveItemToCharacter: (fromId: string, itemId: string, fromSection: 'onHand' | 'storage', toId: string) => void
  setCurrency: (id: string, patch: Partial<Character['currency']>) => void
  setRations: (id: string, count: number) => void

  // Rest
  missRest: (id: string) => void
  resetMissedRests: (id: string) => void
}

function save(characters: Character[], xpLog: XpEvent[]) {
  useCampaignStore.getState().updateCampaignData({ characters, xpLog })
}

function mapChar(
  chars: Character[],
  id: string,
  fn: (c: Character) => Character
): Character[] {
  return chars.map(c => c.id === id ? fn(c) : c)
}

/** Resolve what happens when a character is at 0 HP with no SD left to spend.
 *  - In the Tower of Trials: ejected with 1 HP (cannot die inside).
 *  - Otherwise: dies (rulebook — HP 0 and no SD to Avoid Death).
 *  Returns the (possibly updated) array and a log message when something changed.
 *  A character with SD remaining is left untouched — the player may still choose
 *  to Avoid Death by spending SD (1 SD → 1 HP). */
function resolveDeathAtZero(chars: Character[], id: string): { characters: Character[]; message?: string } {
  const c = chars.find(x => x.id === id)
  if (!c || c.currentHp !== 0 || c.isDead || c.currentSd > 0) return { characters: chars }
  if (c.inTower) {
    return {
      characters: mapChar(chars, id, x => ({ ...x, currentHp: 1, inTower: false })),
      message: `🗼 ${c.name} was ejected from the Tower of Trials with 1 HP — the Tower does not permit death.`,
    }
  }
  return {
    characters: mapChar(chars, id, x => ({ ...x, isDead: true })),
    message: `💀 ${c.name} has fallen — no HP and no SD remaining.`,
  }
}

/** Roll a dice spec like "2d6", "1d8", "d6" → total. Returns 0 for anything unparseable. */
function rollDiceSpec(spec: string): number {
  const m = spec.match(/(\d*)\s*d\s*(\d+)/i)
  if (!m) return 0
  const n = m[1] ? Math.max(1, parseInt(m[1])) : 1
  const sides = parseInt(m[2])
  if (!sides) return 0
  let sum = 0
  for (let i = 0; i < n; i++) sum += Math.floor(Math.random() * sides) + 1
  return sum
}

function defaultClassFeatureState(characterClass: string): ClassFeatureState {
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

function resetClassState(fs: ClassFeatureState): ClassFeatureState {
  switch (fs.class) {
    case 'Warrior':
      return {
        ...fs,
        state: {
          ...fs.state,
          maneuvers: fs.state.maneuvers.map(m => ({ ...m, used: false })),
        },
      }
    case 'Vindicator':
      return {
        ...fs,
        state: {
          ...fs.state,
          voices: fs.state.voices.map(v => ({ ...v, used: false })),
          activeCause: '',
        },
      }
    case 'Delver':
      return {
        ...fs,
        state: {
          ...fs.state,
          evasions: fs.state.evasions.map(e => ({ ...e, used: false })),
          relicActivations: 2,
        },
      }
    case 'Wildspeaker':
      return {
        ...fs,
        state: {
          ...fs.state,
          tethers: [{ force: null, bonus: null }, { force: null, bonus: null }],
          beastshaperUsed: false,
          shamanUsed: false,
        },
      }
    case 'Evoker':
      return {
        ...fs,
        state: {
          ...fs.state,
          soulmenderUsed: false,
          reaperUsed: false,
          soulAnchorUsed: false,
        },
      }
    case 'Tecton':
      return {
        ...fs,
        state: { instantCraftsRemaining: 3, mechanistCharges: 2 },
      }
    case 'Hunter':
      return { ...fs, state: { preyType: null } }
    default:
      return fs
  }
}

export const useCharacterStore = create<CharacterStore>((set, get) => ({
  characters: [],
  xpLog: [],

  hydrate(characters, xpLog) {
    // Migrate stale ability/edge combatRoles tags from any pre-refactor saves.
    const migrated = characters.map(migrateCharacter)
    set({ characters: migrated, xpLog })
    // Persist the migrated shape so we don't repeat work on every page load.
    if (migrated.length > 0) save(migrated, xpLog)
  },

  addCharacter(c) {
    const id = newId()
    const character: Character = { ...c, id }
    const characters = [...get().characters, character]
    set({ characters })
    save(characters, get().xpLog)
    log('character-move', `🧙 ${c.name} added to the campaign.`)
    return id
  },

  updateCharacter(id, patch) {
    const characters = mapChar(get().characters, id, c => ({ ...c, ...patch }))
    set({ characters })
    save(characters, get().xpLog)
  },

  deleteCharacter(id) {
    const characters = get().characters.filter(c => c.id !== id)
    set({ characters })
    save(characters, get().xpLog)
  },

  changeClass(id, newClass) {
    const firstDiscipline = CLASS_DISCIPLINES[newClass]?.[0] ?? ''
    const edge = DISCIPLINE_EDGES[firstDiscipline]
    const newSkills = (DEFAULT_CLASS_SKILLS[newClass] ?? []).map(s => ({
      id: newId(),
      name: s.name,
      bonus: 1 as const,
      description: s.description,
      combatRoles: s.combatRoles,
    }))
    const characters = mapChar(get().characters, id, c => ({
      ...c,
      class: newClass,
      damageDie: CLASS_DAMAGE_DICE[newClass] ?? c.damageDie,
      classFeatureState: defaultClassFeatureState(newClass),
      discipline: firstDiscipline,
      disciplineEdge: edge
        ? { name: edge.name, description: edge.description, combatRoles: edge.combatRoles, appliedEffects: edge.appliedEffects, used: false }
        : { name: '', description: '', used: false },
      skills: newSkills,
    }))
    set({ characters }); save(characters, get().xpLog)
  },

  changeDiscipline(id, discipline) {
    const edge = DISCIPLINE_EDGES[discipline]
    const characters = mapChar(get().characters, id, c => ({
      ...c,
      discipline,
      disciplineEdge: edge
        ? { name: edge.name, description: edge.description, combatRoles: edge.combatRoles, appliedEffects: edge.appliedEffects, used: false }
        : { name: '', description: '', used: false },
    }))
    set({ characters }); save(characters, get().xpLog)
  },

  changeSpeciesVariant(id, species, variant) {
    // Collect all known trait names across all species/variants to identify which traits to replace
    const allKnownTraitNames = new Set<string>()
    Object.values(SPECIES_DATA).forEach(sd => {
      allKnownTraitNames.add(sd.speciesTrait.name)
      sd.variants.forEach(v => allKnownTraitNames.add(v.trait.name))
    })
    const speciesInfo = SPECIES_DATA[species]
    const variantData = speciesInfo?.variants.find(v => v.name === variant) ?? speciesInfo?.variants[0]
    const newSpeciesTraits = [
      ...(speciesInfo ? [{ id: newId(), name: speciesInfo.speciesTrait.name, description: speciesInfo.speciesTrait.description, combatRoles: speciesInfo.speciesTrait.combatRoles }] : []),
      ...(variantData ? [{ id: newId(), name: variantData.trait.name, description: variantData.trait.description, combatRoles: variantData.trait.combatRoles }] : []),
    ]
    const characters = mapChar(get().characters, id, c => ({
      ...c,
      species,
      variant,
      // Keep manually added traits, replace known species/variant traits
      traits: [
        ...c.traits.filter(t => !allKnownTraitNames.has(t.name)),
        ...newSpeciesTraits,
      ],
    }))
    set({ characters }); save(characters, get().xpLog)
  },

  adjustHp(id, delta) {
    const before = get().characters.find(c => c.id === id)
    let characters = mapChar(get().characters, id, c => ({
      ...c,
      currentHp: Math.max(0, Math.min(c.maxHp, c.currentHp + delta)),
    }))
    const after = characters.find(c => c.id === id)
    if (before && after && before.currentHp > 0 && after.currentHp === 0) {
      if (before.name.toLowerCase() === 'infinite') {
        log('character-move', '∞ Infinite has been defeated... You have done the impossible.')
      }
      // Death or Tower-eject only when there's no SD left to Avoid Death.
      const resolved = resolveDeathAtZero(characters, id)
      characters = resolved.characters
      set({ characters }); save(characters, get().xpLog)
      if (resolved.message) log('character-move', resolved.message)
      return
    }
    set({ characters })
    save(characters, get().xpLog)
  },

  // Mirror a Combat Tracker HP change onto the character sheet. Setting HP to 0
  // this way runs the same Avoid Death / Tower-eject resolution as adjustHp, so a
  // PC dropped in combat with SD left is NOT auto-killed — they may still spend SD.
  syncCombatHp(id, currentHp) {
    const before = get().characters.find(c => c.id === id)
    if (!before) return
    let characters = mapChar(get().characters, id, c => ({
      ...c,
      currentHp: Math.max(0, Math.min(c.maxHp, currentHp)),
    }))
    const after = characters.find(c => c.id === id)!
    if (before.currentHp > 0 && after.currentHp === 0) {
      if (before.name.toLowerCase() === 'infinite') {
        log('character-move', '∞ Infinite has been defeated... You have done the impossible.')
      }
      const resolved = resolveDeathAtZero(characters, id)
      characters = resolved.characters
      set({ characters }); save(characters, get().xpLog)
      if (resolved.message) log('character-move', resolved.message)
      return
    }
    set({ characters })
    save(characters, get().xpLog)
  },

  adjustSd(id, delta) {
    const characters = mapChar(get().characters, id, c => ({
      ...c,
      currentSd: Math.max(0, Math.min(c.maxSd, c.currentSd + delta)),
    }))
    set({ characters })
    save(characters, get().xpLog)
  },

  awardXp(characterId, amount, source, note) {
    const xpEntry: XpEvent = {
      id: newId(), timestamp: Date.now(),
      characterId, amount, source, note,
    }
    const characters = mapChar(get().characters, characterId, c => ({
      ...c,
      xp: c.xp + amount,
    }))
    const xpLog = [...get().xpLog, xpEntry]
    set({ characters, xpLog })
    save(characters, xpLog)
    const char = characters.find(c => c.id === characterId)
    if (char) log('xp-awarded', `⭐ ${char.name} gained ${amount} XP (${source}).`)
  },

  levelUp(id) {
    // Manual: leveling up raises maxHp/maxSd. Current SD only refills on rest, so
    // we don't auto-top-up SD here. Current HP gets the new HP delta added (the
    // character "feels" the new vitality immediately) but is capped at maxHp.
    const characters = mapChar(get().characters, id, c => {
      const newLevel = c.level + 1
      const newMaxHp = calcMaxHp(c.class, newLevel)
      const newMaxSd = 5 + newLevel
      const hpGain = Math.max(0, newMaxHp - c.maxHp)
      return {
        ...c,
        level: newLevel,
        xp: c.xp - 5,
        maxHp: newMaxHp,
        currentHp: Math.min(newMaxHp, c.currentHp + hpGain),
        maxSd: newMaxSd,
        // Preserve currentSd; only nudge it up if it was already at the old cap
        // (treat that as "fresh" — common right after a rest)
        currentSd: c.currentSd === c.maxSd ? newMaxSd : Math.min(newMaxSd, c.currentSd),
      }
    })
    set({ characters })
    save(characters, get().xpLog)
    const char = characters.find(c => c.id === id)
    if (char) log('level-up', `🎉 ${char.name} leveled up to Level ${char.level}! Max HP: ${char.maxHp}, Max SD: ${char.maxSd}. (SD refills on rest.)`)
  },

  // ── Death / resurrection ────────────────────────────────────────────────────
  markDead(id) {
    const char = get().characters.find(c => c.id === id)
    if (!char) return
    // Do NOT zero out SD — the player may still want to spend SD to avoid death.
    // SD is only drained if the player chooses not to spend it and the GM confirms death.
    const characters = mapChar(get().characters, id, c => ({
      ...c, isDead: true, isGhost: false, currentHp: 0,
    }))
    set({ characters }); save(characters, get().xpLog)
    log('character-move', `💀 ${char.name} has died.`)
  },

  setGhost(id, isGhost) {
    const char = get().characters.find(c => c.id === id)
    if (!char) return
    const characters = mapChar(get().characters, id, c => ({ ...c, isGhost }))
    set({ characters }); save(characters, get().xpLog)
    log('character-move', isGhost
      ? `👻 ${char.name} is now a Ghost — observing the Tower of Trials.`
      : `👻 ${char.name} is no longer in Ghost form.`)
  },

  setInTower(id, inTower) {
    const char = get().characters.find(c => c.id === id)
    if (!char || !!char.inTower === inTower) return
    const characters = mapChar(get().characters, id, c => ({ ...c, inTower }))
    set({ characters }); save(characters, get().xpLog)
    log('character-move', inTower
      ? `🗼 ${char.name} has entered the Tower of Trials — they cannot die within.`
      : `🗼 ${char.name} has left the Tower of Trials.`)
  },

  resurrect(id) {
    const char = get().characters.find(c => c.id === id)
    if (!char) return
    const characters = mapChar(get().characters, id, c => ({
      ...c, isDead: false, isGhost: false, currentHp: c.maxHp, currentSd: c.maxSd,
    }))
    set({ characters }); save(characters, get().xpLog)
    log('character-move', `✨ ${char.name} has been resurrected by the Tower Keepers! Full HP and SD restored.`)
  },

  setMapPos(id, pos) {
    // Free placement on the map — clears any area/sub-location so a character is
    // either inside a location OR free on the canvas, never both.
    const characters = mapChar(get().characters, id, c => ({
      ...c, mapPos: pos ?? undefined, locationId: pos ? null : c.locationId, subLocationId: pos ? null : c.subLocationId,
    }))
    set({ characters })
    save(characters, get().xpLog)
  },

  setLocation(id, locationId) {
    const characters = mapChar(get().characters, id, c => ({ ...c, locationId, mapPos: undefined }))
    set({ characters })
    save(characters, get().xpLog)
    // Auto-reveal the area to players when a character arrives there
    if (locationId) {
      const worldStore = useWorldStore.getState()
      worldStore.addPlayerVisibleArea(locationId)
      // Clear travel marker if character has arrived at their destination
      const marker = worldStore.travelingMarkers.find(m => m.characterId === id)
      if (marker && marker.toAreaId === locationId) {
        worldStore.clearTravelingMarker(id)
      }
    }
  },

  setSubLocation(id, subLocationId) {
    const characters = mapChar(get().characters, id, c => ({ ...c, subLocationId }))
    set({ characters })
    save(characters, get().xpLog)
  },

  addSkill(id, skill) {
    const characters = mapChar(get().characters, id, c => ({
      ...c, skills: [...c.skills, { ...skill, id: newId() }],
    }))
    set({ characters }); save(characters, get().xpLog)
  },

  updateSkill(id, skillId, patch) {
    const characters = mapChar(get().characters, id, c => ({
      ...c, skills: c.skills.map(s => s.id === skillId ? { ...s, ...patch } : s),
    }))
    set({ characters }); save(characters, get().xpLog)
  },

  deleteSkill(id, skillId) {
    const characters = mapChar(get().characters, id, c => ({
      ...c, skills: c.skills.filter(s => s.id !== skillId),
    }))
    set({ characters }); save(characters, get().xpLog)
  },

  addTrait(id, trait) {
    const characters = mapChar(get().characters, id, c => ({
      ...c, traits: [...c.traits, { ...trait, id: newId() }],
    }))
    set({ characters }); save(characters, get().xpLog)
  },

  updateTrait(id, traitId, patch) {
    const characters = mapChar(get().characters, id, c => ({
      ...c, traits: c.traits.map(t => t.id === traitId ? { ...t, ...patch } : t),
    }))
    set({ characters }); save(characters, get().xpLog)
  },

  deleteTrait(id, traitId) {
    const characters = mapChar(get().characters, id, c => ({
      ...c, traits: c.traits.filter(t => t.id !== traitId),
    }))
    set({ characters }); save(characters, get().xpLog)
  },

  addAbility(id, ability) {
    const characters = mapChar(get().characters, id, c => ({
      ...c, abilities: [...c.abilities, { ...ability, id: newId() }],
    }))
    set({ characters }); save(characters, get().xpLog)
  },

  updateAbility(id, abilityId, patch) {
    const characters = mapChar(get().characters, id, c => ({
      ...c, abilities: c.abilities.map(a => a.id === abilityId ? { ...a, ...patch } : a),
    }))
    set({ characters }); save(characters, get().xpLog)
  },

  deleteAbility(id, abilityId) {
    const characters = mapChar(get().characters, id, c => ({
      ...c, abilities: c.abilities.filter(a => a.id !== abilityId),
    }))
    set({ characters }); save(characters, get().xpLog)
  },

  addEffect(id, effect) {
    const newEffect: ActiveEffect = { ...effect, id: newId() }
    const characters = mapChar(get().characters, id, c => ({
      ...c, activeEffects: [...c.activeEffects, newEffect],
    }))
    set({ characters }); save(characters, get().xpLog)
    const char = characters.find(c => c.id === id)
    if (char) {
      const dur = effect.durationType === 'scenes' ? `${effect.remaining} scenes`
        : effect.durationType === 'days' ? `${effect.remaining} days`
        : effect.durationType
      log('effect-applied', `🧪 ${effect.name} applied to ${char.name} (${dur}).`)
    }
  },

  removeEffect(id, effectId) {
    const char = get().characters.find(c => c.id === id)
    const effect = char?.activeEffects.find(e => e.id === effectId)
    const characters = mapChar(get().characters, id, c => ({
      ...c, activeEffects: c.activeEffects.filter(e => e.id !== effectId),
    }))
    set({ characters }); save(characters, get().xpLog)
    if (char && effect) log('effect-expired', `✨ ${effect.name} expired on ${char.name}.`)
  },

  advanceEffectTime(durationType) {
    const before = get().characters
    const expired: string[] = []
    const dmgLogs: string[] = []

    // Roll & apply damage-over-time (e.g. Poison) for effects that match this
    // interval, then decrement and expire them. Only effects currently present
    // are ticked — a cured/removed effect never rolls (no unnecessary damage).
    let characters = before.map(c => {
      let damage = 0
      const activeEffects = c.activeEffects
        .map(e => {
          if (e.durationType !== durationType || e.remaining == null) return e
          if (e.damagePerRound) {
            const dmg = rollDiceSpec(e.damagePerRound)
            if (dmg > 0) {
              damage += dmg
              dmgLogs.push(`🩸 ${c.name} takes ${dmg} damage from ${e.name} (${e.damagePerRound}).`)
            }
          }
          return { ...e, remaining: e.remaining - 1 }
        })
        .filter(e => {
          if (e.durationType === durationType && e.remaining != null && e.remaining <= 0) {
            expired.push(`${e.name} on ${c.name}`)
            return false
          }
          return true
        })
      const currentHp = Math.max(0, c.currentHp - damage)
      return { ...c, activeEffects, currentHp }
    })

    // Resolve death / Tower-eject for anyone this tick dropped to 0 HP.
    for (const c of characters) {
      const prev = before.find(x => x.id === c.id)
      if (prev && prev.currentHp > 0 && c.currentHp === 0) {
        const resolved = resolveDeathAtZero(characters, c.id)
        characters = resolved.characters
        if (resolved.message) dmgLogs.push(resolved.message)
      }
    }

    set({ characters }); save(characters, get().xpLog)
    dmgLogs.forEach(l => log('character-move', l))
    expired.forEach(name => log('effect-expired', `✨ ${name} expired.`))
  },

  equipArmorPiece(id, slot, material, onHandItemId) {
    const baseDef = getBaseDef(material, slot)
    const characters = mapChar(get().characters, id, c => {
      const onHand = onHandItemId
        ? { items: c.onHand.items.map(i => i.id === onHandItemId ? { ...i, gearSlot: slot as CharacterItem['gearSlot'] } : i) }
        : c.onHand
      return {
        ...c,
        armorLoadout: { ...c.armorLoadout, [slot]: { material, baseDef, currentDef: baseDef, enchantments: [] } },
        onHand,
      }
    })
    set({ characters }); save(characters, get().xpLog)
  },

  unequipArmorPiece(id, slot) {
    const characters = mapChar(get().characters, id, c => ({
      ...c,
      armorLoadout: { ...c.armorLoadout, [slot]: null },
      onHand: { items: c.onHand.items.map(i => i.gearSlot === slot ? { ...i, gearSlot: undefined } : i) },
    }))
    set({ characters }); save(characters, get().xpLog)
  },

  equipFullSet(id, material) {
    const loadout = fullSetLoadout(material)
    const armorName = `${material.charAt(0).toUpperCase() + material.slice(1)} Armor`
    const armorId = newId()
    const characters = mapChar(get().characters, id, c => {
      // Clear any existing gearSlot from old armor items
      const cleared = c.onHand.items.map(i =>
        (i.gearSlot === 'armor' || i.gearSlot === 'shield') ? { ...i, gearSlot: undefined } : i
      )
      return {
        ...c,
        armorLoadout: loadout,
        onHand: { items: [...cleared, { id: armorId, name: armorName, quantity: 1, gearSlot: 'armor' as const }] },
      }
    })
    set({ characters }); save(characters, get().xpLog)
  },

  overrideArmorDef(id, slot, value) {
    const characters = mapChar(get().characters, id, c => {
      const piece = c.armorLoadout[slot]
      if (!piece) return c
      return {
        ...c,
        armorLoadout: { ...c.armorLoadout, [slot]: { ...piece, currentDef: value } },
      }
    })
    set({ characters }); save(characters, get().xpLog)
  },

  resetArmorDef(id, slot) {
    const characters = mapChar(get().characters, id, c => {
      const piece = c.armorLoadout[slot]
      if (!piece) return c
      return {
        ...c,
        armorLoadout: { ...c.armorLoadout, [slot]: { ...piece, currentDef: piece.baseDef } },
      }
    })
    set({ characters }); save(characters, get().xpLog)
  },

  addArmorEnchantment(id, slot, enchantment) {
    const enc: GearEnchantment = { ...enchantment, id: newId() }
    const characters = mapChar(get().characters, id, c => {
      const piece = c.armorLoadout[slot]
      if (!piece) return c
      return {
        ...c,
        armorLoadout: {
          ...c.armorLoadout,
          [slot]: { ...piece, enchantments: [...piece.enchantments, enc] },
        },
      }
    })
    set({ characters }); save(characters, get().xpLog)
  },

  removeArmorEnchantment(id, slot, enchantmentId) {
    const characters = mapChar(get().characters, id, c => {
      const piece = c.armorLoadout[slot]
      if (!piece) return c
      return {
        ...c,
        armorLoadout: {
          ...c.armorLoadout,
          [slot]: {
            ...piece,
            enchantments: piece.enchantments.filter(e => e.id !== enchantmentId),
          },
        },
      }
    })
    set({ characters }); save(characters, get().xpLog)
  },

  advanceArmorEnchantmentTime(durationType) {
    const expired: string[] = []
    const characters = get().characters.map(c => {
      const slots: ArmorSlot[] = ['armor', 'shield']
      const newLoadout = { ...c.armorLoadout }
      for (const slot of slots) {
        const piece = newLoadout[slot]
        if (!piece) continue
        const enchantments = piece.enchantments
          .map(e => e.durationType !== durationType || e.remaining == null
            ? e : { ...e, remaining: e.remaining - 1 })
          .filter(e => {
            if (e.durationType === durationType && e.remaining != null && e.remaining <= 0) {
              expired.push(`${e.name} on ${c.name}'s ${slot}`)
              return false
            }
            return true
          })
        newLoadout[slot] = { ...piece, enchantments }
      }
      return { ...c, armorLoadout: newLoadout }
    })
    set({ characters }); save(characters, get().xpLog)
    expired.forEach(name => log('effect-expired', `✨ ${name} expired.`))
  },

  equipWeapon(id, hand, weapon, onHandItemId) {
    const w: Weapon = { ...weapon, id: newId() }
    const characters = mapChar(get().characters, id, c => {
      const onHand = onHandItemId
        ? { items: c.onHand.items.map(i => i.id === onHandItemId ? { ...i, gearSlot: hand as CharacterItem['gearSlot'] } : i) }
        : c.onHand
      return { ...c, weaponLoadout: { ...c.weaponLoadout, [hand]: w }, onHand }
    })
    set({ characters }); save(characters, get().xpLog)
  },

  unequipWeapon(id, hand) {
    const characters = mapChar(get().characters, id, c => ({
      ...c,
      weaponLoadout: { ...c.weaponLoadout, [hand]: null },
      onHand: { items: c.onHand.items.map(i => i.gearSlot === hand ? { ...i, gearSlot: undefined } : i) },
    }))
    set({ characters }); save(characters, get().xpLog)
  },

  overrideWeaponBonus(id, hand, value) {
    const characters = mapChar(get().characters, id, c => {
      const weapon = c.weaponLoadout[hand]
      if (!weapon) return c
      return {
        ...c,
        weaponLoadout: {
          ...c.weaponLoadout,
          [hand]: { ...weapon, currentDamageBonus: value },
        },
      }
    })
    set({ characters }); save(characters, get().xpLog)
  },

  resetWeaponBonus(id, hand) {
    const characters = mapChar(get().characters, id, c => {
      const weapon = c.weaponLoadout[hand]
      if (!weapon) return c
      return {
        ...c,
        weaponLoadout: {
          ...c.weaponLoadout,
          [hand]: { ...weapon, currentDamageBonus: weapon.baseDamageBonus },
        },
      }
    })
    set({ characters }); save(characters, get().xpLog)
  },

  addWeaponEnchantment(id, hand, enchantment) {
    const enc: GearEnchantment = { ...enchantment, id: newId() }
    const characters = mapChar(get().characters, id, c => {
      const weapon = c.weaponLoadout[hand]
      if (!weapon) return c
      return {
        ...c,
        weaponLoadout: {
          ...c.weaponLoadout,
          [hand]: { ...weapon, enchantments: [...weapon.enchantments, enc] },
        },
      }
    })
    set({ characters }); save(characters, get().xpLog)
  },

  removeWeaponEnchantment(id, hand, enchantmentId) {
    const characters = mapChar(get().characters, id, c => {
      const weapon = c.weaponLoadout[hand]
      if (!weapon) return c
      return {
        ...c,
        weaponLoadout: {
          ...c.weaponLoadout,
          [hand]: {
            ...weapon,
            enchantments: weapon.enchantments.filter(e => e.id !== enchantmentId),
          },
        },
      }
    })
    set({ characters }); save(characters, get().xpLog)
  },

  advanceWeaponEnchantmentTime(durationType) {
    const expired: string[] = []
    const characters = get().characters.map(c => {
      const hands = ['mainHand', 'offHand'] as const
      const newLoadout = { ...c.weaponLoadout }
      for (const hand of hands) {
        const weapon = newLoadout[hand]
        if (!weapon) continue
        const enchantments = weapon.enchantments
          .map(e => e.durationType !== durationType || e.remaining == null
            ? e : { ...e, remaining: e.remaining - 1 })
          .filter(e => {
            if (e.durationType === durationType && e.remaining != null && e.remaining <= 0) {
              expired.push(`${e.name} on ${c.name}'s ${weapon.name}`)
              return false
            }
            return true
          })
        newLoadout[hand] = { ...weapon, enchantments }
      }
      return { ...c, weaponLoadout: newLoadout }
    })
    set({ characters }); save(characters, get().xpLog)
    expired.forEach(name => log('effect-expired', `✨ ${name} expired.`))
  },

  useRestCharge(id, chargeId) {
    const characters = mapChar(get().characters, id, c => {
      const fs = c.classFeatureState
      if (fs.class === 'Warrior') {
        return { ...c, classFeatureState: { ...fs, state: { ...fs.state, maneuvers: fs.state.maneuvers.map(m => m.id === chargeId ? { ...m, used: true } : m) } } }
      }
      if (fs.class === 'Vindicator') {
        return { ...c, classFeatureState: { ...fs, state: { ...fs.state, voices: fs.state.voices.map(v => v.id === chargeId ? { ...v, used: true } : v) } } }
      }
      if (fs.class === 'Delver') {
        return { ...c, classFeatureState: { ...fs, state: { ...fs.state, evasions: fs.state.evasions.map(e => e.id === chargeId ? { ...e, used: true } : e) } } }
      }
      return c
    })
    set({ characters }); save(characters, get().xpLog)
  },

  resetClassFeatures(id) {
    const characters = mapChar(get().characters, id, c => ({
      ...c,
      classFeatureState: resetClassState(c.classFeatureState),
      disciplineEdge: { ...c.disciplineEdge, used: false },
    }))
    set({ characters }); save(characters, get().xpLog)
  },

  resetAllClassFeaturesOnRest(characterIds) {
    const characters = get().characters.map(c => {
      if (!characterIds.includes(c.id)) return c
      return {
        ...c,
        classFeatureState: resetClassState(c.classFeatureState),
        disciplineEdge: { ...c.disciplineEdge, used: false },
        activeEffects: c.activeEffects.filter(e => e.durationType !== 'until-rest'),
      }
    })
    set({ characters }); save(characters, get().xpLog)
  },

  resetMagicCirclesOnDayEnd() {
    const characters = get().characters.map(c => {
      if (c.classFeatureState.class !== 'Enchanter') return c
      const fs = c.classFeatureState
      return {
        ...c,
        classFeatureState: {
          ...fs,
          state: { ...(fs.state as unknown as Record<string, unknown>), magicCircleActive: false },
        } as unknown as ClassFeatureState,
      }
    })
    set({ characters }); save(characters, get().xpLog)
  },

  updateClassState(id, patch) {
    const characters = mapChar(get().characters, id, c => {
      const fs = c.classFeatureState
      const merged = { ...(fs.state as unknown as Record<string, unknown>), ...patch }
      return {
        ...c,
        classFeatureState: { ...fs, state: merged } as unknown as ClassFeatureState,
      }
    })
    set({ characters }); save(characters, get().xpLog)
  },

  setEdgeUsed(id, used) {
    const characters = mapChar(get().characters, id, c => ({
      ...c, disciplineEdge: { ...c.disciplineEdge, used },
    }))
    set({ characters }); save(characters, get().xpLog)
  },

  addOnHandItem(id, item) {
    const itemId = newId()
    const characters = mapChar(get().characters, id, c => ({
      ...c, onHand: { items: [...c.onHand.items, { ...item, id: itemId }] },
    }))
    set({ characters }); save(characters, get().xpLog)
    return itemId
  },

  updateOnHandItem(id, itemId, patch) {
    const characters = mapChar(get().characters, id, c => ({
      ...c, onHand: { items: c.onHand.items.map(i => i.id === itemId ? { ...i, ...patch } : i) },
    }))
    set({ characters }); save(characters, get().xpLog)
  },

  removeOnHandItem(id, itemId) {
    const characters = mapChar(get().characters, id, c => ({
      ...c, onHand: { items: c.onHand.items.filter(i => i.id !== itemId) },
    }))
    set({ characters }); save(characters, get().xpLog)
  },

  addStorageItem(id, item) {
    const characters = mapChar(get().characters, id, c => ({
      ...c, storage: { items: [...c.storage.items, { ...item, id: newId() }] },
    }))
    set({ characters }); save(characters, get().xpLog)
  },

  updateStorageItem(id, itemId, patch) {
    const characters = mapChar(get().characters, id, c => ({
      ...c, storage: { items: c.storage.items.map(i => i.id === itemId ? { ...i, ...patch } : i) },
    }))
    set({ characters }); save(characters, get().xpLog)
  },

  removeStorageItem(id, itemId) {
    const characters = mapChar(get().characters, id, c => ({
      ...c, storage: { items: c.storage.items.filter(i => i.id !== itemId) },
    }))
    set({ characters }); save(characters, get().xpLog)
  },

  moveItemToStorage(id, itemId) {
    const characters = mapChar(get().characters, id, c => {
      const item = c.onHand.items.find(i => i.id === itemId)
      if (!item) return c
      return {
        ...c,
        onHand: { items: c.onHand.items.filter(i => i.id !== itemId) },
        storage: { items: [...c.storage.items, item] },
      }
    })
    set({ characters }); save(characters, get().xpLog)
  },

  moveItemToHand(id, itemId) {
    const characters = mapChar(get().characters, id, c => {
      const item = c.storage.items.find(i => i.id === itemId)
      if (!item) return c
      return {
        ...c,
        storage: { items: c.storage.items.filter(i => i.id !== itemId) },
        onHand: { items: [...c.onHand.items, item] },
      }
    })
    set({ characters }); save(characters, get().xpLog)
  },

  giveItemToCharacter(fromId, itemId, fromSection, toId) {
    const state = get()
    const fromChar = state.characters.find(c => c.id === fromId)
    const toChar = state.characters.find(c => c.id === toId)
    if (!fromChar || !toChar) return
    const item = fromSection === 'onHand'
      ? fromChar.onHand.items.find(i => i.id === itemId)
      : fromChar.storage.items.find(i => i.id === itemId)
    if (!item) return
    const newItemId = newId()
    let characters = state.characters
    // Remove from source
    characters = mapChar(characters, fromId, c =>
      fromSection === 'onHand'
        ? { ...c, onHand: { items: c.onHand.items.filter(i => i.id !== itemId) } }
        : { ...c, storage: { items: c.storage.items.filter(i => i.id !== itemId) } }
    )
    // Add to target's onHand
    characters = mapChar(characters, toId, c => ({
      ...c, onHand: { items: [...c.onHand.items, { ...item, id: newItemId }] },
    }))
    set({ characters }); save(characters, get().xpLog)
    log('item-transfer', `🎁 ${fromChar.name} gave ${item.name || 'an item'} to ${toChar.name}.`)
  },

  setCurrency(id, patch) {
    const characters = mapChar(get().characters, id, c => ({
      ...c, currency: { ...c.currency, ...patch },
    }))
    set({ characters }); save(characters, get().xpLog)
  },

  setRations(id, count) {
    const characters = mapChar(get().characters, id, c => ({ ...c, rations: count }))
    set({ characters }); save(characters, get().xpLog)
  },

  missRest(id) {
    const characters = mapChar(get().characters, id, c => ({
      ...c, missedRests: c.missedRests + 1,
    }))
    set({ characters }); save(characters, get().xpLog)
    const char = characters.find(c => c.id === id)
    if (char) log('missed-rest', `⚠️ ${char.name} skipped a rest. Cumulative ${char.missedRests}d4 penalty now applies to all rolls.`)
  },

  resetMissedRests(id) {
    const characters = mapChar(get().characters, id, c => ({ ...c, missedRests: 0 }))
    set({ characters }); save(characters, get().xpLog)
  },
}))

export { defaultClassFeatureState }
