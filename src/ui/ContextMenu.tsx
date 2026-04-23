import { useEffect, useRef, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { useCharacterStore } from '../features/characters/store'
import { TokenAvatar } from './TokenAvatar'

// ── Item types ───────────────────────────────────────────────────────────

export interface ActionItem {
  type?: 'action'
  label: string
  icon?: string
  onClick: () => void
  danger?: boolean
  disabled?: boolean
}

export interface SeparatorItem {
  label: '---'
  onClick?: () => void
}

/** Expanding character picker — shows all characters as checkboxes on hover,
 *  applies when mouse leaves the whole context-menu + submenu area. */
export interface CharPickerItem {
  type: 'char-picker'
  label: string
  icon?: string
  /** Characters already present at this location (pre-checked). */
  presentIds: string[]
  onApply: (ids: string[]) => void
}

export type ContextMenuItem = ActionItem | SeparatorItem | CharPickerItem

// ── ContextMenu ──────────────────────────────────────────────────────────

interface ContextMenuProps {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [activeSubmenu, setActiveSubmenu] = useState<number | null>(null)

  // Close on outside click
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onClose])

  // Clamp to viewport (account for submenu width)
  const menuLeft = Math.min(x, window.innerWidth - 210)
  const menuTop  = Math.min(y, window.innerHeight - items.length * 36 - 16)

  const clearLeave = () => { if (leaveTimer.current) clearTimeout(leaveTimer.current) }
  const startLeave = () => { leaveTimer.current = setTimeout(() => setActiveSubmenu(null), 120) }

  return (
    <div
      ref={rootRef}
      style={{ position: 'fixed', left: menuLeft, top: menuTop, zIndex: 9999 }}
      className="flex"
      onMouseLeave={startLeave}
      onMouseEnter={clearLeave}
      onContextMenu={e => e.preventDefault()}
    >
      {/* Main menu */}
      <div className="w-52 bg-stone-800 border border-stone-600 rounded-lg shadow-2xl py-1 overflow-hidden">
        {items.map((item, i) => {
          if (item.label === '---') {
            return <div key={i} className="my-1 border-t border-stone-700" />
          }

          if ('type' in item && item.type === 'char-picker') {
            return (
              <div
                key={i}
                onMouseEnter={() => { clearLeave(); setActiveSubmenu(i) }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left cursor-default transition-colors ${
                  activeSubmenu === i ? 'bg-stone-700 text-stone-100' : 'text-stone-200 hover:bg-stone-700'
                }`}
              >
                {item.icon && <span className="text-base leading-none">{item.icon}</span>}
                <span className="flex-1">{item.label}</span>
                <ChevronRight size={12} className="text-stone-500" />
              </div>
            )
          }

          // Normal action item
          const a = item as ActionItem
          return (
            <button
              key={i}
              onClick={() => { a.onClick(); onClose() }}
              onMouseEnter={() => { clearLeave(); setActiveSubmenu(null) }}
              disabled={a.disabled}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                a.danger ? 'text-red-400 hover:bg-red-900/30' : 'text-stone-200 hover:bg-stone-700'
              }`}
            >
              {a.icon && <span className="text-base leading-none">{a.icon}</span>}
              {a.label}
            </button>
          )
        })}
      </div>

      {/* Character picker submenu */}
      {activeSubmenu !== null && (() => {
        const item = items[activeSubmenu]
        if (!('type' in item) || item.type !== 'char-picker') return null
        const submenuLeft = window.innerWidth - menuLeft < 260 ? -208 : 200
        return (
          <CharPickerSubmenu
            item={item}
            style={{ position: 'absolute', left: submenuLeft, top: 0, zIndex: 10000 }}
            onClose={onClose}
            onMouseEnter={clearLeave}
            onMouseLeave={startLeave}
          />
        )
      })()}
    </div>
  )
}

// ── CharPickerSubmenu ────────────────────────────────────────────────────

function CharPickerSubmenu({ item, style, onClose, onMouseEnter, onMouseLeave }: {
  item: CharPickerItem
  style: React.CSSProperties
  onClose: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
}) {
  const allChars = useCharacterStore(s => s.characters)
  const [checked, setChecked] = useState<Set<string>>(() => new Set(item.presentIds))

  const toggle = (id: string) => setChecked(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const apply = () => {
    item.onApply([...checked])
    onClose()
  }

  return (
    <div
      style={style}
      className="w-52 bg-stone-800 border border-stone-600 rounded-lg shadow-2xl py-1 overflow-hidden"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="px-3 py-1.5 text-xs text-stone-500 border-b border-stone-700 mb-1">
        Select characters
      </div>
      {allChars.length === 0 && (
        <div className="px-3 py-2 text-xs text-stone-500 italic">No characters</div>
      )}
      {allChars.map(c => (
        <label
          key={c.id}
          className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer hover:bg-stone-700 transition-colors"
        >
          <input
            type="checkbox"
            checked={checked.has(c.id)}
            onChange={() => toggle(c.id)}
            className="accent-gold w-3.5 h-3.5 shrink-0"
          />
          <TokenAvatar name={c.name} characterId={c.id} size={18} />
          <span className="text-sm text-stone-200 truncate">{c.name}</span>
        </label>
      ))}
      <div className="border-t border-stone-700 mt-1 px-3 py-1.5 flex justify-end">
        <button
          onClick={apply}
          className="text-xs px-2.5 py-1 rounded bg-gold text-stone-900 font-semibold hover:bg-yellow-400"
        >
          Apply
        </button>
      </div>
    </div>
  )
}
