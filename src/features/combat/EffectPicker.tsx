import { useState } from 'react'
import { X, Plus, Search } from 'lucide-react'
import { STATUS_EFFECTS } from './statusEffects'
import type { StatusTemplate } from './statusEffects'

interface EffectPickerProps {
  onApply: (t: StatusTemplate) => void
  onClose: () => void
}

export function EffectPicker({ onApply, onClose }: EffectPickerProps) {
  const [query, setQuery] = useState('')

  const filtered = STATUS_EFFECTS.filter(e =>
    query === '' || e.name.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="mt-2 bg-stone-900 border border-purple-700/40 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 flex items-center gap-1 bg-stone-800 border border-stone-700 rounded px-2 py-1">
          <Search size={10} className="text-stone-500 shrink-0" />
          <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search all 41 effects…"
            className="flex-1 bg-transparent text-stone-300 text-xs outline-none placeholder:text-stone-600" />
        </div>
        <button onClick={onClose} className="text-stone-500 hover:text-stone-300"><X size={13} /></button>
      </div>
      <div className="space-y-0.5 max-h-72 overflow-y-auto">
        {filtered.length === 0 && <div className="text-xs text-stone-600 py-2 text-center">No effects found</div>}
        {filtered.map(e => (
          <button key={e.name} onClick={() => onApply(e)}
            className="w-full flex items-start gap-2 px-2 py-1.5 rounded hover:bg-stone-800 text-left group">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-medium ${e.harmful ? 'text-red-300' : 'text-emerald'}`}>{e.name}</span>
                <span className="text-xs text-stone-600">Lv{e.level}</span>
                {e.damagePerRound && (
                  <span className="text-xs text-red-400 font-mono">🩸{e.damagePerRound}/turn</span>
                )}
              </div>
              <div className="text-xs text-stone-500 truncate">{e.description}</div>
            </div>
            <Plus size={11} className="text-stone-600 group-hover:text-stone-300 shrink-0 mt-0.5" />
          </button>
        ))}
      </div>
    </div>
  )
}
