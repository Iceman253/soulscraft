// One editable row in an inventory list (On Hand, Backpack or a stash).
import { Gift, Shield, Sword, Trash2 } from 'lucide-react'
import { useCharacterStore } from '../store'
import { fileToDataUrl, saveItemImage, loadItemImage } from '../../../lib/platform/imageCache'
import { WeaponSpecLine } from '../../../ui/WeaponSpecLine'
import type { CharacterItem } from '../../../types'

export interface ItemMove { icon: React.ReactNode; title: string; onMove: (id: string) => void }

const GEAR_SLOT_LABELS: Record<NonNullable<CharacterItem['gearSlot']>, { label: string; icon: React.ReactNode }> = {
  mainHand: { label: 'Main Hand', icon: <Sword size={9} /> },
  offHand:  { label: 'Off Hand',  icon: <Sword size={9} /> },
  armor:    { label: 'Armor',     icon: <Shield size={9} /> },
  shield:   { label: 'Shield',    icon: <Shield size={9} /> },
}

export function ItemRow({ item, charId, onUpdate, onRemove, moves, onGive }: {
  item: CharacterItem
  charId: string
  onUpdate: (id: string, patch: Partial<CharacterItem>) => void
  onRemove: (id: string) => void
  moves: ItemMove[]
  onGive: (itemId: string, toId: string) => void
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
    <div className={`bg-stone-800 border rounded-lg px-2 py-1.5 ${gearInfo ? 'border-stone-600' : 'border-stone-700'}`}>
      <div className="flex items-center gap-2">
        <label className="w-8 h-8 rounded-sm bg-stone-700 overflow-hidden cursor-pointer shrink-0 flex items-center justify-center">
          {img ? <img src={img} className="w-full h-full object-cover" /> : <span className="text-stone-500 text-lg">📦</span>}
          <input type="file" accept="image/*" className="hidden" onChange={handleImgUpload} />
        </label>

        <input
          value={item.name}
          onChange={e => onUpdate(item.id, { name: e.target.value })}
          placeholder="Item name..."
          className="flex-1 min-w-0 bg-transparent text-stone-200 text-sm outline-hidden placeholder:text-stone-600"
        />

        {/* Gear slot badge */}
        {gearInfo && (
          <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-sm bg-gold/10 border border-gold/30 text-gold text-xs shrink-0">
            {gearInfo.icon} {gearInfo.label}
          </span>
        )}

        {/* Block toggle */}
        <button
          onClick={() => onUpdate(item.id, { isBlock: !item.isBlock })}
          title={item.isBlock ? 'Mark as non-block' : 'Mark as block (counts to 10-block limit)'}
          className={`text-xs px-1 py-0.5 rounded-sm border shrink-0 transition-colors ${
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
          className="w-12 bg-stone-900 border border-stone-600 rounded-sm px-1.5 py-0.5 text-stone-200 text-xs text-center outline-hidden font-mono tabular-nums"
        />

        {moves.map(m => (
          <button key={m.title} onClick={() => m.onMove(item.id)} title={m.title} aria-label={m.title}
            disabled={!!gearInfo}
            className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-300 disabled:opacity-30 disabled:cursor-not-allowed">
            {m.icon}
          </button>
        ))}

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
      {item.weapon && <WeaponSpecLine spec={item.weapon} className="pl-10 pt-0.5" />}
    </div>
  )
}
