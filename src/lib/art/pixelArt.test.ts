import { describe, it, expect } from 'vitest'
import {
  ICON_SIZE, PALETTE, emptyIcon, normalizeIcon, isBlankIcon, getPixel, setPixel, floodFill, iconRuns, colorOf, lineCells,
} from './pixelArt'

describe('pixel icons', () => {
  it('are 16×16 and start blank', () => {
    expect(ICON_SIZE).toBe(16)
    expect(emptyIcon()).toHaveLength(256)
    expect(isBlankIcon(emptyIcon())).toBe(true)
  })

  it('has 16 distinct palette keys a–p', () => {
    expect(PALETTE.map(p => p.key).join('')).toBe('abcdefghijklmnop')
    expect(colorOf('a')).toBe(PALETTE[0].color)
    expect(colorOf('.')).toBeNull()
  })

  it('normalizes bad input to a blank icon', () => {
    expect(normalizeIcon(undefined)).toBe(emptyIcon())
    expect(normalizeIcon('abc')).toBe(emptyIcon())
    expect(normalizeIcon('z'.repeat(256))).toBe(emptyIcon())
    const ok = setPixel(emptyIcon(), 1, 1, 'c')
    expect(normalizeIcon(ok)).toBe(ok)
    expect(isBlankIcon(undefined)).toBe(true)
  })

  it('sets and reads pixels row-major', () => {
    const icon = setPixel(emptyIcon(), 3, 2, 'k')
    expect(getPixel(icon, 3, 2)).toBe('k')
    expect(icon[2 * 16 + 3]).toBe('k')
    expect(isBlankIcon(icon)).toBe(false)
  })

  it('ignores out-of-bounds coordinates and invalid colors', () => {
    const icon = emptyIcon()
    expect(setPixel(icon, -1, 0, 'a')).toBe(icon)
    expect(setPixel(icon, 16, 0, 'a')).toBe(icon)
    expect(setPixel(icon, 0, 1.5, 'a')).toBe(icon)
    expect(setPixel(icon, 0, 0, 'z')).toBe(icon)
    expect(getPixel(icon, 99, 99)).toBe('.')
  })

  it('erases by setting transparent', () => {
    const icon = setPixel(emptyIcon(), 0, 0, 'a')
    expect(isBlankIcon(setPixel(icon, 0, 0, '.'))).toBe(true)
  })

  describe('floodFill', () => {
    it('fills a whole blank icon', () => {
      expect(floodFill(emptyIcon(), 5, 5, 'h')).toBe('h'.repeat(256))
    })

    it('stops at a boundary of another color', () => {
      // Vertical wall at x = 4 splits the icon in two.
      let icon = emptyIcon()
      for (let y = 0; y < 16; y++) icon = setPixel(icon, 4, y, 'a')
      const filled = floodFill(icon, 0, 0, 'i')
      expect(getPixel(filled, 3, 15)).toBe('i')
      expect(getPixel(filled, 4, 7)).toBe('a')
      expect(getPixel(filled, 5, 0)).toBe('.')
    })

    it('is 4-connected (does not leak through diagonals)', () => {
      // A diagonal line of black splits the top-left corner from the rest.
      let icon = emptyIcon()
      for (let i = 0; i < 16; i++) icon = setPixel(icon, i, 15 - i, 'a')
      const filled = floodFill(icon, 0, 0, 'm')
      expect(getPixel(filled, 0, 0)).toBe('m')
      expect(getPixel(filled, 15, 15)).toBe('.')
    })

    it('is a no-op when filling with the same color or out of bounds', () => {
      const icon = emptyIcon()
      expect(floodFill(icon, 0, 0, '.')).toBe(icon)
      expect(floodFill(icon, 20, 0, 'a')).toBe(icon)
    })
  })

  describe('iconRuns', () => {
    it('merges same-colored horizontal runs and skips transparent pixels', () => {
      let icon = emptyIcon()
      icon = setPixel(icon, 2, 0, 'k')
      icon = setPixel(icon, 3, 0, 'k')
      icon = setPixel(icon, 4, 0, 'c')
      expect(iconRuns(icon)).toEqual([
        { x: 2, y: 0, w: 2, color: colorOf('k') },
        { x: 4, y: 0, w: 1, color: colorOf('c') },
      ])
    })

    it('renders a solid icon as one rect per row', () => {
      expect(iconRuns('b'.repeat(256))).toHaveLength(16)
    })

    it('returns nothing for blank or invalid icons', () => {
      expect(iconRuns(emptyIcon())).toEqual([])
      expect(iconRuns('garbage')).toEqual([])
    })
  })

  describe('lineCells', () => {
    it('returns a single cell for a zero-length line', () => {
      expect(lineCells(3, 4, 3, 4)).toEqual([[3, 4]])
    })
    it('fills every cell of a horizontal skip', () => {
      expect(lineCells(0, 0, 4, 0)).toEqual([[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]])
    })
    it('works right-to-left and vertically', () => {
      expect(lineCells(2, 5, 0, 5)).toEqual([[2, 5], [1, 5], [0, 5]])
      expect(lineCells(1, 3, 1, 0)).toEqual([[1, 3], [1, 2], [1, 1], [1, 0]])
    })
    it('draws a gap-free diagonal and shallow slope', () => {
      expect(lineCells(0, 0, 3, 3)).toEqual([[0, 0], [1, 1], [2, 2], [3, 3]])
      const shallow = lineCells(0, 0, 6, 2)
      expect(shallow[0]).toEqual([0, 0])
      expect(shallow[shallow.length - 1]).toEqual([6, 2])
      // One cell per column, each step moves at most one row.
      expect(shallow.map(c => c[0])).toEqual([0, 1, 2, 3, 4, 5, 6])
      for (let i = 1; i < shallow.length; i++) expect(Math.abs(shallow[i][1] - shallow[i - 1][1])).toBeLessThanOrEqual(1)
    })
  })
})
