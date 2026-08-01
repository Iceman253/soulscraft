import { useMemo, useState } from 'react'
import { X, ShoppingCart, Coins, Send } from 'lucide-react'
import { useEconomyStore, allGoods } from '../economy/store'
import { useRequestStore } from '../requests/store'
import { quoteGood } from '../../lib/economyEngine'
import { toCopper, formatCopper } from '../../lib/currency'
import { GOOD_CATEGORIES } from '../../lib/goods'
import type { Character, MarketProfile, Good } from '../../types'

interface Props {
  character: Character
  market: MarketProfile
  onClose: () => void
}

/** Player-facing shop window. Shows only what the merchant displays — final
 *  prices, no engine internals — and every transaction goes to the GM as a
 *  request. Nothing changes hands until the GM approves. */
export function PlayerMarketModal({ character: c, market, onClose }: Props) {
  const economy = useEconomyStore(s => s.economy)
  const { addRequest, requests } = useRequestStore()
  const [tab, setTab] = useState<'buy' | 'sell'>('buy')
  const [qtyByGood, setQtyByGood] = useState<Record<string, number>>({})
  const [sellItemId, setSellItemId] = useState('')
  const [sellQty, setSellQty] = useState(1)
  const [sent, setSent] = useState<string | null>(null)

  const goods = useMemo(() => allGoods(economy), [economy])
  const goodsById = useMemo(() => new Map(goods.map(g => [g.id, g])), [goods])

  // What's on display: stocked lines with goods still available.
  const shelves = useMemo(() => {
    const rows = market.listings
      .filter(l => l.stock !== 0)
      .map(l => {
        const good = goodsById.get(l.goodId)
        if (!good) return null
        return { good, listing: l, quote: quoteGood(good, market, economy, l) }
      })
      .filter((r): r is { good: Good; listing: typeof market.listings[number]; quote: ReturnType<typeof quoteGood> } => r !== null)
    return GOOD_CATEGORIES
      .map(cat => ({ ...cat, rows: rows.filter(r => r.good.category === cat.id) }))
      .filter(cat => cat.rows.length > 0)
  }, [market, goodsById, economy])

  const pendingHere = requests.filter(r =>
    r.characterId === c.id && r.status === 'pending' && (r.type === 'buy-item' || r.type === 'sell-item')
  )

  const wallet = toCopper(c.currency)

  const requestBuy = (good: Good, unitPrice: number, stock: number) => {
    const qty = Math.max(1, Math.min(stock < 0 ? 99 : stock, qtyByGood[good.id] ?? 1))
    addRequest({
      characterId: c.id,
      characterName: c.name,
      type: 'buy-item',
      label: `wants to buy ${qty}× ${good.name} at ${market.name} — ${formatCopper(unitPrice * qty)}`,
      payload: { marketId: market.id, goodId: good.id, goodName: good.name, quantity: qty, unitPriceCopper: unitPrice },
    })
    setSent(`Purchase request sent — ${qty}× ${good.name}`)
    setTimeout(() => setSent(null), 3000)
  }

  const sellItem = c.onHand.items.find(i => i.id === sellItemId) ?? null
  const sellOffer = useMemo(() => {
    if (!sellItem) return null
    const good = goods.find(g => g.name.toLowerCase() === sellItem.name.toLowerCase())
    if (!good) return null
    const listing = market.listings.find(l => l.goodId === good.id)
    return quoteGood(good, market, economy, listing).sellFinal
  }, [sellItem, goods, market, economy])

  const requestSell = () => {
    if (!sellItem) return
    const qty = Math.max(1, Math.min(sellItem.quantity, sellQty))
    const unit = sellOffer ?? 0
    addRequest({
      characterId: c.id,
      characterName: c.name,
      type: 'sell-item',
      label: `wants to sell ${qty}× ${sellItem.name} at ${market.name}${unit > 0 ? ` — offered ${formatCopper(unit * qty)}` : ' — no standing offer, GM sets price'}`,
      payload: { marketId: market.id, itemId: sellItem.id, itemName: sellItem.name, quantity: qty, unitPriceCopper: unit },
    })
    setSent(`Sale request sent — ${qty}× ${sellItem.name}`)
    setSellItemId(''); setSellQty(1)
    setTimeout(() => setSent(null), 3000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
      <div className="bg-stone-900 border border-stone-700 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-700 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg shrink-0">🏪</span>
            <div className="min-w-0">
              <h2 className="font-bold text-stone-100 text-sm font-heading truncate">{market.name}</h2>
              <div className="text-[10px] text-stone-500">Your purse: <span className="text-stone-300 font-mono">{formatCopper(wallet)}</span></div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex rounded-lg overflow-hidden border border-stone-700">
              {([['buy', 'Buy'], ['sell', 'Sell']] as const).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`px-3 py-1.5 text-xs transition-colors ${tab === id ? 'bg-amber-900/40 text-amber-200' : 'bg-stone-800 text-stone-400 hover:text-stone-200'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button onClick={onClose} className="p-1.5 rounded text-stone-500 hover:text-stone-200 hover:bg-stone-700">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Feedback */}
        {sent && (
          <div className="shrink-0 mx-4 mt-3 px-3 py-2 rounded-lg bg-teal-600/10 border border-teal-600/30 text-xs text-teal-300 flex items-center gap-1.5">
            <Send size={11} /> {sent} — waiting on the GM.
          </div>
        )}
        {pendingHere.length > 0 && (
          <div className="shrink-0 mx-4 mt-3 px-3 py-2 rounded-lg bg-stone-800 border border-stone-700 text-[11px] text-stone-400">
            {pendingHere.length} request{pendingHere.length > 1 ? 's' : ''} with the GM: {pendingHere.map(r => r.label).join(' · ')}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'buy' && (
            shelves.length === 0 ? (
              <div className="py-10 text-center text-stone-500 text-sm">The stalls are bare — nothing for sale right now.</div>
            ) : (
              <div className="space-y-4">
                {shelves.map(cat => (
                  <div key={cat.id}>
                    <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider font-heading mb-1.5">
                      {cat.icon} {cat.label}
                    </div>
                    <div className="space-y-1">
                      {cat.rows.map(({ good, listing, quote }) => {
                        const qty = qtyByGood[good.id] ?? 1
                        const maxQty = listing.stock < 0 ? 99 : listing.stock
                        return (
                          <div key={good.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-stone-800 border border-stone-700/50">
                            <div className="min-w-0 flex-1">
                              <span className="text-sm text-stone-200">{good.name}</span>
                              {good.unit && <span className="ml-1.5 text-[10px] text-stone-600">{good.unit}</span>}
                              {listing.stock >= 0 && listing.stock <= 3 && (
                                <span className="ml-1.5 text-[10px] text-amber-400">only {listing.stock} left</span>
                              )}
                            </div>
                            <span className="text-xs font-mono tabular-nums text-stone-300 shrink-0">{formatCopper(quote.final)}</span>
                            <input
                              type="number" min={1} max={maxQty} value={qty}
                              onChange={e => setQtyByGood(q => ({ ...q, [good.id]: Math.max(1, Math.min(maxQty, parseInt(e.target.value) || 1)) }))}
                              className="w-12 bg-stone-900 border border-stone-700 rounded px-1 py-0.5 text-stone-200 text-xs text-center outline-none focus:border-stone-500 font-mono shrink-0"
                            />
                            <button
                              onClick={() => requestBuy(good, quote.final, listing.stock)}
                              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-amber-900/40 border border-amber-700/50 text-amber-200 hover:bg-amber-800/50 transition-colors shrink-0"
                            >
                              <ShoppingCart size={10} /> Request
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {tab === 'sell' && (
            <div className="max-w-md space-y-3">
              <div>
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1.5 font-heading">From your pack</label>
                {c.onHand.items.length === 0 ? (
                  <div className="text-xs text-stone-500 italic">Nothing on hand to sell.</div>
                ) : (
                  <select
                    value={sellItemId}
                    onChange={e => { setSellItemId(e.target.value); setSellQty(1) }}
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-stone-200 text-sm outline-none focus:border-stone-500"
                  >
                    <option value="">— Pick an item —</option>
                    {c.onHand.items.map(i => (
                      <option key={i.id} value={i.id}>{i.customName || i.name} ×{i.quantity}</option>
                    ))}
                  </select>
                )}
              </div>

              {sellItem && (
                <>
                  <div className="flex items-center gap-3">
                    <div>
                      <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1.5 font-heading">Quantity</label>
                      <input
                        type="number" min={1} max={sellItem.quantity} value={sellQty}
                        onChange={e => setSellQty(Math.max(1, Math.min(sellItem.quantity, parseInt(e.target.value) || 1)))}
                        className="w-20 bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-stone-100 text-sm outline-none focus:border-stone-500 font-mono tabular-nums"
                      />
                    </div>
                    <div className="flex-1 bg-stone-800 border border-stone-700/60 rounded-lg px-3 py-2 text-xs">
                      {sellOffer !== null ? (
                        <>
                          <div className="text-stone-500">Merchant offers</div>
                          <div className="text-emerald font-mono tabular-nums">{formatCopper(sellOffer * sellQty)} <span className="text-stone-600">({formatCopper(sellOffer)} each)</span></div>
                        </>
                      ) : (
                        <div className="text-stone-500 leading-snug">The merchant squints at it — no standing offer. The GM will name a price.</div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={requestSell}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald/80 text-stone-900 font-semibold text-sm hover:bg-emerald transition-colors"
                  >
                    <Coins size={14} /> Request Sale
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
