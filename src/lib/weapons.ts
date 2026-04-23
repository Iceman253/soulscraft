import type { WeaponMaterial, WeaponType } from '../types'

export const WEAPON_DAMAGE_BONUS: Partial<Record<WeaponMaterial, Partial<Record<WeaponType, number>>>> = {
  wood:      { sword: 0, axe: 0, pickaxe: 0, shovel: 0 },
  stone:     { sword: 1, axe: 1, pickaxe: 1, shovel: 1 },
  iron:      { sword: 1, axe: 2, pickaxe: 1, shovel: 1 },
  gold:      { sword: 0, axe: 0, pickaxe: 0, shovel: 0 },
  diamond:   { sword: 2, axe: 2, pickaxe: 2, shovel: 2 },
  netherite: { sword: 3, axe: 3, pickaxe: 3, shovel: 3, mace: 3 },
  none:      { trident: 2, bow: 0, crossbow: 1, fist: 0 },
}

export function getWeaponDamageBonus(material: WeaponMaterial, type: WeaponType): number {
  return WEAPON_DAMAGE_BONUS[material]?.[type] ?? 0
}

export const WEAPON_TYPES: WeaponType[] = [
  'sword', 'axe', 'pickaxe', 'shovel', 'trident', 'bow', 'crossbow', 'mace', 'fist',
]

export const WEAPON_TYPE_LABELS: Record<WeaponType, string> = {
  sword: 'Sword', axe: 'Axe', pickaxe: 'Pickaxe', shovel: 'Shovel',
  trident: 'Trident', bow: 'Bow', crossbow: 'Crossbow', mace: 'Mace', fist: 'Fist',
}

// Which materials are valid for each weapon type
export const WEAPON_TYPE_MATERIALS: Record<WeaponType, WeaponMaterial[]> = {
  sword:    ['wood', 'stone', 'iron', 'gold', 'diamond', 'netherite'],
  axe:      ['wood', 'stone', 'iron', 'gold', 'diamond', 'netherite'],
  pickaxe:  ['wood', 'stone', 'iron', 'gold', 'diamond', 'netherite'],
  shovel:   ['wood', 'stone', 'iron', 'gold', 'diamond', 'netherite'],
  trident:  ['none'],
  bow:      ['none'],
  crossbow: ['none'],
  mace:     ['netherite'],
  fist:     ['none'],
}

export const WEAPON_MATERIAL_LABELS: Record<WeaponMaterial, string> = {
  wood: 'Wooden', stone: 'Stone', iron: 'Iron', gold: 'Golden',
  diamond: 'Diamond', netherite: 'Netherite', none: '—',
}

// Default name for a weapon given type + material
export function defaultWeaponName(type: WeaponType, material: WeaponMaterial): string {
  if (material === 'none') return WEAPON_TYPE_LABELS[type]
  return `${WEAPON_MATERIAL_LABELS[material]} ${WEAPON_TYPE_LABELS[type]}`
}

export const WEAPON_PRESETS: Array<{ type: WeaponType; material: WeaponMaterial }> = [
  { type: 'sword', material: 'iron' },
  { type: 'sword', material: 'diamond' },
  { type: 'sword', material: 'netherite' },
  { type: 'axe',   material: 'iron' },
  { type: 'axe',   material: 'diamond' },
  { type: 'bow',   material: 'none' },
  { type: 'crossbow', material: 'none' },
  { type: 'trident',  material: 'none' },
  { type: 'mace',     material: 'netherite' },
]
