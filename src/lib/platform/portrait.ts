// Setting a character portrait from a picked file — shared by the desktop
// character sheet and the mobile player view.
import { savePortrait, fileToDataUrl } from './imageCache'

/** Portraits are downscaled to fit within this many pixels before saving. */
export const PORTRAIT_MAX_SIZE = 400

/**
 * Convert a picked file to a compressed data URL and save it as the
 * character's portrait (local cache + server sync via imageCache).
 * Returns true if a portrait was saved, false if the file was missing,
 * not an image, or could not be decoded.
 */
export async function setPortraitFromFile(characterId: string, file: File | null | undefined): Promise<boolean> {
  if (!file) return false
  if (!file.type.startsWith('image/')) return false
  try {
    const url = await fileToDataUrl(file, PORTRAIT_MAX_SIZE)
    savePortrait(characterId, url)
    return true
  } catch {
    // Corrupt or undecodable image — leave the existing portrait untouched.
    return false
  }
}
