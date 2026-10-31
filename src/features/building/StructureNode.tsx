import type { NodeProps } from '@xyflow/react'
import { PixelIcon } from './PixelIcon'
import { structureProgress } from '../../lib/building'
import type { Structure } from '../../types'

/** A player build on the world map: its pixel icon, name and build progress.
 *  Shared by the GM map and the player map. */
export function StructureNode({ data }: NodeProps) {
  const { structure: s, selected } = data as unknown as { structure: Structure; selected?: boolean }
  const p = structureProgress(s)
  const pct = Math.round(p.fraction * 100)
  return (
    <div className="flex flex-col items-center gap-0.5" title={p.status === 'complete' ? s.name : `${s.name} — under construction (${pct}%)`}>
      <div className={`rounded-sm p-0.5 bg-stone-900/70 shadow-lg ${selected ? 'ring-2 ring-gold' : 'ring-1 ring-stone-600'} ${p.status === 'complete' ? '' : 'opacity-85'}`}>
        <PixelIcon icon={s.icon} tier={s.tier} size={36} className={p.status === 'planned' ? 'grayscale' : ''} />
      </div>
      <span className="text-[10px] text-stone-100 bg-stone-900/85 px-1 rounded-sm whitespace-nowrap max-w-28 truncate">
        {p.status === 'complete' ? '' : '🚧 '}{s.name}
      </span>
      {p.status !== 'complete' && (
        <div className="w-10 h-1 rounded-sm bg-stone-900 overflow-hidden">
          <div className="h-full bg-amber-500" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  )
}
