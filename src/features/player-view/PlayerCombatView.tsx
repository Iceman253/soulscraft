import { useState } from 'react'
import { useCombatStore } from '../combat/store'
import { useCharacterStore } from '../characters/store'
import { useRequestStore } from '../requests/store'
import { HpBar } from '../../ui/HpBar'
import { Badge } from '../../ui/Badge'
import { Swords, Sparkles, ChevronRight } from 'lucide-react'
import { log } from '../log/store'
import type { Combatant } from '../../types'

interface Props {
  /** The viewer's character id — enables "your turn" actions when set. */
  focusedCharacterId?: string
}

const d6 = () => Math.floor(Math.random() * 6) + 1

/** Resolve a basic attack: 2d6 to hit (7+), then damage die − target DEF.
 *  Non-player targets at or below the attacker's max damage drop to 0 (unless Tough). */
function resolveAttack(attacker: Combatant, target: Combatant) {
  const a = d6(), b = d6()
  const roll = a + b
  const dieMax = parseInt((attacker.damageDie ?? 'd6').replace(/\D/g, '')) || 6
  if (roll < 7) return { a, b, roll, hit: false, dmg: 0, crit: false }
  let dmg: number
  if (target.kind !== 'character' && !target.isTough && target.currentHp <= dieMax) {
    dmg = target.currentHp // instant drop to 0
  } else {
    const dmgRoll = Math.floor(Math.random() * dieMax) + 1
    dmg = Math.max(0, dmgRoll - target.def)
  }
  return { a, b, roll, hit: true, dmg, crit: roll >= 10 }
}

export function PlayerCombatView({ focusedCharacterId }: Props) {
  const session = useCombatStore(s => s.session)
  const adjustCombatantHp = useCombatStore(s => s.adjustCombatantHp)
  const nextTurn = useCombatStore(s => s.nextTurn)
  const myChar = useCharacterStore(s => focusedCharacterId ? s.characters.find(c => c.id === focusedCharacterId) : undefined)
  const addRequest = useRequestStore(s => s.addRequest)

  const [targeting, setTargeting] = useState(false)
  const [pickingAbility, setPickingAbility] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const flash = (msg: string) => { setFeedback(msg); setTimeout(() => setFeedback(null), 4000) }

  if (!session || session.ended) {
    return (
      <div className="flex items-center justify-center h-full text-stone-500 text-base md:text-sm">
        <div className="text-center">
          <Swords size={32} className="mx-auto mb-3 opacity-30" />
          No active combat.
        </div>
      </div>
    )
  }

  const total = session.combatants.length
  const activeCombatant = session.combatants[session.activeIndex]

  const nextIndex = (() => {
    let idx = (session.activeIndex + 1) % total
    let steps = 0
    while (session.combatants[idx].currentHp <= 0 && steps < total) { idx = (idx + 1) % total; steps++ }
    return idx !== session.activeIndex ? idx : null
  })()
  const nextCombatant = nextIndex !== null ? session.combatants[nextIndex] : null

  // Is it this player's turn?
  const myCombatant = focusedCharacterId
    ? session.combatants.find(c => c.kind === 'character' && c.sourceId === focusedCharacterId)
    : undefined
  const myTurn = !!myCombatant && !!activeCombatant && activeCombatant.id === myCombatant.id && myCombatant.currentHp > 0
  const enemies = myCombatant ? session.combatants.filter(c => c.id !== myCombatant.id && c.currentHp > 0) : []

  const doAttack = (target: Combatant) => {
    if (!myCombatant) return
    const r = resolveAttack(myCombatant, target)
    if (!r.hit) {
      flash(`🎲 ${r.a}+${r.b}=${r.roll} — missed ${target.name}.`)
      log('combat-end', `⚔️ ${myCombatant.name} attacked ${target.name} and missed (rolled ${r.roll}).`)
    } else {
      adjustCombatantHp(target.id, -r.dmg)
      flash(`🎲 ${r.roll}${r.crit ? ' (crit!)' : ''} — hit ${target.name} for ${r.dmg} damage.`)
      log('combat-end', `⚔️ ${myCombatant.name} hit ${target.name} for ${r.dmg} damage (rolled ${r.roll}).`)
    }
    setTargeting(false)
  }

  const endTurn = () => { nextTurn(); flash('Turn ended.') }

  const requestAbility = (abilityName: string) => {
    if (!myChar) return
    addRequest({
      characterId: myChar.id,
      characterName: myChar.name,
      type: 'custom',
      payload: { text: `In combat: wants to use "${abilityName}"` },
      label: `⚔️ ${myChar.name} wants to use ability: ${abilityName}`,
    })
    setPickingAbility(false)
    flash(`Sent to GM: ${abilityName}`)
  }

  return (
    <div className="h-full flex flex-col bg-stone-900">
      {/* Combat header */}
      <div className="shrink-0 px-4 py-3 bg-stone-800 border-b border-stone-700">
        <div className="flex items-center gap-3">
          <Swords size={18} className="text-redstone md:w-4 md:h-4" />
          <span className="font-bold text-stone-100 font-heading tracking-wide text-lg md:text-base">Round <span className="font-mono tabular-nums">{session.round}</span></span>
          {activeCombatant && (
            <span className="ml-auto text-base md:text-sm text-gold font-semibold font-heading tracking-wide">⚡ {activeCombatant.name}</span>
          )}
        </div>
        {nextCombatant && (
          <div className="text-sm md:text-xs text-stone-500 mt-0.5 text-right">
            Next up: <span className="text-stone-400">{nextCombatant.name}</span>
          </div>
        )}
      </div>

      {/* Initiative list */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2.5 md:space-y-2">
          {session.combatants.map((c, i) => {
            const isActive = i === session.activeIndex
            const isNext = i === nextIndex
            const isDefeated = c.currentHp <= 0
            const isMe = !!myCombatant && c.id === myCombatant.id
            return (
              <div key={c.id} className={`rounded-xl border p-3.5 md:p-3 transition-all ${
                isDefeated ? 'border-stone-800 opacity-40 bg-stone-900'
                : isActive ? 'border-gold bg-stone-800 shadow-lg shadow-gold/10'
                : isNext ? 'border-stone-500 bg-stone-800/60'
                : isMe ? 'border-teal-700/60 bg-stone-800'
                : 'border-stone-700 bg-stone-800'
              }`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-3 h-3 md:w-2 md:h-2 rounded-full shrink-0 ${
                    isDefeated ? 'bg-stone-700' : isActive ? 'bg-gold animate-pulse' : isNext ? 'bg-stone-400' : 'bg-stone-600'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-medium text-base md:text-sm ${isDefeated ? 'text-stone-500' : 'text-stone-100'}`}>{c.name}{isMe ? ' (you)' : ''}</span>
                      {isActive && !isDefeated && <span className="text-sm md:text-xs bg-gold/20 border border-gold/40 text-gold px-2 py-0.5 md:px-1.5 rounded font-medium">⚡ Active</span>}
                      {isNext && !isDefeated && !isActive && <span className="text-sm md:text-xs bg-stone-700 border border-stone-600 text-stone-400 px-2 py-0.5 md:px-1.5 rounded">Up next</span>}
                      <Badge variant={c.kind === 'character' ? 'blue' : 'red'}>{c.kind}</Badge>
                      {isDefeated && <span className="text-sm md:text-xs text-stone-500">💀 Defeated</span>}
                    </div>
                  </div>
                  {!isDefeated && <span className="text-sm md:text-xs text-stone-400 font-mono shrink-0">{c.currentHp}/{c.maxHp} HP</span>}
                </div>
                {!isDefeated && <HpBar current={c.currentHp} max={c.maxHp} className="mb-2" />}
                {c.activeEffects.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 md:gap-1">
                    {c.activeEffects.map(e => (
                      <span key={e.id} className={`inline-flex items-center gap-1 px-2 py-1 md:px-1.5 md:py-0.5 rounded text-sm md:text-xs border ${
                        e.damagePerRound ? 'bg-red-900/30 border-red-800/50 text-red-300' : 'bg-purple-900/30 border-purple-700/40 text-purple-300'
                      }`}>{e.damagePerRound && '🩸'}{e.name}</span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Feedback toast */}
      {feedback && (
        <div className="shrink-0 mx-4 mb-2 px-3 py-2 rounded-lg bg-stone-800 border border-gold/30 text-sm text-gold text-center">{feedback}</div>
      )}

      {/* ── Your-turn action bar ─────────────────────────────────────────────── */}
      {myTurn && (
        <div className="shrink-0 border-t-2 border-gold/50 bg-stone-800 p-4">
          <div className="text-center text-lg md:text-base font-bold text-gold mb-3">⚡ Your turn, {myCombatant!.name}!</div>

          {targeting ? (
            <div className="space-y-2">
              <div className="text-sm text-stone-400 text-center">Choose a target:</div>
              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                {enemies.length === 0 && <div className="text-sm text-stone-500 text-center italic">No valid targets.</div>}
                {enemies.map(t => (
                  <button key={t.id} onClick={() => doAttack(t)}
                    className="flex items-center justify-between px-3.5 py-3 rounded-xl bg-stone-900 border border-stone-700 active:border-red-500/60 text-left">
                    <span className="text-base text-stone-100">{t.name}</span>
                    <span className="text-sm text-stone-400 font-mono">{t.currentHp}/{t.maxHp} HP · DEF {t.def}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setTargeting(false)} className="w-full py-2 text-sm text-stone-500">Cancel</button>
            </div>
          ) : pickingAbility ? (
            <div className="space-y-2">
              <div className="text-sm text-stone-400 text-center">Which ability? (sent to the GM)</div>
              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                {(myChar?.abilities ?? []).length === 0 && <div className="text-sm text-stone-500 text-center italic">No abilities.</div>}
                {(myChar?.abilities ?? []).map(ab => (
                  <button key={ab.id} onClick={() => requestAbility(ab.name)}
                    className="flex items-center justify-between px-3.5 py-3 rounded-xl bg-stone-900 border border-stone-700 active:border-amber-500/60 text-left">
                    <span className="text-base text-stone-100">{ab.name}</span>
                    <span className="text-sm text-amber-400 font-mono shrink-0">{ab.sdCost > 0 ? `${ab.sdCost} SD` : 'Free'}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setPickingAbility(false)} className="w-full py-2 text-sm text-stone-500">Cancel</button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setTargeting(true)}
                className="flex flex-col items-center gap-1 py-3 rounded-xl bg-red-900/30 border border-red-800/50 text-red-200 active:bg-red-900/50">
                <Swords size={20} /> <span className="text-sm font-semibold">Attack</span>
              </button>
              <button onClick={() => setPickingAbility(true)}
                className="flex flex-col items-center gap-1 py-3 rounded-xl bg-amber-900/30 border border-amber-800/50 text-amber-200 active:bg-amber-900/50">
                <Sparkles size={20} /> <span className="text-sm font-semibold">Ability</span>
              </button>
              <button onClick={endTurn}
                className="flex flex-col items-center gap-1 py-3 rounded-xl bg-stone-700 border border-stone-600 text-stone-200 active:bg-stone-600">
                <ChevronRight size={20} /> <span className="text-sm font-semibold">End Turn</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
