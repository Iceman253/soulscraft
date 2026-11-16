import { describe, it, expect } from 'vitest'
import { placeBackground, scaleBackground } from './backgroundMath'

describe('placeBackground', () => {
  it('centers an 800-wide image at the origin when there are no areas', () => {
    expect(placeBackground([], 400, 200)).toEqual({ x: -400, y: -200, w: 800, h: 400 })
  })
  it('spans 1.6× the areas\' width, centered on them, keeping the aspect ratio', () => {
    const bg = placeBackground([{ x: 0, y: 0 }, { x: 1000, y: 400 }], 2, 1)
    expect(bg).toEqual({ x: -300, y: -200, w: 1600, h: 800 })
  })
  it('uses at least a 300-wide spread', () => {
    expect(placeBackground([{ x: 100, y: 100 }], 1, 1).w).toBe(480)
  })
  it('survives an image with no width', () => {
    expect(Number.isFinite(placeBackground([], 0, 100).h)).toBe(true)
  })
})

describe('scaleBackground', () => {
  it('grows around the center', () => {
    expect(scaleBackground({ x: 0, y: 0, w: 100, h: 200 }, 2)).toEqual({ x: -50, y: -100, w: 200, h: 400 })
  })
  it('stops at 80 a side', () => {
    expect(scaleBackground({ x: 0, y: 0, w: 100, h: 100 }, 0.1)).toEqual({ x: 10, y: 10, w: 80, h: 80 })
  })
})
