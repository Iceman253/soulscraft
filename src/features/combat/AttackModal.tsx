import { useState, useEffect } from 'react'
import { X, Sword, AlertTriangle } from 'lucide-react'
import { maxOfDie } from './combatUtils'
import { useCharacterStore } from '../characters/store'
import { AbilityApplyPanel, totalBonus, hasDamageMod } from '../characters/AbilityApplyPanel'
import type { AppliedModifier } from '../characters/AbilityApplyPanel'
import type { CombatSession } from '../../types'

// ── Types ────────────────────────────────────────────────────────────────
export type AttackPhase = 'attack-roll' | 'defense-roll' | 'damage' | 'done'

export interface AttackFlow {
  attackerId: string
  targetId: string
  phase: AttackPhase
  skillBonus: number
  /** Attacker's staged ability/skill modifiers — committed when the attack is applied. */
  applied?: AppliedModifier[]
  /** Defender's staged evasions / Hold Ground etc. — committed when applied. */
  defenderApplied?: AppliedModifier[]
  attackRoll?: { d1: number; d2: number; total: number; outcome: 'success' | 'partial' | 'failure' }
  defenseRoll?: { d1: number; d2: number; total: number; outcome: 'dodge' | 'reduce' | 'hit' }
  damageRoll?: { raw: number; def: number; defReduction: number; dealt: number; instantKill: boolean; effectNote?: string }
}

export function initialPhase(
  attacker: CombatSession['combatants'][number],
  target: CombatSession['combatants'][number]
): AttackPhase {
  if (attacker.kind === 'creature') {
    return target.kind === 'creature' ? 'damage' : 'defense-roll'
  }
  return 'attack-roll'
}

// ── Sub-components ───────────────────────────────────────────────────────
function DiceBox({ value }: { value: number }) {
  return (
    <span className="w-10 h-10 rounded-lg bg-stone-700 border border-stone-600 flex items-center justify-center text-lg font-bold text-gold font-mono tabular-nums">
      {value}
    </span>
  )
}

function OutcomePill({ outcome }: { outcome: string }) {
  if (outcome === 'success' || outcome === 'dodge')
    return (
      <span className="px-2 py-0.5 rounded-full bg-emerald/20 border border-emerald/40 text-emerald text-xs font-bold">
        {outcome === 'dodge' ? '✅ Dodge — no damage' : '✅ Full Success'}
      </span>
    )
  if (outcome === 'partial' || outcome === 'reduce')
    return (
      <span className="px-2 py-0.5 rounded-full bg-amber-900/30 border border-amber-600/40 text-amber-400 text-xs font-bold">
        {outcome === 'reduce' ? '⚡ Partial — −1 incoming damage' : '⚡ Partial Success'}
      </span>
    )
  return (
    <span className="px-2 py-0.5 rounded-full bg-redstone/20 border border-redstone/40 text-red-400 text-xs font-bold">
      {outcome === 'hit' ? '❌ Hit — full damage' : '❌ Miss'}
    </span>
  )
}

// ── AttackModal ──────────────────────────────────────────────────────────
interface AttackModalProps {
  attack: AttackFlow
  session: CombatSession
  onSetTarget: (id: string) => void
  onSetBonus: (b: number) => void
  /** Update attacker's staged ability/skill modifiers. */
  onSetApplied: (applied: AppliedModifier[]) => void
  /** Update defender's staged evasions / defensive modifiers. */
  onSetDefenderApplied: (applied: AppliedModifier[]) => void
  onRollAttack: () => void
  onRollDefense: () => void
  onSkipDefense: () => void
  onRollDamage: () => void
  /** Apply with optional complication: reduce damage by 1 and/or attach a note. */
  onApplyDamage: (complication?: { reduceDamage: boolean; note: string }) => void
  onClose: () => void
}

export function AttackModal({
  attack, session, onSetTarget, onSetBonus, onSetApplied, onSetDefenderApplied,
  onRollAttack, onRollDefense, onSkipDefense,
  onRollDamage, onApplyDamage, onClose,
}: AttackModalProps) {
  const isPartial = attack.attackRoll?.outcome === 'partial'
  const [reduceDamage, setReduceDamage] = useState(false)
  const [complicationNote, setComplicationNote] = useState('')

  // Reset complication state when a new attack flow starts
  useEffect(() => {
    setReduceDamage(false)
    setComplicationNote('')
  }, [attack.attackerId, attack.targetId, attack.attackRoll?.total])

  const attacker = session.combatants.find(c => c.id === attack.attackerId)!
  const target = session.combatants.find(c => c.id === attack.targetId)
  const others = session.combatants.filter(c => c.id !== attack.attackerId)
  const isCreatureAttack = attacker.kind === 'creature'

  // Look up the underlying Character for attacker/target so we can render the panel
  const characters = useCharacterStore(s => s.characters)
  const attackerChar = attacker.kind === 'character' ? characters.find(c => c.id === attacker.sourceId) : null
  const targetChar   = target?.kind   === 'character' ? characters.find(c => c.id === target.sourceId)   : null

  const applied = attack.applied ?? []
  const defenderApplied = attack.defenderApplied ?? []
  const appliedBonus = totalBonus(applied)
  const totalAttackBonus = attack.skillBonus + appliedBonus
  const hasDouble = hasDamageMod(applied, 'double')
  const defenderHalves = hasDamageMod(defenderApplied, 'half-incoming')
  const defenderNullifies = hasDamageMod(defenderApplied, 'no-damage')

  return (
    <div className="absolute inset-0 z-20 bg-stone-950/90 flex items-center justify-center p-6">
      <div className="bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-700">
          <div className="flex items-center gap-2">
            <Sword size={16} className="text-redstone" />
            <span className="font-bold text-stone-100 font-heading tracking-wide">{attacker.name} Attacks</span>
          </div>
          <button onClick={onClose} className="p-1 rounded text-stone-500 hover:text-stone-300 hover:bg-stone-700">
            <X size={14} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Target selector */}
          <div>
            <label className="text-xs text-stone-400 mb-1 block">Target</label>
            <select value={attack.targetId} onChange={e => onSetTarget(e.target.value)}
              className="w-full bg-stone-800 border border-stone-600 rounded px-3 py-2 text-stone-200 text-sm outline-none">
              {others.map(c => (
                <option key={c.id} value={c.id}>{c.name} (HP: {c.currentHp}/{c.maxHp}, DEF: {c.def})</option>
              ))}
            </select>
          </div>

          {/* Creature auto-hit notice */}
          {isCreatureAttack && (
            <div className="bg-redstone/10 border border-redstone/30 rounded-lg px-3 py-2 text-xs text-red-300">
              ⚔️ Creatures auto-hit.{target?.kind === 'character' ? ' Target may roll to defend.' : ' Rolling damage directly.'}
            </div>
          )}

          {/* Attacker ability/skill panel (PC attackers only) */}
          {!isCreatureAttack && attackerChar && attack.phase === 'attack-roll' && (
            <AbilityApplyPanel
              character={attackerChar}
              context="attack"
              applied={applied}
              onApplied={onSetApplied}
              title={`Apply for Attacker — ${attackerChar.name}`}
            />
          )}

          {/* Skill / trait bonus (manual GM override) */}
          {!isCreatureAttack && attack.phase === 'attack-roll' && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-stone-400">Extra Bonus</span>
              <div className="flex items-center gap-1">
                <button onClick={() => onSetBonus(attack.skillBonus - 1)}
                  className="w-5 h-5 rounded bg-stone-700 text-stone-300 text-xs">-</button>
                <span className={`text-sm font-bold w-8 text-center font-mono tabular-nums ${
                  attack.skillBonus > 0 ? 'text-gold' : attack.skillBonus < 0 ? 'text-red-400' : 'text-stone-400'
                }`}>
                  {attack.skillBonus > 0 ? `+${attack.skillBonus}` : attack.skillBonus}
                </span>
                <button onClick={() => onSetBonus(attack.skillBonus + 1)}
                  className="w-5 h-5 rounded bg-stone-700 text-stone-300 text-xs">+</button>
              </div>
              {appliedBonus !== 0 && (
                <span className="text-xs text-stone-500">
                  +{appliedBonus} from abilities → total {totalAttackBonus > 0 ? `+${totalAttackBonus}` : totalAttackBonus}
                </span>
              )}
            </div>
          )}

          {/* Roll attack button */}
          {attack.phase === 'attack-roll' && (
            <div className="text-center">
              <button onClick={onRollAttack} className="w-full py-3 rounded-lg bg-redstone hover:bg-red-700 text-white font-bold">
                🎲 Roll 2d6{totalAttackBonus !== 0 ? ` ${totalAttackBonus > 0 ? `+${totalAttackBonus}` : totalAttackBonus}` : ''} Attack
                {hasDouble && <span className="block text-xs font-normal opacity-80 mt-0.5">⚡ Deadly Strike staged — damage will ×2 on hit</span>}
              </button>
            </div>
          )}

          {/* Attack result */}
          {attack.attackRoll && (
            <div className={`rounded-lg p-3 border text-center ${
              attack.attackRoll.outcome === 'success' ? 'bg-emerald/10 border-emerald/30' :
              attack.attackRoll.outcome === 'partial' ? 'bg-amber-900/20 border-amber-600/30' :
              'bg-redstone/10 border-redstone/30'
            }`}>
              <div className="flex justify-center gap-2 mb-2">
                <DiceBox value={attack.attackRoll.d1} />
                <DiceBox value={attack.attackRoll.d2} />
                {attack.skillBonus !== 0 && (
                  <span className={`flex items-center text-sm font-bold ${attack.skillBonus > 0 ? 'text-gold' : 'text-red-400'}`}>
                    {attack.skillBonus > 0 ? `+${attack.skillBonus}` : attack.skillBonus}
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold text-stone-100 mb-1 font-mono tabular-nums">{attack.attackRoll.total}</div>
              <OutcomePill outcome={attack.attackRoll.outcome} />
              {attack.attackRoll.outcome === 'partial' && <p className="text-xs text-amber-400/70 mt-1">Hit with a complication or cost.</p>}
              {attack.attackRoll.outcome === 'failure' && <p className="text-xs text-red-400/70 mt-1">Miss — GM introduces a complication.</p>}
            </div>
          )}

          {/* Defender ability/evasion panel — PC defenders only.
              Surface in BOTH defense-roll AND damage phases (pre-roll), since a PC-on-PC
              attack skips the defense roll entirely but the defender can still react. */}
          {targetChar && (attack.phase === 'defense-roll' || (attack.phase === 'damage' && !attack.damageRoll)) && (
            <AbilityApplyPanel
              character={targetChar}
              context="defense"
              applied={defenderApplied}
              onApplied={onSetDefenderApplied}
              title={`Apply for Defender — ${targetChar.name}`}
            />
          )}

          {/* Defense roll (character targets only) */}
          {attack.phase === 'defense-roll' && target?.kind === 'character' && (
            <div className="text-center space-y-3">
              <p className="text-stone-300 text-sm font-medium">{target.name} rolls to defend</p>
              <p className="text-stone-500 text-xs">10+ = dodge · 7–9 = −1 incoming · 6− = full hit</p>
              {defenderNullifies && (
                <p className="text-emerald text-xs font-semibold">✨ Evasion staged — incoming damage will be 0.</p>
              )}
              {defenderHalves && !defenderNullifies && (
                <p className="text-emerald text-xs font-semibold">🛡 Defense staged — incoming damage will be halved.</p>
              )}
              <button onClick={onRollDefense} className="w-full py-3 rounded-lg bg-blue-700 hover:bg-blue-600 text-white font-bold">
                🛡 Roll Defense
              </button>
              <button onClick={onSkipDefense} className="w-full py-1.5 text-xs text-stone-500 hover:text-stone-300">
                Skip — go straight to damage
              </button>
            </div>
          )}

          {/* Defense result */}
          {attack.defenseRoll && attack.phase !== 'defense-roll' && (
            <div className={`rounded-lg p-3 border text-center ${
              attack.defenseRoll.outcome === 'dodge' ? 'bg-emerald/10 border-emerald/30' :
              attack.defenseRoll.outcome === 'reduce' ? 'bg-amber-900/20 border-amber-600/30' :
              'bg-redstone/10 border-redstone/30'
            }`}>
              <div className="flex justify-center gap-2 mb-2">
                <DiceBox value={attack.defenseRoll.d1} />
                <DiceBox value={attack.defenseRoll.d2} />
              </div>
              <div className="text-2xl font-bold text-stone-100 mb-1 font-mono tabular-nums">{attack.defenseRoll.total}</div>
              <OutcomePill outcome={attack.defenseRoll.outcome} />
            </div>
          )}

          {/* Partial-success complication picker (manual p.72: "succeeds with a complication or cost") */}
          {isPartial && attack.phase === 'damage' && !attack.damageRoll && (
            <div className="rounded-lg border border-amber-700/40 bg-amber-950/20 p-3 space-y-2">
              <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold">
                <AlertTriangle size={12} /> Partial — choose a cost / complication
              </div>
              <label className="flex items-center gap-2 text-xs text-amber-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reduceDamage}
                  onChange={e => setReduceDamage(e.target.checked)}
                  className="accent-amber-500"
                />
                −1 to final damage as cost
              </label>
              <input
                value={complicationNote}
                onChange={e => setComplicationNote(e.target.value)}
                placeholder="Complication note (e.g. 'attacker stumbles', 'breaks weapon')..."
                className="w-full bg-stone-900 border border-stone-700 rounded px-2 py-1 text-stone-200 text-xs outline-none focus:border-amber-600"
              />
              <p className="text-[10px] text-amber-400/60 leading-relaxed">
                The attack still hits — but the GM should introduce a twist: counter-attack opening, lost positioning, broken gear, telegraphed move, etc.
              </p>
            </div>
          )}

          {/* Damage roll prompt */}
          {attack.phase === 'damage' && !attack.damageRoll && attacker && target && (
            <div className="text-center space-y-3">
              <p className="text-stone-300 text-sm font-medium">
                Roll damage ({attacker.damageDie ?? 'd6'}) against {target.name}
              </p>
              <p className="text-stone-500 text-xs">
                DEF {target.def}{attack.defenseRoll?.outcome === 'reduce' ? ' + 1 (defense)' : ''} subtracted
                {hasDouble ? ' · ×2 (Deadly Strike)' : ''}
                {defenderHalves ? ' · ½ (defender)' : ''}
                {defenderNullifies ? ' · ✨ defender evades — damage 0' : ''}
                {reduceDamage ? ' · −1 (partial cost)' : ''}
                {target.currentHp <= maxOfDie(attacker.damageDie ?? 'd6') ? ' · ⚠️ Instant defeat possible' : ''}
              </p>
              <button onClick={onRollDamage} className="w-full py-3 rounded-lg bg-redstone hover:bg-red-700 text-white font-bold">
                🎲 Roll {attacker.damageDie ?? 'd6'} Damage
              </button>
            </div>
          )}

          {/* Damage result */}
          {attack.damageRoll && (
            <div className="rounded-lg p-3 border border-redstone/40 bg-redstone/10 text-center space-y-1">
              {attack.damageRoll.instantKill ? (
                <>
                  <div className="text-2xl">💀</div>
                  <div className="text-stone-100 font-bold">Instant defeat!</div>
                  <div className="text-xs text-stone-400">
                    {target?.name}'s HP ({target?.currentHp}) ≤ max die ({maxOfDie(attacker.damageDie ?? 'd6')})
                  </div>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold text-stone-100"><span className="font-mono tabular-nums">{attack.damageRoll.dealt}</span> damage</div>
                  <div className="text-xs text-stone-400">
                    {attack.damageRoll.raw} rolled − {attack.damageRoll.def} DEF
                    {attack.damageRoll.defReduction > 0 ? ` − ${attack.damageRoll.defReduction} (defense)` : ''}
                    {` = ${attack.damageRoll.dealt}`}
                  </div>
                  {attack.damageRoll.dealt === 0 && <div className="text-xs text-stone-500">Absorbed by armor.</div>}
                </>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-stone-700 flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-1.5 rounded bg-stone-700 text-stone-300 hover:bg-stone-600 text-sm">
            Cancel
          </button>
          {attack.phase === 'done' && attack.damageRoll && (() => {
            const finalDealt = !attack.damageRoll.instantKill && reduceDamage
              ? Math.max(0, attack.damageRoll.dealt - 1)
              : attack.damageRoll.dealt
            return (
              <button
                onClick={() => onApplyDamage(isPartial ? { reduceDamage, note: complicationNote.trim() } : undefined)}
                className="px-4 py-1.5 rounded bg-redstone hover:bg-red-700 text-white font-semibold text-sm"
              >
                Apply {attack.damageRoll.instantKill ? 'Defeat' : `${finalDealt} Damage`} to {target?.name}
              </button>
            )
          })()}
          {attack.phase === 'done' && !attack.damageRoll && (
            <button onClick={onClose} className="px-4 py-1.5 rounded bg-stone-600 text-stone-200 text-sm">
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
