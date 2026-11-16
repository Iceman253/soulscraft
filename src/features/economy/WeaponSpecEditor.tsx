// The weapon stats a custom good of category "weapon" carries to its buyer.
import { RotateCcw } from 'lucide-react'
import { newId } from '../../lib/platform/id'
import { WEAPON_MATERIAL_LABELS, WEAPON_TYPES, WEAPON_TYPE_LABELS, WEAPON_TYPE_MATERIALS, getWeaponDamageBonus } from '../../lib/rules/weapons'
import { withWeaponMaterial, withWeaponType } from '../../lib/rules/weaponSpec'
import { AddEnchantmentRow, EnchantmentRow } from '../characters/tabs/gear/Enchantments'
import type { WeaponMaterial, WeaponSpec, WeaponType } from '../../types'

const label = 'text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1.5 font-heading'
const field = 'w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-stone-200 text-sm outline-hidden'

export function WeaponSpecEditor({ spec, onChange }: { spec: WeaponSpec; onChange: (s: WeaponSpec) => void }) {
  const materials = WEAPON_TYPE_MATERIALS[spec.type] ?? ['none']
  const rulebook = getWeaponDamageBonus(spec.material, spec.type)

  return (
    <div className="rounded-lg border border-purple-900/50 bg-purple-950/10 p-3 space-y-3">
      <div className="text-xs text-purple-300 font-semibold font-heading">⚔️ Weapon stats</div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Type</label>
          <select value={spec.type} onChange={e => onChange(withWeaponType(spec, e.target.value as WeaponType))} className={field}>
            {WEAPON_TYPES.map(t => <option key={t} value={t}>{WEAPON_TYPE_LABELS[t]}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Material</label>
          <select value={spec.material} disabled={materials.length < 2}
            onChange={e => onChange(withWeaponMaterial(spec, e.target.value as WeaponMaterial))} className={`${field} disabled:opacity-60`}>
            {materials.map(m => <option key={m} value={m}>{WEAPON_MATERIAL_LABELS[m]}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className={label}>Damage bonus <span className="normal-case text-stone-600">(power level)</span></label>
        <div className="flex items-center gap-2">
          <input type="number" value={spec.damageBonus}
            onChange={e => onChange({ ...spec, damageBonus: parseInt(e.target.value) || 0 })}
            className="w-20 bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-stone-100 text-sm outline-hidden font-mono tabular-nums" />
          {spec.damageBonus !== rulebook ? (
            <button onClick={() => onChange({ ...spec, damageBonus: rulebook })}
              className="flex items-center gap-1 text-[11px] text-stone-400 hover:text-stone-200">
              <RotateCcw size={11} /> rulebook +{rulebook}
            </button>
          ) : <span className="text-[11px] text-stone-600">rulebook value</span>}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className={label}>Abilities <span className="normal-case text-stone-600">(enchantments)</span></label>
        {spec.enchantments.map(enc => (
          <EnchantmentRow key={enc.id} enc={enc}
            onRemove={() => onChange({ ...spec, enchantments: spec.enchantments.filter(e => e.id !== enc.id) })} />
        ))}
        <AddEnchantmentRow withDescription
          onAdd={e => onChange({ ...spec, enchantments: [...spec.enchantments, { ...e, id: newId() }] })} />
      </div>
    </div>
  )
}
