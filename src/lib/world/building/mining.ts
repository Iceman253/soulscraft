// Mining: the time table, the action roll and how it reads (Guidebook pp. 4, 7).
import type { Character, Trait } from '../../../types'
import { rollDiceSpec } from '../../rules/dice'
import { type CarriedTool, signed, miningToolLabel } from './tools'

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

/** The roll spelled out for the GM, e.g. "9 (2d6) +1 Iron pickaxe +1 Miner +2 Delving". */
export function miningBreakdown(parts: {
  dice: number
  tool: CarriedTool | null
  materials?: string[]
  traits: string[]
  skill?: { name: string; bonus: number }
  other?: number
  sdBoost?: number
  penalty?: number
}): string {
  const bits = [`${parts.dice} (2d6)`, miningToolLabel(parts.tool, parts.materials ?? [])]
  for (const t of parts.traits) bits.push(`+1 ${t}`)
  if (parts.skill) bits.push(`+${parts.skill.bonus} ${parts.skill.name}`)
  if (parts.other) bits.push(`${signed(parts.other)} other`)
  if (parts.sdBoost) bits.push(`+${parts.sdBoost} SD`)
  if (parts.penalty) bits.push(`−${parts.penalty} missed rest`)
  return bits.join(' ')
}

/** Display name for a stack of mined materials, e.g. ["Stone", "Iron"] → "Stone & Iron blocks". */
export function minedStackName(materials: string[]): string {
  const m = materials.map(s => s.trim()).filter(Boolean)
  return m.length ? `${m.join(' & ')} blocks` : 'Blocks'
}

/** Common materials a GM can tag an area with (anything else can be typed in). */
export const COMMON_MATERIALS = [
  'Wood', 'Stone', 'Dirt', 'Sand', 'Clay', 'Gravel', 'Coal', 'Copper', 'Iron', 'Gold',
  'Redstone', 'Lapis', 'Diamond', 'Emerald', 'Obsidian', 'Netherrack', 'Quartz',
  'Ancient Debris', 'End Stone', 'Ice',
]
