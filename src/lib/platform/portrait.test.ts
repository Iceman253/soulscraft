import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setPortraitFromFile, PORTRAIT_MAX_SIZE } from './portrait'
import { savePortrait, fileToDataUrl } from './imageCache'

vi.mock('./imageCache', () => ({
  savePortrait: vi.fn(),
  fileToDataUrl: vi.fn(),
}))

function makeFile(type: string): File {
  return new File(['x'], 'pic', { type })
}

describe('setPortraitFromFile', () => {
  beforeEach(() => {
    vi.mocked(savePortrait).mockClear()
    vi.mocked(fileToDataUrl).mockReset()
  })

  it('saves nothing when no file was picked', async () => {
    expect(await setPortraitFromFile('char-1', null)).toBe(false)
    expect(await setPortraitFromFile('char-1', undefined)).toBe(false)
    expect(savePortrait).not.toHaveBeenCalled()
  })

  it('rejects non-image files (e.g. a PDF picked on a phone)', async () => {
    expect(await setPortraitFromFile('char-1', makeFile('application/pdf'))).toBe(false)
    expect(fileToDataUrl).not.toHaveBeenCalled()
    expect(savePortrait).not.toHaveBeenCalled()
  })

  it('converts, downscales and saves an image for the right character', async () => {
    vi.mocked(fileToDataUrl).mockResolvedValue('data:image/webp;base64,abc')
    const file = makeFile('image/jpeg')
    expect(await setPortraitFromFile('char-1', file)).toBe(true)
    expect(fileToDataUrl).toHaveBeenCalledWith(file, PORTRAIT_MAX_SIZE)
    expect(savePortrait).toHaveBeenCalledWith('char-1', 'data:image/webp;base64,abc')
  })

  it('accepts any image/* subtype (phone cameras produce heic/webp)', async () => {
    vi.mocked(fileToDataUrl).mockResolvedValue('data:image/webp;base64,abc')
    expect(await setPortraitFromFile('char-1', makeFile('image/heic'))).toBe(true)
    expect(await setPortraitFromFile('char-1', makeFile('image/webp'))).toBe(true)
  })

  it('keeps the old portrait when the image cannot be decoded', async () => {
    vi.mocked(fileToDataUrl).mockRejectedValue(new Error('decode failed'))
    expect(await setPortraitFromFile('char-1', makeFile('image/png'))).toBe(false)
    expect(savePortrait).not.toHaveBeenCalled()
  })
})
