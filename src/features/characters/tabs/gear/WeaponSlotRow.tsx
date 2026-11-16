// One hand: the weapon held, its damage bonus, enchantments, and equipping from On Hand.
import { useState } from 'react'
import { Sword, RotateCcw } from 'lucide-react'
import { WEAPON_TYPES, WEAPON_TYPE_LABELS, WEAPON_TYPE_MATERIALS, WEAPON_MATERIAL_LABELS, defaultWeaponName } from '../../../../lib/rules/weapons'
import { fileToDataUrl, saveWeaponImage, loadWeaponImage } from '../../../../lib/platform/imageCache'
import type { Character, WeaponType, WeaponMaterial, GearEnchantment, CharacterItem } from '../../../../types'
import { detectWeaponMaterial, detectWeaponType } from './detectGear'
import { EnchantmentRow, AddEnchantmentRow } from './Enchantments'
import { WeaponSpecLine } from '../../../../ui/WeaponSpecLine'

export function WeaponSlotRow({ hand, weapon, unequippedOnHand, onEquip, onUnequip, onOverride, onReset, onAddEnchantment, onRemoveEnchantment, onAddToOnHand }: {
  hand: 'mainHand' | 'offHand'; weapon: Character['weaponLoadout']['mainHand'];
  unequippedOnHand: CharacterItem[];
  onEquip: (type: WeaponType, mat: WeaponMaterial, name: string, itemId?: string) => void;
  onUnequip: () => void;
  onOverride: (v: number) => void; onReset: () => void;
  onAddEnchantment: (e: Omit<GearEnchantment, 'id'>) => void;
  onRemoveEnchantment: (id: string) => void;
  onAddToOnHand: (item: Omit<CharacterItem, 'id'>) => string;
}) {
  const [showEnc, setShowEnc] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState('')
  const [typeOverride, setTypeOverride] = useState<WeaponType | ''>('')
  const [matOverride, setMatOverride] = useState<WeaponMaterial | ''>('')
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [quickType, setQuickType] = useState<WeaponType>('sword')
  const [quickMat, setQuickMat] = useState<WeaponMaterial>('iron')
  const img = weapon ? loadWeaponImage(weapon.material, weapon.type) : null

  const selectedItem = unequippedOnHand.find(i => i.id === selectedItemId)
  const ownStats = selectedItem?.weapon
  const autoType = ownStats?.type ?? (selectedItem ? detectWeaponType(selectedItem.name) : undefined)
  const autoMat = ownStats?.material ?? (selectedItem ? detectWeaponMaterial(selectedItem.name) : undefined)
  const effectiveType = (typeOverride || autoType) as WeaponType | undefined
  const effectiveMat = (matOverride || autoMat) as WeaponMaterial | undefined

  const handleImgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !weapon) return
    const url = await fileToDataUrl(file, 200)
    saveWeaponImage(weapon.material, weapon.type, url)
    onOverride(weapon.currentDamageBonus)
  }

  const handleEquip = () => {
    if (!selectedItem || !effectiveType || !effectiveMat) return
    onEquip(effectiveType, effectiveMat, selectedItem.name, selectedItem.id)
    setSelectedItemId('')
    setTypeOverride('')
    setMatOverride('')
  }

  const handleQuickAdd = () => {
    const name = defaultWeaponName(quickType, quickMat)
    const id = onAddToOnHand({ name, quantity: 1 })
    onEquip(quickType, quickMat, name, id)
    setShowQuickAdd(false)
  }

  const validMats = WEAPON_TYPE_MATERIALS[effectiveType || quickType] ?? WEAPON_TYPE_MATERIALS['sword']

  return (
    <div className="bg-stone-800 border border-stone-700 rounded-lg p-3">
      <div className="flex items-center gap-2.5">
        <label className="w-10 h-10 rounded-sm bg-stone-700 border border-stone-600 overflow-hidden cursor-pointer shrink-0 flex items-center justify-center">
          {img ? <img src={img} className="w-full h-full object-cover" /> : <Sword size={16} className="text-stone-500" />}
          <input type="file" accept="image/*" className="hidden" onChange={handleImgUpload} disabled={!weapon} />
        </label>

        <div className="flex-1 min-w-0">
          <div className="text-xs text-stone-500 mb-1">{hand === 'mainHand' ? 'Main Hand' : 'Off Hand'}</div>
          {weapon ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-stone-200">{weapon.name}</span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-stone-500">+DMG</span>
                <input type="number" value={weapon.currentDamageBonus} onChange={e => onOverride(parseInt(e.target.value) || 0)}
                  className="w-12 bg-stone-900 border border-stone-600 rounded-sm px-1.5 py-0.5 text-orange-300 text-xs outline-hidden font-mono tabular-nums" />
                {weapon.currentDamageBonus !== weapon.baseDamageBonus && (
                  <button onClick={onReset} className="p-0.5 text-stone-500 hover:text-stone-300"><RotateCcw size={10} /></button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-xs text-stone-500 italic">Empty</div>
          )}
        </div>

        {weapon && <button onClick={onUnequip} className="text-xs text-stone-500 hover:text-red-400">Unequip</button>}
        <button onClick={() => setShowEnc(v => !v)} className="p-1 rounded-sm text-stone-500 hover:text-gold flex items-center gap-0.5 text-xs">
          <img src="/enchanted-book.png" className="w-4 h-4 object-contain" alt="enchantments" />
          {weapon?.enchantments.length ? <span className="text-gold font-bold">{weapon.enchantments.length}</span> : ''}
        </button>
      </div>

      {/* Equip from on-hand */}
      {!weapon && (
        <div className="mt-2 pt-2 border-t border-stone-700 space-y-2">
          {unequippedOnHand.length > 0 ? (
            <div className="space-y-1.5">
              <div className="text-xs text-stone-500">Equip from on-hand inventory:</div>
              <div className="flex gap-1.5 flex-wrap items-end">
                <select value={selectedItemId} onChange={e => { setSelectedItemId(e.target.value); setTypeOverride(''); setMatOverride('') }}
                  className="flex-1 bg-stone-900 border border-stone-600 rounded-sm px-2 py-1 text-stone-200 text-xs outline-hidden focus:border-gold/50">
                  <option value="">— Pick item —</option>
                  {unequippedOnHand.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
              {selectedItemId && ownStats && (
                <div className="flex gap-2 items-center">
                  <WeaponSpecLine spec={ownStats} className="flex-1 min-w-0" />
                  <button onClick={handleEquip}
                    className="px-2.5 py-1 rounded-sm bg-gold text-stone-900 font-semibold text-xs shrink-0">
                    Equip
                  </button>
                </div>
              )}
              {selectedItemId && !ownStats && (
                <div className="flex gap-1.5 flex-wrap items-end">
                  <div>
                    <div className="text-xs text-stone-500 mb-0.5">Type</div>
                    <select value={typeOverride || autoType || ''} onChange={e => { setTypeOverride(e.target.value as WeaponType); setMatOverride('') }}
                      className="bg-stone-900 border border-stone-600 rounded-sm px-1.5 py-1 text-stone-200 text-xs outline-hidden">
                      <option value="">— Type —</option>
                      {WEAPON_TYPES.map(t => <option key={t} value={t}>{WEAPON_TYPE_LABELS[t]}</option>)}
                    </select>
                  </div>
                  <div>
                    <div className="text-xs text-stone-500 mb-0.5">Material</div>
                    <select value={matOverride || autoMat || ''} onChange={e => setMatOverride(e.target.value as WeaponMaterial)}
                      className="bg-stone-900 border border-stone-600 rounded-sm px-1.5 py-1 text-stone-200 text-xs outline-hidden">
                      <option value="">— Material —</option>
                      {validMats.map(m => <option key={m} value={m}>{WEAPON_MATERIAL_LABELS[m]}</option>)}
                    </select>
                  </div>
                  <button onClick={handleEquip} disabled={!effectiveType || !effectiveMat}
                    className="px-2.5 py-1 rounded-sm bg-gold text-stone-900 font-semibold text-xs disabled:opacity-40 disabled:cursor-not-allowed self-end">
                    Equip
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-stone-500 italic">No items in on-hand inventory.</div>
          )}

          {/* Quick add & equip */}
          {!showQuickAdd ? (
            <button onClick={() => setShowQuickAdd(true)} className="text-xs text-stone-500 hover:text-stone-300 underline">
              + Quick add to on-hand & equip
            </button>
          ) : (
            <div className="flex gap-1.5 items-end flex-wrap">
              <div>
                <div className="text-xs text-stone-500 mb-0.5">Type</div>
                <select value={quickType} onChange={e => { setQuickType(e.target.value as WeaponType); setQuickMat(WEAPON_TYPE_MATERIALS[e.target.value as WeaponType][0]) }}
                  className="bg-stone-900 border border-stone-600 rounded-sm px-1.5 py-1 text-stone-200 text-xs outline-hidden">
                  {WEAPON_TYPES.map(t => <option key={t} value={t}>{WEAPON_TYPE_LABELS[t]}</option>)}
                </select>
              </div>
              <div>
                <div className="text-xs text-stone-500 mb-0.5">Material</div>
                <select value={quickMat} onChange={e => setQuickMat(e.target.value as WeaponMaterial)}
                  className="bg-stone-900 border border-stone-600 rounded-sm px-1.5 py-1 text-stone-200 text-xs outline-hidden">
                  {WEAPON_TYPE_MATERIALS[quickType].map(m => <option key={m} value={m}>{WEAPON_MATERIAL_LABELS[m]}</option>)}
                </select>
              </div>
              <button onClick={handleQuickAdd} className="px-2.5 py-1 rounded-sm bg-stone-600 text-stone-200 text-xs hover:bg-stone-500">Add & Equip</button>
              <button onClick={() => setShowQuickAdd(false)} className="text-xs text-stone-500 hover:text-stone-300">✕</button>
            </div>
          )}
        </div>
      )}

      {showEnc && weapon && (
        <div className="mt-2 pt-2 border-t border-stone-700 space-y-1.5">
          {weapon.enchantments.map(enc => (
            <EnchantmentRow key={enc.id} enc={enc} onRemove={() => onRemoveEnchantment(enc.id)} />
          ))}
          <AddEnchantmentRow onAdd={onAddEnchantment} />
        </div>
      )}
    </div>
  )
}
