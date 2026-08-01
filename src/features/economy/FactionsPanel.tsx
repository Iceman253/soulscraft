import { useState } from 'react'
import { Plus, Trash2, Flag } from 'lucide-react'
import { useEconomyStore } from './store'
import { standingLabel } from '../../lib/economyEngine'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import type { Faction } from '../../types'

const FACTION_COLORS = ['#cd8f22', '#1a9e56', '#bd2e14', '#2bbdaa', '#7a5cc4', '#c4567a', '#5a82c4', '#8a8a4a']

export function FactionsPanel() {
  const { economy, addFaction, updateFaction, deleteFaction, setReputation, adjustReputation } = useEconomyStore()
  const [newName, setNewName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<Faction | null>(null)

  const create = () => {
    const name = newName.trim()
    if (!name) return
    addFaction({ name, color: FACTION_COLORS[economy.factions.length % FACTION_COLORS.length], notes: '' })
    setNewName('')
  }

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="max-w-2xl space-y-4">

        <div>
          <h2 className="font-heading font-bold text-stone-100 text-base">Factions & Standing</h2>
          <p className="text-xs text-stone-500 mt-1 leading-relaxed">
            Standing runs −100 (hostile) to +100 (honored) and moves prices at markets that faction controls — up to ±20%.
            Adjust it when the party earns favours or makes enemies; haggling, quests, and reputation all land here.
          </p>
        </div>

        {/* Add */}
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') create() }}
            placeholder="New faction name…"
            className="flex-1 bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-stone-100 text-sm outline-none focus:border-stone-500 placeholder:text-stone-600"
          />
          <button
            onClick={create}
            disabled={!newName.trim()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-700 text-amber-100 text-sm font-semibold hover:bg-amber-600 disabled:opacity-40 transition-colors"
          >
            <Plus size={13} /> Add
          </button>
        </div>

        {economy.factions.length === 0 && (
          <div className="py-10 text-center text-stone-500 text-sm">
            <Flag size={28} className="mx-auto mb-2 text-stone-700" />
            No factions yet. The Merchant Guild? The Crown? The Smugglers' Ring?
          </div>
        )}

        {economy.factions.map(faction => {
          const rep = economy.reputation[faction.id] ?? 0
          const marketCount = economy.markets.filter(m => m.factionId === faction.id).length
          return (
            <div key={faction.id} className="bg-stone-800/60 border border-stone-700/60 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: faction.color }} />
                <input
                  value={faction.name}
                  onChange={e => updateFaction(faction.id, { name: e.target.value })}
                  className="flex-1 bg-transparent text-stone-100 text-sm font-semibold outline-none border-b border-transparent focus:border-stone-600 min-w-0"
                />
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                  rep >= 20 ? 'bg-emerald/15 text-emerald' : rep <= -20 ? 'bg-red-900/30 text-red-400' : 'bg-stone-700 text-stone-400'
                }`}>
                  {standingLabel(rep)}
                </span>
                {marketCount > 0 && (
                  <span className="text-[10px] text-stone-500 shrink-0">{marketCount} market{marketCount > 1 ? 's' : ''}</span>
                )}
                <button onClick={() => setConfirmDelete(faction)} className="p-1 rounded text-stone-600 hover:text-red-400 shrink-0">
                  <Trash2 size={13} />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="range" min={-100} max={100} step={5} value={rep}
                  onChange={e => setReputation(faction.id, parseInt(e.target.value))}
                  className="flex-1 accent-amber-600"
                />
                <span className={`w-10 text-right text-sm font-mono tabular-nums shrink-0 ${rep > 0 ? 'text-emerald' : rep < 0 ? 'text-red-400' : 'text-stone-400'}`}>
                  {rep > 0 ? '+' : ''}{rep}
                </span>
                <div className="flex gap-1 shrink-0">
                  {[-10, -5, +5, +10].map(d => (
                    <button
                      key={d}
                      onClick={() => adjustReputation(faction.id, d)}
                      className={`px-1.5 py-0.5 rounded text-[11px] font-mono transition-colors ${
                        d > 0 ? 'bg-emerald/10 text-emerald hover:bg-emerald/20' : 'bg-red-950/30 text-red-400 hover:bg-red-950/50'
                      }`}
                    >
                      {d > 0 ? `+${d}` : d}
                    </button>
                  ))}
                </div>
              </div>

              <input
                value={faction.notes}
                onChange={e => updateFaction(faction.id, { notes: e.target.value })}
                placeholder="Notes — who they are, what they want…"
                className="w-full bg-stone-900/60 border border-stone-700/50 rounded-lg px-3 py-1.5 text-stone-300 text-xs outline-none focus:border-stone-500 placeholder:text-stone-600"
              />
            </div>
          )
        })}
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Delete Faction"
          message={`Delete "${confirmDelete.name}"? Markets they control become independent; their standing is forgotten.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => deleteFaction(confirmDelete.id)}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
