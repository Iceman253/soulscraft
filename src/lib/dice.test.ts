import { describe, it, expect, vi } from 'vitest'
import { parseDiceSpec, rollDiceSpec, rollCombatDice } from './dice'
import { queueMathRolls, queueCryptoRolls } from '../test/rng'

describe('parseDiceSpec', () => {
  it('parses NdS', () => {
    expect(parseDiceSpec('1d6')).toEqual({ count: 1, sides: 6 })
    expect(parseDiceSpec('3d6')).toEqual({ count: 3, sides: 6 })
  })
  it('treats a missing count as one die', () => {
    expect(parseDiceSpec('d8')).toEqual({ count: 1, sides: 8 })
  })
  it('is case-insensitive and tolerates spaces', () => {
    expect(parseDiceSpec('2 D 4')).toEqual({ count: 2, sides: 4 })
  })
  it('rejects garbage and zero-sided dice', () => {
    expect(parseDiceSpec('')).toBeNull()
    expect(parseDiceSpec('abc')).toBeNull()
    expect(parseDiceSpec('6')).toBeNull()
    expect(parseDiceSpec('2d0')).toBeNull()
  })
})

describe('rollDiceSpec (Math.random)', () => {
  it('rolls 1d6', () => {
    queueMathRolls(6, 4)
    expect(rollDiceSpec('1d6')).toBe(4)
  })
  it('sums 3d6', () => {
    const spy = queueMathRolls(6, 1, 6, 3)
    expect(rollDiceSpec('3d6')).toBe(10)
    expect(spy).toHaveBeenCalledTimes(3)
  })
  it('rolls d8 as a single eight-sided die', () => {
    const spy = queueMathRolls(8, 8)
    expect(rollDiceSpec('d8')).toBe(8)
    expect(spy).toHaveBeenCalledTimes(1)
  })
  it('covers the full 1..sides range at the random extremes', () => {
    queueMathRolls(6, 1)
    expect(rollDiceSpec('1d6')).toBe(1)
    queueMathRolls(6, 6)
    expect(rollDiceSpec('1d6')).toBe(6)
  })
  it('returns 0 for garbage input without rolling', () => {
    const spy = queueMathRolls(6)
    expect(rollDiceSpec('')).toBe(0)
    expect(rollDiceSpec('poison')).toBe(0)
    expect(rollDiceSpec('2d0')).toBe(0)
    expect(spy).not.toHaveBeenCalled()
  })
})

describe('rollCombatDice (crypto.getRandomValues)', () => {
  it('rolls 1d6', () => {
    queueCryptoRolls(6, 5)
    expect(rollCombatDice('1d6')).toBe(5)
  })
  it('sums 3d6', () => {
    const spy = queueCryptoRolls(6, 2, 2, 6)
    expect(rollCombatDice('3d6')).toBe(10)
    expect(spy).toHaveBeenCalledTimes(3)
  })
  it('rolls d8 as a single eight-sided die', () => {
    const spy = queueCryptoRolls(8, 7)
    expect(rollCombatDice('d8')).toBe(7)
    expect(spy).toHaveBeenCalledTimes(1)
  })
  it('maps large random values into 1..sides', () => {
    // Any uint32 must land in range: 0xFFFFFFFF % 6 = 3 → 4.
    vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation(<T extends ArrayBufferView | null>(buf: T): T => {
      ;(buf as unknown as Uint32Array)[0] = 0xffffffff
      return buf
    })
    expect(rollCombatDice('1d6')).toBe(4)
  })
  it('returns 0 for garbage input without rolling', () => {
    const spy = queueCryptoRolls(6)
    expect(rollCombatDice('')).toBe(0)
    expect(rollCombatDice('regen')).toBe(0)
    expect(rollCombatDice('1d0')).toBe(0)
    expect(spy).not.toHaveBeenCalled()
  })
})
