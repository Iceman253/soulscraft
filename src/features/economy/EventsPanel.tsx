import { useState } from 'react'
import { Zap, X, Globe, MapPin } from 'lucide-react'
import { useEconomyStore } from './store'
import { useWorldStore } from '../map/store'
import { EVENT_PRESETS } from '../../lib/economyEngine'
import { ALL_GOOD_TAGS } from '../../lib/goods'
import type { GoodTag } from '../../types'

export function EventsPanel() {
  const { economy, addEvent, removeEvent } = useEconomyStore()
  const areas = useWorldStore(s => s.areas)

  // Shared form state — presets prefill it, the GM tweaks, then fires.
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [multiplier, setMultiplier] = useState(1.5)
  const [tags, setTags] = useState<GoodTag[]>([])
  const [scope, setScope] = useState<string>('global')
  const [days, setDays] = useState<number | ''>(7)

  const applyPreset = (i: number) => {
    const p = EVENT_PRESETS[i]
    setName(p.name)
    setDescription(p.description)
    setMultiplier(p.priceMultiplier)
    setTags([...p.affectedTags])
  }

  const fire = () => {
    if (!name.trim()) return
    addEvent({
      name: name.trim(),
      description: description.trim(),
      affectedTags: tags,
      priceMultiplier: multiplier,
      scope,
      remainingDays: days === '' ? null : Math.max(1, days),
    })
    setName(''); setDescription(''); setMultiplier(1.5); setTags([])
  }

  const toggleTag = (tag: GoodTag) =>
    setTags(t => t.includes(tag) ? t.filter(x => x !== tag) : [...t, tag])

  const areaName = (id: string) => areas.find(a => a.id === id)?.name ?? 'removed area'

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="max-w-2xl space-y-5">

        <div>
          <h2 className="font-heading font-bold text-stone-100 text-base">Economic Events</h2>
          <p className="text-xs text-stone-500 mt-1 leading-relaxed">
            Shocks that bend prices while they last — a famine doubles food, a gold rush floods the metal market.
            Timed events tick down on <span className="text-stone-400">End Day</span>; open-ended ones run until you end them.
          </p>
        </div>

        {/* Active events */}
        {economy.events.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider font-heading">Active</div>
            {economy.events.map(ev => (
              <div key={ev.id} className="flex items-center gap-3 bg-amber-900/15 border border-amber-800/30 rounded-lg px-3 py-2.5">
                <Zap size={14} className="text-amber-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-stone-100">
                    {ev.name}
                    <span className={`ml-2 text-xs font-mono ${ev.priceMultiplier > 1 ? 'text-red-400' : 'text-emerald'}`}>
                      ×{ev.priceMultiplier.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-stone-500 flex-wrap">
                    <span className="flex items-center gap-0.5">
                      {ev.scope === 'global' ? <><Globe size={9} /> everywhere</> : <><MapPin size={9} /> {areaName(ev.scope)}</>}
                    </span>
                    <span>· {ev.affectedTags.length === 0 ? 'all goods' : ev.affectedTags.join(', ')}</span>
                    <span>· {ev.remainingDays === null ? 'until ended' : `${ev.remainingDays} day${ev.remainingDays > 1 ? 's' : ''} left`}</span>
                  </div>
                </div>
                <button onClick={() => removeEvent(ev.id)} title="End this event now" className="p-1 rounded text-stone-500 hover:text-red-400 shrink-0">
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Presets */}
        <div>
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider font-heading mb-2">Presets</div>
          <div className="grid grid-cols-2 gap-1.5">
            {EVENT_PRESETS.map((p, i) => (
              <button
                key={p.name}
                onClick={() => applyPreset(i)}
                className="text-left px-3 py-2 rounded-lg bg-stone-800 border border-stone-700 hover:border-amber-700/60 transition-colors"
              >
                <div className="text-xs text-stone-200">
                  {p.name}
                  <span className={`ml-1.5 font-mono text-[10px] ${p.priceMultiplier > 1 ? 'text-red-400' : 'text-emerald'}`}>
                    ×{p.priceMultiplier}
                  </span>
                </div>
                <div className="text-[10px] text-stone-500 leading-snug mt-0.5">{p.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom / fire form */}
        <div className="bg-stone-800/60 border border-stone-700/60 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-[1fr_110px] gap-3">
            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1.5 font-heading">Event</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Pick a preset above or write your own…"
                className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-stone-100 text-sm outline-none focus:border-stone-500 placeholder:text-stone-600"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1.5 font-heading">Multiplier</label>
              <input
                type="number" step={0.05} min={0.1} max={10} value={multiplier}
                onChange={e => setMultiplier(Math.max(0.1, Math.min(10, parseFloat(e.target.value) || 1)))}
                className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-stone-100 text-sm outline-none focus:border-stone-500 font-mono tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1.5 font-heading">
              Affected goods <span className="normal-case text-stone-600">(none selected = everything)</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_GOOD_TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${
                    tags.includes(tag)
                      ? 'bg-amber-900/40 border-amber-600/60 text-amber-200'
                      : 'bg-stone-900 border-stone-700 text-stone-500 hover:border-stone-500'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1.5 font-heading">Where</label>
              <select
                value={scope}
                onChange={e => setScope(e.target.value)}
                className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-stone-200 text-sm outline-none"
              >
                <option value="global">🌍 Everywhere</option>
                {areas.map(a => <option key={a.id} value={a.id}>📍 {a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1.5 font-heading">
                Duration <span className="normal-case text-stone-600">(days; blank = until ended)</span>
              </label>
              <input
                type="number" min={1} value={days}
                onChange={e => setDays(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-stone-100 text-sm outline-none focus:border-stone-500 font-mono tabular-nums"
              />
            </div>
          </div>

          <button
            onClick={fire}
            disabled={!name.trim()}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-amber-700 text-amber-100 font-semibold text-sm hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Zap size={14} /> Fire Event
          </button>
        </div>
      </div>
    </div>
  )
}
