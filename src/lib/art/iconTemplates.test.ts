import { describe, it, expect } from 'vitest'
import { ICON_TEMPLATES } from './iconTemplates'
import { ICON_SIZE, isBlankIcon, normalizeIcon } from './pixelArt'

describe('starter icons', () => {
  it.each(ICON_TEMPLATES.map(t => [t.name, t.icon]))('%s is a valid, non-blank 16×16 icon', (_name, icon) => {
    expect(icon).toHaveLength(ICON_SIZE * ICON_SIZE)
    expect(normalizeIcon(icon)).toBe(icon)
    expect(isBlankIcon(icon)).toBe(false)
  })

  it('have unique names', () => {
    expect(new Set(ICON_TEMPLATES.map(t => t.name)).size).toBe(ICON_TEMPLATES.length)
  })
})
