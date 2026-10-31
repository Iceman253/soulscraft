import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import postcss from 'postcss'
import tailwind from '@tailwindcss/postcss'
import { beforeAll, describe, expect, it } from 'vitest'

// The move to Tailwind 4 kept the app's look by pinning behaviour that Tailwind
// changed. A later upgrade or a tidy of index.css could drop any of these
// without a type error, so compile the real stylesheet and check the output.
const cssPath = fileURLToPath(new URL('./index.css', import.meta.url))

let css = ''

beforeAll(async () => {
  const result = await postcss([tailwind()]).process(readFileSync(cssPath, 'utf8'), { from: cssPath })
  css = result.css
})

/** The text of the first rule for a selector, or '' if it isn't there. */
function rule(selector: string): string {
  const start = css.indexOf(`${selector} {`)
  return start < 0 ? '' : css.slice(start, css.indexOf('}', start))
}

describe('index.css under Tailwind 4', () => {
  it('builds the classes the app uses', () => {
    expect(rule('.bg-gold')).toContain('--color-gold')
    expect(rule('.text-redstone')).toContain('--color-redstone')
    expect(rule('.font-display')).toContain('--font-display')
  })

  it('keeps emerald a single colour with no shades', () => {
    expect(css).toContain('--color-emerald: #1a9e56')
    expect(rule('.text-emerald-400')).toBe('')
    expect(css).not.toMatch(/--color-emerald-\d/)
  })

  it('never uses a numbered emerald class, which would show no colour', () => {
    const src = fileURLToPath(new URL('.', import.meta.url))
    const files = readdirSync(src, { recursive: true, encoding: 'utf8' }).filter(f => f.endsWith('.tsx'))
    expect(files.length).toBeGreaterThan(50)
    const offenders = files.filter(f => /-emerald-\d/.test(readFileSync(`${src}/${f}`, 'utf8')))
    expect(offenders).toEqual([])
  })

  it('keeps the stock shades as hex rather than OKLCH', () => {
    expect(css).toContain('--color-red-500: #ef4444')
    expect(css).toContain('--color-amber-400: #fbbf24')
    expect(css).not.toMatch(/--color-(red|amber|blue|orange|purple|yellow|teal|stone)-\d+: oklch/)
  })

  it('keeps text sizes on fixed line heights', () => {
    expect(rule('.text-xs')).toContain('--text-xs--line-height')
    expect(css).toContain('--text-xs--line-height: 1rem')
    expect(css).toContain('--text-sm--line-height: 1.25rem')
    expect(css).not.toContain('--text-sm--line-height: calc')
  })

  it('spaces stacks with a top margin after the first child', () => {
    expect(css).toMatch(/\.space-y-4 > :not\(\[hidden\]\) ~ :not\(\[hidden\]\)\s*{[^}]*margin-top/)
    // Clears Tailwind's own bottom margin, with no specificity so child classes still win.
    expect(css).toMatch(/:where\(\[class\*='space-y-'\] > \*\)\s*{\s*margin-block: 0/)
    const reset = css.lastIndexOf("[class*='space-y-']")
    expect(reset).toBeGreaterThan(css.indexOf(':where(.space-y-4 > :not(:last-child))'))
  })

  it('lets hover: fire on touch screens', () => {
    expect(css).not.toContain('@media (hover: hover)')
    expect(css).toContain('.hover\\:bg-stone-700:hover {')
  })

  it('keeps the changed base defaults', () => {
    expect(css).toMatch(/border-color: #4a4332/)
    expect(css).toMatch(/textarea::placeholder\s*{\s*color: #9ca3af/)
    expect(css).toMatch(/button:not\(:disabled\), \[role='button'\]:not\(:disabled\)\s*{\s*cursor: pointer/)
    expect(css).toContain('--default-ring-color: rgb(59 130 246 / 0.5)')
  })

  it('lets the focus ring beat outline-hidden', () => {
    const lastUtility = css.indexOf('.outline-hidden')
    const focus = css.indexOf(':focus-visible {', lastUtility)
    expect(lastUtility).toBeGreaterThan(-1)
    expect(focus).toBeGreaterThan(lastUtility)
    expect(css.slice(0, focus).lastIndexOf('@layer utilities')).toBeGreaterThan(css.lastIndexOf('@layer base', focus))
  })
})
