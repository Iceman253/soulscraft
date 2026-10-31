import { useState } from 'react'
import { Pencil, X } from 'lucide-react'
import { useBuildStore } from './store'
import { useCharacterStore } from '../characters/store'
import { useWorldStore } from '../map/store'
import { useRequestStore } from '../requests/store'
import { TokenAvatar } from '../../ui/TokenAvatar'
import { FullScreen, fieldCls } from './FullScreen'
import { PixelEditor } from './PixelEditor'
import { PixelIcon } from './PixelIcon'
import { PROJECT_TIERS, countBlocks, countRedstone, structureProgress } from '../../lib/building'
import { placementLabel } from '../../lib/places'
import type { Character, Structure } from '../../types'

function Bar({ label, have, need }: { label: string; have: number; need: number }) {
  const met = have >= need
  return (
    <div>
      <div className="mb-1 flex justify-between text-base">
        <span className="text-stone-400">{label}</span>
        <span className={`font-mono ${met ? 'text-emerald' : 'text-stone-200'}`}>{have}/{need}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-stone-800">
        <div className={`h-full ${met ? 'bg-emerald' : 'bg-amber-500'}`} style={{ width: `${need > 0 ? Math.min(100, (have / need) * 100) : 100}%` }} />
      </div>
    </div>
  )
}

const stepBtn = 'flex-1 rounded-xl border border-stone-600 bg-stone-900 py-3 text-base font-semibold text-stone-100 active:border-gold/60 disabled:opacity-35'

/** Deposit buttons: the most a tap can put in is what's held and what's still needed. */
function PutIn({ label, have, left, onPut }: { label: string; have: number; left: number; onPut: (amount: number) => void }) {
  const cap = Math.min(have, left)
  return (
    <div>
      <div className="mb-1.5 text-sm text-stone-400">Put in {label} <span className="text-stone-500">({have} available)</span></div>
      <div className="flex gap-2">
        <button onClick={() => onPut(Math.min(5, cap))} disabled={cap === 0} className={stepBtn}>+5</button>
        <button onClick={() => onPut(Math.min(25, cap))} disabled={cap === 0} className={stepBtn}>+25</button>
        <button onClick={() => onPut(cap)} disabled={cap === 0} className={stepBtn}>All ({cap})</button>
      </div>
    </div>
  )
}

/** One build, from the map or the Build tab. Blocks a player owns go in right away;
 *  days worked and asking for less time go to the GM to sign off. */
export function BuildSheet({ structureId, character, onClose }: { structureId: string; character?: Character; onClose: () => void }) {
  const s = useBuildStore(st => st.structures.find(x => x.id === structureId))
  const { commitBlocks, commitRedstone, joinBuild, updateStructure } = useBuildStore()
  const characters = useCharacterStore(st => st.characters)
  const areas = useWorldStore(st => st.areas)
  const addRequest = useRequestStore(st => st.addRequest)
  const [drawing, setDrawing] = useState(false)
  const [askingFaster, setAskingFaster] = useState(false)
  const [days, setDays] = useState(1)
  const [reason, setReason] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  if (!s) return null

  const p = structureProgress(s)
  const builders = characters.filter(c => s.builderIds.includes(c.id))
  const isBuilder = !!character && s.builderIds.includes(character.id)
  const blocksHeld = character ? countBlocks(character.storage.items) + countBlocks(character.onHand.items) : 0
  const dustHeld = character ? countRedstone(character) : 0
  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  const ask = (type: 'build-days' | 'build-speedup', payload: Record<string, unknown>, label: string) => {
    if (!character) return
    addRequest({ characterId: character.id, characterName: character.name, type, payload: { structureId: s.id, ...payload }, label })
    flash('Sent to the GM.')
  }

  const askFaster = () => {
    ask('build-speedup', { days, note: reason.trim() }, `${s.name}: finish in ${days} day${days === 1 ? '' : 's'} instead of ${s.daysRequired}`)
    setAskingFaster(false); setReason('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-stone-700 bg-stone-950 pb-[env(safe-area-inset-bottom)] text-stone-100 sm:rounded-2xl">
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-stone-800 bg-stone-950 px-4 py-3">
          <button onClick={() => isBuilder && setDrawing(true)} disabled={!isBuilder} title="Redraw the icon"
            className="relative shrink-0 rounded-lg border border-stone-600 bg-stone-900 p-1">
            <PixelIcon icon={s.icon} tier={s.tier} size={44} />
            {isBuilder && <span className="absolute -bottom-1.5 -right-1.5 rounded-full border border-stone-500 bg-stone-700 p-1 text-stone-200"><Pencil size={11} /></span>}
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-semibold">{s.name}</div>
            <div className="truncate text-sm text-stone-500">{PROJECT_TIERS[s.tier].label} · {placementLabel(s, areas)}</div>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 text-stone-400"><X size={22} /></button>
        </div>

        <div className="space-y-4 p-4">
          {s.description && <p className="text-base leading-relaxed text-stone-300 whitespace-pre-wrap">{s.description}</p>}
          {toast && <div className="rounded-xl border border-emerald/40 bg-emerald/15 px-3 py-2 text-center text-base text-emerald">{toast}</div>}

          {p.status === 'complete' ? (
            <div className="rounded-xl border border-emerald/50 bg-emerald/10 px-4 py-3 text-center text-lg text-emerald">🏰 Complete</div>
          ) : (
            <div className="space-y-3">
              <Bar label="Blocks" have={s.blocksCommitted} need={s.blocksRequired} />
              {s.redstoneRequired > 0 && <Bar label="Redstone dust" have={s.redstoneCommitted} need={s.redstoneRequired} />}
              <Bar label="Days of work" have={s.daysWorked} need={s.daysRequired} />
            </div>
          )}

          {builders.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-sm text-stone-400">
              {builders.map(c => (
                <span key={c.id} className="flex items-center gap-1.5"><TokenAvatar name={c.name} characterId={c.id} size={22} /> {c.name}</span>
              ))}
            </div>
          )}

          {character && !isBuilder && p.status !== 'complete' && (
            <button onClick={() => joinBuild(s.id, character.id)} className={`${stepBtn} w-full`}>Join this build</button>
          )}

          {isBuilder && p.status !== 'complete' && character && (
            <div className="space-y-4 border-t border-stone-800 pt-4">
              {!p.blocksMet && (
                <PutIn label="blocks" have={blocksHeld} left={s.blocksRequired - s.blocksCommitted}
                  onPut={n => flash(`Put in ${commitBlocks(s.id, character.id, n)} blocks.`)} />
              )}
              {!p.redstoneMet && (
                <PutIn label="redstone dust" have={dustHeld} left={s.redstoneRequired - s.redstoneCommitted}
                  onPut={n => flash(`Put in ${commitRedstone(s.id, character.id, n)} dust.`)} />
              )}
              {!p.daysMet && <WorkButtons s={s} onLog={d => ask('build-days', { days: d }, `${s.name}: worked ${d} day${d === 1 ? '' : 's'} (${s.daysWorked + d}/${s.daysRequired})`)} />}

              {!p.daysMet && (askingFaster ? (
                <div className="space-y-2 rounded-xl border border-stone-700 bg-stone-900 p-3">
                  <div className="text-base text-stone-300">How many days should it take, and why?</div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setDays(d => Math.max(1, d - 1))} className="h-11 w-11 rounded-xl border border-stone-600 text-xl">−</button>
                    <span className="w-10 text-center font-mono text-xl">{days}</span>
                    <button onClick={() => setDays(d => Math.min(Math.max(1, s.daysRequired - 1), d + 1))} className="h-11 w-11 rounded-xl border border-stone-600 text-xl">+</button>
                    <span className="text-base text-stone-500">of {s.daysRequired}</span>
                  </div>
                  <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} placeholder="The villagers agreed to help…" className={`${fieldCls} resize-none`} />
                  <div className="flex gap-2">
                    <button onClick={() => setAskingFaster(false)} className={stepBtn}>Cancel</button>
                    <button onClick={askFaster} disabled={!reason.trim()} className={stepBtn}>Send to GM</button>
                  </div>
                </div>
              ) : s.daysRequired > 1 && (
                <button onClick={() => { setDays(Math.max(1, s.daysRequired - 1)); setAskingFaster(true) }} className="w-full py-2 text-base text-teal-300">
                  Found a way to speed it up?
                </button>
              ))}
            </div>
          )}

          {drawing && (
            <FullScreen title={`Draw: ${s.name}`} onClose={() => setDrawing(false)}>
              <div className="p-4">
                <PixelEditor initial={s.icon} onCancel={() => setDrawing(false)} onSave={icon => { updateStructure(s.id, { icon }); setDrawing(false) }} />
              </div>
            </FullScreen>
          )}
        </div>
      </div>
    </div>
  )
}

/** Log a day at a time, or everything that's left in one go. */
function WorkButtons({ s, onLog }: { s: Structure; onLog: (days: number) => void }) {
  const left = s.daysRequired - s.daysWorked
  return (
    <div>
      <div className="mb-1.5 text-sm text-stone-400">Log days worked <span className="text-stone-500">(the GM signs off)</span></div>
      <div className="flex gap-2">
        <button onClick={() => onLog(Math.min(1, left))} className={stepBtn}>{left < 1 ? `${left} day` : '1 day'}</button>
        {left > 1 && <button onClick={() => onLog(left)} className={stepBtn}>All {left} days</button>}
      </div>
    </div>
  )
}
