// Weapon specs: the stats a sold or carried weapon keeps until it's equipped.
import type { CharacterItem, GearEnchantment, Good, Weapon, WeaponMaterial, WeaponSpec, WeaponType } from '../../types'
import { WEAPON_MATERIAL_LABELS, WEAPON_TYPE_LABELS, WEAPON_TYPE_MATERIALS, getWeaponDamageBonus } from './weapons'

/** A plain weapon of this type and material, at its rulebook damage bonus. */
export function defaultWeaponSpec(type: WeaponType = 'sword', material: WeaponMaterial = 'iron'): WeaponSpec {
  return { type, material, damageBonus: getWeaponDamageBonus(material, type), enchantments: [] }
}

/** Move to a new type and material. A damage bonus still at the rulebook value
 *  follows the change; one the GM set by hand is kept. */
function rebase(spec: WeaponSpec, type: WeaponType, material: WeaponMaterial): WeaponSpec {
  const atDefault = spec.damageBonus === getWeaponDamageBonus(spec.material, spec.type)
  return { ...spec, type, material, damageBonus: atDefault ? getWeaponDamageBonus(material, type) : spec.damageBonus }
}

/** Change the type, keeping the material when that type comes in it. */
export function withWeaponType(spec: WeaponSpec, type: WeaponType): WeaponSpec {
  const materials = WEAPON_TYPE_MATERIALS[type] ?? []
  const material = materials.includes(spec.material) ? spec.material : (materials[0] ?? 'none')
  return rebase(spec, type, material)
}

export function withWeaponMaterial(spec: WeaponSpec, material: WeaponMaterial): WeaponSpec {
  return rebase(spec, spec.type, material)
}

/** The weapon a spec becomes in a hand. Enchantments get fresh ids so two
 *  copies of one ware never share them. */
export function weaponFromSpec(spec: WeaponSpec, name: string, newId: () => string): Omit<Weapon, 'id'> {
  return {
    name,
    type: spec.type,
    material: spec.material,
    baseDamageBonus: spec.damageBonus,
    currentDamageBonus: spec.damageBonus,
    enchantments: spec.enchantments.map(e => ({ ...e, id: newId() })),
    ...(spec.notes ? { notes: spec.notes } : {}),
  }
}

/** What's left of a weapon when it's put away: enchantments keep their remaining
 *  time, and a temporary damage override is dropped. */
export function specFromWeapon(w: Weapon): WeaponSpec {
  return {
    type: w.type,
    material: w.material,
    damageBonus: w.baseDamageBonus,
    enchantments: w.enchantments,
    ...(w.notes ? { notes: w.notes } : {}),
  }
}

export function enchantmentLabel(e: Pick<GearEnchantment, 'name' | 'durationType' | 'remaining'>): string {
  if (e.durationType === 'scenes' || e.durationType === 'days') return `${e.name} (${e.remaining ?? 0} ${e.durationType})`
  return e.durationType === 'permanent' ? e.name : `${e.name} (until removed)`
}

/** One line for a ware or item, e.g. "Diamond Sword · +3 damage · Fire Aspect (3 scenes)". */
export function describeWeaponSpec(spec: WeaponSpec): string {
  const kind = spec.material === 'none'
    ? WEAPON_TYPE_LABELS[spec.type]
    : `${WEAPON_MATERIAL_LABELS[spec.material]} ${WEAPON_TYPE_LABELS[spec.type]}`
  const sign = spec.damageBonus >= 0 ? '+' : '−'
  return [kind, `${sign}${Math.abs(spec.damageBonus)} damage`, ...spec.enchantments.map(enchantmentLabel)].join(' · ')
}

/** The On Hand item a purchase delivers: blocks for stacked goods, and the
 *  weapon's stats for a weapon. `perUnit` is blocks per unit (0 if not blocks). */
export function itemFromGood(good: Pick<Good, 'name' | 'description' | 'weapon'>, qty: number, perUnit: number): Omit<CharacterItem, 'id'> {
  return {
    name: good.name,
    quantity: qty * (perUnit || 1),
    isBlock: perUnit > 0,
    ...(good.description ? { description: good.description } : {}),
    ...(good.weapon ? { weapon: good.weapon } : {}),
  }
}
