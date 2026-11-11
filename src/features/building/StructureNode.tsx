import type { NodeProps } from '@xyflow/react'
import { PixelIcon } from './PixelIcon'
import { buildCondition, structureProgress } from '../../lib/building'
import type { Structure } from '../../types'

const LABEL_PREFIX = { planned: '🚧 ', building: '🚧 ', complete: '', damaged: '💥 ', destroyed: '🪨 ' }

/** A player build on the world map: its pixel icon, name and build progress, or a
 *  damaged / ruined look once something has happened to it. Shared by the GM map and
 *  the player map. */
export function StructureNode({ data }: NodeProps) {
  const { structure: s, selected } = data as unknown as { structure: Structure; selected?: boolean }
  const p = structureProgress(s)
  const condition = buildCondition(s)
  const pct = Math.round(p.fraction * 100)
  const unfinished = condition === 'planned' || condition === 'building'
  const title = condition === 'destroyed' ? `${s.name}: ruins`
    : condition === 'damaged' ? `${s.name}: damaged`
    : unfinished ? `${s.name}: under construction (${pct}%)` : s.name
  return (
    <div className="flex flex-col items-center gap-0.5" title={title}>
      <div className={`rounded-sm p-0.5 bg-stone-900/70 shadow-lg ${selected ? 'ring-2 ring-gold' : condition === 'damaged' ? 'ring-1 ring-orange-500' : 'ring-1 ring-stone-600'} ${condition === 'complete' || condition === 'damaged' ? '' : 'opacity-85'}`}>
        <PixelIcon icon={s.icon} tier={s.tier} size={36}
          className={condition === 'planned' ? 'grayscale' : condition === 'destroyed' ? 'grayscale brightness-50' : ''} />
      </div>
      <span className={`text-[10px] bg-stone-900/85 px-1 rounded-sm whitespace-nowrap max-w-28 truncate ${condition === 'destroyed' ? 'text-stone-400 line-through' : 'text-stone-100'}`}>
        {LABEL_PREFIX[condition]}{s.name}
      </span>
      {unfinished && (
        <div className="w-10 h-1 rounded-sm bg-stone-900 overflow-hidden">
          <div className="h-full bg-amber-500" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  )
}
