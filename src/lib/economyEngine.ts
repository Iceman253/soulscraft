import type {
  Good, GoodTag, MarketProfile, MarketListing, EconomicEvent,
  EconomyData, PriceQuote, PriceFactor, Area, AreaEdge,
} from '../types'

// ── Pricing engine ──────────────────────────────────────────────────────
// Pure functions only. The engine SUGGESTS — every number it produces can be
// overridden by the GM (listing.priceOverride / sellOverride / locked, plus
// global basePriceOverrides). Suggested prices are deterministic from the
// market profile + events + standing, so the GM can always see WHY a price
// is what it is via the factor breakdown.

/** Round to coin-friendly increments so prices read like real money. */
export function roundPrice(copper: number): number {
  const v = Math.max(1, copper)
  if (v < 50) return Math.round(v)
  if (v < 200) return Math.round(v / 5) * 5
  if (v < 1_000) return Math.round(v / 10) * 10
  if (v < 10_000) return Math.round(v / 50) * 50
  return Math.round(v / 100) * 100
}

function hasAnyTag(good: Good, tags: GoodTag[]): boolean {
  return good.tags.some(t => tags.includes(t))
}

/** Combined faction + local standing, clamped to -100..100. */
export function effectiveStanding(market: MarketProfile, economy: EconomyData): number {
  const factionRep = market.factionId ? (economy.reputation[market.factionId] ?? 0) : 0
  return Math.max(-100, Math.min(100, factionRep + market.localStanding))
}

export function standingLabel(standing: number): string {
  if (standing <= -60) return 'Hostile'
  if (standing <= -20) return 'Unfriendly'
  if (standing < 20) return 'Neutral'
  if (standing < 60) return 'Friendly'
  return 'Honored'
}

/** Events that apply to this market: global scope or matching its area. */
function activeEventsFor(market: MarketProfile, economy: EconomyData): EconomicEvent[] {
  return economy.events.filter(e =>
    e.scope === 'global' || (market.areaId !== null && e.scope === market.areaId)
  )
}

/**
 * Compute a full price quote for one good at one market.
 * `listing` is optional — quoting an unlisted good still works (for the
 * GM browsing the full catalog), it just skips stock scarcity and overrides.
 */
export function quoteGood(
  good: Good,
  market: MarketProfile,
  economy: EconomyData,
  listing?: MarketListing,
): PriceQuote {
  const base = economy.basePriceOverrides[good.id] ?? good.basePriceCopper
  const factors: PriceFactor[] = []
  const push = (label: string, factor: number) => {
    if (Math.abs(factor - 1) > 0.001) factors.push({ label, factor })
  }

  // Prosperity — cost of living. Wealthy places pay more for everything.
  push('Prosperity', 1 + (market.prosperity - 3) * 0.08)

  // Size — bigger markets mean more competition and supply.
  push('Market size', 1 - (market.size - 3) * 0.05)

  // Specialty / shortage — the strongest regional signals.
  const isSpecialty = hasAnyTag(good, market.specialties)
  const isShortage = hasAnyTag(good, market.shortages)
  if (isSpecialty) push('Local specialty', 0.7)
  if (isShortage) push('Local shortage', 1.6)

  // Remoteness — goods a place doesn't produce must travel to reach it.
  if (!isSpecialty && market.remoteness > 1) {
    const perStep = good.tags.includes('imported') ? 0.2 : 0.12
    push(good.tags.includes('imported') ? 'Remote (imported)' : 'Remote', 1 + (market.remoteness - 1) * perStep)
  }

  // Low security — risk premium on valuables that attract thieves.
  if (market.security < 3 && hasAnyTag(good, ['luxury', 'gem', 'magic'])) {
    push('Risk premium', 1 + (3 - market.security) * 0.1)
  }

  // Economic events (famine, war, festival…)
  for (const ev of activeEventsFor(market, economy)) {
    const applies = ev.affectedTags.length === 0 || hasAnyTag(good, ev.affectedTags)
    if (applies) push(ev.name, ev.priceMultiplier)
  }

  // Party standing — merchants charge people they dislike.
  const standing = effectiveStanding(market, economy)
  if (standing !== 0) push(`Standing (${standingLabel(standing)})`, 1 - standing * 0.002)

  // Stock scarcity — nearly sold out means the merchant can name their price.
  if (listing && listing.stock >= 0) {
    if (listing.stock > 0 && listing.stock <= 2) push('Nearly sold out', 1.25)
    else if (listing.stock > 2 && listing.stock <= 5) push('Low stock', 1.1)
  }

  // Day-to-day market noise (set by the End Day tick, never on locked lines).
  if (listing?.drift && !listing.locked) {
    push('Market mood', 1 + listing.drift)
  }

  // Tariff goes on last — it taxes the full market price.
  if (market.tariffPct !== 0) push(`Tariff ${market.tariffPct}%`, 1 + market.tariffPct / 100)

  const raw = factors.reduce((p, f) => p * f.factor, base)
  const suggested = roundPrice(raw)

  // Sell-to-merchant: a fraction of the pre-tariff price (merchants don't
  // pay tax to buy your goods), nudged slightly by standing.
  const preTariff = market.tariffPct !== 0 ? raw / (1 + market.tariffPct / 100) : raw
  const sellSuggested = roundPrice(preTariff * market.sellRate)

  const overridden = listing?.priceOverride !== undefined
  const final = listing?.priceOverride ?? suggested
  const sellFinal = listing?.sellOverride ?? sellSuggested

  return { goodId: good.id, base, factors, suggested, final, overridden, sellSuggested, sellFinal }
}

// ── Listing suggestions ─────────────────────────────────────────────────
// "Tell me about the place and the engine figures out what it stocks."

/** Most expensive thing a market of this prosperity plausibly carries. */
const PROSPERITY_PRICE_CAP = [0, 1_500, 4_000, 12_000, 40_000, 150_000]

function categoryAvailable(good: Good, market: MarketProfile): boolean {
  const specialty = hasAnyTag(good, market.specialties)
  if (specialty) return true
  switch (good.category) {
    case 'enchanting': return market.size >= 3
    case 'potion':     return market.size >= 2
    case 'mount':      return market.size >= 2
    case 'luxury':     return market.prosperity >= 3
    default:           return true
  }
}

export function suggestStock(good: Good, market: MarketProfile): number {
  // Services don't run out.
  if (good.category === 'service') return -1
  let stock: number
  switch (good.category) {
    case 'food':
    case 'material':   stock = 6 + market.size * 4; break
    case 'weapon':
    case 'armor':
    case 'tool':       stock = 1 + market.size; break
    case 'potion':
    case 'enchanting': stock = Math.max(1, market.size - 1); break
    case 'mount':      stock = market.size; break
    default:           stock = market.size
  }
  if (hasAnyTag(good, market.specialties)) stock = Math.ceil(stock * 1.5)
  if (hasAnyTag(good, market.shortages)) stock = Math.max(1, Math.floor(stock / 3))
  return stock
}

/**
 * Suggest a full listing set from the market's profile. The GM reviews and
 * applies (or edits) — nothing is forced onto a market automatically.
 */
export function suggestListingsForMarket(market: MarketProfile, allGoods: Good[]): MarketListing[] {
  const cap = PROSPERITY_PRICE_CAP[Math.min(5, Math.max(1, market.prosperity))]
  return allGoods
    .filter(good => good.basePriceCopper <= cap || hasAnyTag(good, market.specialties))
    .filter(good => categoryAvailable(good, market))
    .map(good => ({ goodId: good.id, stock: suggestStock(good, market) }))
}

// ── Travel & remoteness ─────────────────────────────────────────────────

const DANGER_WEIGHT: Record<string, number> = { safe: 1, risky: 1.5, deadly: 2.5 }

/** Effective travel cost of one edge in "safe-road days". */
export function edgeTravelCost(edge: AreaEdge): number {
  const days = edge.travelDays ?? 1
  return days * (DANGER_WEIGHT[edge.travelDanger ?? 'safe'] ?? 1)
}

/**
 * Suggest a remoteness rating (1–5) by walking the map from this area to the
 * nearest big market (size ≥ 4) using edge travel days weighted by danger.
 * Falls back to 3 when the map has no big market to anchor on.
 */
export function suggestRemotenessFromMap(
  areaId: string,
  areas: Area[],
  edges: AreaEdge[],
  markets: MarketProfile[],
): { remoteness: number; reason: string } {
  const hubAreaIds = new Set(
    markets.filter(m => m.size >= 4 && m.areaId && m.areaId !== areaId).map(m => m.areaId as string)
  )
  if (hubAreaIds.size === 0) {
    return { remoteness: 3, reason: 'No large market (size 4+) on the map to anchor against — defaulting to middling.' }
  }

  // Dijkstra over the area graph.
  const dist = new Map<string, number>([[areaId, 0]])
  const visited = new Set<string>()
  while (true) {
    let current: string | null = null
    let best = Infinity
    for (const [id, d] of dist) {
      if (!visited.has(id) && d < best) { best = d; current = id }
    }
    if (current === null) break
    if (hubAreaIds.has(current)) {
      const d = best
      const remoteness = d <= 1 ? 1 : d <= 3 ? 2 : d <= 6 ? 3 : d <= 10 ? 4 : 5
      const hubArea = areas.find(a => a.id === current)
      return {
        remoteness,
        reason: `≈${Math.round(d * 10) / 10} safe-road days to ${hubArea?.name ?? 'nearest hub'} via the map.`,
      }
    }
    visited.add(current)
    for (const e of edges) {
      const next = e.sourceId === current ? e.targetId : e.targetId === current ? e.sourceId : null
      if (!next || visited.has(next)) continue
      const nd = best + edgeTravelCost(e)
      if (nd < (dist.get(next) ?? Infinity)) dist.set(next, nd)
    }
  }
  return { remoteness: 5, reason: 'Not connected to any large market on the map — utterly isolated.' }
}

// ── Daily tick ──────────────────────────────────────────────────────────

/**
 * One in-game day passes: events tick down, prices drift a little, and
 * stock creeps back toward each market's suggested baseline.
 * Locked listings and GM overrides are never touched.
 */
export function tickEconomyDay(economy: EconomyData, allGoods: Good[]): EconomyData {
  const events = economy.events
    .map(e => e.remainingDays === null ? e : { ...e, remainingDays: e.remainingDays - 1 })
    .filter(e => e.remainingDays === null || e.remainingDays > 0)

  const goodsById = new Map(allGoods.map(g => [g.id, g]))

  const markets = economy.markets.map(market => {
    const baseline = new Map(
      suggestListingsForMarket(market, allGoods).map(l => [l.goodId, l.stock])
    )
    const listings = market.listings.map(listing => {
      if (listing.locked || !goodsById.has(listing.goodId)) return listing
      // Drift wanders ±6%/day, capped at ±15% — enough to feel alive,
      // small enough to never surprise the table.
      const drift = Math.max(-0.15, Math.min(0.15,
        (listing.drift ?? 0) + (Math.random() * 0.12 - 0.06)
      ))
      // Stock creeps 1/day toward the profile baseline (unlimited stays put).
      let stock = listing.stock
      if (stock >= 0) {
        const target = baseline.get(listing.goodId) ?? 0
        if (stock < target) stock += 1
        else if (stock > target) stock -= 1
      }
      return { ...listing, drift: Math.round(drift * 1000) / 1000, stock }
    })
    return { ...market, listings }
  })

  return { ...economy, events, markets }
}

// ── Crafting ────────────────────────────────────────────────────────────

export interface CraftCostLine {
  goodId: string
  name: string
  qty: number
  unitCopper: number
  totalCopper: number
}

export interface CraftCost {
  lines: CraftCostLine[]
  materialsCopper: number
  labourCopper: number
  totalCopper: number
  /** Final buy price of the finished good at this market, for comparison. */
  buyCopper: number
}

/**
 * What would it cost to source the materials for `good` at this market and
 * craft it, versus buying it finished? Uses FINAL prices (GM overrides count).
 */
export function craftCostAt(
  good: Good,
  market: MarketProfile,
  economy: EconomyData,
  allGoods: Good[],
): CraftCost | null {
  if (!good.recipe || good.recipe.length === 0) return null
  const goodsById = new Map(allGoods.map(g => [g.id, g]))
  const lines: CraftCostLine[] = []
  for (const ing of good.recipe) {
    const mat = goodsById.get(ing.goodId)
    if (!mat) continue
    const listing = market.listings.find(l => l.goodId === ing.goodId)
    const quote = quoteGood(mat, market, economy, listing)
    lines.push({
      goodId: mat.id, name: mat.name, qty: ing.qty,
      unitCopper: quote.final, totalCopper: quote.final * ing.qty,
    })
  }
  const materialsCopper = lines.reduce((s, l) => s + l.totalCopper, 0)
  const labourCopper = roundPrice(materialsCopper * (good.craftLabour ?? 0.25))
  const listing = market.listings.find(l => l.goodId === good.id)
  const buy = quoteGood(good, market, economy, listing)
  return { lines, materialsCopper, labourCopper, totalCopper: materialsCopper + labourCopper, buyCopper: buy.final }
}

// ── Defaults ────────────────────────────────────────────────────────────

export function emptyEconomy(): EconomyData {
  return {
    markets: [],
    customGoods: [],
    factions: [],
    reputation: {},
    events: [],
    basePriceOverrides: {},
  }
}

/** Sensible starting profile when the GM creates a market on a map area. */
export function defaultMarketForArea(area: Area): Omit<MarketProfile, 'id'> {
  const bySize: Partial<Record<Area['type'], number>> = { settlement: 3, stronghold: 3, ruins: 1, portal: 2 }
  return {
    areaId: area.id,
    name: `${area.name} Market`,
    prosperity: 3,
    size: bySize[area.type] ?? 2,
    remoteness: 2,
    security: area.type === 'settlement' || area.type === 'stronghold' ? 4 : 2,
    specialties: [],
    shortages: [],
    tariffPct: 0,
    sellRate: 0.5,
    factionId: null,
    localStanding: 0,
    notes: '',
    listings: [],
  }
}

// ── Event presets ───────────────────────────────────────────────────────

export const EVENT_PRESETS: Omit<EconomicEvent, 'id' | 'scope' | 'remainingDays'>[] = [
  { name: 'Famine',          description: 'Crops failed — food is desperately scarce.',            affectedTags: ['grain', 'meat', 'fish'], priceMultiplier: 2.0 },
  { name: 'Bumper Harvest',  description: 'Granaries overflow — food is nearly given away.',       affectedTags: ['grain'], priceMultiplier: 0.5 },
  { name: 'War Nearby',      description: 'Armies are buying up arms, armor, and metal.',          affectedTags: ['weapon', 'armor', 'metal'], priceMultiplier: 1.6 },
  { name: 'Festival',        description: 'Celebration drives demand for food, drink, and finery.', affectedTags: ['luxury', 'grain', 'meat'], priceMultiplier: 1.3 },
  { name: 'Plague',          description: 'Sickness spreads — healing is precious, trade slows.',  affectedTags: ['alchemy', 'magic'], priceMultiplier: 1.8 },
  { name: 'Gold Rush',       description: 'A new vein found — raw metal floods the market.',       affectedTags: ['metal', 'gem'], priceMultiplier: 0.65 },
  { name: 'Trade Embargo',   description: 'Routes closed — anything imported is gold dust.',       affectedTags: ['imported', 'luxury'], priceMultiplier: 1.9 },
  { name: 'Bandit Activity', description: 'Caravans are being robbed — everything shipped costs more.', affectedTags: [], priceMultiplier: 1.25 },
]
