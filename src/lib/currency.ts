import type { Currency } from '../types'

export type CurrencyKey = keyof Currency

export interface CurrencyOption {
  key: CurrencyKey
  label: string
  img: string
}

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { key: 'copper',   label: 'Copper',   img: '/currency/copper.png' },
  { key: 'iron',     label: 'Iron',     img: '/currency/iron.png' },
  { key: 'gold',     label: 'Gold',     img: '/currency/gold.png' },
  { key: 'emeralds', label: 'Emeralds', img: '/currency/emerald.png' },
  { key: 'diamonds', label: 'Diamonds', img: '/currency/diamond.png' },
]

export const DEFAULT_CURRENCY: Currency = {
  copper: 0, iron: 0, gold: 0, emeralds: 0, diamonds: 0,
}

// ── Coin math ────────────────────────────────────────────────────────────
// The manual defines a strict 10:1 ladder (manual p.3):
//   1 Diamond = 10 Emeralds = 100 Gold = 1,000 Iron = 10,000 Copper
// Everything in the economy engine is denominated in COPPER internally, then
// rendered back into mixed coins so prices look like real money.

/** Worth of one coin of each tier, expressed in copper. */
export const COIN_VALUE: Record<CurrencyKey, number> = {
  copper: 1,
  iron: 10,
  gold: 100,
  emeralds: 1_000,
  diamonds: 10_000,
}

/** Highest-to-lowest denomination order — used for greedy change-making. */
const TIERS: CurrencyKey[] = ['diamonds', 'emeralds', 'gold', 'iron', 'copper']

/** Total worth of a wallet in copper. */
export function toCopper(c: Currency): number {
  return TIERS.reduce((sum, k) => sum + (c[k] || 0) * COIN_VALUE[k], 0)
}

/** Decompose a copper amount into the fewest coins (greedy, high→low). */
export function fromCopper(copper: number): Currency {
  let remaining = Math.max(0, Math.round(copper))
  const out: Currency = { ...DEFAULT_CURRENCY }
  for (const k of TIERS) {
    const v = COIN_VALUE[k]
    out[k] = Math.floor(remaining / v)
    remaining -= out[k] * v
  }
  return out
}

export function canAfford(wallet: Currency, copperPrice: number): boolean {
  return toCopper(wallet) >= Math.round(copperPrice)
}

/**
 * Pay a copper price out of a wallet, returning the resulting wallet with
 * change made automatically (the realistic "hand over coins, get change back"
 * model — the buyer's denominations are recomputed from their new total).
 * If the wallet can't cover it, `ok` is false and the wallet is unchanged.
 */
export function payFromWallet(wallet: Currency, copperPrice: number): { wallet: Currency; ok: boolean } {
  const price = Math.round(copperPrice)
  const have = toCopper(wallet)
  if (have < price) return { wallet, ok: false }
  return { wallet: fromCopper(have - price), ok: true }
}

/** Credit a copper amount into a wallet (e.g. proceeds of a sale). */
export function addToWallet(wallet: Currency, copperAmount: number): Currency {
  return fromCopper(toCopper(wallet) + Math.round(copperAmount))
}

const TIER_LABEL: Record<CurrencyKey, string> = {
  copper: 'c', iron: 'i', gold: 'g', emeralds: 'em', diamonds: 'dia',
}

/** Render a copper amount as compact mixed coins, e.g. "1g 2i 5c". */
export function formatCopper(copper: number): string {
  const c = fromCopper(copper)
  const parts = TIERS
    .filter(k => c[k] > 0)
    .map(k => `${c[k]}${TIER_LABEL[k]}`)
  return parts.length ? parts.join(' ') : '0c'
}

/** Long form, e.g. "1 Gold, 2 Iron, 5 Copper" — for tooltips/logs. */
export function formatCopperLong(copper: number): string {
  const c = fromCopper(copper)
  const parts = CURRENCY_OPTIONS
    .slice()
    .reverse()
    .filter(o => c[o.key] > 0)
    .map(o => `${c[o.key]} ${o.label}`)
  return parts.length ? parts.join(', ') : '0 Copper'
}
