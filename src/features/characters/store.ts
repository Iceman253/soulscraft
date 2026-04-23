import { create } from 'zustand'
import type {
  Character, ArmorSlot, ArmorMaterial,
  Weapon, ActiveEffect, GearEnchantment, ClassFeatureState,
  Skill, Trait, Ability, CharacterItem, XpEvent,
} from '../../types'
import { newId } from '../../lib/id'
import { useCampaignStore } from '../campaigns/store'
import { useWorldStore } from '../map/store'
import { log } from '../log/store'
import { getBaseDef, fullSetLoadout } from '../../lib/armor'
import { WARRIOR_MANEUVERS, DELVER_EVASIONS, VINDICATOR_VOICES, CLASS_DAMAGE_DICE, CLASS_DISCIPLINES, DISCIPLINE_EDGES, DEFAULT_CLASS_SKILLS, SPECIES_DATA } from '../../lib/constants'

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
  awardXp: (characterId: string, amount: number, source: XpEvent['source'], note?: string) => void
  levelUp: (id: string) => void

  // Location
  setLocation: (id: string, locationId: string | null) => void
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

  hydrate(characters, xpLog) { set({ characters, xpLog }) },

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
      id: newId(), name: s, bonus: 1 as const, description: '',
    }))
    const characters = mapChar(get().characters, id, c => ({
      ...c,
      class: newClass,
      damageDie: CLASS_DAMAGE_DICE[newClass] ?? c.damageDie,
      classFeatureState: defaultClassFeatureState(newClass),
      discipline: firstDiscipline,
      disciplineEdge: edge
        ? { name: edge.name, description: edge.description, used: false }
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
        ? { name: edge.name, description: edge.description, used: false }
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
      ...(speciesInfo ? [{ id: newId(), name: speciesInfo.speciesTrait.name, description: speciesInfo.speciesTrait.description }] : []),
      ...(variantData ? [{ id: newId(), name: variantData.trait.name, description: variantData.trait.description }] : []),
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
    const characters = mapChar(get().characters, id, c => ({
      ...c,
      currentHp: Math.max(0, Math.min(c.maxHp, c.currentHp + delta)),
    }))
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
    const characters = mapChar(get().characters, id, c => ({
      ...c,
      level: c.level + 1,
      xp: c.xp - 5,
      maxSd: 5 + (c.level + 1),
      currentSd: 5 + (c.level + 1),
    }))
    set({ characters })
    save(characters, get().xpLog)
    const char = characters.find(c => c.id === id)
    if (char) log('level-up', `🎉 ${char.name} leveled up to Level ${char.level}!`)
  },

  setLocation(id, locationId) {
    const characters = mapChar(get().characters, id, c => ({ ...c, locationId }))
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
    const expired: string[] = []
    const characters = get().characters.map(c => {
      const activeEffects = c.activeEffects
        .map(e => {
          if (e.durationType !== durationType || e.remaining == null) return e
          return { ...e, remaining: e.remaining - 1 }
        })
        .filter(e => {
          if (e.durationType === durationType && e.remaining != null && e.remaining <= 0) {
            expired.push(`${e.name} on ${c.name}`)
            return false
          }
          return true
        })
      return { ...c, activeEffects }
    })
    set({ characters }); save(characters, get().xpLog)
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
