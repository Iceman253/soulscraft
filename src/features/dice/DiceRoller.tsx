import { useState } from 'react'
import { X, Dices, Star, Flame, Droplets, ArrowDown, Bomb, Wind } from 'lucide-react'
import { useCharacterStore } from '../characters/store'
import { log } from '../log/store'
import { AbilityApplyPanel, commitAppliedModifiers, totalBonus, totalSdCost } from '../characters/AbilityApplyPanel'
import type { AppliedModifier } from '../characters/AbilityApplyPanel'

type RollMode = '2d6' | 'difficult' | 'hazard'

interface DiceRollerProps { onClose: () => void }

interface SubRoll {
  base: number[]        // 2d6
  sdDice: number[]      // each 1d4 from SD spent
  penaltyDice: number[] // each 1d4 from missed rest (subtracted)
  bonus: number         // skill bonus
  total: number
  outcome: 'success' | 'partial' | 'failure'
}

interface RollResult {
  mode: RollMode
  label: string
  sub: SubRoll[]                 // standard = 1 entry, difficult = 3 entries
  multiSuccess?: boolean         // difficult mode pass/fail
  successCount?: number
  sdConsumed: number
  hazardLabel?: string
}

/** Cryptographically secure random integer in [1, sides] using Web Crypto. */
function secureRandInt(sides: number): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return (buf[0] % sides) + 1
}
const rollD6 = () => secureRandInt(6)
const rollD4 = () => secureRandInt(4)

function parseDie(die: string): number {
  const match = die.match(/d(\d+)/i)
  return match ? parseInt(match[1]) : 6
}

function outcomeOf(total: number): 'success' | 'partial' | 'failure' {
  return total >= 10 ? 'success' : total >= 7 ? 'partial' : 'failure'
}

interface HazardPreset {
  name: string
  formula: string             // e.g. "3d6"
  description: string
  icon: React.ReactNode
  ignoresDef?: boolean
}

const HAZARDS: HazardPreset[] = [
  { name: 'Lava — full submerge',  formula: '5d6', description: 'Per round of full submersion. DEF reduced by half (round down).', icon: <Flame size={12} /> },
  { name: 'Lava — splash',         formula: '2d6', description: 'A splash or brief contact. DEF applies normally.',                  icon: <Flame size={12} /> },
  { name: 'Fire — engulfed',       formula: '3d6', description: 'Per round on fire. Wet/Resistance halves.',                          icon: <Flame size={12} /> },
  { name: 'Drowning',              formula: '1d10',description: 'Per round without air. Ignores DEF.',                                icon: <Droplets size={12} />, ignoresDef: true },
  { name: 'Falling — short',       formula: '2d6', description: '3–5 blocks. DEF applies. Feather Falling halves.',                   icon: <ArrowDown size={12} /> },
  { name: 'Falling — long',        formula: '4d6', description: '6+ blocks. DEF applies. Feather Falling halves.',                    icon: <ArrowDown size={12} /> },
  { name: 'Explosion — small',     formula: '3d6', description: 'TNT, creeper at range. DEF applies.',                                icon: <Bomb    size={12} /> },
  { name: 'Explosion — large',     formula: '6d6', description: 'Direct creeper hit, charged TNT. DEF applies.',                      icon: <Bomb    size={12} /> },
  { name: 'Suffocation',           formula: '1d6', description: 'Per round trapped in solid block. Ignores DEF.',                     icon: <Wind    size={12} />, ignoresDef: true },
]

function rollFormula(formula: string): { dice: number[]; total: number } {
  const m = formula.match(/(\d+)d(\d+)/i)
  if (!m) return { dice: [], total: 0 }
  const n = parseInt(m[1]), sides = parseInt(m[2])
  const dice = Array.from({ length: n }, () => secureRandInt(sides))
  return { dice, total: dice.reduce((a, b) => a + b, 0) }
}

export function DiceRoller({ onClose }: DiceRollerProps) {
  const [mode, setMode] = useState<RollMode>('2d6')
  const [result, setResult] = useState<RollResult | null>(null)
  const [rolling, setRolling] = useState(false)
  const [selectedCharId, setSelectedCharId] = useState<string>('')
  const [skillBonus, setSkillBonus] = useState(0)
  const [sdToSpend, setSdToSpend] = useState(0)
  const [label, setLabel] = useState('')
  const [double6Chars, setDouble6Chars] = useState<string[]>([])
  const [appliedMods, setAppliedMods] = useState<AppliedModifier[]>([])
  const characters = useCharacterStore(s => s.characters)
  const { adjustSd, awardXp } = useCharacterStore()

  const selectedChar = characters.find(c => c.id === selectedCharId)
  const maxSd = selectedChar?.currentSd ?? 0
  const cappedSd = Math.min(sdToSpend, maxSd)
  const missedRests = selectedChar?.missedRests ?? 0

  // Combine manual skillBonus + applied modifier bonuses
  const appliedBonus = totalBonus(appliedMods)
  const appliedSdCost = totalSdCost(appliedMods)
  const combinedBonus = skillBonus + appliedBonus

  const rollOnce = (): SubRoll => {
    const base = [rollD6(), rollD6()]
    const sdDice = Array.from({ length: cappedSd }, rollD4)
    const penaltyDice = Array.from({ length: missedRests }, rollD4)
    const baseTotal = base[0] + base[1]
    const sdTotal = sdDice.reduce((a, b) => a + b, 0)
    const penaltyTotal = penaltyDice.reduce((a, b) => a + b, 0)
    const total = baseTotal + combinedBonus + sdTotal - penaltyTotal
    return { base, sdDice, penaltyDice, bonus: combinedBonus, total, outcome: outcomeOf(total) }
  }

  const doRoll = () => {
    if (mode === 'hazard') return
    setRolling(true)
    setTimeout(() => {
      let sub: SubRoll[]
      let rollLabel = label || (mode === 'difficult' ? 'Difficult Action' : 'Standard Roll')
      let successCount: number | undefined
      let multiSuccess: boolean | undefined

      if (mode === 'difficult') {
        // Manual p.4: roll three separate 2d6. Bonus applies to ONE only.
        // We model it as: bonus + SD dice only count toward the FIRST roll the GM picks,
        // but for simplicity and consistency we let the GM choose which one to attribute.
        // Default behavior: apply bonus + SD + penalty to ALL three (closest to "roll three times"),
        // then show the # of 10+ successes. Reminder text clarifies bonuses apply to one.
        const bonusSubRoll = rollOnce()
        const plain = (): SubRoll => {
          const base = [rollD6(), rollD6()]
          const penaltyDice = Array.from({ length: missedRests }, rollD4)
          const penaltyTotal = penaltyDice.reduce((a, b) => a + b, 0)
          const total = base[0] + base[1] - penaltyTotal
          return { base, sdDice: [], penaltyDice, bonus: 0, total, outcome: outcomeOf(total) }
        }
        sub = [bonusSubRoll, plain(), plain()]
        successCount = sub.filter(s => s.total >= 10).length
        multiSuccess = successCount >= 2
      } else {
        sub = [rollOnce()]
      }

      // Deduct SD spent (once, not per sub-roll)
      if (cappedSd > 0 && selectedChar) {
        adjustSd(selectedChar.id, -cappedSd)
      }
      // Commit staged ability/skill modifiers — marks charges used, deducts ability SD costs.
      if (selectedChar && appliedMods.length > 0) {
        commitAppliedModifiers(selectedChar.id, appliedMods)
      }

      const totalSd = cappedSd + appliedSdCost
      const res: RollResult = {
        mode, label: rollLabel, sub,
        multiSuccess, successCount,
        sdConsumed: totalSd,
      }
      setResult(res)
      setRolling(false)
      setSdToSpend(0)        // reset SD-spend for next roll
      setAppliedMods([])     // reset staged ability bonuses (manual bonus persists)

      const charName = selectedChar?.name ? `${selectedChar.name}: ` : ''
      const sdStr = cappedSd ? ` [+${cappedSd}d4 SD]` : ''
      const penStr = missedRests ? ` [−${missedRests}d4 penalty]` : ''
      const appliedStr = appliedMods.length > 0 ? ` [+ ${appliedMods.map(m => m.name).join(', ')}]` : ''
      if (mode === 'difficult') {
        log('dice-roll', `🎲 ${charName}${rollLabel}${sdStr}${penStr}${appliedStr}: ${sub.map(s => s.total).join(' / ')} → ${successCount}/3 successes ${multiSuccess ? '✅' : '❌'}`)
      } else {
        const s = sub[0]
        const outcomeStr = s.outcome === 'success' ? ' ✅ Full Success' : s.outcome === 'partial' ? ' ⚡ Partial' : ' ❌ Failure'
        log('dice-roll', `🎲 ${charName}${rollLabel}: [${s.base.join(',')}]${combinedBonus ? ` ${combinedBonus > 0 ? '+' : ''}${combinedBonus}` : ''}${sdStr}${penStr}${appliedStr} = ${s.total}${outcomeStr}`)
      }

      // Double-6 detection: any sub-roll with both base dice = 6
      const isDouble6 = sub.some(s => s.base[0] === 6 && s.base[1] === 6)
      if (isDouble6) {
        setDouble6Chars(characters.filter(c => !c.isDead).map(c => c.id))
        log('dice-roll', `⭐ Double 6! Award XP to a character below.`)
      }
    }, 600)
  }

  const doHazardRoll = (h: HazardPreset) => {
    const { dice, total } = rollFormula(h.formula)
    const res: RollResult = {
      mode: 'hazard',
      label: h.name,
      hazardLabel: h.formula + (h.ignoresDef ? ' · ignores DEF' : ''),
      sub: [{ base: dice, sdDice: [], penaltyDice: [], bonus: 0, total, outcome: 'failure' }],
      sdConsumed: 0,
    }
    setResult(res)
    log('dice-roll', `☠️ Hazard — ${h.name} (${h.formula}): [${dice.join(', ')}] = ${total}${h.ignoresDef ? ' (ignores DEF)' : ''}`)
  }

  // Custom single die roll
  const doCustomDieRoll = (die: string) => {
    const sides = parseDie(die)
    const val = secureRandInt(sides)
    setResult({
      mode: '2d6', label: die, sdConsumed: 0,
      sub: [{ base: [val], sdDice: [], penaltyDice: [], bonus: 0, total: val, outcome: 'success' }],
    })
    log('dice-roll', `🎲 ${die}: ${val}`)
  }

  return (
    <div className="bg-stone-800 border border-stone-600 rounded-xl shadow-2xl w-80 max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-700 sticky top-0 bg-stone-800 z-10">
        <div className="flex items-center gap-2">
          <Dices size={16} className="text-gold" />
          <span className="font-heading font-semibold text-stone-100 text-sm tracking-wide">Dice Roller</span>
        </div>
        <button onClick={onClose} className="p-1 rounded text-stone-400 hover:text-stone-100 hover:bg-stone-700"><X size={14} /></button>
      </div>

      <div className="p-4 space-y-3">
        {/* Mode tabs */}
        <div className="flex rounded-lg overflow-hidden border border-stone-600">
          {(['2d6', 'difficult', 'hazard'] as RollMode[]).map(m => (
            <button key={m} onClick={() => setMode(m)} className={`flex-1 py-1.5 text-xs font-medium transition-colors ${mode === m ? 'bg-gold text-stone-900' : 'bg-stone-700 text-stone-400 hover:text-stone-200'}`}>
              {m === '2d6' ? 'Standard' : m === 'difficult' ? 'Difficult' : 'Hazard'}
            </button>
          ))}
        </div>

        {mode !== 'hazard' && (
          <>
            {/* Character select */}
            <select value={selectedCharId} onChange={e => { setSelectedCharId(e.target.value); setSdToSpend(0); setAppliedMods([]) }} className="w-full bg-stone-900 border border-stone-600 rounded px-2 py-1.5 text-stone-200 text-sm outline-none">
              <option value="">— No Character —</option>
              {characters.filter(c => !c.isDead).map(c => <option key={c.id} value={c.id}>{c.name} (SD: {c.currentSd}/{c.maxSd}{c.missedRests > 0 ? ` · −${c.missedRests}d4` : ''})</option>)}
            </select>

            {/* Apply Ability / Skill panel */}
            {selectedChar && (
              <AbilityApplyPanel
                character={selectedChar}
                context="general"
                applied={appliedMods}
                onApplied={setAppliedMods}
              />
            )}

            <div className="text-xs text-stone-500 leading-relaxed">
              {mode === '2d6' && '2d6 + bonus + (SD: 1d4 each). 10+ full · 7–9 partial · 6− failure.'}
              {mode === 'difficult' && 'Three 2d6 rolls. Need 2-of-3 at 10+ to succeed. Bonus & SD apply to ONE roll only (the first).'}
            </div>

            {/* Skill bonus + label */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-400 shrink-0">Bonus</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setSkillBonus(v => v - 1)} className="w-5 h-5 rounded bg-stone-700 text-stone-300 text-xs">-</button>
                <span className={`text-sm font-bold w-8 text-center font-mono tabular-nums ${skillBonus > 0 ? 'text-gold' : skillBonus < 0 ? 'text-red-400' : 'text-stone-400'}`}>{skillBonus > 0 ? `+${skillBonus}` : skillBonus}</span>
                <button onClick={() => setSkillBonus(v => v + 1)} className="w-5 h-5 rounded bg-stone-700 text-stone-300 text-xs">+</button>
              </div>
              <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Label..." className="flex-1 bg-stone-900 border border-stone-600 rounded px-2 py-1 text-stone-200 text-xs outline-none" />
            </div>

            {/* SD spend */}
            {selectedChar && maxSd > 0 && (
              <div className="flex items-center gap-2 p-2 rounded bg-blue-950/30 border border-blue-800/40">
                <span className="text-xs text-blue-300 shrink-0">Spend SD</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setSdToSpend(v => Math.max(0, v - 1))} className="w-5 h-5 rounded bg-stone-700 text-stone-300 text-xs">-</button>
                  <span className="text-sm font-bold w-8 text-center text-blue-300 font-mono tabular-nums">{cappedSd}</span>
                  <button onClick={() => setSdToSpend(v => Math.min(maxSd, v + 1))} className="w-5 h-5 rounded bg-stone-700 text-stone-300 text-xs">+</button>
                </div>
                <span className="text-xs text-blue-400/70">+{cappedSd}d4 (declare before rolling)</span>
              </div>
            )}

            {/* Missed-rest warning */}
            {selectedChar && missedRests > 0 && (
              <div className="p-2 rounded bg-orange-950/30 border border-orange-700/40 text-xs text-orange-300">
                ⚠️ {missedRests} missed rest{missedRests > 1 ? 's' : ''} — auto-rolling −{missedRests}d4 penalty.
              </div>
            )}

            <button
              onClick={doRoll}
              disabled={rolling}
              className={`w-full py-3 rounded-lg font-bold text-stone-900 transition-all ${rolling ? 'bg-stone-600 cursor-not-allowed' : 'bg-gold hover:bg-yellow-400 active:scale-95'}`}
            >
              {rolling ? <span className="inline-block animate-[dice-tumble_0.8s_ease-in-out_infinite]">🎲</span> : 'Roll!'}
            </button>
          </>
        )}

        {mode === 'hazard' && (
          <div>
            <div className="text-xs text-stone-500 mb-2 leading-relaxed">Quick-roll environmental damage from p.73. Apply DEF unless noted.</div>
            <div className="space-y-1.5">
              {HAZARDS.map(h => (
                <button
                  key={h.name}
                  onClick={() => doHazardRoll(h)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded bg-stone-900 border border-stone-700 hover:border-orange-600/50 text-left transition-colors"
                >
                  <span className="text-orange-400 shrink-0">{h.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-stone-200 flex items-center gap-1.5">
                      <span>{h.name}</span>
                      <span className="text-stone-500 font-mono text-xs tracking-wide">{h.formula}</span>
                      {h.ignoresDef && <span className="text-red-400 text-[10px] uppercase tracking-wider font-heading">no DEF</span>}
                    </div>
                    <div className="text-[11px] text-stone-500 truncate italic">{h.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Result */}
        {result && !rolling && (
          <div className="space-y-2">
            {result.mode === 'difficult' && (
              <div className={`rounded-lg p-2 text-center text-sm font-semibold border ${
                result.multiSuccess ? 'bg-emerald/10 border-emerald/40 text-emerald' : 'bg-redstone/10 border-redstone/40 text-red-300'
              }`}>
                {result.multiSuccess ? '✅ Action Succeeds' : '❌ Action Fails'}
                <span className="ml-2 text-xs opacity-70">({result.successCount}/3)</span>
              </div>
            )}

            {result.sub.map((s, idx) => (
              <SubRollDisplay key={idx} sub={s} mode={result.mode} index={result.mode === 'difficult' ? idx + 1 : undefined} hazardLabel={idx === 0 ? result.hazardLabel : undefined} />
            ))}

            {result.sdConsumed > 0 && <div className="text-xs text-stone-500 text-center">{result.sdConsumed} SD consumed</div>}
          </div>
        )}

        {/* Double-6 XP offer */}
        {double6Chars.length > 0 && !rolling && (
          <div className="rounded-lg border border-gold/50 bg-gold/10 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Star size={14} className="text-gold" />
              <span className="text-gold font-semibold text-sm">Double 6! Award XP?</span>
            </div>
            <div className="space-y-1">
              {characters.filter(c => !c.isDead).map(c => (
                <div key={c.id} className="flex items-center justify-between">
                  <span className="text-xs text-stone-300">{c.name} — {c.xp}/5 XP</span>
                  <button
                    onClick={() => {
                      awardXp(c.id, 1, 'double-six', 'Double 6 roll')
                      setDouble6Chars(prev => prev.filter(id => id !== c.id))
                    }}
                    className="px-2 py-0.5 rounded bg-gold text-stone-900 text-xs font-bold hover:bg-yellow-400"
                  >
                    +1 XP
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => setDouble6Chars([])}
              className="mt-2 text-xs text-stone-500 hover:text-stone-300 w-full text-center"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Quick die rolls */}
        <div>
          <div className="text-xs text-stone-500 mb-1.5 uppercase tracking-wider font-heading">Quick Rolls</div>
          <div className="flex flex-wrap gap-1.5">
            {['d4', 'd6', 'd8', 'd10', 'd12', 'd20'].map(die => (
              <button
                key={die}
                onClick={() => doCustomDieRoll(die)}
                className="px-3 py-1 rounded bg-stone-700 border border-stone-600 hover:border-gold/60 hover:text-gold text-stone-200 font-heading text-sm tracking-wide transition-colors"
              >
                {die}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

interface SubRollDisplayProps {
  sub: SubRoll
  mode: RollMode
  index?: number
  hazardLabel?: string
}
function SubRollDisplay({ sub, mode, index, hazardLabel }: SubRollDisplayProps) {
  const isHazard = mode === 'hazard'
  return (
    <div className={`rounded-lg p-2.5 border text-center ${
      isHazard ? 'bg-orange-950/20 border-orange-700/40' :
      sub.outcome === 'success' ? 'bg-emerald/10 border-emerald/30' :
      sub.outcome === 'partial' ? 'bg-amber-900/20 border-amber-600/30' :
      'bg-redstone/10 border-redstone/30'
    }`}>
      {index !== undefined && <div className="text-xs text-stone-500 mb-1 font-heading uppercase tracking-wider">Roll {index}</div>}
      <div className="flex justify-center flex-wrap gap-1.5 mb-1">
        {sub.base.map((d, i) => (
          <span key={`b${i}`} className="w-8 h-8 rounded-lg bg-stone-800 border border-stone-600 text-gold flex items-center justify-center text-lg font-heading font-bold">{d}</span>
        ))}
        {sub.sdDice.map((d, i) => (
          <span key={`s${i}`} title="Soul Dice (1d4)" className="w-7 h-7 rounded-lg bg-blue-900/40 border border-blue-600/50 text-blue-200 flex items-center justify-center text-base font-heading font-bold">+{d}</span>
        ))}
        {sub.penaltyDice.map((d, i) => (
          <span key={`p${i}`} title="Missed-rest penalty (1d4)" className="w-7 h-7 rounded-lg bg-orange-900/40 border border-orange-600/50 text-orange-200 flex items-center justify-center text-base font-heading font-bold">−{d}</span>
        ))}
        {sub.bonus !== 0 && (
          <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-base font-heading font-bold ${sub.bonus > 0 ? 'bg-gold/20 border border-gold/50 text-gold' : 'bg-red-900/40 border border-red-600/50 text-red-200'}`}>
            {sub.bonus > 0 ? `+${sub.bonus}` : sub.bonus}
          </span>
        )}
      </div>
      <div className="text-3xl font-heading font-bold text-stone-100 tracking-wide">{sub.total}</div>
      {!isHazard && (
        <div className="text-xs">
          {sub.outcome === 'success' && <span className="text-emerald font-semibold">✅ Full Success</span>}
          {sub.outcome === 'partial' && <span className="text-amber-400 font-semibold">⚡ Partial — succeed with cost</span>}
          {sub.outcome === 'failure' && <span className="text-red-400 font-semibold">❌ Failure</span>}
        </div>
      )}
      {hazardLabel && <div className="text-xs text-orange-300/70 mt-1 font-mono tracking-wide">{hazardLabel}</div>}
    </div>
  )
}
