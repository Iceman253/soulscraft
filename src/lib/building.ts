import type { Character, CharacterItem, InventorySection, ProjectTier, Structure, Trait } from '../types'
import { rollDiceSpec } from './dice'
import { normalizeIcon } from './pixelArt'

// Mining, Building and block-carrying rules — Guidebook pp. 7, 81–83 (3.1e).

/** "You may carry 10 blocks of any material at a time" (on hand; storage is unlimited). */
export const BLOCK_CARRY_LIMIT = 10

/** Total blocks in a list of items (only items flagged as blocks, summing quantities). */
export function countBlocks(items: CharacterItem[]): number {
  return items.filter(i => i.isBlock).reduce((sum, i) => sum + (i.quantity ?? 1), 0)
}

// ── Mining ──────────────────────────────────────────────────────────────

/** Rulebook mining periods: 25 → ½ day, 50 → 1, 100 → 2, 200 → 4, 400 → 8. */
export const MINING_AMOUNTS: { blocks: number; days: number }[] = [
  { blocks: 25, days: 0.5 },
  { blocks: 50, days: 1 },
  { blocks: 100, days: 2 },
  { blocks: 200, days: 4 },
  { blocks: 400, days: 8 },
]

/** In-game days to mine `blocks`. The rulebook table is linear (50 blocks/day);
 *  amounts off the table round up to the next half day. */
export function miningDays(blocks: number): number {
  if (!(blocks > 0)) return 0
  return Math.ceil(blocks / 25) / 2
}

export type ToolTier = 'none' | 'wooden' | 'stone' | 'copper' | 'iron' | 'gold' | 'diamond' | 'netherite'

/** Mining tool bonuses (p.82). The Guidebook gives no value for having no tool, so
 *  'none' is a house rule set one below its worst tool; the GM still decides
 *  whether the material can be mined at all. */
export const TOOL_BONUS: Record<ToolTier, number> = {
  none: -3,
  wooden: -2,
  stone: -1,
  copper: 0,
  iron: 1,
  gold: 2,
  diamond: 3,
  netherite: 4,
}

export const TOOL_TIERS: ToolTier[] = ['none', 'wooden', 'stone', 'copper', 'iron', 'gold', 'diamond', 'netherite']

const TOOL_NAME = /\b(pickaxe|pick|axe|shovel|spade|hoe)\b/i
const TIER_WORDS: [ToolTier, RegExp][] = [
  ['netherite', /\bnetherite\b/i],
  ['diamond', /\bdiamond\b/i],
  ['gold', /\bgold(en)?\b/i],
  ['iron', /\biron\b/i],
  ['copper', /\bcopper\b/i],
  ['stone', /\bstone\b/i],
  ['wooden', /\bwood(en)?\b/i],
]

/** Best mining tool a character is carrying (on hand), e.g. "Iron Pickaxe" → iron. */
export function detectMiningTool(items: CharacterItem[]): { tier: ToolTier; itemName: string | null } {
  let best: { tier: ToolTier; itemName: string | null } = { tier: 'none', itemName: null }
  for (const item of items) {
    const name = `${item.customName ?? ''} ${item.name}`
    if (!TOOL_NAME.test(name)) continue
    const tier = TIER_WORDS.find(([, re]) => re.test(name))?.[0]
    if (!tier) continue
    if (best.tier === 'none' || TOOL_BONUS[tier] > TOOL_BONUS[best.tier]) best = { tier, itemName: item.name }
  }
  return best
}

export type ActionOutcome = 'success' | 'partial' | 'failure'

/** Action roll bands (p.4): 10+ full success, 7–9 partial, 6- failure. */
export function actionOutcome(total: number): ActionOutcome {
  if (total >= 10) return 'success'
  if (total >= 7) return 'partial'
  return 'failure'
}

/** Traits that sound like mining, such as a Deep Dwymir's "Miner" (+1 each). */
export function miningTraits(traits: Trait[]): Trait[] {
  return traits.filter(t => /\b(min(e|er|ers|ing)|excavat\w*|dig(s|ger|gers|ging)?)\b/i.test(t.name))
}

/** Blocks the GM is offered by default: what was asked for, or nothing on a failure. */
export function suggestedMiningBlocks(total: number, requested: number): number {
  return actionOutcome(total) === 'failure' ? 0 : requested
}

/** A mining action roll (p.4): 2d6 + bonuses, plus 1d4 if a Souls Die was spent,
 *  minus the missed-rest penalty (1d4 each, p.90). A natural 12 is double 6s, worth
 *  1 XP on any action roll (p.8). */
export function rollMiningCheck(
  bonus: number,
  missedRests: number,
  { boost = false, roll = rollDiceSpec }: { boost?: boolean; roll?: (spec: string) => number } = {},
) {
  const dice = roll('2d6')
  const sdBoost = boost ? roll('1d4') : 0
  const penalty = missedRests > 0 ? roll(`${missedRests}d4`) : 0
  return { dice, sdBoost, penalty, total: dice + bonus + sdBoost - penalty, doubleSix: dice === 12 }
}

/** Can this character spend a Souls Die on a roll? Fatigue forbids it (p.79). */
export function canBoostWithSd(c: Pick<Character, 'currentSd' | 'activeEffects'>): boolean {
  return c.currentSd > 0 && !c.activeEffects.some(e => /fatigue/i.test(e.name))
}

/** Effects that change an action roll or what a character can do, for the GM to rule
 *  on: Cursed rerolls successes for the worse result, Luck allows a reroll, and
 *  Fatigue forbids impactful physical effort (pp.79-80). */
export function miningEffectNotes(c: Pick<Character, 'activeEffects'>): string[] {
  return c.activeEffects.filter(e => /^(cursed|luck|fatigue)$/i.test(e.name.trim())).map(e => e.name)
}

/** The roll spelled out for the GM, e.g. "9 (2d6) +1 Iron tool +1 Miner +2 Delving". */
export function miningBreakdown(parts: {
  dice: number
  tool: ToolTier
  traits: string[]
  skill?: { name: string; bonus: number }
  other?: number
  sdBoost?: number
  penalty?: number
}): string {
  const signed = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(n)}`
  const bits = [`${parts.dice} (2d6)`]
  if (parts.tool === 'none') bits.push(`${signed(TOOL_BONUS.none)} no tool`)
  else bits.push(`${signed(TOOL_BONUS[parts.tool])} ${parts.tool[0].toUpperCase()}${parts.tool.slice(1)} tool`)
  for (const t of parts.traits) bits.push(`+1 ${t}`)
  if (parts.skill) bits.push(`+${parts.skill.bonus} ${parts.skill.name}`)
  if (parts.other) bits.push(`${signed(parts.other)} other`)
  if (parts.sdBoost) bits.push(`+${parts.sdBoost} SD`)
  if (parts.penalty) bits.push(`−${parts.penalty} missed rest`)
  return bits.join(' ')
}

/** Would adding `adding` blocks put a character over the 10-block carry limit? (p.7) */
export function overCarryLimit(items: CharacterItem[], adding: number): boolean {
  return countBlocks(items) + adding > BLOCK_CARRY_LIMIT
}

/** Blocks in one unit of a market good: 10 for "stack of 10 blocks", 1 for "block",
 *  0 if it isn't sold as blocks. */
export function blocksPerUnit(unit: string | undefined): number {
  if (!unit) return 0
  const stack = unit.match(/stack of (\d+) blocks?/i)
  if (stack) return parseInt(stack[1])
  return /\bblocks?\b/i.test(unit) ? 1 : 0
}

/** Does a free-text item name mean building blocks, like "Stone Blocks"? */
export function looksLikeBlocks(name: string): boolean {
  return /\bblocks?\b/i.test(name)
}

// ── Building ────────────────────────────────────────────────────────────

export interface ProjectTierInfo {
  label: string
  examples: string
  blocks: number
  days: number
  redstone: number
}

/** Project requirements (p.83). */
export const PROJECT_TIERS: Record<ProjectTier, ProjectTierInfo> = {
  redstone: { label: 'Redstone Project', examples: 'technical contraption, machine', blocks: 25, days: 1, redstone: 10 },
  tiny:     { label: 'Tiny Project',     examples: 'shed, lean-to, temporary shelter', blocks: 25, days: 1, redstone: 0 },
  small:    { label: 'Small Project',    examples: 'hut, small cabin', blocks: 50, days: 2, redstone: 0 },
  medium:   { label: 'Medium Project',   examples: 'house, small tower', blocks: 100, days: 4, redstone: 0 },
  large:    { label: 'Large Project',    examples: 'manor, fortified base, tall tower', blocks: 200, days: 8, redstone: 0 },
  mega:     { label: 'Mega Project',     examples: 'castle, mansion, fortress', blocks: 400, days: 16, redstone: 0 },
}

/** Fallback map icon for a build with no drawing yet. */
export const TIER_EMOJI: Record<ProjectTier, string> = {
  redstone: '⚙️', tiny: '⛺', small: '🛖', medium: '🏠', large: '🏯', mega: '🏰',
}

export const PROJECT_TIER_ORDER: ProjectTier[] = ['redstone', 'tiny', 'small', 'medium', 'large', 'mega']

/** Rulebook requirements for a tier. The Tecton Architect Edge (p.62) halves the
 *  blocks and time, rounded down (redstone dust is unaffected). */
export function projectRequirements(tier: ProjectTier, architect = false): { blocks: number; days: number; redstone: number } {
  const t = PROJECT_TIERS[tier]
  if (!architect) return { blocks: t.blocks, days: t.days, redstone: t.redstone }
  return { blocks: Math.floor(t.blocks / 2), days: Math.floor(t.days / 2), redstone: t.redstone }
}

/** Tecton with the Architect Discipline. */
export function isArchitect(c: Pick<Character, 'class' | 'discipline'>): boolean {
  return c.class === 'Tecton' && c.discipline === 'Architect'
}

/** Progress of a structure toward its requirements. */
export function structureProgress(s: Pick<Structure, 'blocksRequired' | 'blocksCommitted' | 'daysRequired' | 'daysWorked' | 'redstoneRequired' | 'redstoneCommitted' | 'completedAt'>) {
  const blocksMet = s.blocksCommitted >= s.blocksRequired
  const daysMet = s.daysWorked >= s.daysRequired
  const redstoneMet = s.redstoneCommitted >= s.redstoneRequired
  const parts = [
    s.blocksRequired > 0 ? Math.min(1, s.blocksCommitted / s.blocksRequired) : 1,
    s.daysRequired > 0 ? Math.min(1, s.daysWorked / s.daysRequired) : 1,
    ...(s.redstoneRequired > 0 ? [Math.min(1, s.redstoneCommitted / s.redstoneRequired)] : []),
  ]
  const fraction = s.completedAt ? 1 : parts.reduce((a, b) => a + b, 0) / parts.length
  const started = s.blocksCommitted > 0 || s.daysWorked > 0 || s.redstoneCommitted > 0
  return {
    blocksMet, daysMet, redstoneMet,
    ready: blocksMet && daysMet && redstoneMet,
    fraction,
    status: s.completedAt ? 'complete' as const : started ? 'building' as const : 'planned' as const,
  }
}

// ── Inventory helpers ───────────────────────────────────────────────────

/** Take up to `amount` blocks from a character, storage first, then on hand.
 *  Stacks that run out are removed. Returns the new sections and how many were taken. */
export function takeBlocks(c: Pick<Character, 'storage' | 'onHand'>, amount: number) {
  return takeItems(c, amount, i => !!i.isBlock)
}

const isRedstoneDust = (i: CharacterItem) => !i.isBlock && /redstone/i.test(i.name)

/** Redstone dust a character holds across storage and on hand. */
export function countRedstone(c: Pick<Character, 'storage' | 'onHand'>): number {
  return [...c.storage.items, ...c.onHand.items].filter(isRedstoneDust).reduce((sum, i) => sum + (i.quantity ?? 1), 0)
}

export function takeRedstone(c: Pick<Character, 'storage' | 'onHand'>, amount: number) {
  return takeItems(c, amount, isRedstoneDust)
}

function takeItems(
  c: Pick<Character, 'storage' | 'onHand'>,
  amount: number,
  matches: (item: CharacterItem) => boolean,
): { storage: InventorySection; onHand: InventorySection; taken: number } {
  let left = Math.max(0, Math.floor(amount))
  const drain = (section: InventorySection): InventorySection => {
    const items: CharacterItem[] = []
    for (const item of section.items) {
      if (left > 0 && matches(item)) {
        const qty = item.quantity ?? 1
        const take = Math.min(qty, left)
        left -= take
        if (qty - take > 0) items.push({ ...item, quantity: qty - take })
      } else {
        items.push(item)
      }
    }
    return { items }
  }
  const storage = drain(c.storage)
  const onHand = drain(c.onHand)
  return { storage, onHand, taken: Math.max(0, Math.floor(amount)) - left }
}

/** Add `quantity` blocks named `name` to a section, stacking onto an existing
 *  block item of the same name (case-insensitive). */
export function addBlocks(section: InventorySection, name: string, quantity: number, newId: () => string): InventorySection {
  if (quantity <= 0) return section
  const key = name.trim().toLowerCase()
  const existing = section.items.find(i => i.isBlock && i.name.trim().toLowerCase() === key)
  if (existing) {
    return { items: section.items.map(i => i === existing ? { ...i, quantity: (i.quantity ?? 1) + quantity } : i) }
  }
  return { items: [...section.items, { id: newId(), name: name.trim(), quantity, isBlock: true }] }
}

/** Display name for a stack of mined materials, e.g. ["Stone", "Iron"] → "Stone & Iron blocks". */
export function minedStackName(materials: string[]): string {
  const m = materials.map(s => s.trim()).filter(Boolean)
  return m.length ? `${m.join(' & ')} blocks` : 'Blocks'
}

/** Everything a player sends to propose a build. */
export interface BuildProposal {
  name: string
  description: string
  tier: ProjectTier
  icon: string
  areaId: string | null
  subNodeId?: string | null
  position: { x: number; y: number }
  builderIds: string[]
}

/** Read a build-start request back safely: it has crossed the network, so a bad
 *  value falls back to something usable and the proposer is always a builder. */
export function parseBuildProposal(p: Record<string, unknown>, proposerId: string): BuildProposal {
  const pos = (p.position ?? {}) as { x?: unknown; y?: unknown }
  const builders = Array.isArray(p.builderIds) ? p.builderIds.filter((id): id is string => typeof id === 'string') : []
  const tier = String(p.tier)
  return {
    name: typeof p.name === 'string' ? p.name : '',
    description: typeof p.description === 'string' ? p.description : '',
    tier: PROJECT_TIER_ORDER.includes(tier as ProjectTier) ? tier as ProjectTier : 'small',
    icon: normalizeIcon(typeof p.icon === 'string' ? p.icon : undefined),
    areaId: typeof p.areaId === 'string' ? p.areaId : null,
    ...(typeof p.subNodeId === 'string' || p.subNodeId === null ? { subNodeId: p.subNodeId as string | null } : {}),
    position: { x: Number(pos.x) || 0, y: Number(pos.y) || 0 },
    builderIds: [...new Set([proposerId, ...builders])],
  }
}

/** Common materials a GM can tag an area with (anything else can be typed in). */
export const COMMON_MATERIALS = [
  'Wood', 'Stone', 'Dirt', 'Sand', 'Clay', 'Gravel', 'Coal', 'Copper', 'Iron', 'Gold',
  'Redstone', 'Lapis', 'Diamond', 'Emerald', 'Obsidian', 'Netherrack', 'Quartz',
  'Ancient Debris', 'End Stone', 'Ice',
]
