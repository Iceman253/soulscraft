import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useCharacterStore } from '../store'
import { Badge } from '../../../ui/Badge'
import { QUICK_EFFECTS } from '../../../lib/constants'
import type { Character, ActiveEffect } from '../../../types'

interface TabEffectsProps { character: Character }

export function TabEffects({ character: c }: TabEffectsProps) {
  const { addEffect, removeEffect } = useCharacterStore()
  const [name, setName] = useState('')
  const [durType, setDurType] = useState<ActiveEffect['durationType']>('scenes')
  const [remaining, setRemaining] = useState(3)

  const submit = () => {
    if (!name.trim()) return
    addEffect(c.id, {
      name: name.trim(),
      durationType: durType,
      remaining: durType === 'scenes' || durType === 'days' ? remaining : undefined,
    })
    setName('')
  }

  return (
    <div className="p-4 space-y-4">
      {/* Quick effects */}
      <div>
        <div className="text-xs text-stone-500 mb-2">Quick Add</div>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_EFFECTS.map(qe => (
            <button
              key={qe.name}
              onClick={() => addEffect(c.id, {
                name: qe.name,
                durationType: qe.durationType,
                remaining: qe.durationType === 'scenes' || qe.durationType === 'days' ? qe.defaultDuration : undefined,
              })}
              className="px-2.5 py-1 rounded bg-stone-700 border border-stone-600 hover:border-purple-500/50 text-stone-300 text-xs"
            >
              {qe.name}
            </button>
          ))}
        </div>
      </div>

      {/* Custom effect */}
      <div className="flex gap-2 flex-wrap items-end bg-stone-800 border border-stone-700 rounded-lg p-3">
        <div className="flex-1 min-w-28">
          <div className="text-xs text-stone-500 mb-1">Name</div>
          <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="Magic Circle..." className="w-full bg-stone-900 border border-stone-600 rounded px-2 py-1.5 text-stone-200 text-sm outline-none focus:border-purple-500/50" />
        </div>
        <div>
          <div className="text-xs text-stone-500 mb-1">Duration</div>
          <select value={durType} onChange={e => setDurType(e.target.value as ActiveEffect['durationType'])} className="bg-stone-900 border border-stone-600 rounded px-2 py-1.5 text-stone-200 text-sm outline-none">
            <option value="scenes">Scenes</option>
            <option value="days">Days</option>
            <option value="until-rest">Until Rest</option>
            <option value="permanent">Permanent</option>
            <option value="manual">Manual</option>
          </select>
        </div>
        {(durType === 'scenes' || durType === 'days') && (
          <div>
            <div className="text-xs text-stone-500 mb-1">Amount</div>
            <input type="number" value={remaining} min={1} onChange={e => setRemaining(parseInt(e.target.value) || 1)}
              className="w-16 bg-stone-900 border border-stone-600 rounded px-2 py-1.5 text-stone-200 text-sm outline-none" />
          </div>
        )}
        <button onClick={submit} className="px-3 py-1.5 rounded bg-stone-700 text-stone-300 hover:bg-stone-600 text-sm"><Plus size={13} /></button>
      </div>

      {/* Active effects list */}
      <div>
        <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 font-heading">
          Active Effects ({c.activeEffects.length})
        </div>
        {c.activeEffects.length === 0 && (
          <div className="text-xs text-stone-500 italic">No active effects</div>
        )}
        <div className="space-y-2">
          {c.activeEffects.map(effect => (
            <div key={effect.id} className="flex items-center gap-2 bg-stone-800 border border-stone-700 rounded-lg px-3 py-2">
              <span className="flex-1 text-sm text-stone-200">{effect.name}</span>
              <DurBadge effect={effect} />
              <button onClick={() => removeEffect(c.id, effect.id)} className="p-0.5 text-stone-500 hover:text-red-400">
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function DurBadge({ effect }: { effect: ActiveEffect }) {
  if (effect.durationType === 'scenes') return <Badge variant="blue">{effect.remaining}s</Badge>
  if (effect.durationType === 'days') return <Badge variant="orange">{effect.remaining}d</Badge>
  if (effect.durationType === 'until-rest') return <Badge variant="gold">Until Rest</Badge>
  if (effect.durationType === 'permanent') return <Badge variant="green">Permanent</Badge>
  return <Badge variant="muted">Manual</Badge>
}
