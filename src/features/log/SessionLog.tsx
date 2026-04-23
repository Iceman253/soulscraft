import { useRef, useEffect, useState } from 'react'
import { Trash2, Send } from 'lucide-react'
import { useLogStore } from './store'

const TYPE_COLORS: Record<string, string> = {
  manual:         'text-stone-300',
  rest:           'text-emerald',
  'missed-rest':  'text-orange-400',
  'item-purchase':'text-blue-300',
  'dice-roll':    'text-purple-300',
  'character-move':'text-yellow-300',
  'level-up':     'text-gold',
  'xp-awarded':   'text-gold',
  'quest-update': 'text-cyan-300',
  'combat-end':   'text-red-400',
  'effect-applied':'text-teal-300',
  'effect-expired':'text-stone-400',
}

export function SessionLog() {
  const { entries, addManualEntry, deleteEntry, clearLog } = useLogStore()
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [entries.length])

  const submit = () => {
    const t = input.trim()
    if (!t) return
    addManualEntry(t)
    setInput('')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-stone-700 shrink-0">
        <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Session Log</span>
        <button onClick={clearLog} className="p-1 rounded text-stone-500 hover:text-red-400 hover:bg-stone-700">
          <Trash2 size={12} />
        </button>
      </div>

      {/* Manual input */}
      <div className="flex gap-1 p-2 border-b border-stone-700 shrink-0">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Add note..."
          className="flex-1 bg-stone-900 border border-stone-600 rounded px-2 py-1 text-xs text-stone-200 outline-none focus:border-gold/40 placeholder:text-stone-600"
        />
        <button onClick={submit} className="p-1.5 rounded bg-stone-700 text-stone-400 hover:bg-stone-600 hover:text-stone-100">
          <Send size={12} />
        </button>
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {entries.length === 0 && (
          <p className="text-xs text-stone-600 text-center py-4">No entries yet</p>
        )}
        {[...entries].reverse().map(entry => (
          <div key={entry.id} className="group flex items-start gap-1 text-xs leading-relaxed">
            <span className="text-stone-600 mr-0.5 shrink-0 mt-0.5">
              {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className={`flex-1 ${TYPE_COLORS[entry.type] ?? 'text-stone-300'}`}>{entry.text}</span>
            <button
              onClick={() => deleteEntry(entry.id)}
              className="shrink-0 opacity-0 group-hover:opacity-100 p-0.5 text-stone-600 hover:text-red-400 transition-opacity mt-0.5"
            >
              <Trash2 size={10} />
            </button>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
