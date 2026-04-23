import { useCharacterStore } from '../store'
import { Plus, Trash2, ArrowDownToLine, ArrowUpFromLine, Sword, Shield, Gift } from 'lucide-react'
import { fileToDataUrl, saveItemImage, loadItemImage } from '../../../lib/imageCache'
import { CURRENCY_OPTIONS } from '../../../lib/currency'
import type { Character, CharacterItem } from '../../../types'

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

  const blockCount = c.onHand.items.filter(i => i.isBlock).reduce((sum, i) => sum + (i.quantity ?? 1), 0)
  const blocksFull = blockCount >= BLOCK_CAP

  return (
    <div className="p-4 space-y-5">
      {/* Currency */}
      <div className="bg-stone-800 border border-stone-700 rounded-lg p-3">
        <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Currency</div>
        <div className="flex flex-wrap gap-3">
          {CURRENCY_OPTIONS.map(({ key, label, img }) => (
            <div key={key} className="flex items-center gap-1.5">
              <img src={img} alt={label} className="w-5 h-5 object-contain" />
              <input
                type="number"
                value={c.currency[key]}
                min={0}
                onChange={e => setCurrency(c.id, { [key]: parseInt(e.target.value) || 0 })}
                className="w-16 bg-stone-900 border border-stone-600 rounded px-2 py-1 text-stone-200 text-sm outline-none focus:border-gold/50"
              />
              <span className="text-xs text-stone-500">{label}</span>
            </div>
          ))}
        </div>
        <div className="text-xs text-stone-600 mt-2">1 Diamond = 10 Emerald = 100 Gold = 1,000 Iron = 10,000 Copper</div>
      </div>

      {/* Rations */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-stone-400">🍖 Rations</span>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setRations(c.id, Math.max(0, c.rations - 1))} className="w-6 h-6 rounded bg-stone-700 text-stone-300 hover:bg-stone-600 text-sm">-</button>
          <span className="text-stone-100 font-bold w-6 text-center">{c.rations}</span>
          <button onClick={() => setRations(c.id, c.rations + 1)} className="w-6 h-6 rounded bg-stone-700 text-stone-300 hover:bg-stone-600 text-sm">+</button>
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
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">{title}</div>
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
          <div className="text-xs text-stone-600 italic py-1">Empty</div>
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
        className="w-12 bg-stone-900 border border-stone-600 rounded px-1.5 py-0.5 text-stone-200 text-xs text-center outline-none"
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
