// Prices typed in a chosen coin (stored as copper), with the amount in words.
import { useState } from 'react'
import { CURRENCY_OPTIONS, coinWords, fromCoin, inCoin, type CurrencyKey } from '../lib/economy/currency'

const show = (n: number) => String(+n.toFixed(4))

/** Which coin price inputs count in. */
export function CoinSelect({ value, onChange, className = '' }: { value: CurrencyKey; onChange: (k: CurrencyKey) => void; className?: string }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value as CurrencyKey)} aria-label="Coin prices are typed in"
      className={`bg-stone-800 border border-stone-700 rounded-sm px-1.5 py-0.5 text-stone-200 text-xs outline-hidden focus:border-stone-500 ${className}`}>
      {CURRENCY_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
    </select>
  )
}

/** A price counted in `coin`. Blank means "no price set" when `allowBlank`,
 *  and then the placeholder (e.g. the engine's suggestion) is shown in words. */
export function CoinPriceInput({ copper, coin, onChange, placeholderCopper, allowBlank = false, disabled, set = false, label, inputClassName = 'w-20' }: {
  copper: number | undefined
  coin: CurrencyKey
  onChange: (copper: number | undefined) => void
  placeholderCopper?: number
  allowBlank?: boolean
  disabled?: boolean
  /** Style it as a GM-set value rather than a default. */
  set?: boolean
  label: string
  inputClassName?: string
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const shown = draft ?? (copper === undefined ? '' : show(inCoin(copper, coin)))
  const wordsFor = copper ?? placeholderCopper

  const edit = (text: string) => {
    setDraft(text)
    if (text.trim() === '') { onChange(allowBlank ? undefined : 0); return }
    const n = parseFloat(text)
    if (Number.isFinite(n)) onChange(fromCoin(n, coin))
  }

  return (
    <span className="inline-flex flex-col items-end">
      <input type="number" min={0} step="any" value={shown} disabled={disabled} aria-label={label}
        placeholder={placeholderCopper === undefined ? undefined : show(inCoin(placeholderCopper, coin))}
        onChange={e => edit(e.target.value)} onBlur={() => setDraft(null)}
        className={`${inputClassName} bg-stone-800 border rounded-sm px-1.5 py-0.5 text-xs text-right outline-hidden font-mono tabular-nums disabled:opacity-40 ${
          set ? 'border-amber-600/70 text-amber-200' : 'border-stone-700 text-stone-300 focus:border-stone-500 placeholder:text-stone-600'
        }`} />
      {wordsFor !== undefined && !disabled && (
        <span className={`text-[10px] leading-tight mt-0.5 text-right ${copper === undefined ? 'text-stone-600' : 'text-stone-400'}`}>
          {coinWords(wordsFor)}
        </span>
      )}
    </span>
  )
}
