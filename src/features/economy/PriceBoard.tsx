import { useMemo, useState } from 'react'
import { Search, Lock, Unlock, Plus, X, ShoppingCart, Coins, Wand2, Infinity as InfinityIcon } from 'lucide-react'
import { useEconomyStore, allGoods } from './store'
import { quoteGood, suggestListingsForMarket, suggestStock } from '../../lib/economyEngine'
import { formatCopper, formatCopperLong } from '../../lib/currency'
import { GOOD_CATEGORIES } from '../../lib/goods'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import { TransactModal } from './TransactModal'
import { GoodEditorModal } from './GoodEditorModal'
import type { MarketProfile, Good, PriceQuote, MarketListing } from '../../types'

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
            className="bg-stone-800 border border-stone-700 rounded-lg pl-7 pr-3 py-1.5 text-stone-200 text-xs outline-none focus:border-stone-500 w-44 placeholder:text-stone-600"
          />
        </div>

        <select
          value={category}
          onChange={e => setCategory(e.target.value as Good['category'] | 'all')}
          className="bg-stone-800 border border-stone-700 rounded-lg px-2 py-1.5 text-stone-300 text-xs outline-none"
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

      {/* Column headers */}
      <div className="shrink-0 grid grid-cols-[1fr_90px_110px_110px_100px_120px] gap-2 px-4 py-2 border-b border-stone-700/40 text-xs text-stone-500 uppercase tracking-wider font-heading">
        <div>Ware</div>
        <div className="text-center">Stock</div>
        <div className="text-right" title="The engine's price from this market's profile — click a row's price to see why">Suggested</div>
        <div className="text-right">Final (yours)</div>
        <div className="text-right">Buys at</div>
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

// ── One ware row ────────────────────────────────────────────────────────

function GoodRow({ good, market, listing, expanded, onToggleExpand, onBuy, onStock, onUnstock, onUpdate, onEditCustom }: {
  good: Good
  market: MarketProfile
  listing?: MarketListing
  expanded: boolean
  onToggleExpand: () => void
  onBuy: (quote: PriceQuote) => void
  onStock: () => void
  onUnstock: () => void
  onUpdate: (patch: Partial<MarketListing>) => void
  onEditCustom?: () => void
}) {
  const economy = useEconomyStore(s => s.economy)
  const quote = quoteGood(good, market, economy, listing)
  const stocked = !!listing
  const soldOut = stocked && listing.stock === 0

  return (
    <div className={`border-b border-stone-800 ${soldOut ? 'opacity-50' : ''}`}>
      <div className="grid grid-cols-[1fr_90px_110px_110px_100px_120px] gap-2 items-center px-4 py-1.5 hover:bg-stone-800/40 transition-colors">

        {/* Name */}
        <div className="min-w-0">
          <span className={`text-sm truncate ${good.custom ? 'text-teal-300' : 'text-stone-200'}`}>
            {good.name}
            {good.custom && onEditCustom && (
              <button onClick={onEditCustom} className="ml-1.5 text-[10px] text-stone-500 hover:text-teal-300 underline">edit</button>
            )}
          </span>
          {good.unit && <span className="ml-1.5 text-[10px] text-stone-600">{good.unit}</span>}
        </div>

        {/* Stock */}
        <div className="flex items-center justify-center gap-1">
          {stocked ? (
            <>
              {listing.stock === -1 ? (
                <button
                  onClick={() => onUpdate({ stock: suggestStock(good, market) })}
                  title="Unlimited — click for finite stock"
                  className="px-2 py-0.5 rounded text-stone-300 hover:bg-stone-700"
                >
                  <InfinityIcon size={13} />
                </button>
              ) : (
                <input
                  type="number" min={0} value={listing.stock}
                  onChange={e => onUpdate({ stock: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="w-12 bg-stone-800 border border-stone-700 rounded px-1 py-0.5 text-stone-200 text-xs text-center outline-none focus:border-stone-500 font-mono tabular-nums"
                />
              )}
            </>
          ) : (
            <span className="text-xs text-stone-600">—</span>
          )}
        </div>

        {/* Suggested — click to see why */}
        <button
          onClick={onToggleExpand}
          title={formatCopperLong(quote.suggested)}
          className="text-right text-xs font-mono tabular-nums text-stone-400 hover:text-amber-300 transition-colors"
        >
          {formatCopper(quote.suggested)}
        </button>

        {/* Final — GM override */}
        <div className="flex items-center justify-end gap-1">
          <input
            type="number" min={0}
            value={listing?.priceOverride ?? ''}
            placeholder={String(quote.suggested)}
            onChange={e => {
              if (!stocked) return
              const v = e.target.value
              onUpdate({ priceOverride: v === '' ? undefined : Math.max(0, parseInt(v) || 0) })
            }}
            disabled={!stocked}
            title={stocked
              ? `In copper. Blank = use suggested. ${quote.overridden ? `Currently fixed at ${formatCopperLong(quote.final)}.` : ''}`
              : 'Stock this ware to set a price'}
            className={`w-20 bg-stone-800 border rounded px-1.5 py-0.5 text-xs text-right outline-none font-mono tabular-nums disabled:opacity-40 ${
              quote.overridden ? 'border-amber-600/70 text-amber-200' : 'border-stone-700 text-stone-300 focus:border-stone-500 placeholder:text-stone-600'
            }`}
          />
        </div>

        {/* Sell (merchant buys at) */}
        <div className="flex items-center justify-end gap-1">
          <input
            type="number" min={0}
            value={listing?.sellOverride ?? ''}
            placeholder={String(quote.sellSuggested)}
            onChange={e => {
              if (!stocked) return
              const v = e.target.value
              onUpdate({ sellOverride: v === '' ? undefined : Math.max(0, parseInt(v) || 0) })
            }}
            disabled={!stocked}
            className={`w-16 bg-stone-800 border rounded px-1.5 py-0.5 text-xs text-right outline-none font-mono tabular-nums disabled:opacity-40 ${
              listing?.sellOverride !== undefined ? 'border-amber-600/70 text-amber-200' : 'border-stone-700 text-stone-500 focus:border-stone-500 placeholder:text-stone-600'
            }`}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-1">
          {stocked ? (
            <>
              <button
                onClick={() => onUpdate({ locked: !listing.locked })}
                title={listing.locked ? 'Locked — daily drift and restock skip this line' : 'Unlocked — drifts with the market'}
                className={`p-1 rounded transition-colors ${listing.locked ? 'text-amber-400 hover:text-amber-300' : 'text-stone-600 hover:text-stone-400'}`}
              >
                {listing.locked ? <Lock size={12} /> : <Unlock size={12} />}
              </button>
              <button
                onClick={() => onBuy(quote)}
                disabled={soldOut}
                className="flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-amber-900/40 border border-amber-700/50 text-amber-200 hover:bg-amber-800/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ShoppingCart size={10} /> {soldOut ? 'Sold out' : 'Buy'}
              </button>
              <button onClick={onUnstock} title="Remove from this market's stock" className="p-1 rounded text-stone-600 hover:text-red-400">
                <X size={12} />
              </button>
            </>
          ) : (
            <button
              onClick={onStock}
              className="px-2 py-1 rounded text-[11px] bg-stone-700 text-stone-300 hover:bg-stone-600 transition-colors"
            >
              + Stock it
            </button>
          )}
        </div>
      </div>

      {/* Why this price — factor breakdown */}
      {expanded && (
        <div className="px-4 pb-2.5 pt-1 bg-stone-800/30">
          <div className="max-w-md text-xs space-y-0.5">
            <div className="flex justify-between text-stone-400">
              <span>Base price{economy.basePriceOverrides[good.id] !== undefined && <span className="text-amber-400"> (your global override)</span>}</span>
              <span className="font-mono tabular-nums">{formatCopper(quote.base)}</span>
            </div>
            {quote.factors.map((f, i) => (
              <div key={i} className="flex justify-between text-stone-500">
                <span>{f.label}</span>
                <span className={`font-mono tabular-nums ${f.factor > 1 ? 'text-red-400/80' : 'text-emerald/80'}`}>
                  ×{f.factor.toFixed(2)}
                </span>
              </div>
            ))}
            <div className="flex justify-between text-stone-300 border-t border-stone-700 pt-1 mt-1">
              <span>Suggested</span>
              <span className="font-mono tabular-nums">{formatCopper(quote.suggested)}</span>
            </div>
            {quote.overridden && (
              <div className="flex justify-between text-amber-300">
                <span>Your final price</span>
                <span className="font-mono tabular-nums">{formatCopper(quote.final)}</span>
              </div>
            )}
            <div className="flex justify-between text-stone-500">
              <span>Merchant buys at</span>
              <span className="font-mono tabular-nums">{formatCopper(quote.sellFinal)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
