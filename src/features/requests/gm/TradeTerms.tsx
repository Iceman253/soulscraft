// The price on a pending buy or sell request, which the GM can change.
import { formatCopper } from '../../../lib/economy/currency'
import { gmDecision, isHaggle } from '../../../lib/economy/haggle'
import { CoinPriceInput, CoinSelect } from '../../../ui/CoinPrice'
import { usePriceCoin } from '../../economy/usePriceCoin'
import type { PlayerRequest } from '../store'

export function TradeTerms({ req, onPrice }: { req: PlayerRequest; onPrice: (unitPriceCopper: number) => void }) {
  const [coin, setCoin] = usePriceCoin()
  const p = req.payload
  const unit = Number(p.unitPriceCopper) || 0
  const qty = Number(p.quantity) || 1
  const haggle = isHaggle(req)
  const offer = Number(p.offerUnitCopper) || 0

  return (
    <div className="bg-stone-900/60 border border-stone-700 rounded-sm p-2 space-y-1.5">
      {haggle && (
        <div className="flex justify-between text-stone-500">
          <span>Listed <span className="font-mono text-stone-300">{formatCopper(Number(p.listedUnitCopper) || 0)}</span></span>
          <span>Offered <span className="font-mono text-teal-300">{formatCopper(offer)}</span> each</span>
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <span className="text-stone-500 pt-0.5">{haggle ? 'Your price' : 'Unit price'} each, in</span>
        <span className="flex items-start gap-1.5">
          <CoinSelect value={coin} onChange={setCoin} />
          <CoinPriceInput copper={unit} coin={coin} onChange={c => onPrice(c ?? 0)} set label="Unit price" />
        </span>
      </div>
      <div className="flex justify-between text-stone-500">
        <span>Total ({qty}×)</span>
        <span className="font-mono tabular-nums text-stone-300">{formatCopper(unit * qty)}</span>
      </div>
      {haggle && gmDecision(unit, offer) === 'counter' && (
        <div className="text-teal-300/90 leading-snug">Above their offer, so it goes back to the player to accept or turn down.</div>
      )}
    </div>
  )
}
