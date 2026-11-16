// The coin this viewer types prices in, remembered on their device only.
import { useState } from 'react'
import { CURRENCY_OPTIONS, type CurrencyKey } from '../../lib/economy/currency'

const KEY = 'soulscraft_price_coin'

function load(): CurrencyKey {
  try {
    const saved = localStorage.getItem(KEY)
    return CURRENCY_OPTIONS.some(o => o.key === saved) ? (saved as CurrencyKey) : 'gold'
  } catch { return 'gold' }
}

export function usePriceCoin(): [CurrencyKey, (k: CurrencyKey) => void] {
  const [coin, setCoin] = useState<CurrencyKey>(load)
  const choose = (k: CurrencyKey) => {
    setCoin(k)
    try { localStorage.setItem(KEY, k) } catch { /* private window: keep it for this visit */ }
  }
  return [coin, choose]
}
