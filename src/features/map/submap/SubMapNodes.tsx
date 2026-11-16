// React Flow node and edge renderers for the sub-location map.
import { useState } from 'react'
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, Handle, Position, type EdgeProps } from '@xyflow/react'
import { ChevronRight, X } from 'lucide-react'
import { TokenAvatar } from '../../../ui/TokenAvatar'
import { CHAR_DND } from '../AreaNode'
import { SUB_TYPE_ICONS as TYPE_ICONS } from '../../../lib/world/places'
import type { SubNode, Character } from '../../../types'

export interface SubNodeData {
  node: SubNode
  selected: boolean
  onSelect: () => void
  directChars: Character[]
  subtreeChars: Character[]
  hasChildren: boolean
  canGoDeeper: boolean
  onOpenSubMap: () => void
  onCharNavigate: (subLocationId: string) => void
  onDropCharacter?: (characterId: string) => void
}

export function SubNodeComponent({ data }: { data: unknown }) {
  const d = data as SubNodeData
  const { node, selected, onSelect, directChars, subtreeChars, hasChildren, canGoDeeper, onOpenSubMap, onCharNavigate, onDropCharacter } = d
  const [dragOver, setDragOver] = useState(false)
  const hc = 'bg-stone-500! w-2! h-2! border-stone-400!'
  return (
    <div
      onClick={onSelect}
      onDragOver={e => {
        if (onDropCharacter && e.dataTransfer.types.includes(CHAR_DND)) {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
          if (!dragOver) setDragOver(true)
        }
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => {
        setDragOver(false)
        const charId = e.dataTransfer.getData(CHAR_DND)
        if (charId && onDropCharacter) { e.preventDefault(); e.stopPropagation(); onDropCharacter(charId) }
      }}
      className={`relative min-w-28 bg-stone-800 border-2 rounded-lg p-2.5 cursor-pointer transition-all shadow-md ${
        selected ? 'border-gold ring-1 ring-gold/50' : 'border-stone-600 hover:border-stone-400'
      } ${dragOver ? 'ring-2 ring-teal-400 brightness-125' : ''}`}
    >
      <Handle id="top"    type="source" position={Position.Top}    className={hc} />
      <Handle id="bottom" type="source" position={Position.Bottom} className={hc} />
      <Handle id="left"   type="source" position={Position.Left}   className={hc} />
      <Handle id="right"  type="source" position={Position.Right}  className={hc} />
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="text-sm">{TYPE_ICONS[node.type] ?? '📍'}</span>
        <span className="text-xs font-semibold text-stone-100 truncate max-w-20">{node.name}</span>
      </div>
      <div className="text-xs text-stone-500 capitalize">{node.type}</div>
      {subtreeChars.length > 0 && (
        <div className="flex flex-wrap gap-0.5 mt-1">
          {subtreeChars.slice(0, 4).map(c => {
            const isDirect = directChars.some(dc => dc.id === c.id)
            return (
              <button
                key={c.id}
                onClick={e => { e.stopPropagation(); onCharNavigate(c.subLocationId!) }}
                title={`${c.name}${isDirect ? '' : ' (in sub-location)'}`}
                className={`rounded-full hover:ring-1 ring-gold transition-all ${isDirect ? 'opacity-100' : 'opacity-50'}`}
              >
                <TokenAvatar name={c.name} characterId={c.id} size={18} />
              </button>
            )
          })}
          {subtreeChars.length > 4 && <span className="text-xs text-stone-500 self-center">+{subtreeChars.length - 4}</span>}
        </div>
      )}
      {hasChildren && canGoDeeper && (
        <button
          onClick={e => { e.stopPropagation(); onOpenSubMap() }}
          className="flex items-center gap-0.5 text-xs text-stone-500 hover:text-gold mt-1"
        >
          Sub-map <ChevronRight size={9} />
        </button>
      )}
    </div>
  )
}


// ── Sub-edge with delete button ───────────────────────────────────────────
export function SubEdgeComponent({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected }: EdgeProps) {
  const [hovered, setHovered] = useState(false)
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition,
    borderRadius: 10,
    offset: 20,
  })
  const onDelete = (data as { onDelete?: () => void })?.onDelete
  const showDelete = selected || hovered

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={{ stroke: selected ? '#a78bfa' : '#4a4a4a', strokeWidth: selected ? 2 : 1.5 }} />
      <EdgeLabelRenderer>
        <div
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            zIndex: 1000,
            padding: '8px',
          }}
          className="absolute pointer-events-auto nodrag nopan"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <button
            onClick={e => {
              e.stopPropagation()
              e.preventDefault()
              if (typeof onDelete === 'function') onDelete()
            }}
            onPointerDown={e => e.stopPropagation()}
            style={{
              opacity: showDelete ? 1 : 0,
              pointerEvents: showDelete ? 'auto' : 'none',
              transition: 'opacity 120ms',
            }}
            className="w-5 h-5 rounded-full bg-stone-700 hover:bg-red-600 border border-stone-500 hover:border-red-400 flex items-center justify-center shadow-sm"
            title="Delete connection"
          >
            <X size={10} className="text-stone-300" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

