import { useState } from 'react'
import { Modal } from './Modal'
import { TokenAvatar } from './TokenAvatar'
import { useCharacterStore } from '../features/characters/store'
import { useWorldStore } from '../features/map/store'

interface PlaceCharactersModalProps {
  /** The area this location belongs to */
  areaId: string
  /** null = area level, string = subNode id */
  subNodeId: string | null
  onClose: () => void
}

export function PlaceCharactersModal({ areaId, subNodeId, onClose }: PlaceCharactersModalProps) {
  const { characters, setLocation, setSubLocation } = useCharacterStore()
  const areas = useWorldStore(s => s.areas)
  const area = areas.find(a => a.id === areaId)

  const isHere = (charId: string) => {
    const c = characters.find(ch => ch.id === charId)
    if (!c) return false
    if (subNodeId) return c.locationId === areaId && c.subLocationId === subNodeId
    return c.locationId === areaId && !c.subLocationId
  }

  const [checked, setChecked] = useState<Set<string>>(() => new Set(characters.filter(c => isHere(c.id)).map(c => c.id)))

  const toggle = (id: string) => setChecked(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const handleConfirm = () => {
    for (const c of characters) {
      if (checked.has(c.id)) {
        setLocation(c.id, areaId)
        setSubLocation(c.id, subNodeId)
      } else if (isHere(c.id)) {
        // Was here, now unchecked → clear location
        setLocation(c.id, null)
        setSubLocation(c.id, null)
      }
    }
    onClose()
  }

  const locationLabel = subNodeId
    ? (() => {
        const findNode = (nodes: import('../types').SubNode[] | undefined, id: string): string | null => {
          if (!nodes) return null
          for (const n of nodes) {
            if (n.id === id) return n.name
            const found = findNode(n.subNodes, id)
            if (found) return found
          }
          return null
        }
        return findNode(area?.subNodes, subNodeId) ?? subNodeId
      })()
    : area?.name ?? areaId

  return (
    <Modal title={`Place Characters — ${locationLabel}`} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-xs text-stone-400">Select which characters are at this location. Unchecking a character who was here will clear their location.</p>
        <div className="space-y-1.5 max-h-72 overflow-y-auto">
          {characters.length === 0 && <p className="text-xs text-stone-500 text-center py-4">No characters exist yet.</p>}
          {characters.map(c => (
            <label key={c.id} className="flex items-center gap-3 p-2 rounded-lg bg-stone-800 hover:bg-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={checked.has(c.id)}
                onChange={() => toggle(c.id)}
                className="accent-gold w-3.5 h-3.5"
              />
              <TokenAvatar name={c.name} characterId={c.id} size={24} />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-stone-100 font-medium truncate">{c.name}</div>
                <div className="text-xs text-stone-500 truncate">
                  {c.locationId
                    ? `${areas.find(a => a.id === c.locationId)?.name ?? c.locationId}${c.subLocationId ? ' › ...' : ''}`
                    : 'Nowhere'}
                </div>
              </div>
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-3 py-1.5 rounded bg-stone-700 text-stone-300 hover:bg-stone-600 text-sm">Cancel</button>
          <button onClick={handleConfirm} className="px-3 py-1.5 rounded bg-gold text-stone-900 font-semibold hover:bg-yellow-400 text-sm">Confirm</button>
        </div>
      </div>
    </Modal>
  )
}
