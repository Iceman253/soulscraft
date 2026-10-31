import { useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { useWorldStore } from '../map/store'
import { FullScreen } from './FullScreen'
import { PlaceMap } from './PlaceMap'
import { BuildSheet } from './BuildSheet'
import { findSubPath, levelCrumbs, levelLabel, type MapLevel } from '../../lib/places'
import type { Character } from '../../types'

/** Look inside an area from the player map: its sub-locations and any builds there. */
export function PlaceExplorer({ start, character, onClose }: { start: MapLevel; character?: Character; onClose: () => void }) {
  const areas = useWorldStore(s => s.areas)
  const visibleAreaIds = useWorldStore(s => s.playerVisibleAreaIds)
  const [level, setLevel] = useState(start)
  const [openId, setOpenId] = useState<string | null>(null)
  const crumbs = levelCrumbs(level, areas).slice(1)
  const hideSecretsExcept = useMemo(() => {
    const area = areas.find(a => a.id === character?.locationId)
    return (area && character?.subLocationId && findSubPath(area.subNodes, character.subLocationId)) || []
  }, [areas, character])

  return (
    <FullScreen title={levelLabel(level, areas)} onClose={onClose}>
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-stone-800 px-4 py-2.5 text-base">
          {crumbs.map((c, i) => (
            <span key={c.label + i} className="flex shrink-0 items-center gap-1">
              {i > 0 && <ChevronRight size={15} className="text-stone-600" />}
              <button onClick={() => setLevel(c.level)} className={i === crumbs.length - 1 ? 'font-semibold text-gold' : 'text-stone-400'}>{c.label}</button>
            </span>
          ))}
        </div>
        <div className="relative min-h-64 flex-1">
          <PlaceMap
            level={level}
            visibleAreaIds={visibleAreaIds}
            hideSecretsExcept={hideSecretsExcept}
            onEnter={setLevel}
            onSelectStructure={setOpenId}
          />
        </div>
      </div>
      {openId && <BuildSheet structureId={openId} character={character} onClose={() => setOpenId(null)} />}
    </FullScreen>
  )
}
