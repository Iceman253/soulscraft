import { describe, it, expect, vi, afterEach } from 'vitest'
import { outcomeOf, parseDie, rollFormula, secureRandInt } from '../rolling'

afterEach(() => vi.restoreAllMocks())

/** Make crypto.getRandomValues hand out these raw values in turn. */
const queueRaw = (...values: number[]) =>
  vi.spyOn(crypto, 'getRandomValues').mockImplementation(<T extends ArrayBufferView | null>(buf: T) => {
    (buf as unknown as Uint32Array)[0] = values.shift() ?? 0
    return buf
  })

describe('secureRandInt', () => {
  it('maps the random value into 1..sides', () => {
    queueRaw(0, 5, 6)
    expect([secureRandInt(6), secureRandInt(6), secureRandInt(6)]).toEqual([1, 6, 1])
  })
})

describe('parseDie', () => {
  it('reads the sides, defaulting to 6', () => {
    expect(parseDie('d12')).toBe(12)
    expect(parseDie('1D4')).toBe(4)
    expect(parseDie('nonsense')).toBe(6)
  })
})

describe('outcomeOf', () => {
  it('splits at 7 and 10', () => {
    expect([6, 7, 9, 10].map(outcomeOf)).toEqual(['failure', 'partial', 'partial', 'success'])
  })
})

describe('rollFormula', () => {
  it('rolls each die and totals them', () => {
    queueRaw(2, 3, 9)  // d10s → 3, 4, 10
    expect(rollFormula('3d10')).toEqual({ dice: [3, 4, 10], total: 17 })
  })
  it('rolls nothing for a formula it cannot read', () => {
    expect(rollFormula('lots')).toEqual({ dice: [], total: 0 })
  })
})
