import { useState } from 'react'
import { X, Plus, Search, AlertTriangle } from 'lucide-react'
import { STATUS_EFFECTS } from './statusEffects'
import type { StatusTemplate } from './statusEffects'

// Rulebook tag-based immunities
// Construct: immune to poison, sleep, and mind-altering effects
// Undead: immune to fear and many mortal weaknesses (poison, mind-altering at GM discretion)
const CONSTRUCT_IMMUNE = ['Poison', 'Nausea', 'Hunger', 'Fear', 'Charm', 'Confusion', 'Hallucination', 'Fatigue']
const UNDEAD_IMMUNE    = ['Fear', 'Poison', 'Charm', 'Confusion', 'Nausea', 'Hunger']

interface EffectPickerProps {
  onApply: (t: StatusTemplate) => void
  onClose: () => void
  targetTags?: string[]   // creature type tags, e.g. ['construct'] or ['undead']
}

export function EffectPicker({ onApply, onClose, targetTags = [] }: EffectPickerProps) {
  const [query, setQuery] = useState('')

  const isConstruct = targetTags.some(t => t.toLowerCase() === 'construct')
  const isUndead    = targetTags.some(t => t.toLowerCase() === 'undead')

  const immuneEffects = new Set([
    ...(isConstruct ? CONSTRUCT_IMMUNE : []),
    ...(isUndead    ? UNDEAD_IMMUNE    : []),
  ])

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

      {/* Immunity notice */}
      {immuneEffects.size > 0 && (
        <div className="mb-2 px-2 py-1.5 rounded bg-amber-900/20 border border-amber-700/30 text-xs text-amber-400 flex items-start gap-1.5">
          <AlertTriangle size={11} className="mt-0.5 shrink-0" />
          <span>
            <strong>{isConstruct ? 'Construct' : 'Undead'}</strong> — immune to marked effects per rulebook rules.
          </span>
        </div>
      )}

      <div className="space-y-0.5 max-h-64 overflow-y-auto">
        {filtered.length === 0 && <div className="text-xs text-stone-500 py-2 text-center">No effects found</div>}
        {filtered.map(e => {
          const isImmune = immuneEffects.has(e.name)
          return (
            <button key={e.name} onClick={() => onApply(e)}
              className={`w-full flex items-start gap-2 px-2 py-1.5 rounded text-left group transition-colors ${
                isImmune ? 'opacity-40 hover:opacity-60 hover:bg-stone-800' : 'hover:bg-stone-800'
              }`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-xs font-medium ${e.harmful ? 'text-red-300' : 'text-emerald'}`}>{e.name}</span>
                  <span className="text-xs text-stone-500 font-mono">Lv{e.level}</span>
                  {e.damagePerRound && (
                    <span className="text-xs text-red-400 font-mono">🩸{e.damagePerRound}/turn</span>
                  )}
                  {e.healPerRound && (
                    <span className="text-xs text-emerald font-mono">💚{e.healPerRound}/turn</span>
                  )}
                  {isImmune && (
                    <span className="text-xs text-amber-400 font-medium">⚠ immune</span>
                  )}
                </div>
                <div className="text-xs text-stone-500 truncate">{e.description}</div>
              </div>
              <Plus size={11} className="text-stone-600 group-hover:text-stone-300 shrink-0 mt-0.5" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
