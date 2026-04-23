import { useState } from 'react'
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@xyflow/react'
import { X } from 'lucide-react'
import type { AreaEdge } from '../../types'

const DANGER_COLORS = {
  safe:    '#17c964',
  risky:   '#f5c842',
  deadly:  '#cc2200',
}

interface EdgeData {
  edge: AreaEdge
  onDelete: () => void
}

export function AreaEdgeComponent({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected }: EdgeProps) {
  const d = data as unknown as EdgeData
  const [hovered, setHovered] = useState(false)
  const color = d?.edge?.travelDanger ? DANGER_COLORS[d.edge.travelDanger] : '#4a4a4a'

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition,
    borderRadius: 12,
    offset: 24, // how far it extends perpendicular from the handle before turning
  })
  const showDelete = selected || hovered

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={{ stroke: selected ? '#e2c97e' : color, strokeWidth: selected ? 2 : 1.5 }} />
      <EdgeLabelRenderer>
        {/* Wider hit area (padding: 8px) ensures hover is reachable even without a label */}
        <div
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            zIndex: 1000,
            padding: '8px',
          }}
          className="absolute pointer-events-auto flex items-center gap-1 nodrag nopan"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {d?.edge?.label && (
            <span className="text-xs bg-stone-800 border border-stone-600 rounded px-1.5 py-0.5 text-stone-300 shadow">
              {d.edge.label}
            </span>
          )}
          <button
            onClick={e => {
              e.stopPropagation()
              e.preventDefault()
              const fn = d?.onDelete
              if (typeof fn === 'function') fn()
            }}
            onPointerDown={e => e.stopPropagation()}
            style={{
              opacity: showDelete ? 1 : 0,
              pointerEvents: showDelete ? 'auto' : 'none',
              transition: 'opacity 120ms',
            }}
            className="w-5 h-5 rounded-full bg-stone-700 hover:bg-red-600 border border-stone-500 hover:border-red-400 flex items-center justify-center shadow"
            title="Delete connection"
          >
            <X size={10} className="text-stone-300" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
