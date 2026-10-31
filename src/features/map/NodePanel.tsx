import { useState, useMemo } from 'react'
import { X, Trash2, ChevronRight, Store, Pickaxe, Hammer } from 'lucide-react'
import { useWorldStore } from './store'
import { useCharacterStore } from '../characters/store'
import { useItemStore } from '../items/store'
import { useEconomyStore } from '../economy/store'
import { TokenAvatar } from '../../ui/TokenAvatar'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import { AREA_TYPES, REALMS } from '../../lib/constants'
import { defaultMarketForArea } from '../../lib/economyEngine'
import { COMMON_MATERIALS, PROJECT_TIERS, structureProgress } from '../../lib/building'
import { useBuildStore } from '../building/store'
import { placementLabel } from '../../lib/places'
import { PixelIcon } from '../building/PixelIcon'
import type { Area } from '../../types'

const PROSPERITY_LABELS = ['Destitute', 'Poor', 'Modest', 'Comfortable', 'Wealthy']
const SIZE_LABELS = ['Hamlet', 'Village', 'Town', 'City', 'Metropolis']

interface NodePanelProps {
  area: Area
  onClose: () => void
  onOpenSubMap: () => void
  onSelectStructure?: (id: string) => void
  onPlanBuild?: () => void
  onMine?: () => void
}

export function NodePanel({ area, onClose, onOpenSubMap, onSelectStructure, onPlanBuild, onMine }: NodePanelProps) {
  const { updateArea, deleteArea, areas, edges } = useWorldStore()
  const allCharacters = useCharacterStore(s => s.characters)
  const characters = useMemo(() => allCharacters.filter(c => c.locationId === area.id), [allCharacters, area.id])
  const allItems = useItemStore(s => s.items)
  const items = useMemo(() => allItems.filter(i => i.location.kind === 'area' && i.location.areaId === area.id), [allItems, area.id])
  const { economy, addMarket } = useEconomyStore()
  const market = economy.markets.find(m => m.areaId === area.id) ?? null
  const routes = useMemo(() => edges
    .filter(e => e.sourceId === area.id || e.targetId === area.id)
    .map(e => {
      const otherId = e.sourceId === area.id ? e.targetId : e.sourceId
      return { edge: e, other: areas.find(a => a.id === otherId) }
    })
    .filter(r => r.other), [edges, areas, area.id])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const allStructures = useBuildStore(s => s.structures)
  const structures = useMemo(() => allStructures.filter(s => s.areaId === area.id), [allStructures, area.id])
  const materials = area.materials ?? []
  const [newMaterial, setNewMaterial] = useState('')
  const [showMaterialPicker, setShowMaterialPicker] = useState(false)
  const addMaterial = (m: string) => {
    const name = m.trim()
    if (name && !materials.some(x => x.toLowerCase() === name.toLowerCase())) updateArea(area.id, { materials: [...materials, name] })
  }
  const removeMaterial = (m: string) => updateArea(area.id, { materials: materials.filter(x => x !== m) })

  return (
    <div className="h-full bg-stone-800 border-l border-stone-700 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-700 shrink-0">
        <h3 className="font-semibold text-stone-100 truncate max-w-48">{area.name}</h3>
        <div className="flex items-center gap-1">
          <button onClick={onOpenSubMap} className="flex items-center gap-1 px-2 py-1 rounded-sm text-xs text-stone-400 hover:text-gold hover:bg-stone-700">
            Sub-map <ChevronRight size={12} />
          </button>
          <button onClick={() => setConfirmDelete(true)} className="p-1.5 rounded-sm text-stone-500 hover:text-red-400 hover:bg-stone-700">
            <Trash2 size={14} />
          </button>
          <button onClick={onClose} className="p-1.5 rounded-sm text-stone-500 hover:text-stone-100 hover:bg-stone-700">
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
            className="w-full bg-stone-900 border border-stone-600 rounded-sm px-2 py-1.5 text-stone-100 text-sm outline-hidden focus:border-gold/50"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-stone-500 mb-1">Type</label>
            <select value={area.type} onChange={e => updateArea(area.id, { type: e.target.value as Area['type'] })} className="w-full bg-stone-900 border border-stone-600 rounded-sm px-2 py-1.5 text-stone-200 text-xs outline-hidden">
              {AREA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">Realm</label>
            <select value={area.realm} onChange={e => updateArea(area.id, { realm: e.target.value as Area['realm'] })} className="w-full bg-stone-900 border border-stone-600 rounded-sm px-2 py-1.5 text-stone-200 text-xs outline-hidden">
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
            className="w-full bg-stone-900 border border-stone-600 rounded-sm px-2 py-1.5 text-stone-200 text-sm outline-hidden focus:border-gold/50 resize-none"
          />
        </div>

        {/* Mining — what can be mined here (Guidebook p.81) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-stone-500 uppercase tracking-wider font-heading">Mineable here</div>
            {onMine && (
              <button onClick={onMine} className="flex items-center gap-1 text-[11px] text-stone-400 hover:text-gold">
                <Pickaxe size={11} /> Go mining
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {materials.map(m => (
              <span key={m} className="flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-stone-900 border border-stone-600 text-xs text-stone-300">
                {m}
                <button onClick={() => removeMaterial(m)} className="text-stone-600 hover:text-red-400" title={`Remove ${m}`}><X size={10} /></button>
              </span>
            ))}
            <button onClick={() => setShowMaterialPicker(v => !v)} className="px-2 py-0.5 rounded-full border border-dashed border-stone-600 text-xs text-stone-500 hover:text-stone-200">
              {showMaterialPicker ? 'Done' : '+ Material'}
            </button>
          </div>
          {materials.length === 0 && !showMaterialPicker && (
            <div className="text-[10px] text-stone-600 mt-1">Players can only mine what the place has — a forest for wood, a mineshaft for ore.</div>
          )}
          {showMaterialPicker && (
            <div className="mt-2 space-y-1.5">
              <div className="flex flex-wrap gap-1">
                {COMMON_MATERIALS.filter(m => !materials.some(x => x.toLowerCase() === m.toLowerCase())).map(m => (
                  <button key={m} onClick={() => addMaterial(m)} className="px-1.5 py-0.5 rounded-sm border border-stone-700 text-[11px] text-stone-400 hover:text-gold hover:border-gold/40">{m}</button>
                ))}
              </div>
              <input
                value={newMaterial}
                onChange={e => setNewMaterial(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { addMaterial(newMaterial); setNewMaterial('') } }}
                placeholder="Other material, then Enter"
                className="w-full bg-stone-900 border border-stone-600 rounded-sm px-2 py-1 text-stone-100 text-xs outline-hidden focus:border-gold/50"
              />
            </div>
          )}
        </div>

        {/* Builds */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-stone-500 uppercase tracking-wider font-heading">Builds</div>
            {onPlanBuild && (
              <button onClick={onPlanBuild} className="flex items-center gap-1 text-[11px] text-stone-400 hover:text-gold">
                <Hammer size={11} /> Plan a build
              </button>
            )}
          </div>
          {structures.length === 0 ? (
            <div className="text-[10px] text-stone-600">Nothing built here yet.</div>
          ) : (
            <div className="space-y-1">
              {structures.map(st => {
                const p = structureProgress(st)
                return (
                  <button key={st.id} onClick={() => onSelectStructure?.(st.id)} className="w-full flex items-center gap-2 px-1.5 py-1 rounded-sm hover:bg-stone-700/60 text-left">
                    <PixelIcon icon={st.icon} tier={st.tier} size={22} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-stone-200 truncate">{st.name}</div>
                      <div className="text-[10px] text-stone-500">
                        {PROJECT_TIERS[st.tier].label} · {st.subNodeId !== undefined ? `${placementLabel(st, areas)} · ` : ''}{p.status === 'complete' ? 'complete' : `${Math.round(p.fraction * 100)}% built`}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Market */}
        <div>
          <div className="text-xs text-stone-500 mb-2 uppercase tracking-wider font-heading">Market</div>
          {market ? (
            <div className="bg-stone-900/60 border border-stone-700/60 rounded-lg p-2.5 space-y-1">
              <div className="flex items-center gap-1.5 text-sm text-stone-200">
                <Store size={13} className="text-amber-500/80" /> {market.name}
              </div>
              <div className="text-[11px] text-stone-500">
                {SIZE_LABELS[market.size - 1]} · {PROSPERITY_LABELS[market.prosperity - 1].toLowerCase()} · {market.listings.length} wares stocked
              </div>
              <div className="text-[10px] text-stone-600">Prices & stock live in the Economy tab.</div>
            </div>
          ) : (
            <button
              onClick={() => addMarket(defaultMarketForArea(area))}
              className="w-full flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border border-dashed border-stone-600 text-xs text-stone-400 hover:text-amber-200 hover:border-amber-700/60 transition-colors"
            >
              <Store size={12} /> Establish market here
            </button>
          )}
        </div>

        {/* Routes from here */}
        {routes.length > 0 && (
          <div>
            <div className="text-xs text-stone-500 mb-2 uppercase tracking-wider font-heading">Routes</div>
            <div className="space-y-1">
              {routes.map(({ edge, other }) => (
                <div key={edge.id} className="flex items-center justify-between text-xs text-stone-400">
                  <span className="truncate">→ {other!.name}</span>
                  <span className="shrink-0 font-mono tabular-nums text-stone-500">
                    {edge.travelDays !== undefined ? `${edge.travelDays}d` : '?d'}
                    {edge.travelDanger && edge.travelDanger !== 'safe' && (
                      <span className={edge.travelDanger === 'deadly' ? ' text-red-400' : ' text-amber-400'}> · {edge.travelDanger}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
            {characters.length > 0 && routes.some(r => r.edge.travelDays !== undefined) && (
              <div className="text-[10px] text-stone-600 mt-1.5 leading-snug">
                Rations needed ({characters.length} traveler{characters.length > 1 ? 's' : ''}):{' '}
                {routes
                  .filter(r => r.edge.travelDays !== undefined)
                  .map(({ edge, other }) => `${other!.name}: ${Math.ceil((edge.travelDays ?? 0) * characters.length)}`)
                  .join(' · ')}
              </div>
            )}
          </div>
        )}

        {/* Characters here */}
        {characters.length > 0 && (
          <div>
            <div className="text-xs text-stone-500 mb-2 uppercase tracking-wider font-heading">Characters Here</div>
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
            <div className="text-xs text-stone-500 mb-2 uppercase tracking-wider font-heading">Items Here</div>
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
