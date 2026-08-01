import { useMemo, useState } from 'react'
import { Hammer } from 'lucide-react'
import { useEconomyStore, allGoods } from './store'
import { craftCostAt } from '../../lib/economyEngine'
import { formatCopper } from '../../lib/currency'
import type { MarketProfile } from '../../types'

interface Props { market: MarketProfile }

export function CraftingCalculator({ market }: Props) {
  const economy = useEconomyStore(s => s.economy)
  const goods = useMemo(() => allGoods(economy), [economy])
  const craftables = useMemo(() => goods.filter(g => g.recipe && g.recipe.length > 0), [goods])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selected = craftables.find(g => g.id === selectedId) ?? null
  const cost = selected ? craftCostAt(selected, market, economy, goods) : null

  return (
    <div className="h-full flex">

      {/* Craftable list */}
      <div className="w-64 shrink-0 border-r border-stone-700/60 overflow-y-auto p-2 space-y-1">
        <div className="px-2 py-1.5 text-xs font-semibold text-stone-500 uppercase tracking-wider font-heading">Craftable Goods</div>
        {craftables.map(good => (
          <button
            key={good.id}
            onClick={() => setSelectedId(good.id)}
            className={`w-full text-left px-2.5 py-2 rounded-lg text-sm transition-colors ${
              selectedId === good.id
                ? 'bg-amber-900/30 border border-amber-700/50 text-amber-100'
                : 'text-stone-300 hover:bg-stone-800 border border-transparent'
            }`}
          >
            {good.name}
          </button>
        ))}
        {craftables.length === 0 && (
          <div className="px-2 py-4 text-xs text-stone-500 italic">No goods with recipes.</div>
        )}
      </div>

      {/* Breakdown */}
      <div className="flex-1 overflow-y-auto p-5">
        {!selected || !cost ? (
          <div className="h-full flex flex-col items-center justify-center text-stone-500 gap-2">
            <Hammer size={32} className="text-stone-700" />
            <div className="text-sm">Pick a craftable good to price its materials here.</div>
            <div className="text-xs text-stone-600 max-w-sm text-center leading-relaxed">
              Sourcing costs use this market's <em>final</em> prices — your overrides included.
              Crafting itself still follows the manual: a Crafting Table, downtime, and your ruling on feasibility.
            </div>
          </div>
        ) : (
          <div className="max-w-md space-y-4">
            <h3 className="font-heading font-bold text-stone-100">{selected.name} — build vs. buy at {market.name}</h3>

            <div className="bg-stone-800/60 border border-stone-700/60 rounded-xl p-4 space-y-1.5 text-sm">
              <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider font-heading mb-2">Materials (local prices)</div>
              {cost.lines.map(line => (
                <div key={line.goodId} className="flex justify-between text-stone-300">
                  <span>{line.qty}× {line.name}</span>
                  <span className="font-mono tabular-nums text-stone-400">{formatCopper(line.totalCopper)}</span>
                </div>
              ))}
              <div className="flex justify-between text-stone-400 border-t border-stone-700 pt-1.5">
                <span>Materials total</span>
                <span className="font-mono tabular-nums">{formatCopper(cost.materialsCopper)}</span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>Hired labour (if not self-crafted)</span>
                <span className="font-mono tabular-nums">{formatCopper(cost.labourCopper)}</span>
              </div>
              <div className="flex justify-between text-stone-100 font-semibold border-t border-stone-700 pt-1.5">
                <span>Commissioned cost</span>
                <span className="font-mono tabular-nums">{formatCopper(cost.totalCopper)}</span>
              </div>
            </div>

            <div className="bg-stone-800/60 border border-stone-700/60 rounded-xl p-4 space-y-1.5 text-sm">
              <div className="flex justify-between text-stone-300">
                <span>Buy it finished here</span>
                <span className="font-mono tabular-nums">{formatCopper(cost.buyCopper)}</span>
              </div>
              <div className="flex justify-between text-stone-300">
                <span>Self-craft (materials only)</span>
                <span className="font-mono tabular-nums">{formatCopper(cost.materialsCopper)}</span>
              </div>
              <div className={`text-xs pt-1 ${cost.materialsCopper < cost.buyCopper ? 'text-emerald' : 'text-red-400'}`}>
                {cost.materialsCopper < cost.buyCopper
                  ? `Self-crafting saves ${formatCopper(cost.buyCopper - cost.materialsCopper)} — if the character can craft it and has downtime.`
                  : `Buying finished is cheaper here by ${formatCopper(cost.materialsCopper - cost.buyCopper)} — materials are dear in this market.`}
              </div>
            </div>

            <div className="text-[11px] text-stone-600 leading-relaxed">
              These numbers are advisory. Per the manual (p.84–85), crafting needs a Crafting Table, downtime,
              and a character capable of understanding the item — you rule on all three.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
