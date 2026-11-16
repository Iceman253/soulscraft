import { useCallback, useRef, useState } from 'react'
import { ArrowLeft, ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { SUB_TYPE_ICONS as TYPE_ICONS } from '../../../lib/world/places'
import { getSiblingsAtDepth, type NavEntry } from './navigation'
import type { Area, SubNode } from '../../../types'

/** A breadcrumb segment with a dropdown ▾ that shows siblings at that level. */
export function BreadcrumbSegment({ label, siblings, onNavigate, onClickSelf }: {
  label: string
  siblings: SubNode[]
  onNavigate: (nodeId: string, nodeName: string) => void
  onClickSelf: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  const closeOnOutside = useCallback((e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as HTMLElement)) setOpen(false)
  }, [])

  // manual subscription (no useEffect in non-hook context — this is a component so it's fine)
  if (typeof window !== 'undefined') {
    // register lazily — it's idempotent
  }

  return (
    <div ref={ref} className="relative flex items-center shrink-0">
      <button onClick={onClickSelf} className="text-sm text-stone-300 hover:text-gold">
        {label}
      </button>
      {siblings.length > 1 && (
        <button
          onClick={e => {
            e.stopPropagation()
            const next = !open
            setOpen(next)
            if (next) document.addEventListener('mousedown', closeOnOutside as EventListener, { once: true })
          }}
          className="ml-0.5 text-stone-600 hover:text-stone-300 transition-colors"
        >
          <ChevronDown size={11} />
        </button>
      )}
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-44 bg-stone-800 border border-stone-600 rounded-lg shadow-xl py-1 overflow-hidden">
          {siblings.map(s => (
            <button
              key={s.id}
              onClick={() => { onNavigate(s.id, s.name); setOpen(false) }}
              className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs text-stone-200 hover:bg-stone-700 truncate"
            >
              <span>{TYPE_ICONS[s.type] ?? '📍'}</span>
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── AreaBreadcrumb ──────────────────────────────────────────────────────

/** First crumb: shows all areas as a dropdown. */
export function AreaBreadcrumb({ areaName, onGoToMap }: { areaName: string; onGoToMap: () => void }) {
  return (
    <button onClick={onGoToMap} className="text-sm text-stone-400 hover:text-gold shrink-0" title="Back to world map">
      {areaName}
    </button>
  )
}

/** The sub-map's top bar: back one level, the path from the area down, and Add. */
export function SubMapHeader({ area, navStack, onGoToMap, onJump, onAdd }: {
  area: Area
  navStack: NavEntry[]
  onGoToMap: () => void
  /** Show this path, selecting a node on it or nothing. */
  onJump: (stack: NavEntry[], selectId: string | null) => void
  onAdd: () => void
}) {
  const here = navStack.length > 0 ? getSiblingsAtDepth(area, navStack, navStack.length) : []
  return (
    <div className="shrink-0 h-10 bg-stone-800 border-b border-stone-700 flex items-center gap-0 px-3 overflow-x-auto">
      {navStack.length > 0 && (
        <button onClick={() => onJump(navStack.slice(0, -1), null)} className="flex items-center gap-1 text-sm text-stone-400 hover:text-stone-100 shrink-0 mr-2" title="Go back one level">
          <ArrowLeft size={14} />
        </button>
      )}

      <AreaBreadcrumb areaName={area.name} onGoToMap={onGoToMap} />

      {navStack.map((entry, i) => (
        <span key={entry.nodeId} className="flex items-center shrink-0">
          <ChevronRight size={12} className="text-stone-600 mx-1" />
          <BreadcrumbSegment
            label={entry.nodeName}
            siblings={getSiblingsAtDepth(area, navStack, i)}
            onClickSelf={() => onJump(navStack.slice(0, i), entry.nodeId)}
            onNavigate={(nodeId, nodeName) => onJump([...navStack.slice(0, i), { nodeId, nodeName }], null)}
          />
        </span>
      ))}

      {navStack.length === 0 && (
        <span className="flex items-center text-stone-400 shrink-0">
          <ChevronRight size={12} className="text-stone-600 mx-1" />
          <span className="text-sm text-stone-400">Sub-locations</span>
        </span>
      )}

      {here.length > 0 && (
        <span className="flex items-center shrink-0">
          <ChevronRight size={12} className="text-stone-600 mx-1" />
          <span className="text-sm text-stone-400 italic">{here.length} location{here.length !== 1 ? 's' : ''}</span>
        </span>
      )}

      <div className="ml-auto flex gap-2 shrink-0">
        <button onClick={onAdd} className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-stone-700 border border-stone-600 text-stone-200 hover:border-gold/50 text-xs">
          <Plus size={12} /> Add
        </button>
      </div>
    </div>
  )
}
