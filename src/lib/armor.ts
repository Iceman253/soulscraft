import type { ArmorLoadout, ArmorMaterial } from '../types'

// ── DEF values per material (whole set — rulebook p.77) ─────────────────
// Armor is a single equip covering the full body. Shield is separate.
export const ARMOR_DEF_VALUES: Record<ArmorMaterial, number> = {
  leather:       1,
  chainmail:     1,
  iron:          2,
  gold:          3,
  diamond:       4,
  netherite:     5,
  'turtle-shell': 0,  // not listed as armor set; kept for compatibility
  none:          0,
}

// ── Tags per material ────────────────────────────────────────────────────
export const ARMOR_TAGS: Partial<Record<ArmorMaterial, string>> = {
  leather:    'Lightweight',
  chainmail:  'Noisy',
  iron:       'Resilient, Clumsy',
  gold:       'Enchantment-friendly, Radiant, Fragile, Clumsy',
  diamond:    'Radiant, Indestructible, Clumsy',
  netherite:  'Indestructible, Fireproof, Dreadful, Enchantment-friendly, Clumsy',
}

export const SHIELD_DEF = 1
export const SHIELD_TAGS = 'Clumsy'

export function getBaseDef(material: ArmorMaterial, slot: string): number {
  if (slot === 'shield') return SHIELD_DEF
  return ARMOR_DEF_VALUES[material] ?? 0
}

export function computeDef(loadout: ArmorLoadout): number {
  return (loadout.armor?.currentDef ?? 0) + (loadout.shield?.currentDef ?? 0)
}

export const ARMOR_MATERIALS: ArmorMaterial[] = [
  'leather', 'chainmail', 'iron', 'gold', 'diamond', 'netherite',
]

export const ARMOR_SLOTS = ['armor', 'shield'] as const

export const ARMOR_SLOT_LABELS: Record<string, string> = {
  armor:  'Armor (full set)',
  shield: 'Shield',
}

export const SLOT_VALID_MATERIALS: Record<string, ArmorMaterial[]> = {
  armor:  ['leather', 'chainmail', 'iron', 'gold', 'diamond', 'netherite'],
  shield: ['iron', 'diamond', 'netherite'],
}

export function emptyLoadout(): ArmorLoadout {
  return { armor: null, shield: null }
}

export function fullSetLoadout(material: ArmorMaterial): ArmorLoadout {
  const def = getBaseDef(material, 'armor')
  return {
    armor:  { material, baseDef: def, currentDef: def, enchantments: [] },
    shield: null,
  }
}
