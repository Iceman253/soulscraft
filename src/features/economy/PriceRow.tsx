// One ware on the GM price board: stock, suggested price, the GM's prices and actions.
import { Lock, Unlock, X, ShoppingCart, Infinity as InfinityIcon } from 'lucide-react'
import { useEconomyStore } from './store'
import { quoteGood, suggestStock } from '../../lib/economy/economyEngine'
import { coinWords, formatCopper, formatCopperLong, type CurrencyKey } from '../../lib/economy/currency'
import { CoinPriceInput } from '../../ui/CoinPrice'
import { WeaponSpecLine } from '../../ui/WeaponSpecLine'
import { PRICE_GRID } from './priceGrid'
import type { MarketProfile, Good, PriceQuote, MarketListing } from '../../types'

export function GoodRow({ good, market, listing, coin, expanded, onToggleExpand, onBuy, onStock, onUnstock, onUpdate, onEditCustom }: {
  good: Good
  /** The coin price inputs count in. */
  coin: CurrencyKey
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
      <div className={`${PRICE_GRID} gap-2 items-center px-4 py-1.5 hover:bg-stone-800/40 transition-colors`}>

        {/* Name */}
        <div className="min-w-0">
          <span className={`text-sm truncate ${good.custom ? 'text-teal-300' : 'text-stone-200'}`}>
            {good.name}
            {good.custom && onEditCustom && (
              <button onClick={onEditCustom} className="ml-1.5 text-[10px] text-stone-500 hover:text-teal-300 underline">edit</button>
            )}
          </span>
          {good.unit && <span className="ml-1.5 text-[10px] text-stone-600">{good.unit}</span>}
          {good.weapon && <WeaponSpecLine spec={good.weapon} className="truncate" />}
        </div>

        {/* Stock */}
        <div className="flex items-center justify-center gap-1">
          {stocked ? (
            <>
              {listing.stock === -1 ? (
                <button
                  onClick={() => onUpdate({ stock: suggestStock(good, market) })}
                  title="Unlimited — click for finite stock"
                  className="px-2 py-0.5 rounded-sm text-stone-300 hover:bg-stone-700"
                >
                  <InfinityIcon size={13} />
                </button>
              ) : (
                <input
                  type="number" min={0} value={listing.stock}
                  onChange={e => onUpdate({ stock: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="w-12 bg-stone-800 border border-stone-700 rounded-sm px-1 py-0.5 text-stone-200 text-xs text-center outline-hidden focus:border-stone-500 font-mono tabular-nums"
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
          title={`${formatCopperLong(quote.suggested)} — click to see why`}
          className="text-right text-xs hover:text-amber-300 transition-colors"
        >
          <span className="block font-mono tabular-nums text-stone-400">{formatCopper(quote.suggested)}</span>
          <span className="block text-[10px] leading-tight text-stone-500">{coinWords(quote.suggested)}</span>
        </button>

        {/* Final — GM override; blank uses the suggestion */}
        <div className="flex justify-end" title={stocked ? 'Blank uses the suggested price' : 'Stock this ware to set a price'}>
          <CoinPriceInput
            copper={listing?.priceOverride} placeholderCopper={quote.suggested} coin={coin} allowBlank
            onChange={priceOverride => stocked && onUpdate({ priceOverride })}
            disabled={!stocked} set={quote.overridden} label={`${good.name} price`}
          />
        </div>

        {/* Sell (merchant pays) */}
        <div className="flex justify-end" title={stocked ? 'Blank uses the suggested price' : 'Stock this ware to set a price'}>
          <CoinPriceInput
            copper={listing?.sellOverride} placeholderCopper={quote.sellSuggested} coin={coin} allowBlank
            onChange={sellOverride => stocked && onUpdate({ sellOverride })}
            disabled={!stocked} set={listing?.sellOverride !== undefined} label={`What the merchant pays for ${good.name}`}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-1">
          {stocked ? (
            <>
              <button
                onClick={() => onUpdate({ locked: !listing.locked })}
                title={listing.locked ? 'Locked — daily drift and restock skip this line' : 'Unlocked — drifts with the market'}
                className={`p-1 rounded-sm transition-colors ${listing.locked ? 'text-amber-400 hover:text-amber-300' : 'text-stone-600 hover:text-stone-400'}`}
              >
                {listing.locked ? <Lock size={12} /> : <Unlock size={12} />}
              </button>
              <button
                onClick={() => onBuy(quote)}
                disabled={soldOut}
                className="flex items-center gap-1 px-2 py-1 rounded-sm text-[11px] bg-amber-900/40 border border-amber-700/50 text-amber-200 hover:bg-amber-800/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ShoppingCart size={10} /> {soldOut ? 'Sold out' : 'Buy'}
              </button>
              <button onClick={onUnstock} title="Remove from this market's stock" className="p-1 rounded-sm text-stone-600 hover:text-red-400">
                <X size={12} />
              </button>
            </>
          ) : (
            <button
              onClick={onStock}
              className="px-2 py-1 rounded-sm text-[11px] bg-stone-700 text-stone-300 hover:bg-stone-600 transition-colors"
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
              <span>{coinWords(quote.base)} <span className="font-mono tabular-nums text-stone-600">({quote.base}c)</span></span>
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
              <span>{coinWords(quote.suggested)} <span className="font-mono tabular-nums text-stone-600">({quote.suggested}c)</span></span>
            </div>
            {quote.overridden && (
              <div className="flex justify-between text-amber-300">
                <span>Your final price</span>
                <span>{coinWords(quote.final)} <span className="font-mono tabular-nums text-stone-600">({quote.final}c)</span></span>
              </div>
            )}
            <div className="flex justify-between text-stone-500">
              <span>Merchant buys at</span>
              <span>{coinWords(quote.sellFinal)} <span className="font-mono tabular-nums text-stone-600">({quote.sellFinal}c)</span></span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
