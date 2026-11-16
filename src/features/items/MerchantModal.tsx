import { useMemo, useState } from 'react'
import { X, ShoppingCart } from 'lucide-react'
import { useItemStore } from './store'
import { useCharacterStore } from '../characters/store'
import { allGoods, useEconomyStore } from '../economy/store'
import { log } from '../log/store'
import { CURRENCY_OPTIONS, COIN_VALUE, toCopper, fromCopper, formatCopper } from '../../lib/economy/currency'
import type { CurrencyKey } from '../../lib/economy/currency'
import { WeaponSpecLine } from '../../ui/WeaponSpecLine'
import { WareList } from './WareList'
import { ARMOR_CATALOG, WEAPONS_CATALOG, catalogWares, itemFromWare, marketWeaponWares, wholeCoinPrice, worldItemWares, type Ware } from './wares'

interface Props {
  onClose: () => void
}

export function MerchantModal({ onClose }: Props) {
  const items = useItemStore(s => s.items)
  const economy = useEconomyStore(s => s.economy)
  const marketWeapons = useMemo(() => marketWeaponWares(allGoods(economy)), [economy])
  const { characters, addOnHandItem, setCurrency } = useCharacterStore()

  const [selected, setSelected] = useState<Ware | null>(null)
  const selectedItem = selected?.name ?? ''
  const [quantity, setQuantity] = useState(1)
  const [price, setPrice] = useState(0)
  const [currency, setCurrencyKey] = useState<CurrencyKey>('gold')
  const [charId, setCharId] = useState<string>('')

  const [forceShort, setForceShort] = useState(false)

  const selectedChar = characters.find(c => c.id === charId) ?? null

  // Real coin math: the price is in the chosen denomination, the wallet pays
  // across ALL tiers (10:1 ladder) and change is re-coined automatically.
  const priceCopper = price * COIN_VALUE[currency]
  const walletCopper = selectedChar ? toCopper(selectedChar.currency) : 0
  const insufficient = !!selectedChar && walletCopper < priceCopper

  const select = (ware: Ware) => {
    setSelected(ware)
    if (ware.basePriceCopper) {
      const suggested = wholeCoinPrice(ware.basePriceCopper)
      setPrice(suggested.amount * quantity)
      setCurrencyKey(suggested.currency)
    }
  }

  const handlePurchase = () => {
    if (!selected || !charId || !selectedChar) return
    if (insufficient && !forceShort) return

    setCurrency(charId, fromCopper(Math.max(0, walletCopper - priceCopper)))
    addOnHandItem(charId, itemFromWare(selected, quantity))

    const currLabel = CURRENCY_OPTIONS.find(c => c.key === currency)?.label ?? currency
    const shortNote = insufficient ? ' (purse emptied — GM waived the shortfall)' : ''
    log('item-purchase', `🛒 ${selectedChar.name} purchased ${quantity}× ${selectedItem} for ${price} ${currLabel}${shortNote}.`)

    // Reset item selection but keep form open
    setSelected(null)
    setQuantity(1)
    setPrice(0)
    setForceShort(false)
  }

  const canPurchase = !!selectedItem && !!charId && (!insufficient || forceShort)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
      <div className="bg-stone-900 border border-stone-700 rounded-xl shadow-2xl flex flex-col w-full max-w-5xl max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-700 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏪</span>
            <h2 className="font-bold text-stone-100 text-base font-heading tracking-wide">Merchant Wares</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-sm text-stone-400 hover:text-stone-100 hover:bg-stone-700 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0">

          {/* Left panel — Wares */}
          <div className="w-[45%] border-r border-stone-700 flex flex-col min-h-0">
            <div className="px-4 py-2.5 border-b border-stone-700/60 shrink-0">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider font-heading">Wares</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              <WareList title="⚔️ Market weapons" wares={marketWeapons} selectedKey={selected?.key} onSelect={select} />
              <WareList title="World Items" wares={worldItemWares(items)} selectedKey={selected?.key} onSelect={select} />
              <WareList title="⚔️ Weapons" wares={catalogWares(WEAPONS_CATALOG, 'weapon')} selectedKey={selected?.key} onSelect={select} />
              <WareList title="🛡️ Armor" wares={catalogWares(ARMOR_CATALOG, 'armor')} selectedKey={selected?.key} onSelect={select} />
              {marketWeapons.length === 0 && (
                <div className="text-[11px] text-stone-600">
                  Named weapons with their own power and abilities come from the Economy tab: add a custom good of category Weapon.
                </div>
              )}
            </div>
          </div>

          {/* Right panel — Purchase */}
          <div className="w-[55%] flex flex-col min-h-0">
            <div className="px-4 py-2.5 border-b border-stone-700/60 shrink-0">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider font-heading">Purchase</span>
            </div>
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">

              {/* Selected Item */}
              <div>
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-2 font-heading">Item</label>
                {selectedItem
                  ? (
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-amber-900/30 border border-amber-700/50">
                      <ShoppingCart size={14} className="text-amber-400 shrink-0" />
                      <span className="min-w-0">
                        <span className="text-amber-100 font-medium text-sm">{selectedItem}</span>
                        {selected?.weapon && <WeaponSpecLine spec={selected.weapon} />}
                      </span>
                      <button
                        onClick={() => setSelected(null)}
                        className="ml-auto text-stone-500 hover:text-stone-300"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )
                  : (
                    <div className="px-3 py-2.5 rounded-lg bg-stone-800 border border-stone-700 border-dashed text-stone-500 text-sm italic">
                      ← Select a ware from the left
                    </div>
                  )
                }
              </div>

              {/* Quantity */}
              <div>
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-2 font-heading">Quantity</label>
                <input
                  type="number"
                  value={quantity}
                  min={1}
                  onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-stone-100 text-sm outline-hidden focus:border-stone-500 font-mono tabular-nums"
                />
              </div>

              {/* Price */}
              <div>
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-2 font-heading">Price</label>
                <input
                  type="number"
                  value={price}
                  min={0}
                  onChange={e => setPrice(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-stone-100 text-sm outline-hidden focus:border-stone-500 font-mono tabular-nums"
                />
              </div>

              {/* Currency */}
              <div>
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-2 font-heading">Currency</label>
                <div className="flex gap-2 flex-wrap">
                  {CURRENCY_OPTIONS.map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => setCurrencyKey(opt.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                        currency === opt.key
                          ? 'bg-amber-900/40 border-amber-600 text-amber-200'
                          : 'bg-stone-800 border-stone-700 text-stone-300 hover:border-stone-500'
                      }`}
                    >
                      <img src={opt.img} alt={opt.label} className="w-4 h-4 object-contain" />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Character */}
              <div>
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-2 font-heading">Buyer</label>
                <select
                  value={charId}
                  onChange={e => setCharId(e.target.value)}
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-stone-200 text-sm outline-hidden focus:border-stone-500"
                >
                  <option value="">— Select character —</option>
                  {characters.map(c => {
                    const amt = c.currency[currency]
                    const currOpt = CURRENCY_OPTIONS.find(o => o.key === currency)
                    return (
                      <option key={c.id} value={c.id}>
                        {c.name} — {amt} {currOpt?.label ?? currency}
                      </option>
                    )
                  })}
                </select>
              </div>

              {/* Character currency preview */}
              {selectedChar && (
                <div className="bg-stone-800 border border-stone-700/60 rounded-lg p-3">
                  <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 font-heading">{selectedChar.name}'s Wallet</div>
                  <div className="flex flex-wrap gap-2">
                    {CURRENCY_OPTIONS.map(opt => (
                      <div
                        key={opt.key}
                        className={`flex items-center gap-1 px-2 py-1 rounded-sm bg-stone-700 text-xs ${currency === opt.key ? 'text-amber-300' : 'text-stone-400'}`}
                      >
                        <img src={opt.img} alt={opt.label} className="w-3.5 h-3.5 object-contain" />
                        <span className="font-mono tabular-nums">{selectedChar.currency[opt.key]}</span>
                      </div>
                    ))}
                  </div>
                  {price > 0 && (
                    <div className="mt-2 text-xs text-stone-500 space-y-1">
                      <div>
                        After purchase:{' '}
                        <span className={insufficient ? 'text-red-400' : 'text-stone-300'}>
                          {insufficient
                            ? `short ${formatCopper(priceCopper - walletCopper)}`
                            : formatCopper(walletCopper - priceCopper)}
                        </span>
                        <span className="text-stone-600 ml-1.5">(coins convert automatically)</span>
                      </div>
                      {insufficient && (
                        <label className="flex items-start gap-1.5 text-amber-400/90 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={forceShort}
                            onChange={e => setForceShort(e.target.checked)}
                            className="mt-0.5 accent-amber-600"
                          />
                          <span>GM override: complete anyway — purse is emptied, the rest is forgiven.</span>
                        </label>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Purchase button */}
              <div className="mt-auto pt-2">
                <button
                  onClick={handlePurchase}
                  disabled={!canPurchase}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-amber-700 text-amber-100 font-semibold text-sm hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ShoppingCart size={15} />
                  Purchase
                  {selectedItem && charId ? ` — ${quantity}× ${selectedItem}` : ''}
                </button>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
