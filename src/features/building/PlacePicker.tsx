import { useMemo, useState } from 'react'
import { ChevronRight, LocateFixed } from 'lucide-react'
import { useWorldStore } from '../map/store'
import { PlaceMap } from './PlaceMap'
import {
  characterLevel, findSubPath, levelCrumbs, levelOfPlacement, placementAt, placesOnLevel, sameLevel,
  WORLD_LEVEL, type MapLevel, type Placement, type PlaceFilter,
} from '../../lib/places'
import type { Character, ProjectTier } from '../../types'

/** Ids a character is standing in, so a secret sub-location they're already
 *  inside still shows for them. */
function ownSubPath(character: Character | undefined, subNodes: (areaId: string) => Parameters<typeof findSubPath>[0]): string[] {
  if (!character?.locationId || !character.subLocationId) return []
  return findSubPath(subNodes(character.locationId), character.subLocationId) ?? []
}

/** Pick where a build goes: walk down World › Area › Sub-location with the breadcrumb
 *  or the "Go inside" chips, then tap the map to drop the pin. Starts on the map the
 *  character is standing on, since that's usually where they want to build. */
export function PlacePicker({ character, icon, tier, value, onChange }: {
  character?: Character
  icon?: string
  tier?: ProjectTier
  value: Placement | null
  onChange: (placement: Placement | null) => void
}) {
  const areas = useWorldStore(s => s.areas)
  const visibleAreaIds = useWorldStore(s => s.playerVisibleAreaIds)
  const here = useMemo(() => {
    const level = character ? characterLevel(character, areas) : WORLD_LEVEL
    return level.areaId && !visibleAreaIds.includes(level.areaId) ? WORLD_LEVEL : level
  }, [character, areas, visibleAreaIds])
  const [level, setLevel] = useState<MapLevel>(() => value ? levelOfPlacement(value, areas) : here)
  // Only revealed areas, so a tap can't tie a build to somewhere the player can't see.
  const knownAreas = useMemo(() => areas.filter(a => visibleAreaIds.includes(a.id)), [areas, visibleAreaIds])

  const filter = useMemo<PlaceFilter>(() => ({
    visibleAreaIds,
    hideSecretsExcept: ownSubPath(character, id => areas.find(a => a.id === id)?.subNodes ?? []),
  }), [visibleAreaIds, character, areas])
  const crumbs = levelCrumbs(level, areas)
  const inside = placesOnLevel(level, areas, filter).filter(p => p.enter)

  const go = (next: MapLevel) => { setLevel(next); onChange(null) }

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 space-y-2 border-b border-stone-800 px-4 py-3">
        {/* Where you are in the map tree */}
        <div className="flex items-center gap-1 overflow-x-auto text-base">
          {crumbs.map((c, i) => (
            <span key={c.label + i} className="flex shrink-0 items-center gap-1">
              {i > 0 && <ChevronRight size={15} className="text-stone-600" />}
              <button
                onClick={() => go(c.level)}
                className={`py-1 ${i === crumbs.length - 1 ? 'font-semibold text-gold' : 'text-stone-400 active:text-gold'}`}
              >
                {c.label}
              </button>
            </span>
          ))}
          {!sameLevel(level, here) && (
            <button onClick={() => go(here)} className="ml-auto flex shrink-0 items-center gap-1 rounded-lg border border-stone-700 px-2 py-1 text-sm text-teal-300 active:border-teal-500">
              <LocateFixed size={14} /> Where I am
            </button>
          )}
        </div>

        {/* Big targets for going deeper, so nobody has to tap a tiny map label */}
        {inside.length > 0 && (
          <div>
            <div className="mb-1 text-xs uppercase tracking-wider text-stone-500">Go inside</div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {inside.map(p => (
                <button key={p.id} onClick={() => go(p.enter!)}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl border border-stone-600 bg-stone-900 px-3 py-2 text-base text-stone-200 active:border-gold/60">
                  <span>{p.icon}</span>{p.name}<ChevronRight size={15} className="text-gold" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="relative min-h-64 flex-1">
        <PlaceMap
          {...filter}
          level={level}
          pin={value ? { position: value.position, icon, tier } : null}
          onEnter={go}
          onPick={position => onChange(placementAt(level, position, knownAreas))}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-4">
          <span className="rounded-full bg-stone-900/90 px-3 py-1.5 text-sm text-stone-200 shadow-lg">
            {value ? 'Tap again to move it' : 'Tap an open spot to place your build'}
          </span>
        </div>
      </div>
    </div>
  )
}
