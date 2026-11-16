import type { Character } from '../../../types'
import { PortraitPicker } from '../../characters/PortraitPicker'
import { TokenAvatar } from '../../../ui/TokenAvatar'
import { HpBar } from '../../../ui/HpBar'
import { SdDots } from '../../../ui/SdDots'
import { Badge } from '../../../ui/Badge'
import { computeDef } from '../../../lib/rules/armor'
import { isAtRestSpot } from '../../../lib/world/places'
import { useWorldStore } from '../../map/store'

/** Portrait, name, species, class and level. Owners can change the portrait. */
export function SheetHeader({ character: c, editable }: { character: Character; editable: boolean }) {
  return (
    <div className="flex items-center gap-3">
      {editable
        ? <PortraitPicker name={c.name} characterId={c.id} size={48} />
        : <TokenAvatar name={c.name} characterId={c.id} size={48} />}
      <div className="min-w-0">
        <div className={`font-bold text-base font-heading tracking-wide ${c.name.toLowerCase() === 'infinite' ? 'rainbow-name' : 'text-stone-100'}`}>{c.name}</div>
        <div className="text-sm text-stone-400">{c.species} · {c.class}</div>
        <div className="text-xs text-stone-500 font-mono">Level {c.level}</div>
      </div>
    </div>
  )
}

/** Where the character is, or that they're on the road. */
export function LocationStatus({ character: c }: { character: Character }) {
  const areas = useWorldStore(s => s.areas)
  const travelMarker = useWorldStore(s => s.travelingMarkers.find(m => m.characterId === c.id))
  const location = areas.find(a => a.id === c.locationId)
  if (!location && !travelMarker) return null
  return (
    <div className={`rounded-lg px-3 py-2 text-xs flex items-center gap-2 ${
      travelMarker ? 'bg-amber-900/20 border border-amber-700/40 text-amber-300' : 'bg-stone-800 border border-stone-700 text-stone-400'
    }`}>
      {travelMarker ? (
        <>
          <span>🚶</span>
          <span>
            Traveling from <span className="text-stone-200">{location?.name ?? '?'}</span>
            {travelMarker.label && <span className="text-amber-400/80"> — {travelMarker.label}</span>}
          </span>
        </>
      ) : (
        <>
          <span>📍</span>
          <span className="text-stone-300">{location?.name}</span>
          <span className="text-stone-500">{location?.type}</span>
          {isAtRestSpot(c, areas) && <span className="ml-1 px-1.5 py-0.5 rounded-sm bg-teal-900/40 border border-teal-700/40 text-teal-400">🏕️ Rest Spot</span>}
        </>
      )}
    </div>
  )
}

/** HP bar, Soul Dice, DEF and damage die. */
export function VitalsSummary({ character: c }: { character: Character }) {
  const def = computeDef(c.armorLoadout)
  return (
    <div className="space-y-2">
      <div>
        <div className="text-xs text-stone-400 mb-1">HP</div>
        <HpBar current={c.currentHp} max={c.maxHp} />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-stone-400">SD</span>
          <SdDots current={c.currentSd} max={c.maxSd} size="sm" />
          <span className="text-xs text-stone-500 font-mono">({c.currentSd}/{c.maxSd})</span>
        </div>
        <div className="flex items-center gap-1.5">
          {def > 0 && <Badge variant="blue">DEF {def}</Badge>}
          <Badge variant="muted">{c.damageDie}</Badge>
        </div>
      </div>
    </div>
  )
}
