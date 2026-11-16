// The GM's answers to a player's haggles: take the counter-offer or walk away.
import { Handshake } from 'lucide-react'
import { formatCopper } from '../../../lib/economy/currency'
import type { PlayerRequest } from '../../../types'

export function CounterOffers({ counters, wallet, onAccept, onDecline }: {
  counters: PlayerRequest[]
  wallet: number
  onAccept: (req: PlayerRequest) => void
  onDecline: (req: PlayerRequest) => void
}) {
  if (counters.length === 0) return null
  return (
    <div className="space-y-1.5">
      {counters.map(req => {
        const qty = Number(req.payload.quantity) || 1
        const unit = Number(req.payload.unitPriceCopper) || 0
        const short = unit * qty > wallet
        return (
          <div key={req.id} className="px-3 py-2 rounded-lg bg-teal-950/40 border border-teal-700/50 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 text-teal-200">
              <Handshake size={12} />
              <span>
                The GM counters: {qty}× {String(req.payload.goodName)} at <span className="font-mono">{formatCopper(unit)}</span> each
                <span className="text-stone-500"> (you offered {formatCopper(Number(req.payload.offerUnitCopper) || 0)}, listed {formatCopper(Number(req.payload.listedUnitCopper) || 0)})</span>
              </span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => onAccept(req)} disabled={short}
                className="px-2.5 py-1 rounded-sm bg-amber-700 text-amber-50 font-semibold hover:bg-amber-600 disabled:bg-stone-700 disabled:text-stone-400">
                {short ? `Need ${formatCopper(unit * qty)}` : `Buy · ${formatCopper(unit * qty)}`}
              </button>
              <button onClick={() => onDecline(req)}
                className="px-2.5 py-1 rounded-sm bg-stone-800 border border-stone-600 text-stone-300 hover:bg-stone-700">No thanks</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
