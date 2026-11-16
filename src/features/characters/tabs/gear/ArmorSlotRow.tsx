// One armor slot: what's worn, its DEF, enchantments, and equipping from On Hand.
import { useState } from 'react'
import { Shield, RotateCcw } from 'lucide-react'
import { getBaseDef } from '../../../../lib/rules/armor'
import { fileToDataUrl, saveArmorImage, loadArmorImage } from '../../../../lib/platform/imageCache'
import type { Character, ArmorMaterial, GearEnchantment, CharacterItem } from '../../../../types'
import { detectArmorMaterial } from './detectGear'
import { EnchantmentRow, AddEnchantmentRow } from './Enchantments'

export function ArmorSlotRow({ slot, label, tags, piece, validMaterials, unequippedOnHand, onEquip, onUnequip, onOverride, onReset, onAddEnchantment, onRemoveEnchantment, onAddToOnHand }: {
  slot: string; label: string; tags: string;
  piece: Character['armorLoadout']['armor'];
  validMaterials: ArmorMaterial[];
  unequippedOnHand: CharacterItem[];
  charId: string;
  onEquip: (mat: ArmorMaterial, itemId?: string) => void;
  onUnequip: () => void;
  onOverride: (v: number) => void; onReset: () => void;
  onAddEnchantment: (e: Omit<GearEnchantment, 'id'>) => void;
  onRemoveEnchantment: (id: string) => void;
  onAddToOnHand: (item: Omit<CharacterItem, 'id'>) => string;
}) {
  const [showEnc, setShowEnc] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState('')
  const [matOverride, setMatOverride] = useState<ArmorMaterial | ''>('')
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [quickMat, setQuickMat] = useState<ArmorMaterial>(validMaterials[0] ?? 'iron')
  const img = piece ? loadArmorImage(piece.material, slot) : null

  const selectedItem = unequippedOnHand.find(i => i.id === selectedItemId)
  const autoMat = selectedItem ? detectArmorMaterial(selectedItem.name) : undefined
  const effectiveMat = (matOverride || autoMat) as ArmorMaterial | undefined

  const handleImgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !piece) return
    const url = await fileToDataUrl(file, 200)
    saveArmorImage(piece.material, slot, url)
    onOverride(piece.currentDef)
  }

  const handleEquip = () => {
    if (!selectedItem || !effectiveMat) return
    onEquip(effectiveMat, selectedItem.id)
    setSelectedItemId('')
    setMatOverride('')
  }

  const handleQuickAdd = () => {
    const name = `${quickMat.charAt(0).toUpperCase() + quickMat.slice(1)} ${slot === 'armor' ? 'Armor' : 'Shield'}`
    const id = onAddToOnHand({ name, quantity: 1 })
    onEquip(quickMat, id)
    setShowQuickAdd(false)
  }

  return (
    <div className="bg-stone-800 border border-stone-700 rounded-lg p-3">
      <div className="flex items-center gap-2.5">
        <label className="w-10 h-10 rounded-sm bg-stone-700 border border-stone-600 overflow-hidden cursor-pointer shrink-0 flex items-center justify-center">
          {img ? <img src={img} className="w-full h-full object-cover" /> : <Shield size={16} className="text-stone-500" />}
          <input type="file" accept="image/*" className="hidden" onChange={handleImgUpload} disabled={!piece} />
        </label>

        <div className="flex-1 min-w-0">
          <div className="text-xs text-stone-500 mb-0.5">{label}</div>
          {piece ? (
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-stone-200 capitalize">{piece.material}</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-stone-500">DEF</span>
                  <input type="number" value={piece.currentDef} onChange={e => onOverride(parseInt(e.target.value) || 0)}
                    className="w-12 bg-stone-900 border border-stone-600 rounded-sm px-1.5 py-0.5 text-blue-300 text-xs outline-hidden font-mono tabular-nums" />
                  {piece.currentDef !== piece.baseDef && (
                    <button onClick={onReset} title="Reset to base" className="p-0.5 text-stone-500 hover:text-stone-300"><RotateCcw size={10} /></button>
                  )}
                </div>
              </div>
              {tags && <div className="text-xs text-stone-500 italic">{tags}</div>}
            </div>
          ) : (
            <div className="text-xs text-stone-500 italic">Not equipped</div>
          )}
        </div>

        {piece && (
          <button onClick={onUnequip} className="text-xs text-stone-500 hover:text-red-400 shrink-0">Unequip</button>
        )}
        <button onClick={() => setShowEnc(v => !v)} className="p-1 rounded-sm text-stone-500 hover:text-gold flex items-center gap-0.5 text-xs">
          <img src="/enchanted-book.png" className="w-4 h-4 object-contain" alt="enchantments" />
          {piece?.enchantments.length ? <span className="text-gold font-bold">{piece.enchantments.length}</span> : ''}
        </button>
      </div>

      {/* Equip from on-hand */}
      {!piece && (
        <div className="mt-2 pt-2 border-t border-stone-700 space-y-2">
          {unequippedOnHand.length > 0 ? (
            <div className="space-y-1.5">
              <div className="text-xs text-stone-500">Equip from on-hand inventory:</div>
              <div className="flex gap-1.5 flex-wrap items-end">
                <select value={selectedItemId} onChange={e => { setSelectedItemId(e.target.value); setMatOverride('') }}
                  className="flex-1 bg-stone-900 border border-stone-600 rounded-sm px-2 py-1 text-stone-200 text-xs outline-hidden focus:border-gold/50">
                  <option value="">— Pick item —</option>
                  {unequippedOnHand.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
                {selectedItemId && (
                  <select value={matOverride || autoMat || ''} onChange={e => setMatOverride(e.target.value as ArmorMaterial)}
                    className="bg-stone-900 border border-stone-600 rounded-sm px-1.5 py-1 text-stone-200 text-xs outline-hidden">
                    <option value="">— Material —</option>
                    {validMaterials.map(m => <option key={m} value={m}>{m} (+{getBaseDef(m, slot)} DEF)</option>)}
                  </select>
                )}
                <button onClick={handleEquip} disabled={!selectedItemId || !effectiveMat}
                  className="px-2.5 py-1 rounded-sm bg-gold text-stone-900 font-semibold text-xs disabled:opacity-40 disabled:cursor-not-allowed">
                  Equip
                </button>
              </div>
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
            <div className="flex gap-1.5 items-center">
              <select value={quickMat} onChange={e => setQuickMat(e.target.value as ArmorMaterial)}
                className="flex-1 bg-stone-900 border border-stone-600 rounded-sm px-1.5 py-1 text-stone-200 text-xs outline-hidden">
                {validMaterials.map(m => <option key={m} value={m}>{m} (+{getBaseDef(m, slot)} DEF)</option>)}
              </select>
              <button onClick={handleQuickAdd} className="px-2.5 py-1 rounded-sm bg-stone-600 text-stone-200 text-xs hover:bg-stone-500">Add & Equip</button>
              <button onClick={() => setShowQuickAdd(false)} className="text-xs text-stone-500 hover:text-stone-300">✕</button>
            </div>
          )}
        </div>
      )}

      {showEnc && piece && (
        <div className="mt-2 pt-2 border-t border-stone-700 space-y-1.5">
          {piece.enchantments.map(enc => (
            <EnchantmentRow key={enc.id} enc={enc} onRemove={() => onRemoveEnchantment(enc.id)} />
          ))}
          <AddEnchantmentRow onAdd={onAddEnchantment} />
        </div>
      )}
    </div>
  )
}
