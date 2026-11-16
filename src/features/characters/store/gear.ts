import type { ArmorMaterial, ArmorPiece, ArmorSlot, Character, CharacterItem, GearEnchantment, Weapon } from '../../../types'
import { newId } from '../../../lib/platform/id'
import { log } from '../../log/store'
import { getBaseDef, fullSetLoadout } from '../../../lib/rules/armor'
import { specFromWeapon, weaponFromSpec } from '../../../lib/rules/weaponSpec'
import { committer } from './helpers'
import type { CharacterSlice } from './types'

type Hand = 'mainHand' | 'offHand'

/** Equipped armor and weapons, their DEF / damage overrides and enchantments. */
export interface GearActions {
  equipArmorPiece: (id: string, slot: ArmorSlot, material: ArmorMaterial, onHandItemId?: string) => void
  unequipArmorPiece: (id: string, slot: ArmorSlot) => void
  equipFullSet: (id: string, material: ArmorMaterial) => void
  overrideArmorDef: (id: string, slot: ArmorSlot, value: number) => void
  resetArmorDef: (id: string, slot: ArmorSlot) => void
  addArmorEnchantment: (id: string, slot: ArmorSlot, enchantment: Omit<GearEnchantment, 'id'>) => void
  removeArmorEnchantment: (id: string, slot: ArmorSlot, enchantmentId: string) => void
  advanceArmorEnchantmentTime: (durationType: 'scenes' | 'days') => void

  equipWeapon: (id: string, hand: Hand, weapon: Omit<Weapon, 'id'>, onHandItemId?: string) => void
  unequipWeapon: (id: string, hand: Hand) => void
  overrideWeaponBonus: (id: string, hand: Hand, value: number) => void
  resetWeaponBonus: (id: string, hand: Hand) => void
  addWeaponEnchantment: (id: string, hand: Hand, enchantment: Omit<GearEnchantment, 'id'>) => void
  removeWeaponEnchantment: (id: string, hand: Hand, enchantmentId: string) => void
  advanceWeaponEnchantmentTime: (durationType: 'scenes' | 'days') => void
}

/** Count enchantments on this clock down by one and drop those that run out;
 *  `onExpire` hears the name of each one that ended. */
export function countDownEnchantments(
  enchantments: GearEnchantment[], durationType: 'scenes' | 'days', onExpire: (name: string) => void,
): GearEnchantment[] {
  return enchantments
    .map(e => e.durationType !== durationType || e.remaining == null ? e : { ...e, remaining: e.remaining - 1 })
    .filter(e => {
      const ended = e.durationType === durationType && e.remaining != null && e.remaining <= 0
      if (ended) onExpire(e.name)
      return !ended
    })
}

/** Change the armor piece in a slot; a no-op when the slot is empty. */
function withArmor(c: Character, slot: ArmorSlot, fn: (p: ArmorPiece) => ArmorPiece): Character {
  const piece = c.armorLoadout[slot]
  return piece ? { ...c, armorLoadout: { ...c.armorLoadout, [slot]: fn(piece) } } : c
}

/** Change the weapon in a hand; a no-op when the hand is empty. */
function withWeapon(c: Character, hand: Hand, fn: (w: Weapon) => Weapon): Character {
  const weapon = c.weaponLoadout[hand]
  return weapon ? { ...c, weaponLoadout: { ...c.weaponLoadout, [hand]: fn(weapon) } } : c
}

/** Mark an on-hand item as the one worn in a gear slot. */
function tagOnHand(c: Character, itemId: string | undefined, slot: CharacterItem['gearSlot']): Character['onHand'] {
  return itemId ? { items: c.onHand.items.map(i => i.id === itemId ? { ...i, gearSlot: slot } : i) } : c.onHand
}

/** Clear the gear-slot mark from on-hand items worn in a slot. */
function untagOnHand(c: Character, slot: CharacterItem['gearSlot']): Character['onHand'] {
  return { items: c.onHand.items.map(i => i.gearSlot === slot ? { ...i, gearSlot: undefined } : i) }
}

/** Put the weapon in a hand back into its On Hand item. An item with its own
 *  stats keeps the weapon's current state, such as enchantment time left. */
export function stowWeapon(c: Character, hand: Hand): Character {
  const held = c.weaponLoadout[hand]
  const items = c.onHand.items.map(i => {
    if (i.gearSlot !== hand) return i
    const rest = { ...i }
    delete rest.gearSlot
    return held && i.weapon ? { ...rest, weapon: specFromWeapon(held) } : rest
  })
  return { ...c, weaponLoadout: { ...c.weaponLoadout, [hand]: null }, onHand: { items } }
}

/** Equip in a hand. An On Hand item with its own stats (a bought weapon)
 *  overrides the type, material and bonus picked on the Gear tab. */
export function equipInHand(c: Character, hand: Hand, weapon: Omit<Weapon, 'id'>, onHandItemId: string | undefined, makeId: () => string): Character {
  const stowed = c.weaponLoadout[hand] ? stowWeapon(c, hand) : c
  const item = onHandItemId ? stowed.onHand.items.find(i => i.id === onHandItemId) : undefined
  const equipped = item?.weapon ? weaponFromSpec(item.weapon, weapon.name, makeId) : weapon
  return {
    ...stowed,
    weaponLoadout: { ...stowed.weaponLoadout, [hand]: { ...equipped, id: makeId() } },
    onHand: tagOnHand(stowed, onHandItemId, hand),
  }
}

export const createGearSlice: CharacterSlice<GearActions> = (set, get) => {
  const { commit, update } = committer(set, get)
  return {
    // ── Armor ──────────────────────────────────────────────────────────
    equipArmorPiece(id, slot, material, onHandItemId) {
      const baseDef = getBaseDef(material, slot)
      update(id, c => ({
        ...c,
        armorLoadout: { ...c.armorLoadout, [slot]: { material, baseDef, currentDef: baseDef, enchantments: [] } },
        onHand: tagOnHand(c, onHandItemId, slot),
      }))
    },

    unequipArmorPiece(id, slot) {
      update(id, c => ({ ...c, armorLoadout: { ...c.armorLoadout, [slot]: null }, onHand: untagOnHand(c, slot) }))
    },

    equipFullSet(id, material) {
      const name = `${material.charAt(0).toUpperCase() + material.slice(1)} Armor`
      const itemId = newId()
      update(id, c => {
        const cleared = c.onHand.items.map(i => (i.gearSlot === 'armor' || i.gearSlot === 'shield') ? { ...i, gearSlot: undefined } : i)
        return {
          ...c,
          armorLoadout: fullSetLoadout(material),
          onHand: { items: [...cleared, { id: itemId, name, quantity: 1, gearSlot: 'armor' as const }] },
        }
      })
    },

    overrideArmorDef: (id, slot, value) => update(id, c => withArmor(c, slot, p => ({ ...p, currentDef: value }))),
    resetArmorDef: (id, slot) => update(id, c => withArmor(c, slot, p => ({ ...p, currentDef: p.baseDef }))),
    addArmorEnchantment: (id, slot, enchantment) =>
      update(id, c => withArmor(c, slot, p => ({ ...p, enchantments: [...p.enchantments, { ...enchantment, id: newId() }] }))),
    removeArmorEnchantment: (id, slot, enchantmentId) =>
      update(id, c => withArmor(c, slot, p => ({ ...p, enchantments: p.enchantments.filter(e => e.id !== enchantmentId) }))),

    advanceArmorEnchantmentTime(durationType) {
      const expired: string[] = []
      commit(get().characters.map(c => {
        let next = c
        for (const slot of ['armor', 'shield'] as const) {
          next = withArmor(next, slot, p => ({
            ...p, enchantments: countDownEnchantments(p.enchantments, durationType, name => expired.push(`${name} on ${c.name}'s ${slot}`)),
          }))
        }
        return next
      }))
      expired.forEach(name => log('effect-expired', `✨ ${name} expired.`))
    },

    // ── Weapons ────────────────────────────────────────────────────────
    equipWeapon: (id, hand, weapon, onHandItemId) => update(id, c => equipInHand(c, hand, weapon, onHandItemId, newId)),
    unequipWeapon: (id, hand) => update(id, c => stowWeapon(c, hand)),

    overrideWeaponBonus: (id, hand, value) => update(id, c => withWeapon(c, hand, w => ({ ...w, currentDamageBonus: value }))),
    resetWeaponBonus: (id, hand) => update(id, c => withWeapon(c, hand, w => ({ ...w, currentDamageBonus: w.baseDamageBonus }))),
    addWeaponEnchantment: (id, hand, enchantment) =>
      update(id, c => withWeapon(c, hand, w => ({ ...w, enchantments: [...w.enchantments, { ...enchantment, id: newId() }] }))),
    removeWeaponEnchantment: (id, hand, enchantmentId) =>
      update(id, c => withWeapon(c, hand, w => ({ ...w, enchantments: w.enchantments.filter(e => e.id !== enchantmentId) }))),

    advanceWeaponEnchantmentTime(durationType) {
      const expired: string[] = []
      commit(get().characters.map(c => {
        let next = c
        for (const hand of ['mainHand', 'offHand'] as const) {
          next = withWeapon(next, hand, w => ({
            ...w, enchantments: countDownEnchantments(w.enchantments, durationType, name => expired.push(`${name} on ${c.name}'s ${w.name}`)),
          }))
        }
        return next
      }))
      expired.forEach(name => log('effect-expired', `✨ ${name} expired.`))
    },
  }
}
