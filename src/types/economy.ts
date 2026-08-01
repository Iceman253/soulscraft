// ── Economy ────────────────────────────────────────────────────────────
// A grounded, GM-controlled trade system. The engine SUGGESTS prices from a
// place's profile; the GM can override any final number. Everything is
// denominated in copper internally (see lib/currency.ts).

/** Broad shelf a good sits on. */
export type GoodCategory =
  | 'weapon'
  | 'armor'
  | 'tool'
  | 'food'
  | 'material'      // raw blocks, ingots, lapis, wood…
  | 'potion'
  | 'enchanting'    // books, lapis, table services
  | 'mount'         // horses, boats, beasts of burden
  | 'service'       // inn, healing, passage, hirelings
  | 'luxury'
  | 'misc'

/** Semantic tags drive how regional factors apply (a place that specialises in
 *  'grain' discounts every good tagged 'grain'). */
export type GoodTag =
  | 'metal' | 'grain' | 'meat' | 'wood' | 'stone' | 'cloth'
  | 'magic' | 'luxury' | 'livestock' | 'fish' | 'gem'
  | 'alchemy' | 'fuel' | 'tool' | 'weapon' | 'armor' | 'imported'

export interface Good {
  id: string
  name: string
  category: GoodCategory
  /** Baseline fair price in copper before any regional modifiers. */
  basePriceCopper: number
  tags: GoodTag[]
  unit?: string              // "each", "stack", "per night", "per day"…
  description?: string
  /** Optional crafting recipe — material goodId → quantity. Drives the
   *  build-vs-buy calculator and "raw vs finished" pricing. */
  recipe?: { goodId: string; qty: number }[]
  /** Crafting difficulty surcharge as a fraction of material cost (labour). */
  craftLabour?: number       // e.g. 0.25 = +25% over materials
  /** True for GM-authored goods (vs the built-in catalog). */
  custom?: boolean
}

/** One line a market actually carries. */
export interface MarketListing {
  goodId: string
  /** Units in stock. -1 = effectively unlimited. Low stock raises the
   *  suggested price; 0 means sold out. */
  stock: number
  /** GM's final buy price (copper). When set, overrides the suggestion. */
  priceOverride?: number
  /** GM's final sell-to-merchant price (copper). When set, overrides. */
  sellOverride?: number
  /** Locked listings ignore drift/restock so a hand-set price sticks. */
  locked?: boolean
  /** Day-to-day market noise (±fraction), wandered by the End Day tick. */
  drift?: number
}

/** A place's economic identity — the "information about a place" the GM feeds
 *  in for the engine to reason about. Attaches to a map Area. */
export interface MarketProfile {
  id: string
  areaId: string | null      // map area this market sits in (null = floating)
  name: string
  /** 1 destitute · 2 poor · 3 modest · 4 comfortable · 5 wealthy. */
  prosperity: number
  /** 1 hamlet · 2 village · 3 town · 4 city · 5 metropolis. */
  size: number
  /** 1 on a trade hub · 5 utterly isolated. Imports cost more when remote. */
  remoteness: number
  /** 1 lawless · 5 strictly policed. Affects illicit goods & risk premium. */
  security: number
  /** Tags this place produces in surplus → discounted. */
  specialties: GoodTag[]
  /** Tags scarce here → premium. */
  shortages: GoodTag[]
  /** Local tax/tariff as a percentage added to every price. */
  tariffPct: number
  /** Fraction of buy price a merchant pays to BUY from the party (0–1). */
  sellRate: number
  /** Faction that controls/runs this market (reputation applies). */
  factionId: string | null
  /** Local standing override, independent of faction reputation (-100..100). */
  localStanding: number
  notes: string
  listings: MarketListing[]
}

export interface Faction {
  id: string
  name: string
  color: string
  notes: string
}

/** A shock the GM applies to bend prices for matching goods. */
export interface EconomicEvent {
  id: string
  name: string
  description: string
  /** Tags affected. Empty = applies to everything. */
  affectedTags: GoodTag[]
  /** Multiplier on matching goods' price, e.g. 1.5 famine, 0.6 glut. */
  priceMultiplier: number
  /** 'global' or a specific areaId. */
  scope: 'global' | string
  /** Days remaining; ticked by End Day. null = until GM removes. */
  remainingDays: number | null
}

export interface EconomyData {
  markets: MarketProfile[]
  customGoods: Good[]
  factions: Faction[]
  /** factionId → standing in -100..100. */
  reputation: Record<string, number>
  events: EconomicEvent[]
  /** Per-good base-price overrides the GM sets globally (copper). */
  basePriceOverrides: Record<string, number>
}

/** One contributing factor in a suggested price, for the "why" breakdown. */
export interface PriceFactor {
  label: string
  factor: number             // multiplicative, e.g. 1.2 or 0.65
}

export interface PriceQuote {
  goodId: string
  base: number
  factors: PriceFactor[]
  suggested: number          // engine's number after all factors
  final: number              // override if present, else suggested
  overridden: boolean
  sellSuggested: number
  sellFinal: number
}
