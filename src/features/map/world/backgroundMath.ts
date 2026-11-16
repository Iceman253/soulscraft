// Placing and resizing the world map's background image (flow-space coordinates).
import type { MapBackground } from '../../../types'

/** Center a new image over the areas, about 1.6× as wide as their spread, keeping its aspect ratio. */
export function placeBackground(positions: { x: number; y: number }[], naturalWidth: number, naturalHeight: number): MapBackground {
  let cx = 0, cy = 0, span = 800
  if (positions.length > 0) {
    const xs = positions.map(p => p.x), ys = positions.map(p => p.y)
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys)
    cx = (minX + maxX) / 2; cy = (minY + maxY) / 2
    span = Math.max(maxX - minX, 300) * 1.6
  }
  const w = span
  const h = w * (naturalHeight / Math.max(1, naturalWidth))
  return { x: cx - w / 2, y: cy - h / 2, w, h }
}

/** Resize around the center, never below 80 units a side. */
export function scaleBackground(bg: MapBackground, factor: number): MapBackground {
  const { x, y, w, h } = bg
  const nw = Math.max(80, w * factor), nh = Math.max(80, h * factor)
  return { x: x - (nw - w) / 2, y: y - (nh - h) / 2, w: nw, h: nh }
}
