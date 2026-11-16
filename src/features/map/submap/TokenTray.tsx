// Characters in this area. Drag one onto a sub-location to nest it;
// drop it back on the tray to move it to the area root.
import { useCharacterStore } from '../../characters/store'
import { TokenAvatar } from '../../../ui/TokenAvatar'
import { CHAR_DND } from '../AreaNode'
import { findSubNodePath } from './navigation'
import type { Area } from '../../../types'

export function TokenTray({ area }: { area: Area }) {
  const characters = useCharacterStore(s => s.characters)
  const setSubLocation = useCharacterStore(s => s.setSubLocation)
  const here = characters.filter(c => c.locationId === area.id && !c.isDead)
  if (here.length === 0) return null
  return (
      <div
        className="absolute top-3 left-3 z-10 w-52 bg-stone-900/95 border border-stone-700 rounded-lg shadow-2xl p-2"
        onDragOver={e => { if (e.dataTransfer.types.includes(CHAR_DND)) { e.preventDefault(); e.dataTransfer.dropEffect = 'move' } }}
        onDrop={e => {
          const charId = e.dataTransfer.getData(CHAR_DND)
          if (charId) { e.preventDefault(); setSubLocation(charId, null) }
        }}
      >
        <div className="text-xs text-stone-500 mb-1.5 px-1">Here — drag onto a sub-location</div>
        <div className="flex flex-col gap-1 max-h-52 overflow-y-auto">
          {here.map(c => {
            const at = c.subLocationId ? (findSubNodePath(area.subNodes, c.subLocationId)?.slice(-1)[0]?.nodeName ?? 'sub-location') : null
            return (
              <div
                key={c.id}
                draggable
                onDragStart={e => { e.dataTransfer.setData(CHAR_DND, c.id); e.dataTransfer.effectAllowed = 'move' }}
                className="flex items-center gap-2 px-1.5 py-1 rounded-sm hover:bg-stone-800 cursor-grab active:cursor-grabbing"
                title="Drag onto a sub-location"
              >
                <TokenAvatar name={c.name} characterId={c.id} size={20} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-stone-200 truncate">{c.name}</div>
                  <div className="text-xs text-stone-500 truncate">{at ? `📍 ${at}` : 'Area root'}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
  )
}
