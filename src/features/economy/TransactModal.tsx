import { useMemo, useState } from 'react'
import { X, ShoppingCart, Coins, AlertTriangle } from 'lucide-react'
import { useEconomyStore, allGoods } from './store'
import { useCharacterStore } from '../characters/store'
import { quoteGood } from '../../lib/economyEngine'
import { toCopper, formatCopper, formatCopperLong } from '../../lib/currency'
import type { MarketProfile, Good, PriceQuote } from '../../types'

type Props =
  | { mode: 'buy'; market: MarketProfile; good: Good; quote: PriceQuote; onClose: () => void }
  | { mode: 'sell'; market: MarketProfile; onClose: () => void }

export function TransactModal(props: Props) {
  const { market, onClose } = props
  const { economy, buy, sell } = useEconomyStore()
  const characters = useCharacterStore(s => s.characters)

  const [charId, setCharId] = useState('')
  const [itemId, setItemId] = useState('')
  const [qty, setQty] = useState(1)
  const [unitPrice, setUnitPrice] = useState<number>(props.mode === 'buy' ? props.quote.final : 0)
  const [force, setForce] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const char = characters.find(c => c.id === charId) ?? null
  const item = props.mode === 'sell' && char ? char.onHand.items.find(i => i.id === itemId) ?? null : null

  // When the GM picks an item to sell, default the price to the engine's
  // sell quote for the matching good (if the merchant recognises it).
  const suggestedSell = useMemo(() => {
    if (props.mode !== 'sell' || !item) return null
    const good = allGoods(economy).find(g => g.name.toLowerCase() === item.name.toLowerCase())
    if (!good) return null
    const listing = market.listings.find(l => l.goodId === good.id)
    return quoteGood(good, market, economy, listing).sellFinal
  }, [props.mode, item, economy, market])

  const pickItem = (id: string) => {
    setItemId(id)
    setQty(1)
    setError(null)
    const picked = char?.onHand.items.find(i => i.id === id)
    if (picked) {
      const good = allGoods(economy).find(g => g.name.toLowerCase() === picked.name.toLowerCase())
      if (good) {
        const listing = market.listings.find(l => l.goodId === good.id)
        setUnitPrice(quoteGood(good, market, economy, listing).sellFinal)
      } else {
        setUnitPrice(0)
      }
    }
  }

  const total = Math.round(unitPrice * qty)
  const walletCopper = char ? toCopper(char.currency) : 0
  const insufficient = props.mode === 'buy' && char !== null && walletCopper < total

  const maxQty = props.mode === 'buy'
    ? (() => {
        const listing = market.listings.find(l => l.goodId === props.good.id)
        return listing && listing.stock >= 0 ? listing.stock : 999
      })()
    : item?.quantity ?? 1

  const canConfirm = props.mode === 'buy'
    ? !!char && qty >= 1 && (!insufficient || force)
    : !!char && !!item && qty >= 1 && qty <= (item?.quantity ?? 0)

  const confirm = () => {
    setError(null)
    const result = props.mode === 'buy'
      ? buy(market.id, props.good.id, qty, charId, unitPrice, { force })
      : sell(market.id, charId, itemId, qty, unitPrice)
    if (!result.ok) { setError(result.reason ?? 'Transaction failed.'); return }
    onClose()
  }

  const title = props.mode === 'buy' ? `Buy — ${props.good.name}` : 'Party Sells to Merchant'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
      <div className="bg-stone-900 border border-stone-700 rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">

        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-700 shrink-0">
          <div className="flex items-center gap-2">
            {props.mode === 'buy' ? <ShoppingCart size={15} className="text-amber-400" /> : <Coins size={15} className="text-emerald" />}
            <h2 className="font-bold text-stone-100 text-sm font-heading">{title}</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded text-stone-500 hover:text-stone-200 hover:bg-stone-700">
            <X size={14} />
          </button>
        </div>

        <div className="p-4 space-y-3.5 overflow-y-auto">

          {/* Character */}
          <div>
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1.5 font-heading">
              {props.mode === 'buy' ? 'Buyer' : 'Seller'}
            </label>
            <select
              value={charId}
              onChange={e => { setCharId(e.target.value); setItemId(''); setError(null) }}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-stone-200 text-sm outline-none focus:border-stone-500"
            >
              <option value="">— Select character —</option>
              {characters.map(c => (
                <option key={c.id} value={c.id}>{c.name} — {formatCopper(toCopper(c.currency))}</option>
              ))}
            </select>
          </div>

          {/* Sell: item picker */}
          {props.mode === 'sell' && char && (
            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1.5 font-heading">Item (on hand)</label>
              {char.onHand.items.length === 0 ? (
                <div className="text-xs text-stone-500 italic px-1">Nothing on hand to sell.</div>
              ) : (
                <select
                  value={itemId}
                  onChange={e => pickItem(e.target.value)}
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-stone-200 text-sm outline-none focus:border-stone-500"
                >
                  <option value="">— Select item —</option>
                  {char.onHand.items.map(i => (
                    <option key={i.id} value={i.id}>{i.customName || i.name} ×{i.quantity}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Quantity + unit price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1.5 font-heading">Quantity</label>
              <input
                type="number" min={1} max={maxQty} value={qty}
                onChange={e => setQty(Math.max(1, Math.min(maxQty, parseInt(e.target.value) || 1)))}
                className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-stone-100 text-sm outline-none focus:border-stone-500 font-mono tabular-nums"
              />
              {props.mode === 'buy' && maxQty < 999 && (
                <div className="text-[10px] text-stone-600 mt-1">{maxQty} in stock</div>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1.5 font-heading">
                Unit price <span className="normal-case text-stone-600">(copper — yours to set)</span>
              </label>
              <input
                type="number" min={0} value={unitPrice}
                onChange={e => setUnitPrice(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-stone-800 border border-amber-700/40 rounded-lg px-3 py-2 text-amber-100 text-sm outline-none focus:border-amber-600 font-mono tabular-nums"
              />
              <div className="text-[10px] text-stone-600 mt-1">
                {props.mode === 'buy'
                  ? <>Engine suggests {formatCopper(props.quote.suggested)}{props.quote.overridden && ' (you fixed this price)'}</>
                  : suggestedSell !== null
                    ? <>Engine suggests {formatCopper(suggestedSell)}</>
                    : item ? 'Unknown to the merchant — name your price' : ''}
              </div>
            </div>
          </div>

          {/* Totals & wallet preview */}
          {char && (props.mode === 'buy' || item) && (
            <div className="bg-stone-800 border border-stone-700/60 rounded-lg p-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-stone-300">
                <span>Total</span>
                <span className="font-mono tabular-nums text-stone-100" title={formatCopperLong(total)}>{formatCopper(total)}</span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>{char.name}'s purse</span>
                <span className="font-mono tabular-nums">{formatCopper(walletCopper)}</span>
              </div>
              <div className="flex justify-between border-t border-stone-700 pt-1.5">
                <span className="text-stone-500">After {props.mode === 'buy' ? 'purchase' : 'sale'}</span>
                <span className={`font-mono tabular-nums ${insufficient ? 'text-red-400' : 'text-emerald'}`}>
                  {props.mode === 'buy'
                    ? insufficient ? `short ${formatCopper(total - walletCopper)}` : formatCopper(walletCopper - total)
                    : formatCopper(walletCopper + total)}
                </span>
              </div>
              <div className="text-[10px] text-stone-600">Coins convert automatically — change is made in the largest denominations.</div>
            </div>
          )}

          {insufficient && (
            <label className="flex items-start gap-2 text-xs text-amber-300/90 bg-amber-900/20 border border-amber-800/40 rounded-lg p-2.5 cursor-pointer">
              <input type="checkbox" checked={force} onChange={e => setForce(e.target.checked)} className="mt-0.5 accent-amber-600" />
              <span>
                <AlertTriangle size={11} className="inline mr-1" />
                GM override: complete the sale anyway. Their purse is emptied and the rest is forgiven (or owed — your call at the table).
              </span>
            </label>
          )}

          {error && <div className="text-xs text-red-400 bg-red-950/30 border border-red-900/40 rounded-lg p-2.5">{error}</div>}
        </div>

        <div className="px-4 pb-4 shrink-0">
          <button
            onClick={confirm}
            disabled={!canConfirm}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${
              props.mode === 'buy' ? 'bg-amber-700 text-amber-100 hover:bg-amber-600' : 'bg-emerald/80 text-stone-900 hover:bg-emerald'
            }`}
          >
            {props.mode === 'buy' ? <ShoppingCart size={14} /> : <Coins size={14} />}
            {props.mode === 'buy' ? 'Complete Purchase' : 'Complete Sale'}
          </button>
        </div>
      </div>
    </div>
  )
}
