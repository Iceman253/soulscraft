// Side panel for editing the selected sub-location.
import { ChevronRight } from 'lucide-react'
import { useWorldStore } from '../store'
import { useCharacterStore } from '../../characters/store'
import { TokenAvatar } from '../../../ui/TokenAvatar'
import { MaterialsEditor } from '../MaterialsEditor'
import { SUB_NODE_TYPES } from '../../../lib/rules/constants'
import { getSubtreeCharacters } from './navigation'
import type { SubNode } from '../../../types'

interface Props {
  node: SubNode
  areaId: string
  path: string[]
  canGoDeeper: boolean
  onDeleted: () => void
  onOpenSubMap: () => void
  onPlaceCharacters: () => void
  onCharNavigate: (subLocationId: string) => void
}

export function SubNodePanel({ node, areaId, path, canGoDeeper, onDeleted, onOpenSubMap, onPlaceCharacters, onCharNavigate }: Props) {
  const { deleteSubNode, updateSubNode } = useWorldStore()
  const characters = useCharacterStore(s => s.characters)
  return (
    <div className="w-64 shrink-0 border-l border-stone-700 bg-stone-800 p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-stone-100 text-sm">{node.name}</span>
        <button
          onClick={() => { deleteSubNode(areaId, node.id, path); onDeleted() }}
          className="text-xs text-red-400 hover:text-red-300"
        >
          Delete
        </button>
      </div>
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-stone-500 mb-1">Name</label>
          <input
            value={node.name}
            onChange={e => updateSubNode(areaId, node.id, { name: e.target.value }, path)}
            className="w-full bg-stone-900 border border-stone-600 rounded-sm px-2 py-1.5 text-stone-100 text-xs outline-hidden focus:border-gold/50"
          />
        </div>
        <div>
          <label className="block text-xs text-stone-500 mb-1">Type</label>
          <select
            value={node.type}
            onChange={e => updateSubNode(areaId, node.id, { type: e.target.value as SubNode['type'] }, path)}
            className="w-full bg-stone-900 border border-stone-600 rounded-sm px-2 py-1.5 text-stone-200 text-xs outline-hidden"
          >
            {SUB_NODE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        {node.type === 'mine' && (
          <div>
            <div className="text-xs text-stone-500 mb-1">Mineable here</div>
            <MaterialsEditor
              materials={node.materials ?? []}
              onChange={materials => updateSubNode(areaId, node.id, { materials }, path)}
            />
          </div>
        )}
        <div>
          <label className="block text-xs text-stone-500 mb-1">Notes</label>
          <textarea
            value={node.description ?? ''}
            onChange={e => updateSubNode(areaId, node.id, { description: e.target.value }, path)}
            rows={4}
            className="w-full bg-stone-900 border border-stone-600 rounded-sm px-2 py-1.5 text-stone-200 text-xs outline-hidden resize-none"
          />
        </div>
        <div className="flex gap-2">
          {canGoDeeper && (
            <button
              onClick={() => { onOpenSubMap() }}
              className="flex-1 px-2 py-1.5 rounded-sm bg-stone-700 text-stone-300 hover:bg-stone-600 text-xs"
            >
              Open Sub-map
            </button>
          )}
          <button
            onClick={() => onPlaceCharacters()}
            className="flex-1 px-2 py-1.5 rounded-sm bg-stone-700 text-stone-300 hover:bg-stone-600 text-xs"
          >
            Place Characters
          </button>
        </div>
        {characters.filter(c => c.subLocationId === node.id).length > 0 && (
          <div>
            <div className="text-xs text-stone-500 mb-1">At this location</div>
            {characters.filter(c => c.subLocationId === node.id).map(c => (
              <div key={c.id} className="flex items-center gap-1.5 text-xs text-stone-300 mb-1">
                <TokenAvatar name={c.name} characterId={c.id} size={16} />
                {c.name}
              </div>
            ))}
          </div>
        )}
        {(() => {
          const descendantChars = getSubtreeCharacters(node, characters).filter(c => c.subLocationId !== node.id)
          if (descendantChars.length === 0) return null
          return (
            <div>
              <div className="text-xs text-stone-500 mb-1">In sub-locations</div>
              {descendantChars.map(c => (
                <button key={c.id} onClick={() => onCharNavigate(c.subLocationId!)}
                  className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-100 mb-1 w-full text-left">
                  <TokenAvatar name={c.name} characterId={c.id} size={16} />
                  {c.name} <ChevronRight size={10} className="ml-auto opacity-50" />
                </button>
              ))}
            </div>
          )
        })()}
      </div>
    </div>
  )
}
