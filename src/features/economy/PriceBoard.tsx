import { useMemo, useState } from 'react'
import { Search, Plus, Coins, Wand2 } from 'lucide-react'
import { useEconomyStore, allGoods } from './store'
import { suggestListingsForMarket, suggestStock } from '../../lib/economy/economyEngine'
import { COIN_VALUE, coinName } from '../../lib/economy/currency'
import { GOOD_CATEGORIES } from '../../lib/economy/goods'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import { CoinSelect } from '../../ui/CoinPrice'
import { TransactModal } from './TransactModal'
import { GoodEditorModal } from './GoodEditorModal'
import { GoodRow } from './PriceRow'
import { PRICE_GRID } from './priceGrid'
import { usePriceCoin } from './usePriceCoin'
import type { MarketProfile, Good, PriceQuote } from '../../types'

interface Props { market: MarketProfile }

type ViewMode = 'stocked' | 'catalog'

export function PriceBoard({ market }: Props) {
  const { economy, upsertListing, removeListing, applyListings } = useEconomyStore()
  const [view, setView] = useState<ViewMode>(market.listings.length > 0 ? 'stocked' : 'catalog')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<Good['category'] | 'all'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [buyGood, setBuyGood] = useState<{ good: Good; quote: PriceQuote } | null>(null)
  const [sellMode, setSellMode] = useState(false)
  const [editGood, setEditGood] = useState<Good | 'new' | null>(null)
  const [confirmRebuild, setConfirmRebuild] = useState(false)
  const [coin, setCoin] = usePriceCoin()
  const coinLabel = coinName(coin, 2)

  const goods = useMemo(() => allGoods(economy), [economy])
  const listingByGood = useMemo(() => new Map(market.listings.map(l => [l.goodId, l])), [market.listings])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return goods.filter(good => {
      if (view === 'stocked' && !listingByGood.has(good.id)) return false
      if (category !== 'all' && good.category !== category) return false
      if (q && !good.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [goods, view, category, search, listingByGood])

  const grouped = useMemo(() => {
    const map = new Map<Good['category'], Good[]>()
    for (const good of visible) {
      const list = map.get(good.category) ?? []
      list.push(good)
      map.set(good.category, list)
    }
    return GOOD_CATEGORIES.filter(c => map.has(c.id)).map(c => ({ ...c, goods: map.get(c.id)! }))
  }, [visible])

  const suggestAndMerge = () => {
    applyListings(market.id, suggestListingsForMarket(market, goods), 'merge')
    setView('stocked')
  }
  const suggestAndReplace = () => {
    applyListings(market.id, suggestListingsForMarket(market, goods), 'replace')
    setView('stocked')
  }

  return (
    <div className="h-full flex flex-col">

      {/* Toolbar */}
      <div className="shrink-0 px-4 py-2.5 border-b border-stone-700/60 flex items-center gap-2 flex-wrap">
        <div className="flex rounded-lg overflow-hidden border border-stone-700">
          {([['stocked', `Stocked (${market.listings.length})`], ['catalog', 'Full Catalog']] as [ViewMode, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={`px-3 py-1.5 text-xs transition-colors ${
                view === id ? 'bg-amber-900/40 text-amber-200' : 'bg-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-600" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search wares…"
            className="bg-stone-800 border border-stone-700 rounded-lg pl-7 pr-3 py-1.5 text-stone-200 text-xs outline-hidden focus:border-stone-500 w-44 placeholder:text-stone-600"
          />
        </div>

        <select
          value={category}
          onChange={e => setCategory(e.target.value as Good['category'] | 'all')}
          className="bg-stone-800 border border-stone-700 rounded-lg px-2 py-1.5 text-stone-300 text-xs outline-hidden"
        >
          <option value="all">All categories</option>
          {GOOD_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
        </select>

        <div className="flex-1" />

        <button
          onClick={() => setSellMode(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-stone-800 border border-stone-700 text-stone-300 hover:border-emerald/60 hover:text-emerald transition-colors"
        >
          <Coins size={12} /> Party sells…
        </button>
        <button
          onClick={() => setEditGood('new')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-stone-800 border border-stone-700 text-stone-300 hover:border-stone-500 hover:text-stone-100 transition-colors"
        >
          <Plus size={12} /> Custom good
        </button>
        <button
          onClick={suggestAndMerge}
          title="Engine suggests what this place would stock, based on its profile. Adds missing lines only — your existing lines are untouched."
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-stone-700 text-stone-200 hover:bg-amber-800 hover:text-amber-100 transition-colors"
        >
          <Wand2 size={12} /> Suggest stock
        </button>
        <button
          onClick={() => setConfirmRebuild(true)}
          title="Rebuild the whole stock list from the profile. Locked lines survive."
          className="px-2 py-1.5 rounded-lg text-xs text-stone-500 hover:text-stone-300 transition-colors"
        >
          Rebuild
        </button>
      </div>

      {/* Which coin prices are typed in */}
      <div className="shrink-0 flex items-center gap-2 flex-wrap px-4 py-1.5 border-b border-stone-700/40 text-[11px] text-stone-500">
        <span>Type prices in</span>
        <CoinSelect value={coin} onChange={setCoin} />
        <span>
          1 {coinName(coin, 1)} = {COIN_VALUE[coin].toLocaleString()} Copper. Each price also shows in coins, e.g. 250 Copper = 2 Gold 5 Iron.
        </span>
      </div>

      {/* Column headers */}
      <div className={`shrink-0 ${PRICE_GRID} gap-2 px-4 py-2 border-b border-stone-700/40 text-xs text-stone-500 uppercase tracking-wider font-heading`}>
        <div>Ware</div>
        <div className="text-center">Stock</div>
        <div className="text-right" title="The engine's price from this market's profile — click a row's price to see why">Suggested</div>
        <div className="text-right" title="What players pay. Blank uses the suggested price.">Sells for <span className="normal-case text-stone-600">({coinLabel})</span></div>
        <div className="text-right" title="What the merchant pays players for it. Blank uses the suggested price.">Buys for <span className="normal-case text-stone-600">({coinLabel})</span></div>
        <div />
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto">
        {grouped.length === 0 && (
          <div className="py-10 text-center text-stone-500 text-sm">
            {view === 'stocked'
              ? 'Nothing stocked. Use "Suggest stock" or browse the Full Catalog to add wares.'
              : 'No goods match.'}
          </div>
        )}
        {grouped.map(group => (
          <div key={group.id}>
            <div className="px-4 pt-3 pb-1 text-xs font-semibold text-stone-500 uppercase tracking-wider font-heading">
              {group.icon} {group.label}
            </div>
            {group.goods.map(good => (
              <GoodRow
                key={good.id}
                good={good}
                market={market}
                listing={listingByGood.get(good.id)}
                coin={coin}
                expanded={expandedId === good.id}
                onToggleExpand={() => setExpandedId(expandedId === good.id ? null : good.id)}
                onBuy={quote => setBuyGood({ good, quote })}
                onStock={() => upsertListing(market.id, { goodId: good.id, stock: suggestStock(good, market) })}
                onUnstock={() => removeListing(market.id, good.id)}
                onUpdate={patch => {
                  const current = listingByGood.get(good.id)
                  if (current) upsertListing(market.id, { ...current, ...patch })
                }}
                onEditCustom={good.custom ? () => setEditGood(good) : undefined}
              />
            ))}
          </div>
        ))}
      </div>

      {buyGood && (
        <TransactModal
          mode="buy"
          market={market}
          good={buyGood.good}
          quote={buyGood.quote}
          onClose={() => setBuyGood(null)}
        />
      )}
      {sellMode && (
        <TransactModal mode="sell" market={market} onClose={() => setSellMode(false)} />
      )}
      {editGood && (
        <GoodEditorModal
          good={editGood === 'new' ? null : editGood}
          onClose={() => setEditGood(null)}
        />
      )}
      {confirmRebuild && (
        <ConfirmDialog
          title="Rebuild Stock"
          message="Replace this market's stock list with the engine's suggestion from its profile? Locked lines are kept; everything else (including price overrides on unlocked lines) is rebuilt."
          confirmLabel="Rebuild"
          danger
          onConfirm={suggestAndReplace}
          onClose={() => setConfirmRebuild(false)}
        />
      )}
    </div>
  )
}
