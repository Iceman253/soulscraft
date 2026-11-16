import { Users } from 'lucide-react'
import { useWorldStore } from '../store'
import { useCharacterStore } from '../../characters/store'
import { TokenAvatar } from '../../../ui/TokenAvatar'
import { CHAR_DND } from '../AreaNode'

/** The party: drag a token onto a location or the map; drop it back here to take it off. */
export function PartyTray() {
  const areas = useWorldStore(s => s.areas)
  const { characters, setLocation, setSubLocation, setInTower, setMapPos } = useCharacterStore()
  const living = characters.filter(c => !c.isDead)
  if (living.length === 0) return null
  return (
      <div
        className="absolute top-16 left-3 z-10 w-56 bg-stone-900/95 border border-stone-700 rounded-lg shadow-2xl p-2"
        onDragOver={e => { if (e.dataTransfer.types.includes(CHAR_DND)) { e.preventDefault(); e.dataTransfer.dropEffect = 'move' } }}
        onDrop={e => {
          const charId = e.dataTransfer.getData(CHAR_DND)
          if (charId) { e.preventDefault(); e.stopPropagation(); setLocation(charId, null); setSubLocation(charId, null); setInTower(charId, false); setMapPos(charId, null) }
        }}
      >
        <div className="text-xs text-stone-500 mb-1.5 px-1 flex items-center gap-1">
          <Users size={11} /> Party — drag onto a location or the map
        </div>
        <div className="flex flex-col gap-1 max-h-56 overflow-y-auto">
          {living.map(c => {
            const loc = c.locationId ? areas.find(a => a.id === c.locationId) : null
            return (
              <div
                key={c.id}
                draggable
                onDragStart={e => { e.dataTransfer.setData(CHAR_DND, c.id); e.dataTransfer.effectAllowed = 'move' }}
                className="flex items-center gap-2 px-1.5 py-1 rounded-sm hover:bg-stone-800 cursor-grab active:cursor-grabbing"
                title="Drag onto a location on the map"
              >
                <TokenAvatar name={c.name} characterId={c.id} size={22} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-stone-200 truncate">{c.name}{c.inTower ? ' 🗼' : ''}</div>
                  <div className="text-xs text-stone-500 truncate">{loc ? `📍 ${loc.name}` : c.mapPos ? '🗺️ On map' : 'Unplaced'}</div>
                </div>
                {(loc || c.mapPos) && (
                  <button
                    onClick={() => { setLocation(c.id, null); setSubLocation(c.id, null); setInTower(c.id, false); setMapPos(c.id, null) }}
                    title="Remove from map"
                    className="text-stone-600 hover:text-red-400 shrink-0 px-1"
                  >
                    ×
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
  )
}
