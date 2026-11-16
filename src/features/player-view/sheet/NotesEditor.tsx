import { useState } from 'react'
import { Pencil } from 'lucide-react'
import type { Character } from '../../../types'
import { useCharacterStore } from '../../characters/store'

/** A character's notes: owners edit with Save/Cancel, others only read. */
export function NotesEditor({ character: c, editable }: { character: Character; editable: boolean }) {
  const updateCharacter = useCharacterStore(s => s.updateCharacter)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const startEditing = () => { setDraft(c.notes ?? ''); setEditing(true) }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-medium text-stone-400 font-heading tracking-wide">Notes</div>
        {editable && !editing && (
          <button onClick={startEditing} className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-300 transition-colors">
            <Pencil size={11} /> Edit
          </button>
        )}
      </div>
      {editable && editing ? (
        <div className="space-y-1.5">
          <textarea autoFocus value={draft} onChange={e => setDraft(e.target.value)} rows={5} placeholder="Write notes here…"
            className="w-full bg-stone-800 border border-stone-600 rounded-sm px-2.5 py-2 text-stone-100 text-xs outline-hidden resize-none focus:border-gold/50 transition-colors" />
          <div className="flex gap-1.5 justify-end">
            <button onClick={() => setEditing(false)}
              className="px-2.5 py-1 rounded-sm text-xs text-stone-400 hover:text-stone-200 border border-stone-600 hover:border-stone-500 transition-colors">
              Cancel
            </button>
            <button onClick={() => { updateCharacter(c.id, { notes: draft }); setEditing(false) }}
              className="px-2.5 py-1 rounded-sm text-xs text-gold border border-gold/50 hover:bg-gold/10 transition-colors">
              Save
            </button>
          </div>
        </div>
      ) : (
        <div onClick={editable ? startEditing : undefined}
          className={`text-xs text-stone-400 whitespace-pre-wrap rounded-sm px-2 py-1.5 min-h-[2.5rem] ${
            editable ? 'cursor-text hover:bg-stone-800/60 transition-colors' : ''
          } ${!c.notes ? 'text-stone-600 italic' : ''}`}>
          {c.notes || (editable ? 'Click to add notes…' : 'No notes.')}
        </div>
      )}
    </div>
  )
}
