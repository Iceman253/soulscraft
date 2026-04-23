import { useMemo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Map, Lock, Eye, ChevronRight } from 'lucide-react'
import { useCharacterStore } from '../characters/store'
import { useWorldStore } from './store'
import { TokenAvatar } from '../../ui/TokenAvatar'
import type { Area } from '../../types'

const REALM_COLORS = {
  overworld: 'border-overworld text-overworld',
  nether:    'border-nether text-orange-400',
  end:       'border-end text-purple-400',
}

const TYPE_ICONS: Record<string, string> = {
  settlement: '🏘️', dungeon: '⚔️', wilderness: '🌲',
  portal: '🌀', stronghold: '🏰', ruins: '🏚️', other: '📍',
}

interface AreaNodeData {
  area: Area
  fogEnabled: boolean
  selected: boolean
  onReveal: () => void
  onOpenSubMap: () => void
  onSelect: () => void
  onCharClick: (subLocationId: string | null) => void
}

export function AreaNodeComponent({ data }: NodeProps) {
  const d = data as unknown as AreaNodeData
  const { area, fogEnabled, selected, onReveal, onOpenSubMap, onSelect, onCharClick } = d
  const allCharacters = useCharacterStore(s => s.characters)
  const characters = useMemo(() => allCharacters.filter(c => c.locationId === area.id), [allCharacters, area.id])
  const isPlayerVisible = useWorldStore(s => s.playerVisibleAreaIds.includes(area.id))

  const hidden = fogEnabled && !area.revealed

  return (
    <div
      onClick={onSelect}
      className={`relative min-w-32 rounded-lg border-2 cursor-pointer transition-all shadow-lg ${
        hidden
          ? 'bg-stone-950 border-stone-700 opacity-60'
          : `bg-stone-800 ${REALM_COLORS[area.realm] ?? 'border-stone-600'} hover:brightness-110`
      } ${selected ? 'ring-2 ring-gold' : ''}`}
    >
      {/* Player-visible badge */}
      {isPlayerVisible && (
        <div className="absolute -top-2 -right-2 z-10 bg-teal-700 border border-teal-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center" title="Visible to players">
          👥
        </div>
      )}
      <Handle id="top"    type="source" position={Position.Top}    className="!bg-stone-500 !w-3 !h-3 !border-stone-400" />
      <Handle id="bottom" type="source" position={Position.Bottom} className="!bg-stone-500 !w-3 !h-3 !border-stone-400" />
      <Handle id="left"   type="source" position={Position.Left}   className="!bg-stone-500 !w-3 !h-3 !border-stone-400" />
      <Handle id="right"  type="source" position={Position.Right}  className="!bg-stone-500 !w-3 !h-3 !border-stone-400" />

      <div className="p-2.5">
        {hidden ? (
          <div className="flex items-center gap-2">
            <Lock size={14} className="text-stone-500" />
            <span className="text-stone-500 text-sm font-medium">???</span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-base leading-none">{TYPE_ICONS[area.type] ?? '📍'}</span>
              <span className="text-sm font-semibold text-stone-100 leading-tight max-w-28 truncate">{area.name}</span>
            </div>
            <div className="text-xs text-stone-400 capitalize flex items-center gap-1">
              <Map size={10} />
              {area.realm} · {area.type}
            </div>
            {area.subNodes.length > 0 && (
              <div className="text-xs text-stone-500 mt-0.5">{area.subNodes.length} sub-location{area.subNodes.length !== 1 ? 's' : ''}</div>
            )}
            {characters.length > 0 && (
              <div className="flex flex-wrap gap-0.5 mt-1.5">
                {characters.slice(0, 4).map(c => (
                  <button
                    key={c.id}
                    onClick={e => { e.stopPropagation(); onCharClick(c.subLocationId) }}
                    title={`${c.name}${c.subLocationId ? ' — click to locate' : ''}`}
                    className="rounded-full hover:ring-1 ring-gold transition-all"
                  >
                    <TokenAvatar name={c.name} characterId={c.id} size={20} />
                  </button>
                ))}
                {characters.length > 4 && (
                  <span className="text.xs text-stone-500">+{characters.length - 4}</span>
                )}
              </div>
            )}

            {/* Action row */}
            <div className="flex items-center gap-1 mt-1.5">
              {fogEnabled && (
                <button
                  onClick={e => { e.stopPropagation(); onReveal() }}
                  className="flex items-center gap-1 text-xs text-stone-500 hover:text-emerald px-1 rounded"
                >
                  <Eye size={10} /> Reveal
                </button>
              )}
              <button
                onClick={e => { e.stopPropagation(); onOpenSubMap() }}
                className="flex items-center gap-1 text-xs text-stone-500 hover:text-gold ml-auto px-1 rounded"
              >
                Sub-map <ChevronRight size={10} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
