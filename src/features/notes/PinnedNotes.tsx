import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useNotesStore } from './store'

const NOTE_COLORS = ['#f5c842', '#17c964', '#3b82f6', '#f97316', '#a855f7', '#ec4899']

export function PinnedNotes() {
  const { notes, addNote, updateNote, deleteNote } = useNotesStore()
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [color, setColor] = useState(NOTE_COLORS[0])

  const submit = () => {
    if (!draft.trim()) return
    addNote(draft.trim(), color)
    setDraft('')
    setAdding(false)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-stone-700 shrink-0">
        <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Pinned Notes</span>
        <button onClick={() => setAdding(v => !v)} className="p-1 rounded text-stone-500 hover:text-gold hover:bg-stone-700">
          <Plus size={12} />
        </button>
      </div>

      {adding && (
        <div className="p-2 border-b border-stone-700 shrink-0 space-y-2">
          <input
            type="text"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setAdding(false) }}
            autoFocus
            placeholder="Quick note..."
            className="w-full bg-stone-900 border border-stone-600 rounded px-2 py-1 text-xs text-stone-200 outline-none focus:border-gold/40"
          />
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {NOTE_COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} className={`w-4 h-4 rounded-full border-2 transition-transform ${color === c ? 'scale-125 border-white' : 'border-transparent'}`} style={{ background: c }} />
              ))}
            </div>
            <button onClick={submit} className="text-xs px-2 py-1 rounded bg-gold text-stone-900 font-semibold hover:bg-yellow-400">Pin</button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {notes.length === 0 && !adding && (
          <p className="text-xs text-stone-600 text-center py-3">No pinned notes</p>
        )}
        {notes.map(note => (
          <div key={note.id} className="group relative bg-stone-800 rounded px-2 py-1.5 border-l-2" style={{ borderColor: note.color ?? '#f5c842' }}>
            <textarea
              value={note.text}
              onChange={e => updateNote(note.id, e.target.value)}
              rows={2}
              className="w-full bg-transparent text-xs text-stone-200 resize-none outline-none leading-relaxed"
            />
            <button
              onClick={() => deleteNote(note.id)}
              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-0.5 rounded text-stone-500 hover:text-red-400"
            >
              <Trash2 size={11} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
