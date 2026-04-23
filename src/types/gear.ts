// ── Gear Enchantments ──────────────────────────────────────────────────
export type GearDuration = 'scenes' | 'days' | 'permanent' | 'manual'

export interface GearEnchantment {
  id: string
  name: string
  description?: string
  durationType: GearDuration
  remaining?: number
}

// ── Armor ──────────────────────────────────────────────────────────────
export type ArmorSlot = 'armor' | 'shield'

export type ArmorMaterial =
  | 'leather' | 'chainmail' | 'iron' | 'gold' | 'diamond' | 'netherite'
  | 'turtle-shell' | 'none'

export interface ArmorPiece {
  material: ArmorMaterial
  baseDef: number
  currentDef: number
  enchantments: GearEnchantment[]
  customName?: string
}

export interface ArmorLoadout {
  armor: ArmorPiece | null
  shield: ArmorPiece | null
}

// ── Weapons ────────────────────────────────────────────────────────────
export type WeaponType =
  | 'sword' | 'axe' | 'pickaxe' | 'shovel'
  | 'trident' | 'bow' | 'crossbow' | 'mace' | 'fist'

export type WeaponMaterial = 'wood' | 'stone' | 'iron' | 'gold' | 'diamond' | 'netherite' | 'none'

export interface Weapon {
  id: string
  name: string
  type: WeaponType
  material: WeaponMaterial
  baseDamageBonus: number
  currentDamageBonus: number
  enchantments: GearEnchantment[]
  notes?: string
}

export interface WeaponLoadout {
  mainHand: Weapon | null
  offHand: Weapon | null
}
