import { useState } from 'react'
import { useCharacterStore } from '../store'
import { Plus, Trash2, Zap } from 'lucide-react'
import { Badge } from '../../../ui/Badge'
import { log } from '../../log/store'
import type { Character } from '../../../types'

interface TabAbilitiesProps { character: Character }

export function TabAbilities({ character: c }: TabAbilitiesProps) {
  const { addAbility, updateAbility, deleteAbility, adjustSd } = useCharacterStore()
  const [usedFeedback, setUsedFeedback] = useState<string | null>(null)

  const useAbility = (_abId: string, name: string, sdCost: number) => {
    if (c.currentSd < sdCost) return
    adjustSd(c.id, -sdCost)
    const msg = `✨ ${c.name} used ${name} (${sdCost} SD). ${c.currentSd - sdCost} SD remaining.`
    log('effect-applied', msg)
    setUsedFeedback(name)
    setTimeout(() => setUsedFeedback(null), 2500)
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <div>
          <div className="text-sm font-semibold text-stone-200">Abilities</div>
          <div className="text-xs text-stone-500">Active powers that cost Soul Dice to activate</div>
        </div>
        <button onClick={() => addAbility(c.id, { name: '', sdCost: 1, description: '', recharge: 'rest' })}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-stone-700 text-stone-300 hover:bg-stone-600 text-xs">
          <Plus size={12} /> Add Ability
        </button>
      </div>

      {c.abilities.length === 0 && (
        <div className="text-xs text-stone-500 italic py-4 text-center">No abilities yet</div>
      )}

      {/* Feedback toast */}
      {usedFeedback && (
        <div className="px-3 py-1.5 rounded-lg bg-gold/10 border border-gold/30 text-xs text-gold">
          ✨ Used: {usedFeedback}
        </div>
      )}

      <div className="space-y-3">
        {c.abilities.map(ab => {
          const canAfford = c.currentSd >= ab.sdCost
          return (
            <div key={ab.id} className="bg-stone-800 border border-stone-700 rounded-lg p-3">
              <div className="flex items-start gap-2 mb-2">
                <input
                  value={ab.name}
                  onChange={e => updateAbility(c.id, ab.id, { name: e.target.value })}
                  placeholder="Ability name..."
                  className="flex-1 bg-stone-900 border border-stone-600 rounded px-2 py-1 text-stone-100 text-sm font-medium outline-none focus:border-gold/50"
                />
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs text-stone-500">SD</span>
                  <input
                    type="number" min={0} value={ab.sdCost}
                    onChange={e => updateAbility(c.id, ab.id, { sdCost: parseInt(e.target.value) || 0 })}
                    className="w-12 bg-stone-900 border border-stone-600 rounded px-1.5 py-1 text-gold text-xs text-center outline-none"
                  />
                </div>
                <select
                  value={ab.recharge}
                  onChange={e => updateAbility(c.id, ab.id, { recharge: e.target.value as 'rest' | 'scene' | 'day' | 'none' })}
                  className="bg-stone-900 border border-stone-600 rounded px-1.5 py-1 text-stone-200 text-xs outline-none"
                >
                  <option value="rest">Per Rest</option>
                  <option value="scene">Per Scene</option>
                  <option value="day">Per Day</option>
                  <option value="none">One-time</option>
                </select>
                <button onClick={() => deleteAbility(c.id, ab.id)} className="p-1 text-stone-500 hover:text-red-400">
                  <Trash2 size={12} />
                </button>
              </div>
              <textarea
                value={ab.description}
                onChange={e => updateAbility(c.id, ab.id, { description: e.target.value })}
                placeholder="Describe what this ability does..."
                rows={2}
                className="w-full bg-stone-900 border border-stone-600 rounded px-2 py-1.5 text-stone-400 text-xs outline-none resize-none focus:border-stone-500"
              />
              {ab.sdCost > 0 && (
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <Badge variant="gold">🎲 {ab.sdCost} SD</Badge>
                  <Badge variant="muted">Recharge: {ab.recharge}</Badge>
                  {/* Use button */}
                  <button
                    onClick={() => useAbility(ab.id, ab.name, ab.sdCost)}
                    disabled={!canAfford || !ab.name.trim()}
                    title={canAfford ? `Spend ${ab.sdCost} SD to use ${ab.name}` : `Not enough SD (need ${ab.sdCost}, have ${c.currentSd})`}
                    className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded border text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed
                      enabled:bg-gold/10 enabled:border-gold/40 enabled:text-gold enabled:hover:bg-gold/20"
                  >
                    <Zap size={11} /> Use ({ab.sdCost} SD)
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
