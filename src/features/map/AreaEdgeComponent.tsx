import { useState } from 'react'
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@xyflow/react'
import { X, Pencil } from 'lucide-react'
import type { AreaEdge } from '../../types'

const DANGER_COLORS = {
  safe:    '#17c964',
  risky:   '#f5c842',
  deadly:  '#cc2200',
}

interface EdgeData {
  edge: AreaEdge
  onDelete: () => void
  onUpdate: (patch: Partial<AreaEdge>) => void
}

export function AreaEdgeComponent({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected }: EdgeProps) {
  const d = data as unknown as EdgeData
  const [hovered, setHovered] = useState(false)
  const [editing, setEditing] = useState(false)
  const color = d?.edge?.travelDanger ? DANGER_COLORS[d.edge.travelDanger] : '#4a4a4a'

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition,
    borderRadius: 12,
    offset: 24, // how far it extends perpendicular from the handle before turning
  })
  const showControls = selected || hovered || editing

  const travelDays = d?.edge?.travelDays

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={{ stroke: selected ? '#e2c97e' : color, strokeWidth: selected ? 2 : 1.5 }} />
      <EdgeLabelRenderer>
        {/* Wider hit area (padding: 8px) ensures hover is reachable even without a label */}
        <div
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            zIndex: editing ? 1100 : 1000,
            padding: '8px',
          }}
          className="absolute pointer-events-auto flex items-center gap-1 nodrag nopan"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {(d?.edge?.label || travelDays !== undefined) && !editing && (
            <span className="text-xs bg-stone-800 border border-stone-600 rounded px-1.5 py-0.5 text-stone-300 shadow whitespace-nowrap">
              {d.edge.label}
              {travelDays !== undefined && (
                <span className="text-stone-500">{d.edge.label ? ' · ' : ''}⏱ {travelDays}d</span>
              )}
            </span>
          )}

          {/* Edit + delete — visible on hover/selection */}
          {!editing && (
            <>
              <button
                onClick={e => { e.stopPropagation(); e.preventDefault(); setEditing(true) }}
                onPointerDown={e => e.stopPropagation()}
                style={{ opacity: showControls ? 1 : 0, pointerEvents: showControls ? 'auto' : 'none', transition: 'opacity 120ms' }}
                className="w-5 h-5 rounded-full bg-stone-700 hover:bg-stone-600 border border-stone-500 flex items-center justify-center shadow"
                title="Edit route — label, danger, travel days"
              >
                <Pencil size={9} className="text-stone-300" />
              </button>
              <button
                onClick={e => {
                  e.stopPropagation()
                  e.preventDefault()
                  const fn = d?.onDelete
                  if (typeof fn === 'function') fn()
                }}
                onPointerDown={e => e.stopPropagation()}
                style={{ opacity: showControls ? 1 : 0, pointerEvents: showControls ? 'auto' : 'none', transition: 'opacity 120ms' }}
                className="w-5 h-5 rounded-full bg-stone-700 hover:bg-red-600 border border-stone-500 hover:border-red-400 flex items-center justify-center shadow"
                title="Delete connection"
              >
                <X size={10} className="text-stone-300" />
              </button>
            </>
          )}

          {/* Route editor popover */}
          {editing && (
            <div
              className="bg-stone-900 border border-stone-600 rounded-lg shadow-2xl p-2.5 space-y-2 w-48"
              onPointerDown={e => e.stopPropagation()}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-stone-500 uppercase tracking-wider font-heading">Route</span>
                <button onClick={() => setEditing(false)} className="p-0.5 rounded text-stone-500 hover:text-stone-200">
                  <X size={11} />
                </button>
              </div>
              <input
                value={d.edge.label ?? ''}
                onChange={e => d.onUpdate({ label: e.target.value || undefined })}
                placeholder="e.g. 3 days north by sea"
                className="w-full bg-stone-800 border border-stone-700 rounded px-2 py-1 text-stone-200 text-xs outline-none focus:border-stone-500 placeholder:text-stone-600"
              />
              <div className="flex gap-1">
                {(['safe', 'risky', 'deadly'] as const).map(danger => (
                  <button
                    key={danger}
                    onClick={() => d.onUpdate({ travelDanger: d.edge.travelDanger === danger ? undefined : danger })}
                    className={`flex-1 px-1 py-1 rounded text-[10px] capitalize border transition-colors ${
                      d.edge.travelDanger === danger
                        ? 'border-current font-semibold'
                        : 'border-stone-700 text-stone-500 hover:border-stone-500'
                    }`}
                    style={d.edge.travelDanger === danger ? { color: DANGER_COLORS[danger] } : undefined}
                  >
                    {danger}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-stone-500 whitespace-nowrap">Travel days</label>
                <input
                  type="number" min={0} step={0.5}
                  value={travelDays ?? ''}
                  placeholder="—"
                  onChange={e => {
                    const v = e.target.value
                    d.onUpdate({ travelDays: v === '' ? undefined : Math.max(0, parseFloat(v) || 0) })
                  }}
                  className="w-14 bg-stone-800 border border-stone-700 rounded px-1.5 py-0.5 text-stone-200 text-xs outline-none focus:border-stone-500 font-mono tabular-nums placeholder:text-stone-600"
                />
              </div>
              <div className="text-[9px] text-stone-600 leading-snug">
                Days × danger feed market remoteness and ration planning.
              </div>
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
