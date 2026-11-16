// State and steps of one attack in the combat tracker: pick a target, roll
// attack, defense and damage, then apply it and commit the staged abilities.
import { useState } from 'react'
import { useCombatStore } from './store'
import { log } from '../log/store'
import { rollDie, rollD6, parseSides } from './combatUtils'
import { initialPhase, type AttackFlow } from './AttackModal'
import { commitAppliedModifiers, totalBonus, hasDamageMod, type AppliedModifier } from '../characters/modifiers'
import { STATUS_EFFECTS } from './statusEffects'
import { attackLogLine, attackOutcome, defenseOutcome, finalDamage, resolveDamage, type Complication } from './combatMath'
import type { Combatant } from '../../types'

/** Commit one side's staged abilities; effects aimed at a target land on `onto`. */
function commitSide(user: Combatant, mods: AppliedModifier[] | undefined, succeeded: boolean, onto: Combatant, why: string) {
  if (user.kind !== 'character' || !mods || mods.length === 0) return
  const { addCombatantEffect } = useCombatStore.getState()
  const res = commitAppliedModifiers(user.sourceId, mods, succeeded)
  res.pendingTargetEffects.forEach(spec => {
    const template = STATUS_EFFECTS.find(s => s.name === spec.effectName)
    addCombatantEffect(onto.id, {
      name: spec.effectName,
      description: template?.description,
      durationType: spec.durationType ?? 'manual',
      remaining: spec.remaining,
      damagePerRound: template?.damagePerRound,
    })
    log('effect-applied', `🩸 ${spec.effectName} auto-applied to ${onto.name} (${why}).`)
  })
  // There's no ally picker in combat yet, so the GM routes these by hand.
  res.pendingAllyEffects.forEach(spec => log('effect-applied', `📝 GM: route ${spec.effectName} to an ally of ${user.name}.`))
}

export function useAttackFlow() {
  const session = useCombatStore(s => s.session)
  const adjustCombatantHp = useCombatStore(s => s.adjustCombatantHp)
  const [attack, setAttack] = useState<AttackFlow | null>(null)
  const patch = (p: Partial<AttackFlow>) => setAttack(a => a ? { ...a, ...p } : null)
  const find = (id: string | undefined) => session?.combatants.find(c => c.id === id)

  const open = (attacker: Combatant) => {
    const firstTarget = session?.combatants.find(c => c.id !== attacker.id)
    if (!firstTarget) return
    setAttack({ attackerId: attacker.id, targetId: firstTarget.id, phase: initialPhase(attacker, firstTarget), skillBonus: 0 })
  }

  const setTarget = (id: string) => {
    if (!attack) return
    const attacker = find(attack.attackerId), target = find(id)
    if (!attacker || !target) return
    const phase = attacker.kind === 'creature' && (attack.phase === 'defense-roll' || attack.phase === 'damage')
      ? initialPhase(attacker, target) : attack.phase
    // The old defender's staged mods don't carry over to a new one.
    patch({ targetId: id, phase, defenseRoll: undefined, damageRoll: undefined, defenderApplied: [] })
  }

  const rollAttack = () => {
    if (!attack) return
    const d1 = rollD6(), d2 = rollD6()
    const total = d1 + d2 + attack.skillBonus + totalBonus(attack.applied ?? [])
    const outcome = attackOutcome(total)
    patch({ attackRoll: { d1, d2, total, outcome }, phase: outcome === 'failure' ? 'done' : 'damage' })
  }

  const rollDefense = () => {
    if (!attack) return
    const d1 = rollD6(), d2 = rollD6()
    const outcome = defenseOutcome(d1 + d2)
    patch({ defenseRoll: { d1, d2, total: d1 + d2, outcome }, phase: outcome === 'dodge' ? 'done' : 'damage' })
  }

  const rollDamage = () => {
    const attacker = find(attack?.attackerId), target = find(attack?.targetId)
    if (!attack || !attacker || !target) return
    const die = attacker.damageDie ?? 'd6'
    const defenderMods = attack.defenderApplied ?? []
    const damageRoll = resolveDamage({
      raw: rollDie(parseSides(die)),
      die,
      defReduction: attack.defenseRoll?.outcome === 'reduce' ? 1 : 0,
      target,
      attackerDouble: hasDamageMod(attack.applied ?? [], 'double'),
      defenderHalves: hasDamageMod(defenderMods, 'half-incoming'),
      defenderNoDamage: hasDamageMod(defenderMods, 'no-damage'),
    })
    patch({ damageRoll, phase: 'done' })
  }

  const applyDamage = (complication?: Complication) => {
    const attacker = find(attack?.attackerId), target = find(attack?.targetId)
    if (!attack?.damageRoll || !attacker || !target) return
    adjustCombatantHp(target.id, attack.damageRoll.instantKill ? -target.currentHp : -finalDamage(attack.damageRoll, complication))
    // The attacker succeeds on a 10+ attack (or when a creature attacks without a roll);
    // the defender succeeds on a 10+ defense.
    commitSide(attacker, attack.applied, attack.attackRoll ? attack.attackRoll.outcome === 'success' : true, target, `from ${attacker.name}`)
    commitSide(target, attack.defenderApplied, attack.defenseRoll?.outcome === 'dodge', attacker, `from ${target.name}'s defense`)
    log('combat-end', attackLogLine(attack, attacker.name, target.name, complication))
    setAttack(null)
  }

  return { attack, setAttack, patch, open, setTarget, rollAttack, rollDefense, rollDamage, applyDamage, close: () => setAttack(null) }
}
