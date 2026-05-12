import { useState } from 'react'
import { X, MapPin } from 'lucide-react'
import { useWorldStore } from '../map/store'
import { useCharacterStore } from '../characters/store'

interface TravelingModalProps {
  preselectedCharacterId?: string
  onClose: () => void
}

export function TravelingModal({ preselectedCharacterId, onClose }: TravelingModalProps) {
  const { areas, edges, travelingMarkers, setTravelingMarker, clearTravelingMarker } = useWorldStore()
  const { characters, setLocation } = useCharacterStore()

  const [characterId, setCharacterId] = useState(preselectedCharacterId ?? characters[0]?.id ?? '')
  const [toAreaId, setToAreaId] = useState('')
  const [edgeId, setEdgeId] = useState('')
  const [label, setLabel] = useState('')

  const selectedChar = characters.find(c => c.id === characterId)
  const fromAreaId = selectedChar?.locationId ?? ''
  const fromArea = areas.find(a => a.id === fromAreaId)

  // Edges from current location
  const availableEdges = edges.filter(e =>
    e.sourceId === fromAreaId || e.targetId === fromAreaId
  )

  // Pre-fill from existing marker if editing
  const existingMarker = travelingMarkers.find(m => m.characterId === characterId)

  const handleCharChange = (id: string) => {
    setCharacterId(id)
    setToAreaId('')
    setEdgeId('')
    setLabel('')
    const marker = travelingMarkers.find(m => m.characterId === id)
    if (marker) {
      setToAreaId(marker.toAreaId)
      setEdgeId(marker.edgeId ?? '')
      setLabel(marker.label ?? '')
    }
  }

  const handleConfirm = () => {
    if (!characterId || !toAreaId || !fromAreaId) return
    setTravelingMarker({
      characterId,
      fromAreaId,
      toAreaId,
      edgeId: edgeId || undefined,
      label: label.trim() || undefined,
    })
    onClose()
  }

  const handleClearMarker = () => {
    if (characterId) clearTravelingMarker(characterId)
    onClose()
  }

  const handleMarkArrived = () => {
    if (!characterId || !toAreaId) return
    setLocation(characterId, toAreaId)  // auto-clears marker + reveals area
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/80 flex items-center justify-center p-6" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-700">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-amber-400" />
            <span className="font-bold text-stone-100">Mark as Traveling</span>
          </div>
          <button onClick={onClose} className="p-1 rounded text-stone-500 hover:text-stone-300 hover:bg-stone-700">
            <X size={14} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Character */}
          <div>
            <label className="text-xs text-stone-400 mb-1.5 block">Character</label>
            <select value={characterId} onChange={e => handleCharChange(e.target.value)}
              className="w-full bg-stone-800 border border-stone-600 rounded px-3 py-2 text-stone-200 text-sm outline-none">
              {characters.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* From area (read-only) */}
          <div>
            <label className="text-xs text-stone-400 mb-1.5 block">Traveling from</label>
            <div className="px-3 py-2 rounded bg-stone-800/50 border border-stone-700 text-stone-400 text-sm">
              {fromArea ? `📍 ${fromArea.name}` : <span className="italic text-stone-500">No current location set</span>}
            </div>
          </div>

          {/* Destination (GM-only) */}
          <div>
            <label className="text-xs text-stone-400 mb-1.5 block">
              Destination <span className="text-stone-500">(hidden from players until they arrive)</span>
            </label>
            <select value={toAreaId} onChange={e => setToAreaId(e.target.value)}
              className="w-full bg-stone-800 border border-stone-600 rounded px-3 py-2 text-stone-200 text-sm outline-none">
              <option value="">— Select destination —</option>
              {areas.filter(a => a.id !== fromAreaId).map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          {/* Edge/road */}
          {availableEdges.length > 0 && (
            <div>
              <label className="text-xs text-stone-400 mb-1.5 block">
                Road / path <span className="text-stone-500">(optional)</span>
              </label>
              <select value={edgeId} onChange={e => setEdgeId(e.target.value)}
                className="w-full bg-stone-800 border border-stone-600 rounded px-3 py-2 text-stone-200 text-sm outline-none">
                <option value="">— Any path —</option>
                {availableEdges.map(e => {
                  const other = areas.find(a => a.id === (e.sourceId === fromAreaId ? e.targetId : e.sourceId))
                  return <option key={e.id} value={e.id}>{e.label ?? `→ ${other?.name ?? '?'}`}</option>
                })}
              </select>
            </div>
          )}

          {/* Travel note shown to players */}
          <div>
            <label className="text-xs text-stone-400 mb-1.5 block">
              Travel note for players <span className="text-stone-500">(optional — shown on map path)</span>
            </label>
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="e.g. 3 days north by sea…"
              className="w-full bg-stone-800 border border-stone-600 rounded px-3 py-2 text-stone-200 text-sm outline-none placeholder:text-stone-600"
            />
          </div>
        </div>

        <div className="px-5 py-3 border-t border-stone-700 flex items-center gap-2">
          {existingMarker && (
            <button onClick={handleClearMarker}
              className="px-3 py-1.5 rounded bg-stone-700 text-stone-400 hover:text-stone-200 hover:bg-stone-600 text-sm">
              Clear Marker
            </button>
          )}
          {existingMarker && toAreaId && (
            <button onClick={handleMarkArrived}
              className="px-3 py-1.5 rounded bg-teal-700 hover:bg-teal-600 text-white font-medium text-sm">
              ✅ Mark Arrived
            </button>
          )}
          <div className="flex-1" />
          <button onClick={onClose} className="px-3 py-1.5 rounded bg-stone-700 text-stone-300 hover:bg-stone-600 text-sm">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!toAreaId || !fromAreaId}
            className="px-4 py-1.5 rounded bg-amber-700 hover:bg-amber-600 text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Mark Traveling
          </button>
        </div>
      </div>
    </div>
  )
}
