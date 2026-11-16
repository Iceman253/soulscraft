// Pure combat rules: roll outcomes, damage after effects, and the log line.
import type { Combatant } from '../../types'
import { maxOfDie } from './combatUtils'
import type { AttackFlow } from './AttackModal'

export type AttackOutcome = 'success' | 'partial' | 'failure'
export type DefenseOutcome = 'dodge' | 'reduce' | 'hit'

export const attackOutcome = (total: number): AttackOutcome =>
  total >= 10 ? 'success' : total >= 7 ? 'partial' : 'failure'

export const defenseOutcome = (total: number): DefenseOutcome =>
  total >= 10 ? 'dodge' : total >= 7 ? 'reduce' : 'hit'

/** Slimes and Magma Cubes split on death (manual p.110); the small ones don't. */
export function canSplitOnDeath(name: string): boolean {
  const n = name.toLowerCase()
  if (n.includes('small')) return false
  return n.includes('slime') || (n.includes('magma') && n.includes('cube'))
}

export interface DamageInput {
  raw: number
  die: string
  /** 1 when the defender's roll was a 7-9. */
  defReduction: number
  target: Pick<Combatant, 'def' | 'isTough' | 'kind' | 'currentHp' | 'activeEffects'>
  /** Attacker staged Deadly Strike. */
  attackerDouble: boolean
  /** Defender staged Hold Ground, Block or Redirect. */
  defenderHalves: boolean
  /** Defender staged a full Dodge. */
  defenderNoDamage: boolean
}

export type DamageRoll = NonNullable<AttackFlow['damageRoll']>

export function resolveDamage(i: DamageInput): DamageRoll {
  const brittle = i.target.activeEffects.some(e => e.name === 'Brittle')
  const absorption = i.target.activeEffects.some(e => e.name === 'Absorption')

  let dealt = Math.max(0, i.raw - i.target.def - i.defReduction)
  if (i.attackerDouble) dealt *= 2
  if (brittle) dealt *= 2
  if (absorption) dealt = Math.ceil(dealt / 2)
  if (i.defenderHalves) dealt = Math.ceil(dealt / 2)
  if (i.defenderNoDamage) dealt = 0

  // Instant kill when the target's HP is at most the attacker's max damage,
  // but never against a Tough creature or a player character.
  const inKillRange = i.target.currentHp <= maxOfDie(i.die)
  const instantKill = !i.target.isTough && i.target.kind !== 'character' && inKillRange && dealt > 0
  const effectNote = [
    i.attackerDouble ? '[Deadly Strike ×2]' : '',
    brittle ? '[Brittle×2]' : '',
    absorption ? '[Absorption÷2]' : '',
    i.defenderHalves ? '[Defender ½]' : '',
    i.defenderNoDamage ? '[Defender evades]' : '',
    i.target.isTough && inKillRange ? '[Tough — no instant kill]' : '',
  ].filter(Boolean).join(' ')

  return { raw: i.raw, def: i.target.def, defReduction: i.defReduction, dealt, instantKill, effectNote: effectNote || undefined }
}

export interface Complication { reduceDamage: boolean; note: string }

/** Damage actually taken: a partial-success complication can knock 1 off (not off an instant kill). */
export function finalDamage(roll: DamageRoll, complication?: Complication): number {
  return !roll.instantKill && complication?.reduceDamage ? Math.max(0, roll.dealt - 1) : roll.dealt
}

/** One session-log line summing up a resolved attack. */
export function attackLogLine(attack: AttackFlow, attackerName: string, targetName: string, complication?: Complication): string {
  const roll = attack.damageRoll
  const dealt = roll ? finalDamage(roll, complication) : 0
  const used = (label: string, mods?: { name: string }[]) => mods && mods.length > 0 ? ` [${label} used: ${mods.map(m => m.name).join(', ')}]` : ''
  const atk = attack.attackRoll ? ` (roll: ${attack.attackRoll.total})` : ''
  const def = attack.defenseRoll ? ` | def: ${attack.defenseRoll.total} (${attack.defenseRoll.outcome})` : ''
  const dmg = !roll ? '' : roll.instantKill
    ? ' → instant defeat'
    : ` → ${roll.raw}−${roll.def}${roll.defReduction ? `−${roll.defReduction}` : ''}${complication?.reduceDamage ? '−1' : ''}=${dealt} dealt${roll.effectNote ?? ''}`
  const comp = complication?.note ? ` [⚡ Complication: ${complication.note}]` : complication ? ' [⚡ partial cost]' : ''
  return `⚔️ ${attackerName} → ${targetName}${atk}${def}${dmg}${comp}${used('Atk', attack.applied)}${used('Def', attack.defenderApplied)}`
}
