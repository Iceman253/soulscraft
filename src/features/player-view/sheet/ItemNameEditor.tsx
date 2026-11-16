import { useState } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import type { CharacterItem } from '../../../types'

/** An item's name that the player can click to give it their own label. The
 *  GM-given name stays underneath and is what game rules (potions…) read. */
export function ItemNameEditor({ item, onSave }: { item: CharacterItem; onSave: (customName: string | undefined) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.customName ?? item.name)
  const commit = () => { onSave(draft.trim() || undefined); setEditing(false) }

  if (!editing) {
    return (
      <button
        onClick={() => { setDraft(item.customName ?? item.name); setEditing(true) }}
        className="flex items-center gap-1 group/name text-left min-w-0"
        title="Click to rename"
      >
        <span className="text-stone-200 truncate">{item.customName ?? item.name}</span>
        {item.customName && <span className="text-stone-600 text-xs truncate italic">({item.name})</span>}
        <Pencil size={10} className="shrink-0 text-stone-600 opacity-0 group-hover/name:opacity-100 transition-opacity" />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1 flex-1 min-w-0">
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') setEditing(false)
        }}
        className="flex-1 bg-stone-700 border border-stone-500 rounded-sm px-1.5 py-0.5 text-stone-100 text-xs outline-hidden focus:border-gold/60 min-w-0"
      />
      <button onClick={commit} className="p-0.5 text-gold hover:text-gold/80 shrink-0"><Check size={11} /></button>
      <button onClick={() => setEditing(false)} className="p-0.5 text-stone-500 hover:text-stone-300 shrink-0"><X size={11} /></button>
    </div>
  )
}
