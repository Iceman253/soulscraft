import { Camera } from 'lucide-react'
import { TokenAvatar } from '../../ui/TokenAvatar'
import { setPortraitFromFile } from '../../lib/platform/portrait'
import { useCharacterStore } from './store'

interface Props {
  characterId: string
  name: string
  size?: number
}

/**
 * Tappable avatar that opens the photo picker to set the character's portrait.
 * The camera badge is always visible (phones have no hover), and the portrait
 * syncs to every device through the image cache.
 */
export function PortraitPicker({ characterId, name, size = 48 }: Props) {
  const updateCharacter = useCharacterStore(s => s.updateCharacter)

  const handlePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''   // allow re-picking the same file later
    const saved = await setPortraitFromFile(characterId, file)
    if (saved) updateCharacter(characterId, {})   // nudge a re-render so the new portrait shows
  }

  return (
    <label className="relative inline-block cursor-pointer shrink-0" title="Change portrait">
      <TokenAvatar name={name} characterId={characterId} size={size} />
      <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-stone-700 border border-stone-500 flex items-center justify-center shadow-sm">
        <Camera size={11} className="text-stone-300" />
      </span>
      <input type="file" accept="image/*" className="hidden" onChange={handlePick} />
    </label>
  )
}
