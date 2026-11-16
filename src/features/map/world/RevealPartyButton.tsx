import { useState } from 'react'
import { ChevronDown, Users } from 'lucide-react'
import { useWorldStore } from '../store'
import { useCharacterStore } from '../../characters/store'

/** Shows or hides the party's locations to players, all at once or one by one. */
export function RevealPartyButton() {
  const { areas, playerVisibleAreaIds, addPlayerVisibleArea, removePlayerVisibleArea } = useWorldStore()
  const characters = useCharacterStore(s => s.characters)
  const [showRevealDropdown, setShowRevealDropdown] = useState(false)
  // Only count characters whose locationId actually exists in the areas array
  const charsWithLocation = characters.filter(c => c.locationId && areas.some(a => a.id === c.locationId))
  const partyAreaIds = [...new Set(charsWithLocation.map(c => c.locationId) as string[])]
  const hiddenCount = partyAreaIds.filter(id => !playerVisibleAreaIds.includes(id)).length
  const allVisible = hiddenCount === 0 && partyAreaIds.length > 0
  const noParty = partyAreaIds.length === 0

  return (
    <div className="relative flex shadow-lg">
      {/* Main button */}
      <button
        onClick={() => {
          if (noParty) return
          if (allVisible) {
            partyAreaIds.forEach(id => removePlayerVisibleArea(id))
          } else {
            partyAreaIds.forEach(id => addPlayerVisibleArea(id))
          }
        }}
        className={`flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-l-sm border border-r-0 text-sm transition-colors ${
          noParty
            ? 'bg-stone-800 border-stone-600 text-stone-600 cursor-not-allowed'
            : allVisible
              ? 'bg-stone-800 border-stone-600 text-stone-400 hover:border-stone-500 hover:text-stone-300'
              : 'bg-stone-800 border-stone-600 text-teal-400 hover:border-teal-500/50 hover:text-teal-300'
        }`}
        title={
          noParty
            ? 'No characters placed on the map — use right-click → Place Characters Here'
            : allVisible
              ? 'Hide all party locations from players'
              : 'Reveal all party locations to players'
        }
      >
        <Users size={14} />
        {allVisible ? 'Hide Party' : 'Reveal Party'}
        {hiddenCount > 0
          ? <span className="text-xs bg-amber-700/60 text-amber-300 font-bold px-1.5 py-0.5 rounded-full">{hiddenCount}</span>
          : partyAreaIds.length > 0
            ? <span className="text-xs text-stone-500 font-mono">✓</span>
            : null
        }
      </button>

      {/* Dropdown toggle */}
      <button
        onClick={() => setShowRevealDropdown(v => !v)}
        className={`flex items-center px-1.5 py-1.5 rounded-r-sm border border-stone-600 text-sm transition-colors ${
          showRevealDropdown
            ? 'bg-stone-700 border-teal-500/50 text-teal-300'
            : 'bg-stone-800 text-teal-400 hover:bg-stone-700 hover:text-teal-300'
        }`}
        title="Toggle individual character locations"
      >
        <ChevronDown size={13} className={`transition-transform ${showRevealDropdown ? 'rotate-180' : ''}`} />
      </button>

      {/* Per-character dropdown */}
      {showRevealDropdown && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowRevealDropdown(false)} />
          <div className="absolute top-full left-0 mt-1 w-56 bg-stone-900 border border-stone-600 rounded-lg shadow-2xl z-50 overflow-hidden">
            <div className="px-3 py-1.5 text-xs text-stone-500 border-b border-stone-700">Toggle individual location</div>
            {charsWithLocation.length === 0 && (
              <div className="px-3 py-2 text-xs text-stone-500 italic">
                No characters placed on the map.<br />
                <span className="text-stone-500">Right-click an area → Place Characters Here.</span>
              </div>
            )}
            {charsWithLocation.map(c => {
              const area = areas.find(a => a.id === c.locationId)
              const isVisible = playerVisibleAreaIds.includes(c.locationId!)
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    if (isVisible) removePlayerVisibleArea(c.locationId!)
                    else addPlayerVisibleArea(c.locationId!)
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-stone-800 text-left transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-sm text-stone-200 truncate">{c.name}</div>
                    <div className="text-xs text-stone-500 truncate">📍 {area?.name ?? '?'}</div>
                  </div>
                  {isVisible
                    ? <span className="text-xs text-teal-500 shrink-0 ml-2">✓ shown</span>
                    : <span className="text-xs text-amber-400 shrink-0 ml-2">hidden</span>
                  }
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
