import { useState } from 'react'
import { useCharacterStore } from '../store'
import { Plus, Trash2, ArrowDownToLine, ArrowUpFromLine, Sword, Shield, Gift, Package } from 'lucide-react'
import { fileToDataUrl, saveItemImage, loadItemImage } from '../../../lib/imageCache'
import { CURRENCY_OPTIONS } from '../../../lib/currency'
import type { Character, CharacterItem } from '../../../types'

// Rulebook equipment packs (pp. 91) — quick-fill starting gear
const EQUIPMENT_PACKS: { name: string; items: { name: string; quantity: number }[]; currency?: Partial<Character['currency']>; rations?: number }[] = [
  {
    name: 'Wilderness',
    rations: 10,
    currency: { emeralds: 25 },
    items: [{ name: 'Bed', quantity: 1 }, { name: 'Lantern', quantity: 1 }, { name: 'Spyglass', quantity: 1 }, { name: 'Compass', quantity: 1 }],
  },
  {
    name: 'Miner\'s',
    rations: 10,
    currency: { emeralds: 25 },
    items: [{ name: 'Iron Pickaxe', quantity: 1 }, { name: 'Lantern', quantity: 1 }, { name: 'Coal', quantity: 20 }, { name: 'Compass', quantity: 1 }],
  },
  {
    name: 'Scholar\'s',
    rations: 10,
    currency: { emeralds: 50 },
    items: [{ name: 'Journal', quantity: 1 }, { name: 'Quill and Ink', quantity: 1 }, { name: 'Torch', quantity: 10 }, { name: 'Compass', quantity: 1 }, { name: 'Amethyst Shard', quantity: 1 }, { name: 'Sealing Wax', quantity: 1 }],
  },
  {
    name: 'Soldier\'s',
    rations: 10,
    currency: { emeralds: 50 },
    items: [{ name: 'Bed', quantity: 1 }, { name: 'Compass', quantity: 1 }, { name: 'Iron Dagger', quantity: 1 }],
  },
]

const BLOCK_CAP = 10

const GEAR_SLOT_LABELS: Record<NonNullable<CharacterItem['gearSlot']>, { label: string; icon: React.ReactNode }> = {
  mainHand: { label: 'Main Hand', icon: <Sword size={9} /> },
  offHand:  { label: 'Off Hand',  icon: <Sword size={9} /> },
  armor:    { label: 'Armor',     icon: <Shield size={9} /> },
  shield:   { label: 'Shield',    icon: <Shield size={9} /> },
}

interface TabInventoryProps { character: Character }

export function TabInventory({ character: c }: TabInventoryProps) {
  const {
    addOnHandItem, updateOnHandItem, removeOnHandItem,
    addStorageItem, updateStorageItem, removeStorageItem,
    moveItemToStorage, moveItemToHand, setCurrency, setRations,
    giveItemToCharacter,
  } = useCharacterStore()
  const [showPacks, setShowPacks] = useState(false)

  function applyPack(pack: typeof EQUIPMENT_PACKS[number]) {
    pack.items.forEach(item => addOnHandItem(c.id, { name: item.name, quantity: item.quantity }))
    if (pack.currency) setCurrency(c.id, { ...c.currency, ...Object.fromEntries(Object.entries(pack.currency).map(([k, v]) => [k, (c.currency[k as keyof typeof c.currency] ?? 0) + (v ?? 0)])) })
    if (pack.rations) setRations(c.id, c.rations + pack.rations)
    setShowPacks(false)
  }

  const blockCount = c.onHand.items.filter(i => i.isBlock).reduce((sum, i) => sum + (i.quantity ?? 1), 0)
  const blocksFull = blockCount >= BLOCK_CAP

  return (
    <div className="p-4 space-y-5">
      {/* Currency */}
      <div className="bg-stone-800 border border-stone-700 rounded-lg p-3">
        <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 font-heading">Currency</div>
        <div className="flex flex-wrap gap-3">
          {CURRENCY_OPTIONS.map(({ key, label, img }) => (
            <div key={key} className="flex items-center gap-1.5">
              <img src={img} alt={label} className="w-5 h-5 object-contain" />
              <input
                type="number"
                value={c.currency[key]}
                min={0}
                onChange={e => setCurrency(c.id, { [key]: parseInt(e.target.value) || 0 })}
                className="w-16 bg-stone-900 border border-stone-600 rounded px-2 py-1 text-stone-200 text-sm outline-none focus:border-gold/50 font-mono tabular-nums"
              />
              <span className="text-xs text-stone-500">{label}</span>
            </div>
          ))}
        </div>
        <div className="text-xs text-stone-500 mt-2">1 Diamond = 10 Emerald = 100 Gold = 1,000 Iron = 10,000 Copper</div>
      </div>

      {/* Rations */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-stone-400">🍖 Rations</span>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setRations(c.id, Math.max(0, c.rations - 1))} className="w-6 h-6 rounded bg-stone-700 text-stone-300 hover:bg-stone-600 text-sm">-</button>
          <span className="text-stone-100 font-bold w-6 text-center font-mono tabular-nums">{c.rations}</span>
          <button onClick={() => setRations(c.id, c.rations + 1)} className="w-6 h-6 rounded bg-stone-700 text-stone-300 hover:bg-stone-600 text-sm">+</button>
        </div>
        {/* Equipment packs quick-start */}
        <div className="relative ml-auto">
          <button onClick={() => setShowPacks(v => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-stone-700 border border-stone-600 text-stone-300 hover:bg-stone-600 text-xs transition-colors">
            <Package size={11} /> Equipment Pack
          </button>
          {showPacks && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-stone-900 border border-stone-600 rounded-xl shadow-2xl z-20 overflow-hidden">
              <div className="px-3 py-2 border-b border-stone-700 text-xs text-stone-400 font-medium">Starting Equipment Packs</div>
              {EQUIPMENT_PACKS.map(pack => (
                <button key={pack.name} onClick={() => applyPack(pack)}
                  className="w-full text-left px-3 py-2 hover:bg-stone-800 transition-colors group">
                  <div className="text-xs font-semibold text-stone-200 group-hover:text-gold">{pack.name} Pack</div>
                  <div className="text-xs text-stone-500 mt-0.5">{pack.items.map(i => i.name).join(', ')}{pack.rations ? ` + ${pack.rations} rations` : ''}</div>
                </button>
              ))}
              <button onClick={() => setShowPacks(false)} className="w-full text-center px-3 py-1.5 text-xs text-stone-600 hover:text-stone-400 border-t border-stone-700">Cancel</button>
            </div>
          )}
        </div>
      </div>

      {/* On-hand inventory */}
      <ItemList
        title="On Hand"
        items={c.onHand.items}
        charId={c.id}
        onAdd={() => addOnHandItem(c.id, { name: '', quantity: 1 })}
        onUpdate={(itemId, patch) => updateOnHandItem(c.id, itemId, patch)}
        onRemove={(itemId) => removeOnHandItem(c.id, itemId)}
        onMove={(itemId) => moveItemToStorage(c.id, itemId)}
        onGive={(itemId, toId) => giveItemToCharacter(c.id, itemId, 'onHand', toId)}
        moveIcon={<ArrowDownToLine size={12} />}
        moveTitle="Move to Storage"
        blockCount={blockCount}
        blocksFull={blocksFull}
      />

      {/* Storage */}
      <ItemList
        title="Storage"
        items={c.storage.items}
        charId={c.id}
        onAdd={() => addStorageItem(c.id, { name: '', quantity: 1 })}
        onUpdate={(itemId, patch) => updateStorageItem(c.id, itemId, patch)}
        onRemove={(itemId) => removeStorageItem(c.id, itemId)}
        onMove={(itemId) => moveItemToHand(c.id, itemId)}
        onGive={(itemId, toId) => giveItemToCharacter(c.id, itemId, 'storage', toId)}
        moveIcon={<ArrowUpFromLine size={12} />}
        moveTitle="Move to On Hand"
      />
    </div>
  )
}

function ItemList({ title, items, charId, onAdd, onUpdate, onRemove, onMove, onGive, moveIcon, moveTitle, blockCount, blocksFull }: {
  title: string
  items: CharacterItem[]
  charId: string
  onAdd: () => void
  onUpdate: (id: string, patch: Partial<CharacterItem>) => void
  onRemove: (id: string) => void
  onMove: (id: string) => void
  onGive: (itemId: string, toId: string) => void
  moveIcon: React.ReactNode
  moveTitle: string
  blockCount?: number
  blocksFull?: boolean
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider font-heading">{title}</div>
          {blockCount !== undefined && (
            <span className={`text-xs font-mono px-1.5 py-0.5 rounded border ${
              blocksFull
                ? 'bg-red-900/40 border-red-700 text-red-400 font-bold'
                : 'bg-stone-800 border-stone-700 text-stone-500'
            }`}>
              📦 {blockCount}/{BLOCK_CAP} blocks{blocksFull ? ' — FULL' : ''}
            </span>
          )}
        </div>
        <button onClick={onAdd} className="p-1 rounded text-stone-500 hover:text-gold hover:bg-stone-700">
          <Plus size={13} />
        </button>
      </div>
      <div className="space-y-1.5">
        {items.length === 0 && (
          <div className="text-xs text-stone-500 italic py-1">Empty</div>
        )}
        {items.map(item => (
          <ItemRow key={item.id} item={item} charId={charId} onUpdate={onUpdate} onRemove={onRemove} onMove={onMove} onGive={onGive} moveIcon={moveIcon} moveTitle={moveTitle} />
        ))}
      </div>
    </div>
  )
}

function ItemRow({ item, charId, onUpdate, onRemove, onMove, onGive, moveIcon, moveTitle }: {
  item: CharacterItem
  charId: string
  onUpdate: (id: string, patch: Partial<CharacterItem>) => void
  onRemove: (id: string) => void
  onMove: (id: string) => void
  onGive: (itemId: string, toId: string) => void
  moveIcon: React.ReactNode
  moveTitle: string
}) {
  const characters = useCharacterStore(s => s.characters)
  const otherChars = characters.filter(c => c.id !== charId)
  const img = loadItemImage(item.name)
  const gearInfo = item.gearSlot ? GEAR_SLOT_LABELS[item.gearSlot] : null

  const handleImgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await fileToDataUrl(file, 200)
    saveItemImage(item.name, url)
    onUpdate(item.id, {})
  }

  return (
    <div className={`flex items-center gap-2 bg-stone-800 border rounded-lg px-2 py-1.5 ${gearInfo ? 'border-stone-600' : 'border-stone-700'}`}>
      <label className="w-8 h-8 rounded bg-stone-700 overflow-hidden cursor-pointer shrink-0 flex items-center justify-center">
        {img ? <img src={img} className="w-full h-full object-cover" /> : <span className="text-stone-500 text-lg">📦</span>}
        <input type="file" accept="image/*" className="hidden" onChange={handleImgUpload} />
      </label>

      <input
        value={item.name}
        onChange={e => onUpdate(item.id, { name: e.target.value })}
        placeholder="Item name..."
        className="flex-1 min-w-0 bg-transparent text-stone-200 text-sm outline-none placeholder:text-stone-600"
      />

      {/* Gear slot badge */}
      {gearInfo && (
        <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gold/10 border border-gold/30 text-gold text-xs shrink-0">
          {gearInfo.icon} {gearInfo.label}
        </span>
      )}

      {/* Block toggle */}
      <button
        onClick={() => onUpdate(item.id, { isBlock: !item.isBlock })}
        title={item.isBlock ? 'Mark as non-block' : 'Mark as block (counts to 10-block limit)'}
        className={`text-xs px-1 py-0.5 rounded border shrink-0 transition-colors ${
          item.isBlock
            ? 'bg-amber-900/40 border-amber-700 text-amber-400'
            : 'bg-stone-900 border-stone-700 text-stone-600 hover:text-stone-400'
        }`}>
        📦
      </button>

      <input
        type="number"
        value={item.quantity}
        min={1}
        onChange={e => onUpdate(item.id, { quantity: parseInt(e.target.value) || 1 })}
        className="w-12 bg-stone-900 border border-stone-600 rounded px-1.5 py-0.5 text-stone-200 text-xs text-center outline-none font-mono tabular-nums"
      />

      <button onClick={() => onMove(item.id)} title={moveTitle}
        disabled={!!gearInfo}
        className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-300 disabled:opacity-30 disabled:cursor-not-allowed">
        {moveIcon}
      </button>

      {!gearInfo && otherChars.length > 0 && (
        <div className="relative shrink-0">
          <select
            value=""
            onChange={e => { if (e.target.value) onGive(item.id, e.target.value) }}
            title="Give to character"
            className="absolute inset-0 opacity-0 w-full cursor-pointer"
          >
            <option value="">Give to...</option>
            {otherChars.map(c => (
              <option key={c.id} value={c.id}>{c.name || 'Unnamed'}</option>
            ))}
          </select>
          <Gift size={12} className="text-stone-500 hover:text-stone-300 pointer-events-none" />
        </div>
      )}

      <button onClick={() => onRemove(item.id)} className="p-0.5 text-stone-500 hover:text-red-400">
        <Trash2 size={12} />
      </button>
    </div>
  )
}
