import { useState } from 'react'
import { Moon, Check, AlertTriangle, RotateCcw } from 'lucide-react'
import { useRestStore } from './store'
import { useCharacterStore } from '../characters/store'
import type { RestConditions } from '../../types'

export function RestPanel() {
  const { events, logRest } = useRestStore()
  const { characters, missRest, resetMissedRests } = useCharacterStore()

  const [selectedChars, setSelectedChars] = useState<string[]>([])
  const [location, setLocation] = useState('')
  const [conditions, setConditions] = useState<RestConditions>({ fed: false, shelter: false, safe: false, calmMind: false })

  const toggleChar = (id: string) => setSelectedChars(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
  const toggleCond = (key: keyof RestConditions) => setConditions(prev => ({ ...prev, [key]: !prev[key] }))

  const metCount = Object.values(conditions).filter(Boolean).length
  // Rulebook: "most or all conditions met" = 3+ out of 4 for Good Rest
  const quality = metCount >= 3 ? 'Good Rest' : 'Poor Rest'
  const qualityColor = metCount >= 3 ? 'text-emerald' : 'text-orange-400'

  const handleLogRest = () => {
    if (selectedChars.length === 0 || !location.trim()) return
    logRest(location.trim(), conditions, selectedChars)
    setSelectedChars([])
  }

  return (
    <div className="h-full flex flex-col p-4 overflow-y-auto">
      <h2 className="font-semibold text-stone-100 mb-4 flex items-center gap-2 font-heading tracking-wide">
        <Moon size={16} className="text-blue-300" /> Rest Log
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Log a rest */}
        <div className="bg-stone-800 border border-stone-700 rounded-xl p-4 space-y-3">
          <div className="font-medium text-stone-200 text-sm font-heading tracking-wide">Log a Rest</div>

          {/* Location */}
          <div>
            <label className="text-xs text-stone-500 block mb-1">Where did they rest?</label>
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Camp by the river..."
              className="w-full bg-stone-900 border border-stone-600 rounded px-2 py-1.5 text-stone-200 text-sm outline-none focus:border-gold/50" />
          </div>

          {/* Characters */}
          <div>
            <label className="text-xs text-stone-500 block mb-1">Who rested?</label>
            <div className="flex flex-wrap gap-1.5">
              {characters.map(c => (
                <button key={c.id} onClick={() => toggleChar(c.id)}
                  className={`px-2.5 py-1 rounded text-xs border transition-all ${selectedChars.includes(c.id) ? 'bg-emerald/20 border-emerald/50 text-emerald' : 'bg-stone-700 border-stone-600 text-stone-400 hover:text-stone-200'}`}>
                  {selectedChars.includes(c.id) && '✓ '}{c.name}
                </button>
              ))}
              {characters.length === 0 && <span className="text-xs text-stone-500">No characters yet</span>}
            </div>
          </div>

          {/* Conditions */}
          <div>
            <label className="text-xs text-stone-500 block mb-1">Rest Conditions</label>
            <div className="space-y-1.5">
              {([
                ['fed', '🍖 Fed — Characters had rations'],
                ['shelter', '🏠 Shelter — Protected from environment'],
                ['safe', '🛡️ Safe — No imminent threats'],
                ['calmMind', '🧘 Calm Mind — No psychological stress'],
              ] as const).map(([key, label]) => (
                <button key={key} onClick={() => toggleCond(key)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${conditions[key] ? 'bg-emerald/10 border-emerald/40 text-stone-200' : 'bg-stone-700 border-stone-600 text-stone-400 hover:text-stone-200'}`}>
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${conditions[key] ? 'bg-emerald border-emerald' : 'border-stone-500'}`}>
                    {conditions[key] && <Check size={10} className="text-stone-900" />}
                  </div>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Quality preview */}
          <div className={`text-sm font-semibold ${qualityColor}`}>
            <span className="font-mono tabular-nums">{metCount}/4</span> conditions met → {quality} {metCount >= 3 ? '✓' : '(need 3+)'}
          </div>
          <div className="text-xs text-stone-500">
            {metCount >= 3 ? 'Full HP & SD restored. Negative effects cleared. Class features reset.' : 'Half of lost HP & SD restored. Class features reset.'}
          </div>

          <button onClick={handleLogRest} disabled={selectedChars.length === 0 || !location.trim()}
            className="w-full py-2 rounded-lg bg-gold text-stone-900 font-bold hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-sm">
            Log Rest
          </button>
        </div>

        {/* Rest history */}
        <div className="bg-stone-800 border border-stone-700 rounded-xl p-4">
          <div className="font-medium text-stone-200 text-sm mb-3 font-heading tracking-wide">Rest History</div>
          {events.length === 0 && <div className="text-xs text-stone-500">No rests logged yet</div>}
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {[...events].reverse().map(ev => {
              const charNames = ev.characterIds.map(id => characters.find(c => c.id === id)?.name ?? '?').join(', ')
              const cond = [ev.conditions.fed && '🍖', ev.conditions.shelter && '🏠', ev.conditions.safe && '🛡️', ev.conditions.calmMind && '🧘'].filter(Boolean).join(' ')
              return (
                <div key={ev.id} className={`rounded-lg border px-3 py-2 text-sm ${ev.quality === 'good' ? 'border-emerald/30 bg-emerald/5' : 'border-orange-700/30 bg-orange-900/10'}`}>
                  <div className="flex items-center justify-between">
                    <span className={ev.quality === 'good' ? 'text-emerald font-semibold' : 'text-orange-400 font-semibold'}>
                      {ev.quality === 'good' ? '✅ Good Rest' : '⚠️ Poor Rest'}
                    </span>
                    <span className="text-xs text-stone-500">{new Date(ev.timestamp).toLocaleDateString()}</span>
                  </div>
                  <div className="text-xs text-stone-400">📍 {ev.location}</div>
                  <div className="text-xs text-stone-500">{charNames}</div>
                  <div className="text-xs text-stone-500">{cond || 'No conditions met'}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* No-rest penalty tracker */}
      {characters.length > 0 && (
        <div className="bg-stone-800 border border-stone-700 rounded-xl p-4 mt-2">
          <div className="font-medium text-stone-200 text-sm mb-3 flex items-center gap-2 font-heading tracking-wide">
            <AlertTriangle size={14} className="text-orange-400" />
            No-Rest Penalties
          </div>
          <div className="space-y-2">
            {characters.map(c => (
              <div key={c.id} className="flex items-center gap-3">
                <span className="flex-1 text-sm text-stone-300 truncate">{c.name}</span>
                {c.missedRests > 0
                  ? <span className="text-xs text-orange-400 font-bold font-mono">-{c.missedRests}d4 to all rolls</span>
                  : <span className="text-xs text-stone-500">No penalty</span>
                }
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => missRest(c.id)}
                    title="Record a missed rest"
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-orange-900/40 border border-orange-700/50 text-orange-400 hover:bg-orange-800/40 text-xs"
                  >
                    <AlertTriangle size={10} /> Miss
                  </button>
                  {c.missedRests > 0 && (
                    <button
                      onClick={() => resetMissedRests(c.id)}
                      title="Reset missed rests"
                      className="flex items-center gap-1 px-2 py-0.5 rounded bg-stone-700 border border-stone-600 text-stone-400 hover:text-stone-200 text-xs"
                    >
                      <RotateCcw size={10} /> Reset
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
