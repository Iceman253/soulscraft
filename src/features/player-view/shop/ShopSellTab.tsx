// Selling to a market: the player names the item, the GM settles the price.
import { useMemo, useState } from 'react'
import { Coins } from 'lucide-react'
import { useEconomyStore, allGoods } from '../../economy/store'
import { useRequestStore } from '../../requests/store'
import { quoteGood } from '../../../lib/economy/economyEngine'
import { blocksPerUnit } from '../../../lib/world/building'
import { formatCopper } from '../../../lib/economy/currency'
import type { Character, MarketProfile } from '../../../types'

const label = 'text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1.5 font-heading'

export function ShopSellTab({ character: c, market, onSent }: { character: Character; market: MarketProfile; onSent: (msg: string) => void }) {
  const economy = useEconomyStore(s => s.economy)
  const addRequest = useRequestStore(s => s.addRequest)
  const [itemId, setItemId] = useState('')
  const [qty, setQty] = useState(1)

  const item = c.onHand.items.find(i => i.id === itemId) ?? null
  const offer = useMemo(() => {
    if (!item) return null
    const good = allGoods(economy).find(g => g.name.toLowerCase() === item.name.toLowerCase())
    if (!good) return null
    // Quotes are per market unit; loose blocks sell for their share of a stack.
    const perUnit = quoteGood(good, market, economy, market.listings.find(l => l.goodId === good.id)).sellFinal
    return item.isBlock ? Math.round(perUnit / (blocksPerUnit(good.unit) || 1)) : perUnit
  }, [item, market, economy])

  const request = () => {
    if (!item) return
    const n = Math.max(1, Math.min(item.quantity, qty))
    const unit = offer ?? 0
    addRequest({
      characterId: c.id,
      characterName: c.name,
      type: 'sell-item',
      label: `wants to sell ${n}× ${item.name} at ${market.name}${unit > 0 ? ` — offered ${formatCopper(unit * n)}` : ' — no standing offer, GM sets price'}`,
      payload: { marketId: market.id, itemId: item.id, itemName: item.name, quantity: n, unitPriceCopper: unit },
    })
    onSent(`Sale request sent — ${n}× ${item.name}`)
    setItemId(''); setQty(1)
  }

  return (
    <div className="max-w-md space-y-3">
      <div>
        <label className={label}>From your pack</label>
        {c.onHand.items.length === 0 ? (
          <div className="text-xs text-stone-500 italic">Nothing on hand to sell.</div>
        ) : (
          <select value={itemId} onChange={e => { setItemId(e.target.value); setQty(1) }}
            className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-stone-200 text-sm outline-hidden focus:border-stone-500">
            <option value="">— Pick an item —</option>
            {c.onHand.items.map(i => <option key={i.id} value={i.id}>{i.customName || i.name} ×{i.quantity}</option>)}
          </select>
        )}
      </div>

      {item && (
        <>
          <div className="flex items-center gap-3">
            <div>
              <label className={label}>Quantity</label>
              <input type="number" min={1} max={item.quantity} value={qty}
                onChange={e => setQty(Math.max(1, Math.min(item.quantity, parseInt(e.target.value) || 1)))}
                className="w-20 bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-stone-100 text-sm outline-hidden focus:border-stone-500 font-mono tabular-nums" />
            </div>
            <div className="flex-1 bg-stone-800 border border-stone-700/60 rounded-lg px-3 py-2 text-xs">
              {offer !== null ? (
                <>
                  <div className="text-stone-500">Merchant offers</div>
                  <div className="text-emerald font-mono tabular-nums">{formatCopper(offer * qty)} <span className="text-stone-600">({formatCopper(offer)} each)</span></div>
                </>
              ) : (
                <div className="text-stone-500 leading-snug">The merchant squints at it — no standing offer. The GM will name a price.</div>
              )}
            </div>
          </div>
          <button onClick={request}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald/80 text-stone-900 font-semibold text-sm hover:bg-emerald transition-colors">
            <Coins size={14} /> Request Sale
          </button>
        </>
      )}
    </div>
  )
}
