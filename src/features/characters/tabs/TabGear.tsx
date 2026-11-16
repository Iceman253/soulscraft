import { PackagePlus } from 'lucide-react'
import { useCharacterStore } from '../store'
import { ARMOR_MATERIALS, SLOT_VALID_MATERIALS, ARMOR_TAGS, SHIELD_TAGS } from '../../../lib/rules/armor'
import { getWeaponDamageBonus, defaultWeaponName } from '../../../lib/rules/weapons'
import type { Character } from '../../../types'
import { ArmorSlotRow } from './gear/ArmorSlotRow'
import { WeaponSlotRow } from './gear/WeaponSlotRow'

interface TabGearProps { character: Character }

export function TabGear({ character: c }: TabGearProps) {
  const {
    equipArmorPiece, unequipArmorPiece, equipFullSet, overrideArmorDef, resetArmorDef,
    addArmorEnchantment, removeArmorEnchantment,
    equipWeapon, unequipWeapon, overrideWeaponBonus, resetWeaponBonus,
    addWeaponEnchantment, removeWeaponEnchantment,
    addOnHandItem,
  } = useCharacterStore()

  const unequippedOnHand = c.onHand.items.filter(i => !i.gearSlot)

  return (
    <div className="p-4 space-y-6">

      {/* Armor */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider font-heading">Armor</div>
          <div className="text-sm font-bold text-blue-300 font-mono tabular-nums">
            DEF {(c.armorLoadout.armor?.currentDef ?? 0) + (c.armorLoadout.shield?.currentDef ?? 0)}
          </div>
        </div>

        {/* Quick equip full sets — auto-adds to on-hand */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {ARMOR_MATERIALS.map(mat => (
            <button key={mat} onClick={() => equipFullSet(c.id, mat)}
              title={`Add ${mat} armor to on-hand & equip`}
              className="px-2.5 py-1 rounded-sm bg-stone-700 border border-stone-600 hover:border-gold/50 text-stone-300 text-xs capitalize flex items-center gap-1">
              <PackagePlus size={10} className="opacity-60" /> {mat}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <ArmorSlotRow
            slot="armor" label="Armor (full set)"
            tags={c.armorLoadout.armor ? (ARMOR_TAGS[c.armorLoadout.armor.material] ?? '') : ''}
            piece={c.armorLoadout.armor}
            validMaterials={SLOT_VALID_MATERIALS['armor']}
            unequippedOnHand={unequippedOnHand}
            charId={c.id}
            onEquip={(mat, itemId) => equipArmorPiece(c.id, 'armor', mat, itemId)}
            onUnequip={() => unequipArmorPiece(c.id, 'armor')}
            onOverride={(val) => overrideArmorDef(c.id, 'armor', val)}
            onReset={() => resetArmorDef(c.id, 'armor')}
            onAddEnchantment={(enc) => addArmorEnchantment(c.id, 'armor', enc)}
            onRemoveEnchantment={(eid) => removeArmorEnchantment(c.id, 'armor', eid)}
            onAddToOnHand={(item) => addOnHandItem(c.id, item)}
          />
          <ArmorSlotRow
            slot="shield" label="Shield"
            tags={c.armorLoadout.shield ? SHIELD_TAGS : ''}
            piece={c.armorLoadout.shield}
            validMaterials={SLOT_VALID_MATERIALS['shield']}
            unequippedOnHand={unequippedOnHand}
            charId={c.id}
            onEquip={(mat, itemId) => equipArmorPiece(c.id, 'shield', mat, itemId)}
            onUnequip={() => unequipArmorPiece(c.id, 'shield')}
            onOverride={(val) => overrideArmorDef(c.id, 'shield', val)}
            onReset={() => resetArmorDef(c.id, 'shield')}
            onAddEnchantment={(enc) => addArmorEnchantment(c.id, 'shield', enc)}
            onRemoveEnchantment={(eid) => removeArmorEnchantment(c.id, 'shield', eid)}
            onAddToOnHand={(item) => addOnHandItem(c.id, item)}
          />
        </div>
      </div>

      {/* Weapons */}
      <div>
        <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 font-heading">Weapons</div>
        <div className="space-y-2">
          {(['mainHand', 'offHand'] as const).map(hand => (
            <WeaponSlotRow
              key={hand}
              hand={hand}
              weapon={c.weaponLoadout[hand]}
              unequippedOnHand={unequippedOnHand}
              onEquip={(type, mat, name, itemId) => equipWeapon(c.id, hand, {
                name: name || defaultWeaponName(type, mat),
                type, material: mat,
                baseDamageBonus: getWeaponDamageBonus(mat, type),
                currentDamageBonus: getWeaponDamageBonus(mat, type),
                enchantments: [],
              }, itemId)}
              onUnequip={() => unequipWeapon(c.id, hand)}
              onOverride={(val) => overrideWeaponBonus(c.id, hand, val)}
              onReset={() => resetWeaponBonus(c.id, hand)}
              onAddEnchantment={(enc) => addWeaponEnchantment(c.id, hand, enc)}
              onRemoveEnchantment={(eid) => removeWeaponEnchantment(c.id, hand, eid)}
              onAddToOnHand={(item) => addOnHandItem(c.id, item)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
