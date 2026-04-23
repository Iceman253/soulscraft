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
