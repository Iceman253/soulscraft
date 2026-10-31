import { useMemo, useState } from 'react'
import { X, Trash2, Pencil, RotateCcw } from 'lucide-react'
import { useBuildStore } from './store'
import { useCharacterStore } from '../characters/store'
import { useWorldStore } from '../map/store'
import { Modal } from '../../ui/Modal'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import { TokenAvatar } from '../../ui/TokenAvatar'
import { PixelIcon } from './PixelIcon'
import { PixelEditor } from './PixelEditor'
import { PROJECT_TIERS, PROJECT_TIER_ORDER, projectRequirements, isArchitect, structureProgress, countBlocks } from '../../lib/building'
import { allPlaceOptions, defaultPositionFor, placeOptionValue } from '../../lib/places'
import type { ProjectTier } from '../../types'

const inputCls = 'w-full bg-stone-900 border border-stone-600 rounded px-2 py-1.5 text-stone-100 text-sm outline-none focus:border-gold/50'
const numCls = 'w-16 bg-stone-900 border border-stone-600 rounded px-2 py-1 text-stone-100 text-xs font-mono outline-none focus:border-gold/50'
const sectionCls = 'text-xs text-stone-500 mb-2 uppercase tracking-wider font-heading'

function Bar({ label, have, need, unit }: { label: string; have: number; need: number; unit: string }) {
  const pct = need > 0 ? Math.min(100, (have / need) * 100) : 100
  return (
    <div>
      <div className="flex justify-between text-xs mb-0.5">
        <span className="text-stone-400">{label}</span>
        <span className={`font-mono ${have >= need ? 'text-emerald' : 'text-stone-300'}`}>{have}/{need} {unit}</span>
      </div>
      <div className="h-1.5 rounded bg-stone-900 overflow-hidden">
        <div className={`h-full ${have >= need ? 'bg-emerald' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

/** GM sidebar for one structure: plan, requirements, progress, icon. */
export function StructurePanel({ structureId, onClose }: { structureId: string; onClose: () => void }) {
  const s = useBuildStore(st => st.structures.find(x => x.id === structureId))
  const { updateStructure, setTier, resetRequirements, deleteStructure, commitBlocks, addProgress, setCompleted } = useBuildStore()
  const characters = useCharacterStore(st => st.characters)
  const areas = useWorldStore(st => st.areas)
  const living = useMemo(() => characters.filter(c => !c.isDead), [characters])
  const placeOptions = useMemo(() => allPlaceOptions(areas), [areas])

  const [editingIcon, setEditingIcon] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [giverId, setGiverId] = useState('')
  const [giveAmount, setGiveAmount] = useState<number | ''>('')
  const [extraBlocks, setExtraBlocks] = useState<number | ''>('')
  const [extraRedstone, setExtraRedstone] = useState<number | ''>('')
  const [extraDays, setExtraDays] = useState<number | ''>('')
  const [flash, setFlash] = useState<string | null>(null)

  if (!s) return null
  const progress = structureProgress(s)
  const builders = living.filter(c => s.builderIds.includes(c.id))
  const architect = builders.some(isArchitect)
  const rulebook = projectRequirements(s.tier, architect)
  const offRulebook = rulebook.blocks !== s.blocksRequired || rulebook.days !== s.daysRequired || rulebook.redstone !== s.redstoneRequired
  const giver = living.find(c => c.id === (giverId || builders[0]?.id)) ?? null
  const giverBlocks = giver ? countBlocks(giver.storage.items) + countBlocks(giver.onHand.items) : 0
  const blocksLeft = Math.max(0, s.blocksRequired - s.blocksCommitted)

  const toggleBuilder = (id: string) =>
    updateStructure(s.id, { builderIds: s.builderIds.includes(id) ? s.builderIds.filter(x => x !== id) : [...s.builderIds, id] })

  const movePlace = (value: string) => {
    const option = placeOptions.find(o => o.value === value)
    if (!option) return
    const { areaId, subNodeId } = option.placement
    updateStructure(s.id, { areaId, subNodeId, position: defaultPositionFor(option.placement, useBuildStore.getState().structures.filter(x => x.id !== s.id), areas) })
  }

  const give = () => {
    if (!giver) return
    const amount = giveAmount === '' ? Math.min(blocksLeft, giverBlocks) : giveAmount
    const taken = commitBlocks(s.id, giver.id, amount)
    setFlash(taken > 0 ? `${giver.name} put in ${taken} block${taken === 1 ? '' : 's'}.` : `${giver.name} has no blocks to give.`)
    setGiveAmount('')
    setTimeout(() => setFlash(null), 2500)
  }

  return (
    <div className="h-full bg-stone-800 border-l border-stone-700 flex flex-col">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-stone-700 shrink-0">
        <PixelIcon icon={s.icon} tier={s.tier} size={24} />
        <h3 className="font-semibold text-stone-100 truncate flex-1">{s.name}</h3>
        <button onClick={() => setConfirmDelete(true)} className="p-1.5 rounded text-stone-500 hover:text-red-400 hover:bg-stone-700" title="Delete build">
          <Trash2 size={14} />
        </button>
        <button onClick={onClose} className="p-1.5 rounded text-stone-500 hover:text-stone-100 hover:bg-stone-700">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Icon + name */}
        <div className="flex gap-3 items-start">
          <button onClick={() => setEditingIcon(true)} title="Draw this build's map icon"
            className="group relative shrink-0 rounded border border-stone-600 bg-stone-900 p-1.5 hover:border-gold/60">
            <PixelIcon icon={s.icon} tier={s.tier} size={56} />
            <span className="absolute -bottom-1.5 -right-1.5 rounded-full bg-stone-700 border border-stone-500 p-1 text-stone-200 group-hover:text-gold"><Pencil size={10} /></span>
          </button>
          <div className="flex-1 min-w-0 space-y-2">
            <input value={s.name} onChange={e => updateStructure(s.id, { name: e.target.value })} className={inputCls} />
            <select value={placeOptionValue(s)} onChange={e => movePlace(e.target.value)} className={`${inputCls} text-xs`}>
              {placeOptions.map(o => <option key={o.value} value={o.value}>{'\u00A0\u00A0'.repeat(o.depth)}{o.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs text-stone-500 mb-1">Project size</label>
          <select value={s.tier} onChange={e => setTier(s.id, e.target.value as ProjectTier)} className={inputCls}>
            {PROJECT_TIER_ORDER.map(t => {
              const info = PROJECT_TIERS[t]
              return <option key={t} value={t}>{info.label} — {info.blocks} blocks{info.redstone ? ` + ${info.redstone} redstone` : ''}, {info.days}d</option>
            })}
          </select>
          <div className="text-[10px] text-stone-500 mt-0.5">e.g. {PROJECT_TIERS[s.tier].examples}</div>
        </div>

        <div>
          <label className="block text-xs text-stone-500 mb-1">Description</label>
          <textarea value={s.description} onChange={e => updateStructure(s.id, { description: e.target.value })} rows={3}
            placeholder="Three high towers, a drawbridge and a moat…"
            className="w-full bg-stone-900 border border-stone-600 rounded px-2 py-1.5 text-stone-200 text-sm outline-none focus:border-gold/50 resize-none" />
        </div>

        {/* Builders */}
        <div>
          <div className={sectionCls}>Builders</div>
          {living.length === 0 ? <div className="text-xs text-stone-500 italic">No characters.</div> : (
            <div className="flex flex-wrap gap-1.5">
              {living.map(c => {
                const on = s.builderIds.includes(c.id)
                return (
                  <button key={c.id} onClick={() => toggleBuilder(c.id)}
                    className={`flex items-center gap-1 pl-0.5 pr-2 py-0.5 rounded-full border text-xs ${on ? 'border-gold/60 bg-gold/10 text-stone-100' : 'border-stone-600 text-stone-500 hover:text-stone-300'}`}>
                    <TokenAvatar name={c.name} characterId={c.id} size={18} />
                    {c.name}{isArchitect(c) ? ' 📐' : ''}
                  </button>
                )
              })}
            </div>
          )}
          {architect && <div className="text-[11px] text-teal-300 mt-1.5">📐 Architect Edge: half the blocks and time, rounded down.</div>}
        </div>

        {/* Requirements */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className={sectionCls + ' mb-0'}>Requirements</div>
            {offRulebook && (
              <button onClick={() => resetRequirements(s.id)} className="flex items-center gap-1 text-[11px] text-stone-400 hover:text-gold" title="Back to the rulebook values for this size">
                <RotateCcw size={11} /> Rulebook ({rulebook.blocks} / {rulebook.days}d)
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-stone-400">
            <label className="flex items-center gap-1.5">Blocks <input type="number" min={0} value={s.blocksRequired} onChange={e => updateStructure(s.id, { blocksRequired: Math.max(0, parseInt(e.target.value) || 0) })} className={numCls} /></label>
            <label className="flex items-center gap-1.5">Days <input type="number" min={0} value={s.daysRequired} onChange={e => updateStructure(s.id, { daysRequired: Math.max(0, parseFloat(e.target.value) || 0) })} className={numCls} /></label>
            {(s.redstoneRequired > 0 || s.tier === 'redstone') && (
              <label className="flex items-center gap-1.5">Redstone <input type="number" min={0} value={s.redstoneRequired} onChange={e => updateStructure(s.id, { redstoneRequired: Math.max(0, parseInt(e.target.value) || 0) })} className={numCls} /></label>
            )}
          </div>
          <div className="text-[10px] text-stone-500 mt-1 leading-snug">Optimize progress: lower these when the party gets help (the rulebook's villagers cut a 16-day castle to 5).</div>
        </div>

        {/* Progress */}
        <div className="space-y-2.5">
          <div className={sectionCls}>Progress</div>
          <Bar label="Blocks" have={s.blocksCommitted} need={s.blocksRequired} unit="" />
          {s.redstoneRequired > 0 && <Bar label="Redstone dust" have={s.redstoneCommitted} need={s.redstoneRequired} unit="" />}
          <Bar label="Days of work" have={s.daysWorked} need={s.daysRequired} unit="d" />

          {/* Give blocks from a character */}
          {living.length > 0 && (
            <div className="bg-stone-900/60 border border-stone-700/60 rounded-lg p-2 space-y-1.5">
              <div className="text-[11px] text-stone-400">Put in blocks from a character's inventory</div>
              <div className="flex gap-1.5">
                <select value={giver?.id ?? ''} onChange={e => setGiverId(e.target.value)} className="flex-1 min-w-0 bg-stone-900 border border-stone-600 rounded px-1.5 py-1 text-stone-200 text-xs outline-none">
                  {[...builders, ...living.filter(c => !s.builderIds.includes(c.id))].map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({countBlocks(c.storage.items) + countBlocks(c.onHand.items)} blocks)</option>
                  ))}
                </select>
                <input type="number" min={1} placeholder={String(Math.min(blocksLeft, giverBlocks))} value={giveAmount}
                  onChange={e => setGiveAmount(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1))} className={numCls} />
                <button onClick={give} disabled={giverBlocks === 0} className="px-2 rounded bg-amber-700/70 text-amber-50 text-xs hover:bg-amber-600 disabled:opacity-40">Put in</button>
              </div>
              {flash && <div className="text-[11px] text-emerald">{flash}</div>}
            </div>
          )}

          {/* Other progress */}
          <div className="bg-stone-900/60 border border-stone-700/60 rounded-lg p-2 space-y-1.5">
            <div className="text-[11px] text-stone-400">Add from elsewhere (bought, gifted, time spent)</div>
            <div className="flex flex-wrap gap-2 text-xs text-stone-400">
              <span className="flex items-center gap-1">
                <input type="number" placeholder="blocks" value={extraBlocks} onChange={e => setExtraBlocks(e.target.value === '' ? '' : parseInt(e.target.value) || 0)} className={numCls} />
                <button onClick={() => { if (extraBlocks) addProgress(s.id, { blocks: extraBlocks }); setExtraBlocks('') }} className="px-1.5 py-1 rounded border border-stone-600 hover:border-gold/50">+ blocks</button>
              </span>
              {s.redstoneRequired > 0 && (
                <span className="flex items-center gap-1">
                  <input type="number" placeholder="dust" value={extraRedstone} onChange={e => setExtraRedstone(e.target.value === '' ? '' : parseInt(e.target.value) || 0)} className={numCls} />
                  <button onClick={() => { if (extraRedstone) addProgress(s.id, { redstone: extraRedstone }); setExtraRedstone('') }} className="px-1.5 py-1 rounded border border-stone-600 hover:border-gold/50">+ redstone</button>
                </span>
              )}
              <span className="flex items-center gap-1">
                <button onClick={() => addProgress(s.id, { days: 1 })} className="px-1.5 py-1 rounded border border-stone-600 hover:border-gold/50">+1 day</button>
                <input type="number" placeholder="days" value={extraDays} onChange={e => setExtraDays(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)} className={numCls} />
                <button onClick={() => { if (extraDays) addProgress(s.id, { days: extraDays }); setExtraDays('') }} className="px-1.5 py-1 rounded border border-stone-600 hover:border-gold/50">+ days</button>
              </span>
            </div>
          </div>

          {progress.status === 'complete' ? (
            <div className="flex items-center justify-between rounded-lg border border-emerald/60 bg-emerald/10 px-3 py-2">
              <span className="text-sm text-emerald">🏰 Complete</span>
              <button onClick={() => setCompleted(s.id, false)} className="text-[11px] text-stone-400 hover:text-stone-200">Reopen</button>
            </div>
          ) : (
            <button onClick={() => setCompleted(s.id, true)} className="w-full py-1.5 rounded border border-dashed border-stone-600 text-xs text-stone-400 hover:text-emerald hover:border-emerald/60">
              Mark complete now (GM's call)
            </button>
          )}
        </div>
      </div>

      {editingIcon && (
        <Modal title={`Draw: ${s.name}`} onClose={() => setEditingIcon(false)}>
          <PixelEditor initial={s.icon} onCancel={() => setEditingIcon(false)} onSave={icon => { updateStructure(s.id, { icon }); setEditingIcon(false) }} />
        </Modal>
      )}
      {confirmDelete && (
        <ConfirmDialog
          title="Delete build"
          message={`Delete "${s.name}"? Blocks already put in are not returned.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => { deleteStructure(s.id); onClose() }}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </div>
  )
}
