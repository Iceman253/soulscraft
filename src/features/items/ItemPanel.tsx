import { useState } from 'react'
import { Plus, Trash2, Search, Sword, Shield } from 'lucide-react'
import { useItemStore } from './store'
import { useWorldStore } from '../map/store'
import { useCharacterStore } from '../characters/store'
import { fileToDataUrl, saveItemImage, loadItemImage, loadArmorImage, loadWeaponImage } from '../../lib/imageCache'
import { Modal } from '../../ui/Modal'
import { MerchantModal } from './MerchantModal'
import type { Item, ItemLocation } from '../../types'

export function ItemPanel() {
  const { items, addItem, updateItem, deleteItem, moveItem } = useItemStore()
  const areas = useWorldStore(s => s.areas)
  const characters = useCharacterStore(s => s.characters)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showMerchant, setShowMerchant] = useState(false)
  const [newName, setNewName] = useState('')
  const [newQty, setNewQty] = useState(1)
  const [newAreaId, setNewAreaId] = useState('')

  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))

  const handleAdd = () => {
    if (!newName.trim()) return
    const location: ItemLocation = newAreaId
      ? { kind: 'area', areaId: newAreaId }
      : { kind: 'unassigned' }
    addItem({ name: newName.trim(), quantity: newQty, location })
    setNewName(''); setNewQty(1); setNewAreaId(''); setShowAdd(false)
  }

  // Build the character gear list
  const charGear = characters.flatMap(ch => {
    const gear: { charName: string; label: string; img: string | null; sub: string }[] = []
    if (ch.weaponLoadout.mainHand) {
      const w = ch.weaponLoadout.mainHand
      gear.push({ charName: ch.name, label: w.name, img: loadWeaponImage(w.material, w.type), sub: `Main Hand · +${w.currentDamageBonus} DMG` })
    }
    if (ch.weaponLoadout.offHand) {
      const w = ch.weaponLoadout.offHand
      gear.push({ charName: ch.name, label: w.name, img: loadWeaponImage(w.material, w.type), sub: `Off Hand · +${w.currentDamageBonus} DMG` })
    }
    if (ch.armorLoadout.armor) {
      const a = ch.armorLoadout.armor
      gear.push({ charName: ch.name, label: `${a.material.charAt(0).toUpperCase() + a.material.slice(1)} Armor`, img: loadArmorImage(a.material, 'armor'), sub: `Armor · DEF ${a.currentDef}` })
    }
    if (ch.armorLoadout.shield) {
      const a = ch.armorLoadout.shield
      gear.push({ charName: ch.name, label: `${a.material.charAt(0).toUpperCase() + a.material.slice(1)} Shield`, img: loadArmorImage(a.material, 'shield'), sub: `Shield · DEF ${a.currentDef}` })
    }
    return gear
  })

  return (
    <div className="h-full flex flex-col p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-stone-100">World Items</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowMerchant(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-stone-700 text-stone-200 font-semibold hover:bg-stone-600 text-sm">
            🏪 Merchant
          </button>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-gold text-stone-900 font-semibold hover:bg-yellow-400 text-sm">
            <Plus size={14} /> Add Item
          </button>
        </div>
      </div>

      <div className="relative mb-4">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items..."
          className="w-full bg-stone-800 border border-stone-700 rounded-lg pl-8 pr-3 py-2 text-stone-200 text-sm outline-none focus:border-stone-500" />
      </div>

      {/* Character Gear section */}
      {charGear.length > 0 && (
        <div className="mb-6">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Equipped Gear</div>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {charGear.map((g, i) => (
              <div key={i} className="bg-stone-800 border border-stone-700/60 rounded-xl p-3 opacity-90">
                <div className="w-14 h-14 mx-auto mb-2 rounded-lg bg-stone-700 border border-stone-600 overflow-hidden flex items-center justify-center">
                  {g.img
                    ? <img src={g.img} className="w-full h-full object-cover" />
                    : g.sub.includes('Hand') ? <Sword size={22} className="text-stone-500" /> : <Shield size={22} className="text-stone-500" />}
                </div>
                <div className="text-center text-stone-200 text-xs font-medium truncate">{g.label}</div>
                <div className="text-center text-stone-500 text-xs mt-0.5 truncate">{g.sub}</div>
                <div className="text-center mt-1">
                  <span className="px-1.5 py-0.5 rounded-full bg-stone-700 text-stone-400 text-xs">{g.charName}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* World items */}
      {(filtered.length > 0 || charGear.length === 0) && (
        <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Items</div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
        {filtered.length === 0 && (
          <div className="col-span-full text-stone-500 text-sm text-center py-8">No items found</div>
        )}
        {filtered.map(item => (
          <ItemCard key={item.id} item={item} areas={areas} onUpdate={updateItem} onDelete={deleteItem} onMove={moveItem} />
        ))}
      </div>

      {showMerchant && <MerchantModal onClose={() => setShowMerchant(false)} />}

      {showAdd && (
        <Modal title="Add Item" onClose={() => setShowAdd(false)}>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-stone-400 block mb-1">Name *</label>
              <input autoFocus value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder="Iron Sword..." className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-stone-100 text-sm outline-none focus:border-gold/50" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-stone-400 block mb-1">Quantity</label>
                <input type="number" value={newQty} min={1} onChange={e => setNewQty(parseInt(e.target.value) || 1)}
                  className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-stone-200 text-sm outline-none" />
              </div>
              <div>
                <label className="text-sm text-stone-400 block mb-1">Location</label>
                <select value={newAreaId} onChange={e => setNewAreaId(e.target.value)} className="w-full bg-stone-900 border border-stone-600 rounded px-2 py-2 text-stone-200 text-sm outline-none">
                  <option value="">Unassigned</option>
                  {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 rounded bg-stone-700 text-stone-300 hover:bg-stone-600 text-sm">Cancel</button>
              <button onClick={handleAdd} disabled={!newName.trim()} className="px-3 py-1.5 rounded bg-gold text-stone-900 font-semibold text-sm disabled:opacity-50">Add</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function ItemCard({ item, areas, onUpdate, onDelete, onMove }: {
  item: Item
  areas: ReturnType<typeof useWorldStore.getState>['areas']
  onUpdate: (id: string, patch: Partial<Item>) => void
  onDelete: (id: string) => void
  onMove: (id: string, loc: ItemLocation) => void
}) {
  const img = loadItemImage(item.name)

  const handleImgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await fileToDataUrl(file, 200)
    saveItemImage(item.name, url)
    onUpdate(item.id, {})
  }

  return (
    <div className="bg-stone-800 border border-stone-700 rounded-xl p-3 group relative">
      <button onClick={() => onDelete(item.id)} className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 text-stone-500 hover:text-red-400 transition-opacity">
        <Trash2 size={12} />
      </button>

      <label className="block w-16 h-16 mx-auto mb-2 rounded-lg bg-stone-700 border border-stone-600 overflow-hidden cursor-pointer flex items-center justify-center">
        {img ? <img src={img} className="w-full h-full object-cover" /> : <span className="text-3xl">📦</span>}
        <input type="file" accept="image/*" className="hidden" onChange={handleImgUpload} />
      </label>

      <input value={item.name} onChange={e => onUpdate(item.id, { name: e.target.value })}
        className="w-full text-center bg-transparent text-stone-100 text-sm font-medium outline-none hover:bg-stone-700 rounded px-1" />

      <div className="flex items-center justify-center gap-1.5 mt-1">
        <button onClick={() => onUpdate(item.id, { quantity: Math.max(1, item.quantity - 1) })} className="w-5 h-5 rounded bg-stone-700 text-stone-400 text-xs hover:bg-stone-600">-</button>
        <span className="text-xs text-stone-300 w-6 text-center">{item.quantity}</span>
        <button onClick={() => onUpdate(item.id, { quantity: item.quantity + 1 })} className="w-5 h-5 rounded bg-stone-700 text-stone-400 text-xs hover:bg-stone-600">+</button>
      </div>

      <div className="mt-2">
        <select
          value={item.location.kind === 'area' ? item.location.areaId : ''}
          onChange={e => onMove(item.id, e.target.value ? { kind: 'area', areaId: e.target.value } : { kind: 'unassigned' })}
          className="w-full bg-stone-900 border border-stone-700 rounded px-1.5 py-1 text-stone-400 text-xs outline-none"
        >
          <option value="">Unassigned</option>
          {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
    </div>
  )
}
