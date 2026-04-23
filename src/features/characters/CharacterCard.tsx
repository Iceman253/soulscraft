import { useState } from 'react'
import { useWorldStore } from '../map/store'
import { TokenAvatar } from '../../ui/TokenAvatar'
import { HpBar } from '../../ui/HpBar'
import { SdDots } from '../../ui/SdDots'
import { Badge } from '../../ui/Badge'
import { computeDef } from '../../lib/armor'
import { CURRENCY_OPTIONS } from '../../lib/currency'
import { TravelingModal } from '../player-view/TravelingModal'
import type { Character } from '../../types'

interface CharacterCardProps {
  character: Character
  onOpen: () => void
}

export function CharacterCard({ character: c, onOpen }: CharacterCardProps) {
  const areas = useWorldStore(s => s.areas)
  const travelingMarkers = useWorldStore(s => s.travelingMarkers)
  const location = areas.find(a => a.id === c.locationId)
  const def = computeDef(c.armorLoadout)
  const isTraveling = travelingMarkers.some(m => m.characterId === c.id)

  const [showTravelModal, setShowTravelModal] = useState(false)

  return (
    <>
      <div
        onClick={onOpen}
        className="bg-stone-800 border border-stone-700 rounded-lg p-3 cursor-pointer hover:border-stone-500 hover:bg-stone-750 transition-all group"
      >
        <div className="flex items-start gap-2.5 mb-2.5">
          <TokenAvatar name={c.name} characterId={c.id} size={40} />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-stone-100 truncate text-sm group-hover:text-gold transition-colors">{c.name}</div>
            <div className="text-xs text-stone-400">{c.species} {c.class}</div>
            <div className="text-xs text-stone-500">Level {c.level}</div>
          </div>
          {/* Traveling badge + button */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            {isTraveling && (
              <span className="text-xs bg-amber-900/40 border border-amber-600/40 text-amber-300 px-1.5 py-0.5 rounded">
                🚶 Traveling
              </span>
            )}
            <button
              onClick={e => { e.stopPropagation(); setShowTravelModal(true) }}
              className="text-xs text-stone-500 hover:text-teal-400 transition-colors"
              title="Mark as traveling"
            >
              {isTraveling ? 'Edit travel' : 'Mark traveling'}
            </button>
          </div>
        </div>

        <HpBar current={c.currentHp} max={c.maxHp} className="mb-1.5" />

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <span className="text-xs text-stone-500">SD</span>
            <SdDots current={c.currentSd} max={c.maxSd} size="sm" />
          </div>
          <div className="flex items-center gap-1.5">
            {def > 0 && <Badge variant="blue">DEF {def}</Badge>}
            <Badge variant="muted">{c.damageDie}</Badge>
          </div>
        </div>

        {location && (
          <div className="text-xs text-stone-500 truncate">📍 {location.name}</div>
        )}

        {/* Currency + rations */}
        {(CURRENCY_OPTIONS.some(o => c.currency[o.key] > 0) || c.rations > 0) && (
          <div className="flex items-center gap-2 flex-wrap mt-1">
            {CURRENCY_OPTIONS.map(opt => {
              const amt = c.currency[opt.key]
              if (!amt) return null
              return (
                <span key={opt.key} className="flex items-center gap-0.5 text-xs text-stone-400">
                  <img src={opt.img} alt={opt.label} className="w-3.5 h-3.5 object-contain" />
                  <span className="font-mono text-stone-300">{amt}</span>
                </span>
              )
            })}
            {c.rations > 0 && (
              <span className="text-xs text-stone-400">🍖 <span className="font-mono text-stone-300">{c.rations}</span></span>
            )}
          </div>
        )}

        {c.missedRests > 0 && (
          <div className="text-xs text-orange-400 mt-1">⚠️ -{c.missedRests}d4 penalty</div>
        )}

        {c.activeEffects.length > 0 && (
          <div className="flex flex-wrap gap-0.5 mt-1.5">
            {c.activeEffects.slice(0, 3).map(e => (
              <Badge key={e.id} variant="purple" className="text-xs">{e.name}</Badge>
            ))}
            {c.activeEffects.length > 3 && <Badge variant="muted">+{c.activeEffects.length - 3}</Badge>}
          </div>
        )}
      </div>

      {showTravelModal && (
        <TravelingModal
          preselectedCharacterId={c.id}
          onClose={() => setShowTravelModal(false)}
        />
      )}
    </>
  )
}
