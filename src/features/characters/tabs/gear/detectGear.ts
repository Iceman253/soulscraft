// Guess a gear item's material and type from its name.
import { WEAPON_TYPES } from '../../../../lib/rules/weapons'
import type { ArmorMaterial, WeaponType, WeaponMaterial } from '../../../../types'

// ── Name auto-detection helpers ───────────────────────────────────────
export function detectArmorMaterial(name: string): ArmorMaterial | undefined {
  const lower = name.toLowerCase()
  return (['leather', 'chainmail', 'iron', 'gold', 'diamond', 'netherite'] as ArmorMaterial[]).find(m => lower.includes(m))
}
export function detectWeaponMaterial(name: string): WeaponMaterial | undefined {
  const lower = name.toLowerCase()
  return (['wood', 'stone', 'iron', 'gold', 'diamond', 'netherite'] as WeaponMaterial[]).find(m => lower.includes(m))
}
export function detectWeaponType(name: string): WeaponType | undefined {
  const lower = name.toLowerCase()
  return WEAPON_TYPES.find(t => lower.includes(t))
}
