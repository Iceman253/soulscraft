import { useMemo, useState } from 'react'
import { Pencil } from 'lucide-react'
import { useBuildStore } from './store'
import { useWorldStore } from '../map/store'
import { Modal } from '../../ui/Modal'
import { PixelIcon } from './PixelIcon'
import { PixelEditor } from './PixelEditor'
import { PROJECT_TIERS, structureProgress } from '../../lib/building'

/** Player-facing list of the builds a character is working on. Players draw
 *  each build's map icon here; the GM handles requirements and progress. */
export function MyBuilds({ characterId }: { characterId: string }) {
  const allStructures = useBuildStore(s => s.structures)
  const updateStructure = useBuildStore(s => s.updateStructure)
  const areas = useWorldStore(s => s.areas)
  const structures = useMemo(() => allStructures.filter(s => s.builderIds.includes(characterId)), [allStructures, characterId])
  const [editingId, setEditingId] = useState<string | null>(null)
  const editing = structures.find(s => s.id === editingId)

  if (structures.length === 0) {
    return <div className="text-xs text-stone-500 italic">No builds yet — when the GM starts a Building phase with you as a builder, you can draw its map icon here.</div>
  }

  return (
    <div className="space-y-2">
      {structures.map(s => {
        const p = structureProgress(s)
        const area = areas.find(a => a.id === s.areaId)
        return (
          <div key={s.id} className="flex items-center gap-3 rounded-xl bg-stone-800 border border-stone-700 px-3 py-2.5">
            <button onClick={() => setEditingId(s.id)} title="Draw the map icon"
              className="relative shrink-0 rounded-lg border border-stone-600 bg-stone-900 p-1 active:border-gold/60 hover:border-gold/60">
              <PixelIcon icon={s.icon} tier={s.tier} size={40} />
              <span className="absolute -bottom-1.5 -right-1.5 rounded-full bg-stone-700 border border-stone-500 p-1 text-stone-200"><Pencil size={10} /></span>
            </button>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-stone-100 truncate">{s.name}</div>
              <div className="text-xs text-stone-500 truncate">
                {PROJECT_TIERS[s.tier].label}{area ? ` · ${area.name}` : ''}
              </div>
              {p.status === 'complete' ? (
                <div className="text-xs text-emerald mt-0.5">🏰 Complete</div>
              ) : (
                <div className="mt-1 space-y-0.5">
                  <div className="h-1.5 rounded bg-stone-900 overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: `${Math.round(p.fraction * 100)}%` }} />
                  </div>
                  <div className="text-[11px] text-stone-500">
                    {s.blocksCommitted}/{s.blocksRequired} blocks · {s.daysWorked}/{s.daysRequired} days
                    {s.redstoneRequired > 0 ? ` · ${s.redstoneCommitted}/${s.redstoneRequired} redstone` : ''}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })}

      {editing && (
        <Modal title={`Draw: ${editing.name}`} onClose={() => setEditingId(null)}>
          <PixelEditor
            initial={editing.icon}
            onCancel={() => setEditingId(null)}
            onSave={icon => { updateStructure(editing.id, { icon }); setEditingId(null) }}
          />
        </Modal>
      )}
    </div>
  )
}
