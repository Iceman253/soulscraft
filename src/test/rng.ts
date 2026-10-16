import { vi } from 'vitest'

/** Make Math.random return values that roll exactly `results` on a die of `sides`,
 *  one per call, in order. */
export function queueMathRolls(sides: number, ...results: number[]) {
  const spy = vi.spyOn(Math, 'random')
  for (const r of results) spy.mockReturnValueOnce((r - 0.5) / sides)
  return spy
}

/** Make crypto.getRandomValues fill each Uint32Array so a die of `sides` rolls
 *  exactly `results`, one per call, in order. */
export function queueCryptoRolls(sides: number, ...results: number[]) {
  const queue = [...results]
  return vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation(<T extends ArrayBufferView | null>(buf: T): T => {
    const r = queue.shift()
    if (r === undefined) throw new Error('queueCryptoRolls: no rolls left')
    ;(buf as unknown as Uint32Array)[0] = (r - 1) % sides
    return buf
  })
}
