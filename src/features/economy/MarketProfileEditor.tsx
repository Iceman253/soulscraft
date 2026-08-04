import { useState } from 'react'
import { Wand2 } from 'lucide-react'
import { useEconomyStore } from './store'
import { useWorldStore } from '../map/store'
import { suggestRemotenessFromMap } from '../../lib/economyEngine'
import { ALL_GOOD_TAGS } from '../../lib/goods'
import type { MarketProfile, GoodTag } from '../../types'

const SCALE_LABELS: Record<string, string[]> = {
  prosperity: ['Destitute', 'Poor', 'Modest', 'Comfortable', 'Wealthy'],
  size:       ['Hamlet', 'Village', 'Town', 'City', 'Metropolis'],
  remoteness: ['Trade hub', 'Connected', 'Off the road', 'Far-flung', 'Isolated'],
  security:   ['Lawless', 'Rough', 'Watched', 'Policed', 'Iron grip'],
}

function ScaleInput({ label, field, value, onChange, hint }: {
  label: string
  field: keyof typeof SCALE_LABELS
  value: number
  onChange: (v: number) => void
  hint: string
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="text-sm font-semibold text-stone-400 uppercase tracking-wider font-heading">{label}</label>
        <span className="text-sm text-stone-300">{SCALE_LABELS[field][value - 1]}</span>
      </div>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            onClick={() => onChange(n)}
            title={SCALE_LABELS[field][n - 1]}
            className={`flex-1 py-2 rounded text-sm font-mono transition-colors ${
              n === value
                ? 'bg-amber-800/60 text-amber-100 border border-amber-600'
                : n < value
                  ? 'bg-stone-700 text-stone-400 border border-stone-700'
                  : 'bg-stone-800 text-stone-600 border border-stone-700 hover:border-stone-500'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="text-xs text-stone-500 mt-1.5 leading-snug">{hint}</div>
    </div>
  )
}

interface Props { market: MarketProfile }

export function MarketProfileEditor({ market }: Props) {
  const { economy, updateMarket } = useEconomyStore()
  const { areas, edges } = useWorldStore()
  const [remoteHint, setRemoteHint] = useState<string | null>(null)

  const set = (patch: Partial<MarketProfile>) => updateMarket(market.id, patch)

  // Each tag cycles: neither → specialty → shortage → neither.
  const cycleTag = (tag: GoodTag) => {
    const isSpec = market.specialties.includes(tag)
    const isShort = market.shortages.includes(tag)
    if (isSpec) {
      set({ specialties: market.specialties.filter(t => t !== tag), shortages: [...market.shortages, tag] })
    } else if (isShort) {
      set({ shortages: market.shortages.filter(t => t !== tag) })
    } else {
      set({ specialties: [...market.specialties, tag] })
    }
  }

  const suggestRemote = () => {
    if (!market.areaId) return
    const { remoteness, reason } = suggestRemotenessFromMap(market.areaId, areas, edges, economy.markets)
    set({ remoteness })
    setRemoteHint(reason)
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-5xl space-y-6">

        {/* Identity */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1.5 font-heading">Name</label>
            <input
              value={market.name}
              onChange={e => set({ name: e.target.value })}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-stone-100 text-sm outline-none focus:border-stone-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1.5 font-heading">Map Area</label>
            <select
              value={market.areaId ?? ''}
              onChange={e => set({ areaId: e.target.value || null })}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-stone-200 text-sm outline-none focus:border-stone-500"
            >
              <option value="">— Not on the map —</option>
              {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>

        {/* The four dials */}
        <div className="grid grid-cols-2 gap-x-5 gap-y-4 bg-stone-800/60 border border-stone-700/60 rounded-xl p-4">
          <ScaleInput label="Prosperity" field="prosperity" value={market.prosperity} onChange={v => set({ prosperity: v })}
            hint="Wealthy places charge more for everything but carry finer goods." />
          <ScaleInput label="Size" field="size" value={market.size} onChange={v => set({ size: v })}
            hint="Bigger markets mean competition: lower prices, deeper stock, rarer wares." />
          <div>
            <ScaleInput label="Remoteness" field="remoteness" value={market.remoteness} onChange={v => { set({ remoteness: v }); setRemoteHint(null) }}
              hint="Remote places pay a premium for anything they don't make themselves." />
            <button
              onClick={suggestRemote}
              disabled={!market.areaId}
              title={market.areaId ? 'Walk the map: travel days × danger to the nearest size-4+ market' : 'Link this market to a map area first'}
              className="mt-1.5 flex items-center gap-1.5 px-2 py-1 rounded text-[11px] bg-stone-700 text-stone-300 hover:bg-amber-800 hover:text-amber-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Wand2 size={11} /> Suggest from map routes
            </button>
            {remoteHint && <div className="text-[10px] text-amber-400/80 mt-1 leading-snug">{remoteHint}</div>}
          </div>
          <ScaleInput label="Security" field="security" value={market.security} onChange={v => set({ security: v })}
            hint="Lawless places add a risk premium to valuables — gems, magic, luxuries." />
        </div>

        {/* Produces / lacks */}
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider font-heading">Produces & Lacks</label>
            <span className="text-[10px] text-stone-600">click a tag to cycle: surplus → shortage → neither</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ALL_GOOD_TAGS.map(tag => {
              const isSpec = market.specialties.includes(tag)
              const isShort = market.shortages.includes(tag)
              return (
                <button
                  key={tag}
                  onClick={() => cycleTag(tag)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                    isSpec
                      ? 'bg-emerald/20 border-emerald/50 text-emerald'
                      : isShort
                        ? 'bg-red-900/30 border-red-700/60 text-red-300'
                        : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-500'
                  }`}
                >
                  {isSpec && '▼ '}{isShort && '▲ '}{tag}
                </button>
              )
            })}
          </div>
          <div className="text-[10px] text-stone-600 mt-1.5">
            <span className="text-emerald">▼ surplus</span> −30% on matching goods · <span className="text-red-400">▲ shortage</span> +60%
          </div>
        </div>

        {/* Trade terms */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1.5 font-heading">Tariff %</label>
            <input
              type="number" min={-50} max={200} value={market.tariffPct}
              onChange={e => set({ tariffPct: Math.max(-50, Math.min(200, parseInt(e.target.value) || 0)) })}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-stone-100 text-sm outline-none focus:border-stone-500 font-mono tabular-nums"
            />
            <div className="text-[10px] text-stone-600 mt-1">Local tax on every purchase.</div>
          </div>
          <div>
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1.5 font-heading">Buys at %</label>
            <input
              type="number" min={0} max={100} value={Math.round(market.sellRate * 100)}
              onChange={e => set({ sellRate: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) / 100 })}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-stone-100 text-sm outline-none focus:border-stone-500 font-mono tabular-nums"
            />
            <div className="text-[10px] text-stone-600 mt-1">What merchants pay for party goods.</div>
          </div>
          <div>
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1.5 font-heading">Faction</label>
            <select
              value={market.factionId ?? ''}
              onChange={e => set({ factionId: e.target.value || null })}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-stone-200 text-sm outline-none focus:border-stone-500"
            >
              <option value="">— Independent —</option>
              {economy.factions.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <div className="text-[10px] text-stone-600 mt-1">Faction standing shifts prices here.</div>
          </div>
        </div>

        {/* Local standing */}
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider font-heading">Local Standing</label>
            <span className={`text-xs font-mono tabular-nums ${market.localStanding > 0 ? 'text-emerald' : market.localStanding < 0 ? 'text-red-400' : 'text-stone-400'}`}>
              {market.localStanding > 0 ? '+' : ''}{market.localStanding}
            </span>
          </div>
          <input
            type="range" min={-100} max={100} step={5} value={market.localStanding}
            onChange={e => set({ localStanding: parseInt(e.target.value) })}
            className="w-full accent-amber-600"
          />
          <div className="text-[10px] text-stone-600 mt-0.5">
            How this town in particular feels about the party — stacks with faction standing, up to ±20% on prices.
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1.5 font-heading">GM Notes</label>
          <textarea
            value={market.notes}
            onChange={e => set({ notes: e.target.value })}
            rows={3}
            placeholder="Who runs the market, what's whispered in the stalls, what's not on display…"
            className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-stone-200 text-sm outline-none focus:border-stone-500 resize-none placeholder:text-stone-600"
          />
        </div>

      </div>
    </div>
  )
}
