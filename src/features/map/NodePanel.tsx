import { useState, useMemo } from 'react'
import { X, Trash2, ChevronRight } from 'lucide-react'
import { useWorldStore } from './store'
import { useCharacterStore } from '../characters/store'
import { useItemStore } from '../items/store'
import { TokenAvatar } from '../../ui/TokenAvatar'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import { AREA_TYPES, REALMS } from '../../lib/constants'
import type { Area } from '../../types'

interface NodePanelProps {
  area: Area
  onClose: () => void
  onOpenSubMap: () => void
}

export function NodePanel({ area, onClose, onOpenSubMap }: NodePanelProps) {
  const { updateArea, deleteArea } = useWorldStore()
  const allCharacters = useCharacterStore(s => s.characters)
  const characters = useMemo(() => allCharacters.filter(c => c.locationId === area.id), [allCharacters, area.id])
  const allItems = useItemStore(s => s.items)
  const items = useMemo(() => allItems.filter(i => i.location.kind === 'area' && i.location.areaId === area.id), [allItems, area.id])
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className="h-full bg-stone-800 border-l border-stone-700 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-700 shrink-0">
        <h3 className="font-semibold text-stone-100 truncate max-w-48">{area.name}</h3>
        <div className="flex items-center gap-1">
          <button onClick={onOpenSubMap} className="flex items-center gap-1 px-2 py-1 rounded text-xs text-stone-400 hover:text-gold hover:bg-stone-700">
            Sub-map <ChevronRight size={12} />
          </button>
          <button onClick={() => setConfirmDelete(true)} className="p-1.5 rounded text-stone-500 hover:text-red-400 hover:bg-stone-700">
            <Trash2 size={14} />
          </button>
          <button onClick={onClose} className="p-1.5 rounded text-stone-500 hover:text-stone-100 hover:bg-stone-700">
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Name */}
        <div>
          <label className="block text-xs text-stone-500 mb-1">Name</label>
          <input
            value={area.name}
            onChange={e => updateArea(area.id, { name: e.target.value })}
            className="w-full bg-stone-900 border border-stone-600 rounded px-2 py-1.5 text-stone-100 text-sm outline-none focus:border-gold/50"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-stone-500 mb-1">Type</label>
            <select value={area.type} onChange={e => updateArea(area.id, { type: e.target.value as Area['type'] })} className="w-full bg-stone-900 border border-stone-600 rounded px-2 py-1.5 text-stone-200 text-xs outline-none">
              {AREA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">Realm</label>
            <select value={area.realm} onChange={e => updateArea(area.id, { realm: e.target.value as Area['realm'] })} className="w-full bg-stone-900 border border-stone-600 rounded px-2 py-1.5 text-stone-200 text-xs outline-none">
              {REALMS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs text-stone-500 mb-1">Description</label>
          <textarea
            value={area.description}
            onChange={e => updateArea(area.id, { description: e.target.value })}
            rows={4}
            className="w-full bg-stone-900 border border-stone-600 rounded px-2 py-1.5 text-stone-200 text-sm outline-none focus:border-gold/50 resize-none"
          />
        </div>

        {/* Characters here */}
        {characters.length > 0 && (
          <div>
            <div className="text-xs text-stone-500 mb-2 uppercase tracking-wider">Characters Here</div>
            <div className="space-y-1">
              {characters.map(c => (
                <div key={c.id} className="flex items-center gap-2 text-sm text-stone-300">
                  <TokenAvatar name={c.name} characterId={c.id} size={20} />
                  {c.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Items here */}
        {items.length > 0 && (
          <div>
            <div className="text-xs text-stone-500 mb-2 uppercase tracking-wider">Items Here</div>
            <div className="space-y-1">
              {items.map(item => (
                <div key={item.id} className="text-sm text-stone-300">{item.quantity}× {item.name}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Delete Area"
          message={`Delete "${area.name}"? This will also remove all connected edges.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => { deleteArea(area.id); onClose() }}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </div>
  )
}
