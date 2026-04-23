/** Shared dice utilities for combat */

export function rollDie(sides: number): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return (buf[0] % sides) + 1
}

export function rollD6(): number { return rollDie(6) }

export function parseSides(die: string): number {
  const m = die.match(/d(\d+)/i)
  return m ? parseInt(m[1]) : 6
}

export function maxOfDie(die: string): number { return parseSides(die) }
