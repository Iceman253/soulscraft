import { useState } from 'react'
import { Shield, Sword, Plus, Trash2, RotateCcw, PackagePlus } from 'lucide-react'
import { useCharacterStore } from '../store'
import {
  ARMOR_MATERIALS, SLOT_VALID_MATERIALS, ARMOR_TAGS, SHIELD_TAGS,
  getBaseDef,
} from '../../../lib/armor'
import {
  WEAPON_TYPES, WEAPON_TYPE_LABELS, WEAPON_TYPE_MATERIALS,
  WEAPON_MATERIAL_LABELS, getWeaponDamageBonus, defaultWeaponName,
} from '../../../lib/weapons'
import { fileToDataUrl, saveArmorImage, loadArmorImage, saveWeaponImage, loadWeaponImage } from '../../../lib/imageCache'
import { Badge } from '../../../ui/Badge'
import type { Character, ArmorMaterial, WeaponType, WeaponMaterial, GearEnchantment, CharacterItem } from '../../../types'

interface TabGearProps { character: Character }

// ── Name auto-detection helpers ───────────────────────────────────────
function detectArmorMaterial(name: string): ArmorMaterial | undefined {
  const lower = name.toLowerCase()
  return (['leather', 'chainmail', 'iron', 'gold', 'diamond', 'netherite'] as ArmorMaterial[]).find(m => lower.includes(m))
}
function detectWeaponMaterial(name: string): WeaponMaterial | undefined {
  const lower = name.toLowerCase()
  return (['wood', 'stone', 'iron', 'gold', 'diamond', 'netherite'] as WeaponMaterial[]).find(m => lower.includes(m))
}
function detectWeaponType(name: string): WeaponType | undefined {
  const lower = name.toLowerCase()
  return WEAPON_TYPES.find(t => lower.includes(t))
}

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
              className="px-2.5 py-1 rounded bg-stone-700 border border-stone-600 hover:border-gold/50 text-stone-300 text-xs capitalize flex items-center gap-1">
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

function ArmorSlotRow({ slot, label, tags, piece, validMaterials, unequippedOnHand, onEquip, onUnequip, onOverride, onReset, onAddEnchantment, onRemoveEnchantment, onAddToOnHand }: {
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
        <label className="w-10 h-10 rounded bg-stone-700 border border-stone-600 overflow-hidden cursor-pointer shrink-0 flex items-center justify-center">
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
                    className="w-12 bg-stone-900 border border-stone-600 rounded px-1.5 py-0.5 text-blue-300 text-xs outline-none font-mono tabular-nums" />
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
        <button onClick={() => setShowEnc(v => !v)} className="p-1 rounded text-stone-500 hover:text-gold flex items-center gap-0.5 text-xs">
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
                  className="flex-1 bg-stone-900 border border-stone-600 rounded px-2 py-1 text-stone-200 text-xs outline-none focus:border-gold/50">
                  <option value="">— Pick item —</option>
                  {unequippedOnHand.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
                {selectedItemId && (
                  <select value={matOverride || autoMat || ''} onChange={e => setMatOverride(e.target.value as ArmorMaterial)}
                    className="bg-stone-900 border border-stone-600 rounded px-1.5 py-1 text-stone-200 text-xs outline-none">
                    <option value="">— Material —</option>
                    {validMaterials.map(m => <option key={m} value={m}>{m} (+{getBaseDef(m, slot)} DEF)</option>)}
                  </select>
                )}
                <button onClick={handleEquip} disabled={!selectedItemId || !effectiveMat}
                  className="px-2.5 py-1 rounded bg-gold text-stone-900 font-semibold text-xs disabled:opacity-40 disabled:cursor-not-allowed">
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
                className="flex-1 bg-stone-900 border border-stone-600 rounded px-1.5 py-1 text-stone-200 text-xs outline-none">
                {validMaterials.map(m => <option key={m} value={m}>{m} (+{getBaseDef(m, slot)} DEF)</option>)}
              </select>
              <button onClick={handleQuickAdd} className="px-2.5 py-1 rounded bg-stone-600 text-stone-200 text-xs hover:bg-stone-500">Add & Equip</button>
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

function WeaponSlotRow({ hand, weapon, unequippedOnHand, onEquip, onUnequip, onOverride, onReset, onAddEnchantment, onRemoveEnchantment, onAddToOnHand }: {
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
  const autoType = selectedItem ? detectWeaponType(selectedItem.name) : undefined
  const autoMat = selectedItem ? detectWeaponMaterial(selectedItem.name) : undefined
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
        <label className="w-10 h-10 rounded bg-stone-700 border border-stone-600 overflow-hidden cursor-pointer shrink-0 flex items-center justify-center">
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
                  className="w-12 bg-stone-900 border border-stone-600 rounded px-1.5 py-0.5 text-orange-300 text-xs outline-none font-mono tabular-nums" />
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
        <button onClick={() => setShowEnc(v => !v)} className="p-1 rounded text-stone-500 hover:text-gold flex items-center gap-0.5 text-xs">
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
                  className="flex-1 bg-stone-900 border border-stone-600 rounded px-2 py-1 text-stone-200 text-xs outline-none focus:border-gold/50">
                  <option value="">— Pick item —</option>
                  {unequippedOnHand.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
              {selectedItemId && (
                <div className="flex gap-1.5 flex-wrap items-end">
                  <div>
                    <div className="text-xs text-stone-500 mb-0.5">Type</div>
                    <select value={typeOverride || autoType || ''} onChange={e => { setTypeOverride(e.target.value as WeaponType); setMatOverride('') }}
                      className="bg-stone-900 border border-stone-600 rounded px-1.5 py-1 text-stone-200 text-xs outline-none">
                      <option value="">— Type —</option>
                      {WEAPON_TYPES.map(t => <option key={t} value={t}>{WEAPON_TYPE_LABELS[t]}</option>)}
                    </select>
                  </div>
                  <div>
                    <div className="text-xs text-stone-500 mb-0.5">Material</div>
                    <select value={matOverride || autoMat || ''} onChange={e => setMatOverride(e.target.value as WeaponMaterial)}
                      className="bg-stone-900 border border-stone-600 rounded px-1.5 py-1 text-stone-200 text-xs outline-none">
                      <option value="">— Material —</option>
                      {validMats.map(m => <option key={m} value={m}>{WEAPON_MATERIAL_LABELS[m]}</option>)}
                    </select>
                  </div>
                  <button onClick={handleEquip} disabled={!effectiveType || !effectiveMat}
                    className="px-2.5 py-1 rounded bg-gold text-stone-900 font-semibold text-xs disabled:opacity-40 disabled:cursor-not-allowed self-end">
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
                  className="bg-stone-900 border border-stone-600 rounded px-1.5 py-1 text-stone-200 text-xs outline-none">
                  {WEAPON_TYPES.map(t => <option key={t} value={t}>{WEAPON_TYPE_LABELS[t]}</option>)}
                </select>
              </div>
              <div>
                <div className="text-xs text-stone-500 mb-0.5">Material</div>
                <select value={quickMat} onChange={e => setQuickMat(e.target.value as WeaponMaterial)}
                  className="bg-stone-900 border border-stone-600 rounded px-1.5 py-1 text-stone-200 text-xs outline-none">
                  {WEAPON_TYPE_MATERIALS[quickType].map(m => <option key={m} value={m}>{WEAPON_MATERIAL_LABELS[m]}</option>)}
                </select>
              </div>
              <button onClick={handleQuickAdd} className="px-2.5 py-1 rounded bg-stone-600 text-stone-200 text-xs hover:bg-stone-500">Add & Equip</button>
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

function EnchantmentRow({ enc, onRemove }: { enc: GearEnchantment; onRemove: () => void }) {
  const durLabel = enc.durationType === 'scenes' || enc.durationType === 'days'
    ? `${enc.remaining} ${enc.durationType}` : enc.durationType
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-purple-300 flex-1">{enc.name}</span>
      <Badge variant="purple">{durLabel}</Badge>
      <button onClick={onRemove} className="p-0.5 text-stone-500 hover:text-red-400"><Trash2 size={10} /></button>
    </div>
  )
}

function AddEnchantmentRow({ onAdd }: { onAdd: (e: Omit<GearEnchantment, 'id'>) => void }) {
  const [name, setName] = useState('')
  const [durType, setDurType] = useState<GearEnchantment['durationType']>('scenes')
  const [remaining, setRemaining] = useState(3)

  const submit = () => {
    if (!name.trim()) return
    onAdd({ name: name.trim(), durationType: durType, remaining: durType === 'scenes' || durType === 'days' ? remaining : undefined })
    setName('')
  }

  return (
    <div className="flex gap-1.5 items-end">
      <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()}
        placeholder="Enchantment name..." className="flex-1 bg-stone-900 border border-stone-600 rounded px-2 py-1 text-stone-200 text-xs outline-none focus:border-purple-500/50" />
      <select value={durType} onChange={e => setDurType(e.target.value as GearEnchantment['durationType'])}
        className="bg-stone-900 border border-stone-600 rounded px-1.5 py-1 text-stone-200 text-xs outline-none">
        <option value="scenes">Scenes</option>
        <option value="days">Days</option>
        <option value="permanent">Permanent</option>
        <option value="manual">Manual</option>
      </select>
      {(durType === 'scenes' || durType === 'days') && (
        <input type="number" value={remaining} onChange={e => setRemaining(parseInt(e.target.value) || 1)} min={1}
          className="w-12 bg-stone-900 border border-stone-600 rounded px-1.5 py-1 text-stone-200 text-xs outline-none" />
      )}
      <button onClick={submit} className="px-2 py-1 rounded bg-stone-700 hover:bg-stone-600 text-stone-300 text-xs"><Plus size={11} /></button>
    </div>
  )
}
