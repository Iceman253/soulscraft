import { useState } from 'react'
import { useWorldStore } from '../map/store'
import { TokenAvatar } from '../../ui/TokenAvatar'
import { HpBar } from '../../ui/HpBar'
import { SdDots } from '../../ui/SdDots'
import { Badge } from '../../ui/Badge'
import { computeDef } from '../../lib/armor'
import { CURRENCY_OPTIONS } from '../../lib/currency'
import { TravelingModal } from '../player-view/TravelingModal'
import { rollDie, parseSides } from '../../features/combat/combatUtils'
import { log } from '../log/store'
import type { Character } from '../../types'

function outcomeLabel(total: number) {
  if (total >= 10) return { label: 'Full Success', color: 'text-emerald' }
  if (total >= 7)  return { label: 'Partial',      color: 'text-amber-400' }
  return                  { label: 'Failure',       color: 'text-red-400' }
}

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
  const [dmgRoll, setDmgRoll] = useState<number | null>(null)

  const rollDamage = (e: React.MouseEvent) => {
    e.stopPropagation()
    const result = rollDie(parseSides(c.damageDie))
    setDmgRoll(result)
    log('dice-roll', `🎲 ${c.name} damage roll: ${result} (${c.damageDie})`)
    setTimeout(() => setDmgRoll(null), 3000)
  }

  return (
    <>
      <div
        onClick={onOpen}
        className={`border rounded-lg p-3 cursor-pointer transition-all group ${
          c.isDead
            ? 'bg-stone-900 border-stone-800 hover:border-stone-700 opacity-80'
            : c.isGhost
              ? 'bg-stone-800/60 border-purple-900/60 hover:border-purple-700/60'
              : 'bg-stone-800 border-stone-700 hover:border-stone-500 hover:bg-stone-700/60'
        }`}
      >
        <div className="flex items-start gap-2.5 mb-2.5">
          <TokenAvatar name={c.name} characterId={c.id} size={40} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {c.isDead && <span className="text-base leading-none" title="Fallen">💀</span>}
              {c.isGhost && !c.isDead && <span className="text-base leading-none" title="Ghost — Tower of Trials">👻</span>}
              <div className={`font-semibold truncate text-sm transition-colors ${c.name.toLowerCase() === 'infinite' ? 'rainbow-name' : c.isDead ? 'text-stone-500 line-through' : 'text-stone-100 group-hover:text-gold'}`}>{c.name}</div>
            </div>
            <div className="text-xs text-stone-400">{c.species} {c.class}{c.discipline ? ` · ${c.discipline}` : ''}</div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-300 font-mono">Lv.{c.level}</span>
              {/* XP pips */}
              <div className="flex gap-0.5" title={`${c.xp}/5 XP`}>
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < c.xp ? 'bg-gold' : 'bg-stone-700'}`} />
                ))}
              </div>
              {c.xp >= 5 && <span className="text-xs text-gold font-bold animate-pulse font-heading tracking-wide">↑ Level Up!</span>}
            </div>
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
              className="text-xs text-teal-400/80 hover:text-teal-300 underline decoration-dotted underline-offset-2 transition-colors"
              title="Mark as traveling"
            >
              {isTraveling ? 'Edit travel' : 'Mark traveling'}
            </button>
          </div>
        </div>

        <HpBar current={c.currentHp} max={c.maxHp} className="mb-1.5" />

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <span className="text-xs text-stone-300 font-heading tracking-wider uppercase">SD</span>
            <SdDots current={c.currentSd} max={c.maxSd} size="sm" />
          </div>
          <div className="flex items-center gap-1.5">
            {def > 0 && <Badge variant="blue">DEF {def}</Badge>}
            <button
              onClick={rollDamage}
              title={`Roll ${c.damageDie} damage`}
              className={`px-2 py-0.5 rounded text-xs font-mono border transition-all ${
                dmgRoll !== null
                  ? 'bg-gold/30 border-gold text-gold font-bold shadow-sm shadow-gold/30'
                  : 'bg-stone-700 border-stone-500 text-stone-200 hover:border-gold/60 hover:text-gold hover:bg-stone-700/80'
              }`}
            >
              {dmgRoll !== null ? `= ${dmgRoll}` : `🎲 ${c.damageDie}`}
            </button>
          </div>
        </div>

        {location && (
          <div className="text-xs text-stone-300 truncate">📍 {location.name}</div>
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
