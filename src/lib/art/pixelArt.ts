// Tiny pixel-art icons for player builds. An icon is a 16×16 grid stored as a
// 256-character string (row-major), one character per pixel: '.' = transparent,
// 'a'–'p' = a PALETTE index. Compact enough to sync inside campaign data.

export const ICON_SIZE = 16
export const TRANSPARENT = '.'

/** Minecraft dye-inspired palette. Keys are the stored characters. */
export const PALETTE: { key: string; color: string; name: string }[] = [
  { key: 'a', color: '#1d1d21', name: 'Black' },
  { key: 'b', color: '#f9fffe', name: 'White' },
  { key: 'c', color: '#9d9d97', name: 'Stone' },
  { key: 'd', color: '#474f52', name: 'Cobble' },
  { key: 'e', color: '#835432', name: 'Wood' },
  { key: 'f', color: '#c49a6c', name: 'Planks' },
  { key: 'g', color: '#5e7c16', name: 'Leaves' },
  { key: 'h', color: '#80c71f', name: 'Grass' },
  { key: 'i', color: '#3c44aa', name: 'Water' },
  { key: 'j', color: '#3ab3da', name: 'Diamond' },
  { key: 'k', color: '#b02e26', name: 'Brick' },
  { key: 'l', color: '#f9801d', name: 'Orange' },
  { key: 'm', color: '#fed83d', name: 'Gold' },
  { key: 'n', color: '#8932b8', name: 'Purple' },
  { key: 'o', color: '#169c9c', name: 'Cyan' },
  { key: 'p', color: '#f38baa', name: 'Pink' },
]

const COLOR_BY_KEY: Record<string, string> = Object.fromEntries(PALETTE.map(p => [p.key, p.color]))
const VALID = new Set([TRANSPARENT, ...PALETTE.map(p => p.key)])

export function emptyIcon(): string {
  return TRANSPARENT.repeat(ICON_SIZE * ICON_SIZE)
}

/** Coerce anything into a valid icon string (wrong length/characters → blank). */
export function normalizeIcon(icon: string | undefined | null): string {
  if (typeof icon !== 'string' || icon.length !== ICON_SIZE * ICON_SIZE) return emptyIcon()
  for (const ch of icon) if (!VALID.has(ch)) return emptyIcon()
  return icon
}

export function isBlankIcon(icon: string | undefined | null): boolean {
  return !icon || !/[^.]/.test(normalizeIcon(icon))
}

export function colorOf(key: string): string | null {
  return COLOR_BY_KEY[key] ?? null
}

function inBounds(x: number, y: number) {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < ICON_SIZE && y < ICON_SIZE
}

export function getPixel(icon: string, x: number, y: number): string {
  return inBounds(x, y) ? icon[y * ICON_SIZE + x] : TRANSPARENT
}

/** Set one pixel. Out-of-bounds or invalid colors leave the icon unchanged. */
export function setPixel(icon: string, x: number, y: number, key: string): string {
  if (!inBounds(x, y) || !VALID.has(key)) return icon
  const i = y * ICON_SIZE + x
  if (icon[i] === key) return icon
  return icon.slice(0, i) + key + icon.slice(i + 1)
}

/** Flood-fill the 4-connected region of the clicked pixel's color. */
export function floodFill(icon: string, x: number, y: number, key: string): string {
  if (!inBounds(x, y) || !VALID.has(key)) return icon
  const target = getPixel(icon, x, y)
  if (target === key) return icon
  const px = icon.split('')
  const stack: [number, number][] = [[x, y]]
  while (stack.length) {
    const [cx, cy] = stack.pop()!
    if (!inBounds(cx, cy) || px[cy * ICON_SIZE + cx] !== target) continue
    px[cy * ICON_SIZE + cx] = key
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1])
  }
  return px.join('')
}

/** Horizontal runs of same-colored opaque pixels — one SVG rect each when rendering. */
export function iconRuns(icon: string): { x: number; y: number; w: number; color: string }[] {
  const norm = normalizeIcon(icon)
  const runs: { x: number; y: number; w: number; color: string }[] = []
  for (let y = 0; y < ICON_SIZE; y++) {
    let x = 0
    while (x < ICON_SIZE) {
      const key = norm[y * ICON_SIZE + x]
      let w = 1
      while (x + w < ICON_SIZE && norm[y * ICON_SIZE + x + w] === key) w++
      const color = colorOf(key)
      if (color) runs.push({ x, y, w, color })
      x += w
    }
  }
  return runs
}

/** Grid cells on the straight line between two cells (inclusive, Bresenham), so
 *  a fast stroke whose pointer events skip cells still draws a solid line. */
export function lineCells(x0: number, y0: number, x1: number, y1: number): [number, number][] {
  const cells: [number, number][] = []
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1
  let err = dx + dy
  let x = x0, y = y0
  for (;;) {
    cells.push([x, y])
    if (x === x1 && y === y1) break
    const e2 = 2 * err
    if (e2 >= dy) { err += dy; x += sx }
    if (e2 <= dx) { err += dx; y += sy }
  }
  return cells
}
