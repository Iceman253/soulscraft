import { useMemo, useState } from 'react'
import { Dices } from 'lucide-react'
import { useWorldStore } from '../map/store'
import { useRequestStore } from '../requests/store'
import { FullScreen, fieldCls, fieldLabelCls, primaryBtn } from './FullScreen'
import {
  MINING_AMOUNTS, TOOL_BONUS, TOOL_TIERS, actionOutcome, detectMiningTool, miningDays, miningTraits,
  rollMiningCheck, suggestedMiningBlocks, type ToolTier,
} from '../../lib/building'
import type { Character } from '../../types'

type Step = 'where' | 'amount' | 'roll' | 'sent'

const OUTCOME = {
  success: { label: 'Full success', cls: 'border-emerald/60 bg-emerald/10 text-emerald' },
  partial: { label: 'Partial success', cls: 'border-amber-700/60 bg-amber-900/20 text-amber-300' },
  failure: { label: 'Failure', cls: 'border-red-700/60 bg-red-900/20 text-red-300' },
}

const fmtDays = (d: number) => d === 0.5 ? '½ day' : `${d} day${d === 1 ? '' : 's'}`
const chip = (on: boolean) => `rounded-full border px-3.5 py-2 text-base ${on ? 'border-gold/70 bg-gold/15 text-gold' : 'border-stone-600 text-stone-300'}`

/** Mining on the player's own device (Guidebook p.81): pick where and how much, then
 *  one button rolls and sends together, so a bad roll can't be quietly retried. */
export function MineFlow({ character, onClose }: { character: Character; onClose: () => void }) {
  const allAreas = useWorldStore(s => s.areas)
  const visibleIds = useWorldStore(s => s.playerVisibleAreaIds)
  const addRequest = useRequestStore(s => s.addRequest)
  const areas = useMemo(() => allAreas.filter(a => visibleIds.includes(a.id)), [allAreas, visibleIds])

  const [step, setStep] = useState<Step>('where')
  const [areaId, setAreaId] = useState(() => areas.some(a => a.id === character.locationId) ? character.locationId! : '')
  const area = areas.find(a => a.id === areaId)
  const tagged = area?.materials ?? []
  const [materials, setMaterials] = useState<string[]>([])
  const [custom, setCustom] = useState('')
  const [requested, setRequested] = useState(50)

  const detected = useMemo(() => detectMiningTool(character.onHand.items), [character])
  const [tool, setTool] = useState<ToolTier>(detected.tier)
  const [skillId, setSkillId] = useState('')
  const [traitIds, setTraitIds] = useState(() => miningTraits(character.traits).map(t => t.id))
  const [destination, setDestination] = useState<'storage' | 'onHand'>('storage')
  const [result, setResult] = useState<{ dice: number; penalty: number; total: number; bonus: number } | null>(null)

  const skill = character.skills.find(s => s.id === skillId)
  const bonus = TOOL_BONUS[tool] + traitIds.length + (skill?.bonus ?? 0)
  const toggleMaterial = (m: string) => setMaterials(cur => cur.includes(m) ? cur.filter(x => x !== m) : [...cur, m])
  const addCustom = () => {
    const m = custom.trim()
    if (m && !materials.includes(m)) setMaterials([...materials, m])
    setCustom('')
  }

  const rollAndSend = () => {
    const check = rollMiningCheck(bonus, character.missedRests)
    const outcome = actionOutcome(check.total)
    const what = materials.join(' & ')
    addRequest({
      characterId: character.id,
      characterName: character.name,
      type: 'mine',
      payload: {
        areaName: area?.name, materials, requested, total: check.total,
        gained: suggestedMiningBlocks(check.total, requested), destination,
        // Anything not on the area's list is the GM's call, so flag it on their card.
        offList: area ? materials.filter(m => !tagged.some(t => t.toLowerCase() === m.toLowerCase())) : [],
      },
      label: `Mined ${requested} ${what}${area ? ` at ${area.name}` : ''}: rolled ${check.total} (${OUTCOME[outcome].label})`,
    })
    setResult({ ...check, bonus })
    setStep('sent')
  }

  if (step === 'sent' && result) {
    const outcome = OUTCOME[actionOutcome(result.total)]
    return (
      <FullScreen title="Sent to the GM" onClose={onClose} footer={<button onClick={onClose} className={primaryBtn}>Done</button>}>
        <div className="space-y-4 p-6 text-center">
          <div className="text-6xl font-bold font-mono text-stone-100">{result.total}</div>
          <div className="font-mono text-base text-stone-400">
            {result.dice} (2d6) {result.bonus >= 0 ? '+' : '−'} {Math.abs(result.bonus)}{result.penalty > 0 ? ` − ${result.penalty} (missed rest)` : ''}
          </div>
          <div className={`rounded-xl border px-4 py-3 text-lg font-semibold ${outcome.cls}`}>{outcome.label}</div>
          <p className="text-base text-stone-400">Your GM will narrate what happens and add the blocks to your {destination === 'onHand' ? 'pack' : 'storage'}.</p>
        </div>
      </FullScreen>
    )
  }

  if (step === 'roll') {
    return (
      <FullScreen
        title="Ready to mine"
        onClose={onClose}
        onBack={() => setStep('amount')}
        footer={
          <button onClick={rollAndSend} className={`${primaryBtn} flex items-center justify-center gap-2`}>
            <Dices size={20} /> Roll &amp; send to GM ({bonus >= 0 ? '+' : ''}{bonus})
          </button>
        }
      >
        <div className="space-y-5 p-4">
          <div>
            <label className={fieldLabelCls}>Tool</label>
            <select value={tool} onChange={e => setTool(e.target.value as ToolTier)} className={fieldCls}>
              {TOOL_TIERS.map(t => (
                <option key={t} value={t}>{t === 'none' ? 'No proper tool' : `${t[0].toUpperCase()}${t.slice(1)}`} ({TOOL_BONUS[t] >= 0 ? '+' : ''}{TOOL_BONUS[t]})</option>
              ))}
            </select>
            <div className="mt-1 text-sm text-stone-500">{detected.itemName ? `You're carrying: ${detected.itemName}` : 'No mining tool on hand'}</div>
          </div>
          {character.skills.length > 0 && (
            <div>
              <label className={fieldLabelCls}>Skill (one only)</label>
              <select value={skillId} onChange={e => setSkillId(e.target.value)} className={fieldCls}>
                <option value="">None</option>
                {character.skills.map(s => <option key={s.id} value={s.id}>{s.name} (+{s.bonus})</option>)}
              </select>
            </div>
          )}
          {character.traits.length > 0 && (
            <div>
              <div className={fieldLabelCls}>Traits that apply (+1 each)</div>
              <div className="flex flex-wrap gap-2">
                {character.traits.map(t => (
                  <button key={t.id} onClick={() => setTraitIds(cur => cur.includes(t.id) ? cur.filter(x => x !== t.id) : [...cur, t.id])} className={chip(traitIds.includes(t.id))}>
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <div className={fieldLabelCls}>Put the blocks</div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setDestination('storage')} className={chip(destination === 'storage')}>In storage</button>
              <button onClick={() => setDestination('onHand')} className={chip(destination === 'onHand')}>On hand</button>
            </div>
          </div>
          {character.missedRests > 0 && (
            <div className="rounded-xl border border-orange-700/40 bg-orange-900/20 px-3.5 py-2.5 text-base text-orange-300">
              ⚠️ {character.missedRests} missed rest{character.missedRests === 1 ? '' : 's'}: −{character.missedRests}d4 on this roll
            </div>
          )}
        </div>
      </FullScreen>
    )
  }

  if (step === 'amount') {
    return (
      <FullScreen title="How much?" onClose={onClose} onBack={() => setStep('where')}
        footer={<button onClick={() => setStep('roll')} className={primaryBtn}>Next</button>}>
        <div className="space-y-2 p-4">
          {MINING_AMOUNTS.map(a => (
            <button key={a.blocks} onClick={() => setRequested(a.blocks)}
              className={`flex w-full items-center justify-between rounded-xl border p-4 text-lg ${requested === a.blocks ? 'border-gold/70 bg-gold/10 text-gold' : 'border-stone-700 bg-stone-900 text-stone-200'}`}>
              <span className="font-semibold">{a.blocks} blocks</span>
              <span className="text-base text-stone-400">{fmtDays(miningDays(a.blocks))}</span>
            </button>
          ))}
        </div>
      </FullScreen>
    )
  }

  return (
    <FullScreen title="Go mining" onClose={onClose}
      footer={<button onClick={() => setStep('amount')} disabled={materials.length === 0} className={primaryBtn}>Next</button>}>
      <div className="space-y-5 p-4">
        <div>
          <label className={fieldLabelCls}>Where</label>
          <select value={areaId} onChange={e => { setAreaId(e.target.value); setMaterials([]) }} className={fieldCls}>
            <option value="">Somewhere else</option>
            {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <div className={fieldLabelCls}>Mining for</div>
          {tagged.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {tagged.map(m => <button key={m} onClick={() => toggleMaterial(m)} className={chip(materials.includes(m))}>{m}</button>)}
            </div>
          )}
          <div className="flex gap-2">
            <input value={custom} onChange={e => setCustom(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addCustom() }}
              placeholder={tagged.length ? 'Something else…' : 'Stone, iron…'} className={fieldCls} />
            <button onClick={addCustom} className="rounded-xl border border-stone-600 px-4 text-base text-stone-300 active:border-gold/50">Add</button>
          </div>
          {materials.filter(m => !tagged.includes(m)).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {materials.filter(m => !tagged.includes(m)).map(m => <button key={m} onClick={() => toggleMaterial(m)} className={chip(true)}>{m} ×</button>)}
            </div>
          )}
          <p className="mt-2 text-sm text-stone-500">You can only mine what the place actually has: a forest for wood, a mineshaft for ore.</p>
        </div>
      </div>
    </FullScreen>
  )
}
