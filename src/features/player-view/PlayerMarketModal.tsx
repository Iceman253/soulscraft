import { useState } from 'react'
import { X, Send, Check, AlertTriangle } from 'lucide-react'
import { toCopper, formatCopper } from '../../lib/economy/currency'
import { useShop, type ShopResult } from './shop/useShop'
import { ShopWareRow } from './shop/ShopWareRow'
import { CounterOffers } from './shop/CounterOffers'
import { ShopSellTab } from './shop/ShopSellTab'
import type { Character, MarketProfile } from '../../types'

interface Props {
  character: Character
  market: MarketProfile
  onClose: () => void
}

type Notice = { tone: 'done' | 'sent' | 'warn'; text: string }

const NOTICE_STYLE: Record<Notice['tone'], string> = {
  done: 'bg-emerald/10 border-emerald/30 text-emerald',
  sent: 'bg-teal-600/10 border-teal-600/30 text-teal-300',
  warn: 'bg-amber-900/20 border-amber-700/40 text-amber-300',
}

/** The player's shop window. Buying at the listed price happens straight away;
 *  asking for a better price, and every sale, goes to the GM as a request. */
export function PlayerMarketModal({ character: c, market, onClose }: Props) {
  const shop = useShop(c, market)
  const [tab, setTab] = useState<'buy' | 'sell'>('buy')
  const [notice, setNotice] = useState<Notice | null>(null)
  const wallet = toCopper(c.currency)

  const show = (n: Notice) => { setNotice(n); setTimeout(() => setNotice(cur => (cur === n ? null : cur)), 4000) }
  const report = (result: ShopResult, done: Notice): ShopResult => {
    show(result.ok ? done : { tone: 'warn', text: result.reason })
    return result
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75">
      <div className="bg-stone-900 border border-stone-700 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh]">

        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-700 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg shrink-0">🏪</span>
            <div className="min-w-0">
              <h2 className="font-bold text-stone-100 text-sm font-heading truncate">{market.name}</h2>
              <div className="text-[11px] text-stone-500">Your purse: <span className="text-stone-300 font-mono">{formatCopper(wallet)}</span></div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex rounded-lg overflow-hidden border border-stone-700">
              {([['buy', 'Buy'], ['sell', 'Sell']] as const).map(([id, label]) => (
                <button key={id} onClick={() => setTab(id)}
                  className={`px-3 py-1.5 text-xs transition-colors ${tab === id ? 'bg-amber-900/40 text-amber-200' : 'bg-stone-800 text-stone-400 hover:text-stone-200'}`}>
                  {label}
                </button>
              ))}
            </div>
            <button onClick={onClose} aria-label="Close shop" className="p-1.5 rounded-sm text-stone-500 hover:text-stone-200 hover:bg-stone-700">
              <X size={14} />
            </button>
          </div>
        </div>

        {notice && (
          <div className={`shrink-0 mx-4 mt-3 px-3 py-2 rounded-lg border text-xs flex items-center gap-1.5 ${NOTICE_STYLE[notice.tone]}`}>
            {notice.tone === 'done' ? <Check size={12} /> : notice.tone === 'sent' ? <Send size={11} /> : <AlertTriangle size={12} />}
            {notice.text}
          </div>
        )}
        {shop.waiting.length > 0 && (
          <div className="shrink-0 mx-4 mt-3 px-3 py-2 rounded-lg bg-stone-800 border border-stone-700 text-[11px] text-stone-400">
            With the GM: {shop.waiting.map(r => r.label).join(' · ')}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {tab === 'buy' && (
            <>
              <CounterOffers
                counters={shop.counters}
                wallet={wallet}
                onAccept={req => report(shop.acceptCounter(req), { tone: 'done', text: `Bought ${req.payload.quantity}× ${req.payload.goodName} at the GM's price.` })}
                onDecline={req => { shop.declineCounter(req); show({ tone: 'sent', text: `You turned down the GM's price for ${req.payload.goodName}.` }) }}
              />
              {shop.shelves.length === 0 ? (
                <div className="py-10 text-center text-stone-500 text-sm">The stalls are bare — nothing for sale right now.</div>
              ) : shop.shelves.map(cat => (
                <div key={cat.id}>
                  <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider font-heading mb-1.5">{cat.icon} {cat.label}</div>
                  <div className="space-y-1.5">
                    {cat.rows.map(row => (
                      <ShopWareRow key={row.good.id} row={row} wallet={wallet}
                        onBuy={qty => report(shop.buy(row.good.id, qty, row.unitPrice), { tone: 'done', text: `Bought ${qty}× ${row.good.name} for ${formatCopper(row.unitPrice * qty)}.` })}
                        onAsk={(qty, offer) => report(shop.askBetterPrice(row, qty, offer), { tone: 'sent', text: `Offer sent: ${qty}× ${row.good.name} at ${formatCopper(offer)} each. Waiting on the GM.` })}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
          {tab === 'sell' && <ShopSellTab character={c} market={market} onSent={text => show({ tone: 'sent', text: `${text}. Waiting on the GM.` })} />}
        </div>
      </div>
    </div>
  )
}
