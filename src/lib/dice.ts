/** Parse a dice spec like "2d6", "1d8", "d6" → { count, sides }, or null if unparseable. */
export function parseDiceSpec(spec: string): { count: number; sides: number } | null {
  const m = spec.match(/(\d*)\s*d\s*(\d+)/i)
  if (!m) return null
  const count = m[1] ? Math.max(1, parseInt(m[1])) : 1
  const sides = parseInt(m[2])
  if (!sides) return null
  return { count, sides }
}

/** Roll a dice spec with Math.random → total. Returns 0 for anything unparseable. */
export function rollDiceSpec(spec: string): number {
  const parsed = parseDiceSpec(spec)
  if (!parsed) return 0
  let sum = 0
  for (let i = 0; i < parsed.count; i++) sum += Math.floor(Math.random() * parsed.sides) + 1
  return sum
}

/** Roll a dice spec with crypto.getRandomValues (combat tracker) → total.
 *  Returns 0 for anything unparseable. */
export function rollCombatDice(spec: string): number {
  const parsed = parseDiceSpec(spec)
  if (!parsed) return 0
  let sum = 0
  const buf = new Uint32Array(1)
  for (let i = 0; i < parsed.count; i++) {
    crypto.getRandomValues(buf)
    sum += (buf[0] % parsed.sides) + 1
  }
  return sum
}
