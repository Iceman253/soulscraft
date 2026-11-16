// Dice roller rules: secure rolls, outcomes and formula parsing.

export type RollMode = '2d6' | 'difficult' | 'hazard'

export interface SubRoll {
  base: number[]        // 2d6
  sdDice: number[]      // each 1d4 from SD spent
  penaltyDice: number[] // each 1d4 from missed rest (subtracted)
  bonus: number         // skill bonus
  total: number
  outcome: 'success' | 'partial' | 'failure'
}

export interface RollResult {
  mode: RollMode
  label: string
  sub: SubRoll[]                 // standard = 1 entry, difficult = 3 entries
  multiSuccess?: boolean         // difficult mode pass/fail
  successCount?: number
  sdConsumed: number
  hazardLabel?: string
}

/** Cryptographically secure random integer in [1, sides] using Web Crypto. */
export function secureRandInt(sides: number): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return (buf[0] % sides) + 1
}
export const rollD6 = () => secureRandInt(6)
export const rollD4 = () => secureRandInt(4)

export function parseDie(die: string): number {
  const match = die.match(/d(\d+)/i)
  return match ? parseInt(match[1]) : 6
}

export function outcomeOf(total: number): 'success' | 'partial' | 'failure' {
  return total >= 10 ? 'success' : total >= 7 ? 'partial' : 'failure'
}


export function rollFormula(formula: string): { dice: number[]; total: number } {
  const m = formula.match(/(\d+)d(\d+)/i)
  if (!m) return { dice: [], total: 0 }
  const n = parseInt(m[1]), sides = parseInt(m[2])
  const dice = Array.from({ length: n }, () => secureRandInt(sides))
  return { dice, total: dice.reduce((a, b) => a + b, 0) }
}
