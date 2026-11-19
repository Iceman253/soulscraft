import { describe, it, expect } from 'vitest'
import { isSafeImageEntry, isSafeImageData, cssImageUrl } from './imageSafety'

const IMG = 'data:image/webp;base64,UklGRsx+/A=='

describe('image safety', () => {
  it('accepts image keys with raster data', () => {
    expect(isSafeImageEntry("img_item_bob's sword", IMG)).toBe(true)
    expect(isSafeImageEntry('soulscraft_mapbg_abc', IMG)).toBe(true)
  })

  it('refuses keys that would overwrite app settings', () => {
    for (const key of ['soulscraft_codes', 'soulscraft_client_id', 'soulscraft_active', 'img_']) {
      expect(isSafeImageEntry(key, IMG)).toBe(false)
    }
  })

  it('refuses remote, SVG and CSS-breaking values', () => {
    for (const data of [
      'https://evil.example/a.png',
      'data:image/svg+xml;base64,PHN2Zz4=',
      'data:image/png;base64,AA) , url(https://evil.example/x',
      42,
    ]) expect(isSafeImageData(data)).toBe(false)
  })

  it('builds a quoted CSS url only for safe images', () => {
    expect(cssImageUrl(IMG)).toBe(`url("${IMG}")`)
    expect(cssImageUrl('https://evil.example/a.png')).toBeUndefined()
    expect(cssImageUrl(null)).toBeUndefined()
  })
})
