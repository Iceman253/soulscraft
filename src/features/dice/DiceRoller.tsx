import { useState } from 'react'
import { X, Dices, Star } from 'lucide-react'
import { useCharacterStore } from '../characters/store'
import { log } from '../log/store'

type RollMode = '2d6' | 'sd' | 'difficult'

interface DiceRollerProps { onClose: () => void }

interface RollResult {
  dice: number[]
  mode: RollMode
  total: number
  label: string
  outcome?: 'success' | 'partial' | 'failure'
  sdConsumed?: number
}

/** Cryptographically secure random integer in [1, sides] using Web Crypto. */
function secureRandInt(sides: number): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return (buf[0] % sides) + 1
}
function rollD6(): number { return secureRandInt(6) }
function rollCustomDie(sides: number): number { return secureRandInt(sides) }

function parseDie(die: string): number {
  const match = die.match(/d(\d+)/i)
  return match ? parseInt(match[1]) : 6
}

export function DiceRoller({ onClose }: DiceRollerProps) {
  const [mode, setMode] = useState<RollMode>('2d6')
  const [result, setResult] = useState<RollResult | null>(null)
  const [rolling, setRolling] = useState(false)
  const [selectedCharId, setSelectedCharId] = useState<string>('')
  const [skillBonus, setSkillBonus] = useState(0)
  const [label, setLabel] = useState('')
  const [double6Chars, setDouble6Chars] = useState<string[]>([]) // chars to offer XP to
  const characters = useCharacterStore(s => s.characters)
  const { adjustSd, awardXp } = useCharacterStore()

  const selectedChar = characters.find(c => c.id === selectedCharId)

  const doRoll = () => {
    setRolling(true)
    setTimeout(() => {
      let dice: number[] = []
      let total = 0
      let outcome: 'success' | 'partial' | 'failure' | undefined
      let sdConsumed: number | undefined
      let rollLabel = label || mode

      if (mode === '2d6') {
        dice = [rollD6(), rollD6()]
        total = dice[0] + dice[1] + skillBonus
        outcome = total >= 10 ? 'success' : total >= 7 ? 'partial' : 'failure'
        rollLabel = label || 'Standard Roll'
      } else if (mode === 'difficult') {
        // Roll 3d6 take lowest 2
        const all = [rollD6(), rollD6(), rollD6()]
        all.sort((a, b) => a - b)
        dice = all.slice(0, 2)
        total = dice[0] + dice[1] + skillBonus
        outcome = total >= 10 ? 'success' : total >= 7 ? 'partial' : 'failure'
        rollLabel = label || 'Difficult Roll'
      } else if (mode === 'sd') {
        // SD roll: spend 1 SD for each extra die, take best 2
        const sdToSpend = selectedChar ? Math.min(3, selectedChar.currentSd) : 1
        const numDice = 2 + sdToSpend
        const all = Array.from({ length: numDice }, rollD6).sort((a, b) => b - a)
        dice = all.slice(0, 2)
        total = dice[0] + dice[1] + skillBonus
        outcome = total >= 10 ? 'success' : total >= 7 ? 'partial' : 'failure'
        sdConsumed = sdToSpend
        if (selectedChar && sdToSpend > 0) {
          adjustSd(selectedChar.id, -sdToSpend)
        }
        rollLabel = label || `Soul Dice Roll (${sdToSpend} SD)`
      }

      const res: RollResult = { dice, mode, total, label: rollLabel, outcome, sdConsumed }
      setResult(res)
      setRolling(false)

      const charName = selectedChar?.name ? `${selectedChar.name}: ` : ''
      const bonusStr = skillBonus > 0 ? ` +${skillBonus}` : skillBonus < 0 ? ` ${skillBonus}` : ''
      const outcomeStr = outcome === 'success' ? ' ✅ Full Success' : outcome === 'partial' ? ' ⚡ Partial Success' : outcome === 'failure' ? ' ❌ Failure' : ''
      const sdStr = sdConsumed ? ` [${sdConsumed} SD spent]` : ''
      log('dice-roll', `🎲 ${charName}${rollLabel}: [${dice.join(', ')}]${bonusStr} = ${total}${outcomeStr}${sdStr}`)

      // Double-6 detection: both shown dice are 6 on a 2d6 or SD roll
      const isDouble6 = (mode === '2d6' || mode === 'sd') && dice.length >= 2 && dice[0] === 6 && dice[1] === 6
      if (isDouble6) {
        // Offer XP to all characters (GM decides who gets it)
        setDouble6Chars(characters.map(c => c.id))
        log('dice-roll', `⭐ Double 6! XP available — award to characters below.`)
      }
    }, 600)
  }

  // Custom single die roll
  const doCustomDieRoll = (die: string) => {
    const sides = parseDie(die)
    const val = rollCustomDie(sides)
    setResult({ dice: [val], mode: '2d6', total: val, label: die })
    log('dice-roll', `🎲 ${die}: ${val}`)
  }

  return (
    <div className="bg-stone-800 border border-stone-600 rounded-xl shadow-2xl w-80">
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-700">
        <div className="flex items-center gap-2">
          <Dices size={16} className="text-gold" />
          <span className="font-semibold text-stone-100 text-sm">Dice Roller</span>
        </div>
        <button onClick={onClose} className="p-1 rounded text-stone-400 hover:text-stone-100 hover:bg-stone-700"><X size={14} /></button>
      </div>

      <div className="p-4 space-y-3">
        {/* Character select */}
        <select value={selectedCharId} onChange={e => setSelectedCharId(e.target.value)} className="w-full bg-stone-900 border border-stone-600 rounded px-2 py-1.5 text-stone-200 text-sm outline-none">
          <option value="">— No Character —</option>
          {characters.map(c => <option key={c.id} value={c.id}>{c.name} (SD: {c.currentSd}/{c.maxSd})</option>)}
        </select>

        {/* Mode tabs */}
        <div className="flex rounded-lg overflow-hidden border border-stone-600">
          {(['2d6', 'difficult', 'sd'] as RollMode[]).map(m => (
            <button key={m} onClick={() => setMode(m)} className={`flex-1 py-1.5 text-xs font-medium transition-colors ${mode === m ? 'bg-gold text-stone-900' : 'bg-stone-700 text-stone-400 hover:text-stone-200'}`}>
              {m === '2d6' ? '2d6' : m === 'difficult' ? 'Difficult' : 'Soul Dice'}
            </button>
          ))}
        </div>

        <div className="text-xs text-stone-500">
          {mode === '2d6' && '2d6 + skill bonus. 10+ full, 7–9 partial, 6- failure.'}
          {mode === 'difficult' && '3d6, take lowest 2. Harder to succeed.'}
          {mode === 'sd' && selectedChar ? `Spend SD for extra dice, keep best 2. ${selectedChar.name} has ${selectedChar.currentSd} SD.` : mode === 'sd' && 'Select a character to auto-spend SD.'}
        </div>

        {/* Skill bonus */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-400">Skill Bonus</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setSkillBonus(v => v - 1)} className="w-5 h-5 rounded bg-stone-700 text-stone-300 text-xs">-</button>
            <span className={`text-sm font-bold w-8 text-center ${skillBonus > 0 ? 'text-gold' : skillBonus < 0 ? 'text-red-400' : 'text-stone-400'}`}>{skillBonus > 0 ? `+${skillBonus}` : skillBonus}</span>
            <button onClick={() => setSkillBonus(v => v + 1)} className="w-5 h-5 rounded bg-stone-700 text-stone-300 text-xs">+</button>
          </div>
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Label..." className="flex-1 bg-stone-900 border border-stone-600 rounded px-2 py-1 text-stone-200 text-xs outline-none" />
        </div>

        {/* Roll button */}
        <button
          onClick={doRoll}
          disabled={rolling}
          className={`w-full py-3 rounded-lg font-bold text-stone-900 transition-all ${rolling ? 'bg-stone-600 cursor-not-allowed' : 'bg-gold hover:bg-yellow-400 active:scale-95'}`}
        >
          {rolling ? (
            <span className="inline-block animate-[dice-tumble_0.8s_ease-in-out_infinite]">🎲</span>
          ) : (
            'Roll!'
          )}
        </button>

        {/* Result */}
        {result && !rolling && (
          <div className={`rounded-lg p-3 border text-center transition-all ${
            result.outcome === 'success' ? 'bg-emerald/10 border-emerald/30' :
            result.outcome === 'partial' ? 'bg-amber-900/20 border-amber-600/30' :
            result.outcome === 'failure' ? 'bg-redstone/10 border-redstone/30' :
            'bg-stone-700 border-stone-600'
          }`}>
            <div className="flex justify-center gap-2 mb-1">
              {result.dice.map((d, i) => (
                <span key={i} className={`w-9 h-9 rounded-lg border flex items-center justify-center text-lg font-bold shadow ${d === 6 && result.dice.length === 2 ? 'bg-gold/20 border-gold text-gold' : 'bg-stone-800 border-stone-600 text-gold'}`}>{d}</span>
              ))}
            </div>
            <div className="text-2xl font-bold text-stone-100 mb-0.5">{result.total}</div>
            <div className="text-sm">
              {result.outcome === 'success' && <span className="text-emerald font-semibold">✅ Full Success</span>}
              {result.outcome === 'partial' && (
                <div>
                  <span className="text-amber-400 font-semibold">⚡ Partial Success</span>
                  <div className="text-xs text-amber-400/70 mt-0.5">Succeed with a cost, complication, or choice.</div>
                </div>
              )}
              {result.outcome === 'failure' && (
                <div>
                  <span className="text-red-400 font-semibold">❌ Failure</span>
                  <div className="text-xs text-red-400/70 mt-0.5">The GM introduces a complication or twist.</div>
                </div>
              )}
            </div>
            {result.sdConsumed !== undefined && <div className="text-xs text-stone-500 mt-0.5">{result.sdConsumed} SD consumed</div>}
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
              {characters.map(c => (
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
          <div className="text-xs text-stone-500 mb-1.5">Quick Rolls</div>
          <div className="flex flex-wrap gap-1.5">
            {['d4', 'd6', 'd8', 'd10', 'd12', 'd20'].map(die => (
              <button key={die} onClick={() => doCustomDieRoll(die)} className="px-2.5 py-1 rounded bg-stone-700 border border-stone-600 hover:border-gold/50 text-stone-300 text-xs font-mono">
                {die}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
