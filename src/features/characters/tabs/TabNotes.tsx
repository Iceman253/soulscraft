import { useCharacterStore } from '../store'
import type { Character } from '../../../types'

interface TabNotesProps { character: Character }

export function TabNotes({ character: c }: TabNotesProps) {
  const { updateCharacter } = useCharacterStore()

  return (
    <div className="p-4 flex flex-col h-full">
      <div className="text-xs text-stone-500 mb-2">GM & player notes for this character</div>
      <textarea
        value={c.notes}
        onChange={e => updateCharacter(c.id, { notes: e.target.value })}
        placeholder="Write anything here — backstory, ongoing effects, relationships, goals..."
        className="flex-1 min-h-64 w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-3 text-stone-200 text-sm outline-none focus:border-stone-500 resize-none leading-relaxed"
      />
    </div>
  )
}
