// One ware on the player's shop shelf: buy it now, or offer the GM less.
import { useState } from 'react'
import { ShoppingCart, Handshake } from 'lucide-react'
import { formatCopper } from '../../../lib/economy/currency'
import { isValidOffer } from '../../../lib/economy/haggle'
import { WeaponSpecLine } from '../../../ui/WeaponSpecLine'
import { CoinPriceInput, CoinSelect } from '../../../ui/CoinPrice'
import { usePriceCoin } from '../../economy/usePriceCoin'
import type { ShelfRow, ShopResult } from './useShop'

export function ShopWareRow({ row, wallet, onBuy, onAsk }: {
  row: ShelfRow
  wallet: number
  onBuy: (qty: number) => ShopResult
  onAsk: (qty: number, offerUnit: number) => ShopResult
}) {
  const { good, listing, unitPrice } = row
  const maxQty = listing.stock < 0 ? 99 : listing.stock
  const [qty, setQty] = useState(1)
  const [asking, setAsking] = useState(false)
  const [offer, setOffer] = useState(Math.max(1, Math.floor(unitPrice * 0.8)))
  const [coin, setCoin] = usePriceCoin()
  const total = unitPrice * qty
  const short = total > wallet
  const offerOk = isValidOffer(offer, unitPrice)

  const send = () => { if (onAsk(qty, offer).ok) setAsking(false) }

  return (
    <div className="px-3 py-2 rounded-lg bg-stone-800 border border-stone-700/50 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="min-w-0 flex-1 basis-40">
          <span className="text-sm text-stone-200">{good.name}</span>
          {good.unit && <span className="ml-1.5 text-[10px] text-stone-600">{good.unit}</span>}
          {listing.stock >= 0 && listing.stock <= 3 && <span className="ml-1.5 text-[10px] text-amber-400">only {listing.stock} left</span>}
          {good.weapon && <WeaponSpecLine spec={good.weapon} />}
          <div className="text-[11px] text-stone-500 font-mono tabular-nums">{formatCopper(unitPrice)} each</div>
        </div>
        <input type="number" min={1} max={maxQty} value={qty} aria-label={`How many ${good.name}`}
          onChange={e => setQty(Math.max(1, Math.min(maxQty, parseInt(e.target.value) || 1)))}
          className="w-14 bg-stone-900 border border-stone-700 rounded-sm px-1 py-1.5 text-stone-200 text-sm text-center outline-hidden focus:border-stone-500 font-mono" />
        <button onClick={() => onBuy(qty)} disabled={short} title={short ? `You have ${formatCopper(wallet)}` : undefined}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-sm text-xs bg-amber-700 text-amber-50 font-semibold hover:bg-amber-600 disabled:bg-stone-700 disabled:text-stone-400 transition-colors">
          <ShoppingCart size={12} /> {short ? `Need ${formatCopper(total)}` : `Buy · ${formatCopper(total)}`}
        </button>
      </div>

      {asking ? (
        <div className="flex items-start gap-2 flex-wrap text-xs">
          <span className="text-stone-400 pt-1">Offer each, in</span>
          <CoinSelect value={coin} onChange={setCoin} className="py-1" />
          <CoinPriceInput copper={offer} coin={coin} onChange={c => setOffer(c ?? 0)} label="Your offer" inputClassName="w-20 py-1! text-sm!" />
          <button onClick={send} disabled={!offerOk}
            className="px-2.5 py-1 rounded-sm bg-teal-700 text-teal-50 font-semibold hover:bg-teal-600 disabled:opacity-40">Send to GM</button>
          <button onClick={() => setAsking(false)} className="text-stone-500 hover:text-stone-300">Cancel</button>
          {!offerOk && <span className="basis-full text-amber-400/90">Offer at least 1 copper and less than {formatCopper(unitPrice)}.</span>}
        </div>
      ) : (
        <button onClick={() => setAsking(true)} className="flex items-center gap-1 text-[11px] text-teal-400/90 hover:text-teal-300">
          <Handshake size={11} /> Ask the GM for a better price
        </button>
      )}
    </div>
  )
}
