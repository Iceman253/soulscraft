import { create } from 'zustand'
import type { BestiaryEntry } from '../../types'
import { newId } from '../../lib/id'
import { useCampaignStore } from '../campaigns/store'

const RULEBOOK_CREATURES: Omit<BestiaryEntry, 'id'>[] = [
  // ── Confirmed rulebook stat blocks ────────────────────────────────────
  { name: 'Zombie',          hpTier: 'weak',    maxHp: 4,  size: 'medium',  creatureType: ['undead'],                    speed: 'slow',   abilities: 'Infects on hit (DC 8 to resist)', isCustom: false },
  { name: 'Skeleton',        hpTier: 'average', maxHp: 6,  size: 'medium',  creatureType: ['undead'],                    speed: 'normal', abilities: 'Ranged bow attack; immune to fall damage', isCustom: false },
  { name: 'Creeper',         hpTier: 'average', maxHp: 5,  size: 'medium',  creatureType: ['aberration'],                speed: 'normal', abilities: 'Explodes on death or when adjacent (3d6 blast)', isCustom: false },
  { name: 'Cave Spider',     hpTier: 'weak',    maxHp: 3,  size: 'small',   creatureType: ['natural', 'arthropod'],      speed: 'fast',   abilities: 'Venomous; inflicts Poison on hit; squeezes through tight gaps', isCustom: false },
  { name: 'Blaze',           hpTier: 'average', maxHp: 8,  size: 'medium',  creatureType: ['elemental'],                 speed: 'fast',   abilities: 'Flies; fires three fireballs per turn; immune to fire', isCustom: false },
  { name: 'Witch',           hpTier: 'strong',  maxHp: 12, size: 'medium',  creatureType: ['magical', 'intelligent'],    speed: 'normal', abilities: 'Throws potions; heals self; resistant to magic', isCustom: false },
  { name: 'Slime',           hpTier: 'average', maxHp: 7,  size: 'large',   creatureType: ['aberration'],                speed: 'slow',   abilities: 'Splits into 2 smaller slimes on death (large→medium→small); HP 7/5/3', isCustom: false },
  { name: 'Ghast',           hpTier: 'average', maxHp: 7,  size: 'massive', creatureType: ['aberration'],                speed: 'fast',   abilities: 'Flies; fires explosive fireballs; fireball can be deflected back', isCustom: false },
  { name: 'Wither Skeleton', hpTier: 'mighty',  maxHp: 13, size: 'large',   creatureType: ['undead', 'intelligent'],     speed: 'fast',   abilities: 'Applies Wither II on hit; immune to fire', isCustom: false },
  { name: 'Hoglin',          hpTier: 'average', maxHp: 8,  size: 'large',   creatureType: ['natural'],                   speed: 'fast',   abilities: 'Charges; knocks back targets; repelled by warped fungus', isCustom: false },
  { name: 'Endermite',       hpTier: 'weak',    maxHp: 2,  size: 'small',   creatureType: ['magical', 'arthropod'],      speed: 'fast',   abilities: 'Spawns from Ender Pearls; distracts Endermen; deals 2 flat damage', isCustom: false },
  { name: 'Silverfish',      hpTier: 'weak',    maxHp: 2,  size: 'small',   creatureType: ['natural', 'arthropod'],      speed: 'fast',   abilities: 'Calls swarm allies when injured; hides in stone blocks; deals 2 flat damage', isCustom: false },
  { name: 'Guardian',        hpTier: 'strong',  maxHp: 12, size: 'large',   creatureType: ['construct'],                 speed: 'fast',   abilities: 'Ranged laser; thorns aura damages melee attackers', isCustom: false },
  { name: 'Elder Guardian',  hpTier: 'mighty',  maxHp: 15, size: 'massive', creatureType: ['construct', 'intelligent'],  speed: 'slow',   abilities: 'Mining Fatigue aura; powerful laser (ignores non-enchanted armor DEF); thorns', isCustom: false },
  { name: 'Shulker',         hpTier: 'average', maxHp: 8,  size: 'small',   creatureType: ['natural'],                   speed: 'slow',   abilities: 'Fires levitation bullets; immune while shell closed', isCustom: false },
  { name: 'Wither',          hpTier: 'mighty',  maxHp: 20, size: 'large',   creatureType: ['undead'],                    speed: 'fast',   abilities: 'Fires Wither skulls; explosion on summon; heals over time; immune to fire', isCustom: false },
  { name: 'Ravager',         hpTier: 'mighty',  maxHp: 13, size: 'large',   creatureType: ['natural'],                   speed: 'fast',   abilities: 'Charges; roar knocks back; destroys blocks', isCustom: false },
  { name: 'Drowned',         hpTier: 'weak',    maxHp: 4,  size: 'medium',  creatureType: ['undead'],                    speed: 'slow',   abilities: 'Trident throw; can hold nautilus shell', isCustom: false },
  { name: 'Phantom',         hpTier: 'average', maxHp: 8,  size: 'medium',  creatureType: ['undead'],                    speed: 'fast',   abilities: 'Swoops to attack sleepy characters; ignites in daylight', isCustom: false },
  { name: 'Magma Cube',      hpTier: 'average', maxHp: 7,  size: 'large',   creatureType: ['elemental'],                 speed: 'slow',   abilities: 'Immune to fire; splits on death (HP 7/5/3); immune to fall damage', isCustom: false },
  { name: 'Strider',         hpTier: 'average', maxHp: 5,  size: 'medium',  creatureType: ['natural'],                   speed: 'normal', abilities: 'Walks on lava; slows in cold; can be ridden with warped fungus on stick', isCustom: false },
  // ── Not in rulebook bestiary (kept for reference) ─────────────────────
  { name: 'Spider',          hpTier: 'weak',    size: 'medium',  creatureType: ['natural'],          speed: 'fast',   abilities: 'Climb walls; can poison on hit', isCustom: false },
  { name: 'Enderman',        hpTier: 'average', size: 'large',   creatureType: ['elemental'],        speed: 'fast',   abilities: 'Teleports; enrages when looked at; immune to ranged attacks', isCustom: false },
  { name: 'Piglin',          hpTier: 'weak',    size: 'medium',  creatureType: ['natural'],          speed: 'normal', abilities: 'Hostile without gold; can be bartered with; ranged crossbow', isCustom: false },
  { name: 'Piglin Brute',    hpTier: 'strong',  size: 'medium',  creatureType: ['natural'],          speed: 'normal', abilities: 'Cannot be bartered with; powerful axe attacks; immune to fire', isCustom: false },
  { name: 'Pillager',        hpTier: 'weak',    size: 'medium',  creatureType: ['natural', 'intelligent'], speed: 'normal', abilities: 'Ranged crossbow; can be captured to summon raid', isCustom: false },
  { name: 'Vindicator',      hpTier: 'average', size: 'medium',  creatureType: ['natural', 'intelligent'], speed: 'normal', abilities: 'Axes deal extra damage; attacks doors', isCustom: false },
  { name: 'Evoker',          hpTier: 'average', size: 'medium',  creatureType: ['magical', 'intelligent'], speed: 'slow',   abilities: 'Summons Vex; Fangs spell; can change sheep color', isCustom: false },
  { name: 'Vex',             hpTier: 'weak',    size: 'small',   creatureType: ['magical'],          speed: 'fast',   abilities: 'Flies; phases through walls; limited lifespan', isCustom: false },
  { name: 'Ender Dragon',    hpTier: 'mighty',  size: 'massive', creatureType: ['elemental'],        speed: 'fast',   abilities: 'Breath attack; End Crystal healing; immune to most damage; flies', isCustom: false },
]

interface BestiaryStore {
  entries: BestiaryEntry[]
  hydrate: (entries: BestiaryEntry[]) => void
  addEntry: (entry: Omit<BestiaryEntry, 'id'>) => string
  updateEntry: (id: string, patch: Partial<BestiaryEntry>) => void
  deleteEntry: (id: string) => void
  resetToDefaults: () => void
}

function save(entries: BestiaryEntry[]) {
  useCampaignStore.getState().updateCampaignData({ bestiary: entries })
}

export const useBestiaryStore = create<BestiaryStore>((set, get) => ({
  entries: [],

  hydrate(entries) {
    // If no entries exist, seed with rulebook defaults
    if (entries.length === 0) {
      const defaults = RULEBOOK_CREATURES.map(c => ({ ...c, id: newId() }))
      set({ entries: defaults })
      save(defaults)
    } else {
      // Migrate old format: creatureType was a string, now it's string[]
      const migrated = entries.map(e => ({
        ...e,
        creatureType: Array.isArray(e.creatureType) ? e.creatureType : [e.creatureType as unknown as string],
      }))
      set({ entries: migrated })
    }
  },

  addEntry(entry) {
    const id = newId()
    const entries = [...get().entries, { ...entry, id }]
    set({ entries }); save(entries)
    return id
  },

  updateEntry(id, patch) {
    const entries = get().entries.map(e => e.id === id ? { ...e, ...patch } : e)
    set({ entries }); save(entries)
  },

  deleteEntry(id) {
    const entries = get().entries.filter(e => e.id !== id)
    set({ entries }); save(entries)
  },

  resetToDefaults() {
    const defaults = RULEBOOK_CREATURES.map(c => ({ ...c, id: newId() }))
    set({ entries: defaults })
    save(defaults)
  },
}))
