import { useMemo, useState } from 'react'
import { Dices } from 'lucide-react'
import { Modal } from '../../ui/Modal'
import { useCharacterStore } from '../characters/store'
import { useWorldStore } from '../map/store'
import { useBuildStore } from './store'
import { rollDiceSpec } from '../../lib/dice'
import {
  MINING_AMOUNTS, miningDays, TOOL_BONUS, TOOL_TIERS, detectMiningTool, actionOutcome,
  BLOCK_CARRY_LIMIT, countBlocks, minedStackName, miningTraits, suggestedMiningBlocks, type ToolTier,
} from '../../lib/building'

const OUTCOME_TEXT = {
  success: { label: 'Full success', cls: 'text-emerald border-emerald/60 bg-emerald/10', hint: 'They get what they were after — maybe more (the rulebook example turns 100 into 110).' },
  partial: { label: 'Partial success', cls: 'text-amber-300 border-amber-700/60 bg-amber-900/20', hint: 'They get it, but with a cost or complication — mobs, a cave-in, less than hoped…' },
  failure: { label: 'Failure', cls: 'text-red-300 border-red-700/60 bg-red-900/20', hint: 'They come back empty-handed or worse — the GM introduces a complication.' },
}

const fmtDays = (d: number) => d === 0.5 ? '½ day' : `${d} day${d === 1 ? '' : 's'}`

const inputCls = 'w-full bg-stone-900 border border-stone-600 rounded px-2 py-1.5 text-stone-100 text-sm outline-none focus:border-gold/50'
const labelCls = 'block text-xs text-stone-500 mb-1'

/** Mining (Guidebook p.81–82): pick a place with the material, an amount, roll
 *  2d6 + tool + Traits/Skill, and the GM awards the blocks. */
export function MiningModal({ initialAreaId, initialCharacterId, onClose }: { initialAreaId?: string; initialCharacterId?: string; onClose: () => void }) {
  const characters = useCharacterStore(s => s.characters)
  const areas = useWorldStore(s => s.areas)
  const mine = useBuildStore(s => s.mine)
  const living = useMemo(() => characters.filter(c => !c.isDead), [characters])

  const [characterId, setCharacterId] = useState(() =>
    initialCharacterId
    ?? living.find(c => initialAreaId && c.locationId === initialAreaId)?.id
    ?? living[0]?.id ?? '')
  const character = living.find(c => c.id === characterId)
  const [areaId, setAreaId] = useState(() => initialAreaId ?? character?.locationId ?? '')
  const area = areas.find(a => a.id === areaId)
  const areaMaterials = area?.materials ?? []

  const [materials, setMaterials] = useState<string[]>([])
  const [customMaterial, setCustomMaterial] = useState('')
  const [requested, setRequested] = useState(50)
  const detected = useMemo(() => detectMiningTool(character?.onHand.items ?? []), [character])
  const [tool, setTool] = useState<ToolTier | null>(null)
  const effectiveTool = tool ?? detected.tier
  const [skillId, setSkillId] = useState('')
  const [traitIds, setTraitIds] = useState<string[] | null>(null)
  const [otherBonus, setOtherBonus] = useState(0)
  const [roll, setRoll] = useState<number | ''>('')
  const [gained, setGained] = useState<number | null>(null)
  const [destination, setDestination] = useState<'storage' | 'onHand'>('storage')

  // Default: pre-check Traits that sound like mining (e.g. Deep Dwymir "Miner").
  const autoTraits = useMemo(() => miningTraits(character?.traits ?? []).map(t => t.id), [character])
  const checkedTraits = traitIds ?? autoTraits
  const skill = character?.skills.find(s => s.id === skillId)
  const bonus = TOOL_BONUS[effectiveTool] + checkedTraits.length + (skill?.bonus ?? 0) + otherBonus
  const total = roll === '' ? null : roll + bonus
  const outcome = total === null ? null : actionOutcome(total)
  const awarded = gained ?? (total === null ? 0 : suggestedMiningBlocks(total, requested))
  const offList = materials.filter(m => !areaMaterials.some(a => a.toLowerCase() === m.toLowerCase()))
  const onHandAfter = (character ? countBlocks(character.onHand.items) : 0) + (destination === 'onHand' ? awarded : 0)

  const toggleMaterial = (m: string) => setMaterials(cur => cur.includes(m) ? cur.filter(x => x !== m) : [...cur, m])
  const addCustom = () => {
    const m = customMaterial.trim()
    if (m && !materials.includes(m)) setMaterials([...materials, m])
    setCustomMaterial('')
  }

  const switchCharacter = (id: string) => {
    setCharacterId(id)
    setTool(null); setSkillId(''); setTraitIds(null)
    const c = living.find(x => x.id === id)
    if (c?.locationId && !initialAreaId) setAreaId(c.locationId)
  }

  const apply = () => {
    if (!character || total === null) return
    mine({ characterId: character.id, areaName: area?.name, materials, requested, total, gained: awarded, destination })
    onClose()
  }

  if (living.length === 0) {
    return <Modal title="⛏️ Go Mining" onClose={onClose}><div className="text-sm text-stone-400">No living characters to send mining.</div></Modal>
  }

  return (
    <Modal title="⛏️ Go Mining" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>Who's mining</label>
            <select value={characterId} onChange={e => switchCharacter(e.target.value)} className={inputCls}>
              {living.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Where</label>
            <select value={areaId} onChange={e => { setAreaId(e.target.value); setMaterials([]) }} className={inputCls}>
              <option value="">— somewhere unmapped —</option>
              {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>

        {/* Materials */}
        <div>
          <label className={labelCls}>Mining for</label>
          {areaMaterials.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {areaMaterials.map(m => (
                <button key={m} onClick={() => toggleMaterial(m)}
                  className={`px-2 py-1 rounded-full border text-xs ${materials.includes(m) ? 'border-gold/70 bg-gold/15 text-gold' : 'border-stone-600 text-stone-300 hover:border-stone-500'}`}>
                  {m}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-xs text-stone-500 italic">
              {area ? `No materials tagged for ${area.name} yet — add them in the area panel, or type one below.` : 'Pick a place, or type a material below.'}
            </div>
          )}
          <div className="flex gap-1.5 mt-2">
            <input value={customMaterial} onChange={e => setCustomMaterial(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addCustom() }}
              placeholder="Other material…" className={inputCls} />
            <button onClick={addCustom} className="px-2.5 rounded border border-stone-600 text-xs text-stone-300 hover:border-gold/50">Add</button>
          </div>
          {materials.filter(m => !areaMaterials.includes(m)).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {materials.filter(m => !areaMaterials.includes(m)).map(m => (
                <button key={m} onClick={() => toggleMaterial(m)} className="px-2 py-1 rounded-full border border-gold/70 bg-gold/15 text-gold text-xs">{m} ×</button>
              ))}
            </div>
          )}
          {area && offList.length > 0 && (
            <div className="text-[11px] text-amber-400 mt-1.5">
              ⚠️ {offList.join(', ')} {offList.length === 1 ? "isn't" : "aren't"} listed for {area.name}. Rulebook: you need a location that has the material.
            </div>
          )}
        </div>

        {/* Amount */}
        <div>
          <label className={labelCls}>How many blocks</label>
          <div className="flex flex-wrap items-center gap-1.5">
            {MINING_AMOUNTS.map(a => (
              <button key={a.blocks} onClick={() => { setRequested(a.blocks); setGained(null) }}
                className={`px-2.5 py-1 rounded border text-xs ${requested === a.blocks ? 'border-gold/70 bg-gold/15 text-gold' : 'border-stone-600 text-stone-300 hover:border-stone-500'}`}>
                {a.blocks} <span className="text-stone-500">· {fmtDays(a.days)}</span>
              </button>
            ))}
            <input type="number" min={1} value={requested} onChange={e => { setRequested(Math.max(1, parseInt(e.target.value) || 1)); setGained(null) }}
              className="w-20 bg-stone-900 border border-stone-600 rounded px-2 py-1 text-stone-100 text-xs font-mono outline-none" />
          </div>
          <div className="text-[11px] text-stone-500 mt-1">Takes {fmtDays(miningDays(requested))} of in-game time.</div>
        </div>

        {/* Bonuses */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>Tool</label>
            <select value={effectiveTool} onChange={e => setTool(e.target.value as ToolTier)} className={inputCls}>
              {TOOL_TIERS.map(t => (
                <option key={t} value={t}>{t === 'none' ? 'No proper tool' : `${t[0].toUpperCase()}${t.slice(1)}`} ({TOOL_BONUS[t] >= 0 ? '+' : ''}{TOOL_BONUS[t]})</option>
              ))}
            </select>
            <div className="text-[10px] text-stone-500 mt-0.5">{detected.itemName ? `Carrying: ${detected.itemName}` : 'No mining tool on hand'}</div>
          </div>
          <div>
            <label className={labelCls}>Skill (one only)</label>
            <select value={skillId} onChange={e => setSkillId(e.target.value)} className={inputCls}>
              <option value="">None</option>
              {(character?.skills ?? []).map(s => <option key={s.id} value={s.id}>{s.name} (+{s.bonus})</option>)}
            </select>
          </div>
        </div>
        {(character?.traits.length ?? 0) > 0 && (
          <div>
            <label className={labelCls}>Traits that apply (+1 each)</label>
            <div className="flex flex-wrap gap-1.5">
              {character!.traits.map(t => {
                const on = checkedTraits.includes(t.id)
                return (
                  <button key={t.id} onClick={() => setTraitIds(on ? checkedTraits.filter(x => x !== t.id) : [...checkedTraits, t.id])}
                    className={`px-2 py-1 rounded-full border text-xs ${on ? 'border-teal-500/70 bg-teal-600/20 text-teal-300' : 'border-stone-600 text-stone-400 hover:border-stone-500'}`}>
                    {t.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Roll */}
        <div className="flex items-end gap-2 flex-wrap">
          <div>
            <label className={labelCls}>2d6 roll</label>
            <div className="flex gap-1.5">
              <input type="number" value={roll} onChange={e => { setRoll(e.target.value === '' ? '' : parseInt(e.target.value) || 0); setGained(null) }}
                className="w-16 bg-stone-900 border border-stone-600 rounded px-2 py-1.5 text-stone-100 text-sm font-mono outline-none focus:border-gold/50" />
              <button onClick={() => { setRoll(rollDiceSpec('2d6')); setGained(null) }} className="flex items-center gap-1 px-2.5 rounded border border-stone-600 text-xs text-stone-300 hover:border-gold/50">
                <Dices size={13} /> Roll
              </button>
            </div>
          </div>
          <div>
            <label className={labelCls}>Other (SD boost…)</label>
            <input type="number" value={otherBonus} onChange={e => setOtherBonus(parseInt(e.target.value) || 0)}
              className="w-16 bg-stone-900 border border-stone-600 rounded px-2 py-1.5 text-stone-100 text-sm font-mono outline-none" />
          </div>
          <div className="text-sm text-stone-400 pb-1.5 font-mono">
            {roll === '' ? '?' : roll} {bonus >= 0 ? '+' : '−'} {Math.abs(bonus)} = <span className="text-stone-100 font-semibold">{total ?? '?'}</span>
          </div>
        </div>

        {outcome && (
          <div className={`rounded border px-3 py-2 text-xs ${OUTCOME_TEXT[outcome].cls}`}>
            <div className="font-semibold">{OUTCOME_TEXT[outcome].label}</div>
            <div className="opacity-80">{OUTCOME_TEXT[outcome].hint}</div>
          </div>
        )}

        {outcome && (
          <div className="grid grid-cols-2 gap-2 items-end">
            <div>
              <label className={labelCls}>Blocks gained (GM's call)</label>
              <input type="number" min={0} value={awarded} onChange={e => setGained(Math.max(0, parseInt(e.target.value) || 0))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Put them</label>
              <select value={destination} onChange={e => setDestination(e.target.value as 'storage' | 'onHand')} className={inputCls}>
                <option value="storage">In storage (chests)</option>
                <option value="onHand">On hand</option>
              </select>
            </div>
            {destination === 'onHand' && onHandAfter > BLOCK_CARRY_LIMIT && (
              <div className="col-span-2 text-[11px] text-amber-400">
                ⚠️ {character?.name} would carry {onHandAfter} blocks — the limit is {BLOCK_CARRY_LIMIT} on hand (the GM may waive it).
              </div>
            )}
            {awarded > 0 && (
              <div className="col-span-2 text-[11px] text-stone-500">Adds “{minedStackName(materials)}” × {awarded}.</div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-3 py-1.5 rounded text-sm text-stone-400 hover:text-stone-200">Cancel</button>
          <button onClick={apply} disabled={!character || total === null}
            className="px-3 py-1.5 rounded bg-gold text-stone-900 text-sm font-semibold hover:bg-yellow-400 disabled:opacity-40">
            Resolve mining
          </button>
        </div>
      </div>
    </Modal>
  )
}
