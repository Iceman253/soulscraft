// Item images — shared by item name
export const saveItemImage = (name: string, url: string) =>
  localStorage.setItem(`img_item_${name.toLowerCase().trim()}`, url)
export const loadItemImage = (name: string) =>
  localStorage.getItem(`img_item_${name.toLowerCase().trim()}`)

// Armor piece images — shared by material+slot
export const saveArmorImage = (material: string, slot: string, url: string) =>
  localStorage.setItem(`img_armor_${material}_${slot}`, url)
export const loadArmorImage = (material: string, slot: string) =>
  localStorage.getItem(`img_armor_${material}_${slot}`)

// Weapon images — shared by material+type
export const saveWeaponImage = (material: string, type: string, url: string) =>
  localStorage.setItem(`img_weapon_${material}_${type}`, url)
export const loadWeaponImage = (material: string, type: string) =>
  localStorage.getItem(`img_weapon_${material}_${type}`)

// Character portraits — unique per character
export const savePortrait = (charId: string, url: string) =>
  localStorage.setItem(`img_portrait_${charId}`, url)
export const loadPortrait = (charId: string) =>
  localStorage.getItem(`img_portrait_${charId}`)
export const deletePortrait = (charId: string) =>
  localStorage.removeItem(`img_portrait_${charId}`)

// Creature images — unique per bestiary entry id
export const saveCreatureImage = (id: string, url: string) =>
  localStorage.setItem(`img_creature_${id}`, url)
export const loadCreatureImage = (id: string) =>
  localStorage.getItem(`img_creature_${id}`)
export const deleteCreatureImage = (id: string) =>
  localStorage.removeItem(`img_creature_${id}`)

// Map background — per campaign
export const saveMapBg = (campaignId: string, url: string) =>
  localStorage.setItem(`soulscraft_mapbg_${campaignId}`, url)
export const loadMapBg = (campaignId: string) =>
  localStorage.getItem(`soulscraft_mapbg_${campaignId}`)
export const deleteMapBg = (campaignId: string) =>
  localStorage.removeItem(`soulscraft_mapbg_${campaignId}`)

// Compress image to data URL (max width/height for portraits)
export async function fileToDataUrl(file: File, maxSize = 400): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/webp', 0.8))
    }
    img.onerror = reject
    img.src = url
  })
}
