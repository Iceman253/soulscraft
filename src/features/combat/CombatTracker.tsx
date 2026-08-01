import { useState, useEffect } from 'react'
import { X, Plus, ArrowRight, Shield, Swords, Dices, Sword, Zap } from 'lucide-react'
import { useCombatStore, HP_TIER } from './store'
import { useCharacterStore } from '../characters/store'
import { useBestiaryStore } from '../bestiary/store'
import { HpBar } from '../../ui/HpBar'
import { Badge } from '../../ui/Badge'
import { TokenAvatar } from '../../ui/TokenAvatar'
import { loadCreatureImage } from '../../lib/imageCache'
import { log } from '../log/store'
import { rollDie, rollD6, parseSides, maxOfDie } from './combatUtils'
import { AttackModal, initialPhase } from './AttackModal'
import type { AttackFlow } from './AttackModal'
import { commitAppliedModifiers, totalBonus, hasDamageMod } from '../characters/AbilityApplyPanel'
import { InitiativeModal } from './InitiativeModal'
import type { InitRoll } from './InitiativeModal'
import { EffectPicker } from './EffectPicker'
import type { StatusTemplate } from './statusEffects'
import { STATUS_EFFECTS } from './statusEffects'
import type { ActiveEffect } from '../../types'

interface CombatTrackerProps { onClose: () => void }

export function CombatTracker({ onClose }: CombatTrackerProps) {
  const {
    session, startCombat, addCharacterCombatant, addCreatureCombatant, removeComabtant,
    setInitiative, sortByInitiative, nextTurn, adjustCombatantHp, updateCombatantNotes,
    addCombatantEffect, removeCombatantEffect, toggleTough, splitSlime, endCombat,
  } = useCombatStore()

  // Detects creatures that should split on death (Slime, Magma Cube — manual p.110)
  const canSplitOnDeath = (name: string) => {
    const n = name.toLowerCase()
    if (n.includes('small')) return false
    return n.includes('slime') || n.includes('magma cube') || n.includes('magma') && n.includes('cube')
  }

  const characters = useCharacterStore(s => s.characters)
  const creatures = useBestiaryStore(s => s.entries)

  const [hpOverride, setHpOverride] = useState<Record<string, string>>({})
  const [defOverride, setDefOverride] = useState<Record<string, string>>({})

  // ── Initiative rolls ───────────────────────────────────────────────────
  const [initRolls, setInitRolls] = useState<InitRoll[] | null>(null)
  const [revealedCount, setRevealedCount] = useState(0)
  const [rolling, setRolling] = useState(false)

  const startInitiativeRolls = () => {
    if (!session || session.combatants.length === 0) return
    const rolls: InitRoll[] = session.combatants.map(c => {
      const d1 = rollD6(), d2 = rollD6()
      return { id: c.id, name: c.name, d1, d2, total: d1 + d2 }
    })
    setInitRolls(rolls)
    setRevealedCount(0)
    setRolling(true)
  }

  useEffect(() => {
    if (!rolling || initRolls === null) return
    if (revealedCount >= initRolls.length) { setRolling(false); return }
    const t = setTimeout(() => setRevealedCount(n => n + 1), 550)
    return () => clearTimeout(t)
  }, [rolling, revealedCount, initRolls])

  const applyInitiative = () => {
    if (!initRolls) return
    initRolls.forEach(r => setInitiative(r.id, r.total))
    sortByInitiative()
    setInitRolls(null)
    setRevealedCount(0)
  }

  const discardInitiative = () => {
    setInitRolls(null)
    setRevealedCount(0)
  }

  // ── Attack flow ────────────────────────────────────────────────────────
  const [attack, setAttack] = useState<AttackFlow | null>(null)
  const [effectPickerFor, setEffectPickerFor] = useState<string | null>(null)

  const openAttack = (attacker: NonNullable<typeof session>['combatants'][number]) => {
    if (!session) return
    const others = session.combatants.filter(c => c.id !== attacker.id)
    if (others.length === 0) return
    const firstTarget = others[0]
    setAttack({ attackerId: attacker.id, targetId: firstTarget.id, phase: initialPhase(attacker, firstTarget), skillBonus: 0 })
  }

  const rollAttack = () => {
    if (!attack) return
    const d1 = rollD6(), d2 = rollD6()
    const appliedBonus = totalBonus(attack.applied ?? [])
    const total = d1 + d2 + attack.skillBonus + appliedBonus
    const outcome: 'success' | 'partial' | 'failure' =
      total >= 10 ? 'success' : total >= 7 ? 'partial' : 'failure'
    setAttack(a => a ? { ...a, attackRoll: { d1, d2, total, outcome }, phase: outcome === 'failure' ? 'done' : 'damage' } : null)
  }

  const rollDefense = () => {
    if (!attack) return
    const d1 = rollD6(), d2 = rollD6()
    const total = d1 + d2
    const outcome: 'dodge' | 'reduce' | 'hit' =
      total >= 10 ? 'dodge' : total >= 7 ? 'reduce' : 'hit'
    setAttack(a => a ? { ...a, defenseRoll: { d1, d2, total, outcome }, phase: outcome === 'dodge' ? 'done' : 'damage' } : null)
  }

  const rollDamage = () => {
    if (!attack || !session) return
    const attacker = session.combatants.find(c => c.id === attack.attackerId)
    const target = session.combatants.find(c => c.id === attack.targetId)
    if (!attacker || !target) return
    const die = attacker.damageDie ?? 'd6'
    const raw = rollDie(parseSides(die))
    const defReduction = attack.defenseRoll?.outcome === 'reduce' ? 1 : 0

    // Apply status modifiers from target's active effects
    const hasBrittle    = target.activeEffects.some(e => e.name === 'Brittle')     // double physical damage
    const hasAbsorption = target.activeEffects.some(e => e.name === 'Absorption')  // halve all damage

    // Apply attacker's staged damage mods (Deadly Strike) and defender's (Hold Ground, Dodge, Block, Redirect)
    const attackerMods = attack.applied ?? []
    const defenderMods = attack.defenderApplied ?? []
    const attackerDouble  = hasDamageMod(attackerMods, 'double')
    const defenderNoDmg   = hasDamageMod(defenderMods, 'no-damage')
    const defenderHalves  = hasDamageMod(defenderMods, 'half-incoming')

    let afterEffects = Math.max(0, raw - target.def - defReduction)
    if (attackerDouble) afterEffects = afterEffects * 2           // Deadly Strike — double damage on hit
    if (hasBrittle)     afterEffects = afterEffects * 2
    if (hasAbsorption)  afterEffects = Math.ceil(afterEffects / 2)
    if (defenderHalves) afterEffects = Math.ceil(afterEffects / 2) // Hold Ground / Block / Redirect
    if (defenderNoDmg)  afterEffects = 0                            // Dodge — full evasion
    const dealt = Math.max(0, afterEffects)
    // Rulebook: instant kill when target HP ≤ attacker max damage — but NOT against Tough creatures or PCs.
    // Deadly Strike doesn't enable instant-kill on PCs; defender mods can suppress it.
    const instantKill = !target.isTough && target.kind !== 'character' && target.currentHp <= maxOfDie(die) && dealt > 0
    const effectNote = [
      attackerDouble  ? '[Deadly Strike ×2]' : '',
      hasBrittle      ? '[Brittle×2]'        : '',
      hasAbsorption   ? '[Absorption÷2]'     : '',
      defenderHalves  ? '[Defender ½]'       : '',
      defenderNoDmg   ? '[Defender evades]'  : '',
      target.isTough && target.currentHp <= maxOfDie(die) ? '[Tough — no instant kill]' : '',
    ].filter(Boolean).join(' ')
    setAttack(a => a ? { ...a, damageRoll: { raw, def: target.def, defReduction, dealt, instantKill, effectNote: effectNote || undefined }, phase: 'done' } : null)
  }

  const applyDamage = (complication?: { reduceDamage: boolean; note: string }) => {
    if (!attack || !session || !attack.damageRoll) return
    const target = session.combatants.find(c => c.id === attack.targetId)
    const attacker = session.combatants.find(c => c.id === attack.attackerId)
    if (!target || !attacker) return
    const { instantKill } = attack.damageRoll
    const finalDealt = !instantKill && complication?.reduceDamage
      ? Math.max(0, attack.damageRoll.dealt - 1)
      : attack.damageRoll.dealt
    adjustCombatantHp(target.id, instantKill ? -target.currentHp : -finalDealt)

    // ── Commit staged modifiers + auto-route status effects ──────────────
    // For the attacker, "success" = attack-roll outcome === 'success' (10+).
    // For PC-on-PC where attacker has no roll (creature), default to true.
    const attackerSucceeded = attack.attackRoll
      ? attack.attackRoll.outcome === 'success'
      : true
    // For the defender, "success" = defense-roll outcome === 'dodge' (10+).
    const defenderSucceeded = attack.defenseRoll
      ? attack.defenseRoll.outcome === 'dodge'
      : false

    if (attacker.kind === 'character' && attack.applied && attack.applied.length > 0) {
      const res = commitAppliedModifiers(attacker.sourceId, attack.applied, attackerSucceeded)
      // Apply target-bound effects to the combatant being attacked (only if still alive after damage)
      res.pendingTargetEffects.forEach(spec => {
        const template = STATUS_EFFECTS.find(s => s.name === spec.effectName)
        addCombatantEffect(target.id, {
          name: spec.effectName,
          description: template?.description,
          durationType: spec.durationType ?? 'manual',
          remaining: spec.remaining,
          damagePerRound: template?.damagePerRound,
        })
        log('effect-applied', `🩸 ${spec.effectName} auto-applied to ${target.name} (from ${attacker.name}).`)
      })
      // Ally effects — log for GM to route, since there's no ally selector in combat yet.
      res.pendingAllyEffects.forEach(spec => {
        log('effect-applied', `📝 GM: route ${spec.effectName} to an ally of ${attacker.name}.`)
      })
    }
    if (target.kind === 'character' && attack.defenderApplied && attack.defenderApplied.length > 0) {
      const res = commitAppliedModifiers(target.sourceId, attack.defenderApplied, defenderSucceeded)
      // Defender-staged target effects = retaliation onto the attacker
      res.pendingTargetEffects.forEach(spec => {
        const template = STATUS_EFFECTS.find(s => s.name === spec.effectName)
        addCombatantEffect(attacker.id, {
          name: spec.effectName,
          description: template?.description,
          durationType: spec.durationType ?? 'manual',
          remaining: spec.remaining,
          damagePerRound: template?.damagePerRound,
        })
        log('effect-applied', `🩸 ${spec.effectName} auto-applied to ${attacker.name} (from ${target.name}'s defense).`)
      })
      res.pendingAllyEffects.forEach(spec => {
        log('effect-applied', `📝 GM: route ${spec.effectName} to an ally of ${target.name}.`)
      })
    }

    const appliedAtkStr  = attack.applied         && attack.applied.length         > 0 ? ` [Atk used: ${attack.applied.map(m => m.name).join(', ')}]` : ''
    const appliedDefStr  = attack.defenderApplied && attack.defenderApplied.length > 0 ? ` [Def used: ${attack.defenderApplied.map(m => m.name).join(', ')}]` : ''
    const atkStr = attack.attackRoll ? ` (roll: ${attack.attackRoll.total})` : ''
    const defStr = attack.defenseRoll ? ` | def: ${attack.defenseRoll.total} (${attack.defenseRoll.outcome})` : ''
    const dmgStr = instantKill
      ? ` → instant defeat`
      : ` → ${attack.damageRoll.raw}−${attack.damageRoll.def}${attack.damageRoll.defReduction ? `−${attack.damageRoll.defReduction}` : ''}${complication?.reduceDamage ? '−1' : ''}=${finalDealt} dealt${attack.damageRoll.effectNote ?? ''}`
    const complicationStr = complication?.note ? ` [⚡ Complication: ${complication.note}]` : (complication ? ' [⚡ partial cost]' : '')
    log('combat-end', `⚔️ ${attacker.name} → ${target.name}${atkStr}${defStr}${dmgStr}${complicationStr}${appliedAtkStr}${appliedDefStr}`)
    setAttack(null)
  }

  // ── Status effects ─────────────────────────────────────────────────────
  const applyStatusEffect = (combatantId: string, template: StatusTemplate) => {
    const effect: Omit<ActiveEffect, 'id'> = {
      name: template.name,
      description: template.description,
      durationType: 'manual',
      damagePerRound: template.damagePerRound,
    }
    addCombatantEffect(combatantId, effect)
    const cTarget = session?.combatants.find(c => c.id === combatantId)
    const cName = cTarget?.name ?? ''
    let extraNote = template.damagePerRound ? ` (${template.damagePerRound}/turn)` : ''

    // Special auto-effects on application
    if (template.name === 'Withering' && cTarget) {
      // Drain all SD for PC combatants (Withering: SD → 0 while active)
      if (cTarget.kind === 'character') {
        const charStore = useCharacterStore.getState()
        const char = charStore.characters.find(c => c.id === cTarget.sourceId)
        if (char) { charStore.adjustSd(char.id, -char.currentSd); extraNote += ' — SD drained to 0' }
      }
    }
    if (template.name === 'Health Boost' && cTarget) {
      // Roll 1d6 temp HP — add to current HP up to maxHp (the temp HP is lost first when damaged)
      const tempHp = rollD6()
      adjustCombatantHp(combatantId, tempHp)
      extraNote += ` — +${tempHp} temp HP rolled`
    }

    log('combat-end', `${template.harmful ? '🩸' : '✨'} ${template.name} applied to ${cName}.${extraNote}`)
    setEffectPickerFor(null)
  }

  // ── Empty / ended state ────────────────────────────────────────────────
  if (!session || session.ended) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-stone-950 text-stone-200">
        <Swords size={48} className="text-redstone mb-4 opacity-60" />
        <h2 className="text-xl font-bold mb-2 font-heading tracking-wide">Combat Tracker</h2>
        <p className="text-stone-500 mb-6 text-sm">Start a new combat encounter</p>
        <button onClick={startCombat} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-redstone hover:bg-red-700 text-white font-bold text-lg">
          <Swords size={20} /> Begin Combat
        </button>
        {session?.ended && (
          <p className="text-stone-500 text-sm mt-4">Previous combat ended. Press Begin to start a new one.</p>
        )}
        <button onClick={onClose} className="mt-4 text-sm text-stone-500 hover:text-stone-300">← Back</button>
      </div>
    )
  }

  const activeCombatant = session.combatants[session.activeIndex]

  return (
    <div className="h-full flex flex-col bg-stone-900 relative">
      {/* Header */}
      <div className="shrink-0 bg-stone-800 border-b border-stone-700 px-4 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Swords size={16} className="text-redstone" />
          <span className="font-bold text-stone-100 font-heading tracking-wide">Combat — Round <span className="font-mono tabular-nums">{session.round}</span></span>
        </div>
        {activeCombatant && <Badge variant="red">Active: {activeCombatant.name}</Badge>}
        <div className="ml-auto flex gap-2">
          {session.combatants.length > 0 && (
            <button onClick={startInitiativeRolls}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-stone-700 text-stone-300 hover:bg-stone-600 text-xs">
              <Dices size={12} /> Roll Initiative
            </button>
          )}
          <button onClick={sortByInitiative} className="px-3 py-1.5 rounded bg-stone-700 text-stone-300 hover:bg-stone-600 text-xs">Sort</button>
          <button onClick={nextTurn} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-gold text-stone-900 font-semibold hover:bg-yellow-400 text-xs">
            Next Turn <ArrowRight size={12} />
          </button>
          <button onClick={endCombat} className="px-3 py-1.5 rounded bg-redstone/80 hover:bg-redstone text-white text-xs">End Combat</button>
          <button onClick={onClose} className="p-1.5 rounded text-stone-400 hover:text-stone-100 hover:bg-stone-700"><X size={16} /></button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Combatants list */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {session.combatants.map((c, i) => (
              <div key={c.id} className={`bg-stone-800 border rounded-xl p-3 transition-all ${
                c.currentHp <= 0
                  ? 'border-stone-800 opacity-50'
                  : i === session.activeIndex
                    ? 'border-gold shadow-lg shadow-gold/10'
                    : 'border-stone-700'
              }`}>
                <div className="flex items-center gap-3">
                  {/* Initiative */}
                  <div className="text-center shrink-0">
                    <div className="text-xs text-stone-500">Init</div>
                    <input type="number" value={c.initiative}
                      onChange={e => setInitiative(c.id, parseInt(e.target.value) || 0)}
                      className="w-12 bg-stone-900 border border-stone-600 rounded px-1 py-0.5 text-stone-200 text-sm text-center outline-none font-mono tabular-nums" />
                  </div>

                  {/* Avatar */}
                  {c.kind === 'character'
                    ? <TokenAvatar name={c.name} characterId={c.sourceId} size={32} />
                    : <div className="w-8 h-8 rounded-full bg-redstone/20 border border-redstone/40 flex items-center justify-center text-sm shrink-0">⚔️</div>
                  }

                  {/* Name + HP */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-stone-100 text-sm">{c.name}</span>
                      {i === session.activeIndex && <Badge variant="gold">Active</Badge>}
                      <Badge variant={c.kind === 'character' ? 'blue' : 'red'}>{c.kind}</Badge>
                      {c.currentHp <= 0 && <span className="text-xs text-stone-500 font-medium">💀 Defeated</span>}
                      {c.currentHp <= 0 && c.kind === 'creature' && canSplitOnDeath(c.name) && (
                        <button
                          onClick={() => splitSlime(c.id)}
                          title="Split into 2 smaller versions"
                          className="px-1.5 py-0.5 rounded text-xs border bg-emerald/10 border-emerald/40 text-emerald hover:bg-emerald/20 transition-colors"
                        >
                          🟢 Split!
                        </button>
                      )}
                      {c.damageDie && c.currentHp > 0 && <span className="text-xs text-stone-500 font-mono">{c.damageDie}</span>}
                      {/* Missed-rest penalty badge for PC combatants */}
                      {c.kind === 'character' && (() => {
                        const char = characters.find(ch => ch.id === c.sourceId)
                        return char && char.missedRests > 0
                          ? <span className="text-xs text-orange-400 font-bold" title={`${char.missedRests} missed rest(s) — apply -${char.missedRests}d4 to their rolls`}>⚠️ -{char.missedRests}d4</span>
                          : null
                      })()}
                      {/* Tough tag toggle — only on creatures */}
                      {c.kind === 'creature' && (
                        <button
                          onClick={() => toggleTough(c.id)}
                          title={c.isTough ? 'Tough: immune to instant kill — click to remove' : 'Mark as Tough (immune to instant kill)'}
                          className={`px-1.5 py-0.5 rounded text-xs border transition-colors ${c.isTough ? 'bg-orange-900/40 border-orange-600/60 text-orange-300' : 'bg-stone-700 border-stone-600 text-stone-500 hover:text-stone-300'}`}
                        >
                          {c.isTough ? '🪨 Tough' : '+ Tough'}
                        </button>
                      )}
                    </div>
                    <HpBar current={c.currentHp} max={c.maxHp} className="mt-1" />
                  </div>

                  {/* DEF */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Shield size={12} className="text-blue-400" />
                    <span className="text-sm text-blue-300 font-bold font-mono tabular-nums">{c.def}</span>
                  </div>

                  {/* Attack button */}
                  <button onClick={() => openAttack(c)} disabled={session.combatants.length < 2}
                    title="Attack"
                    className="flex items-center gap-1 px-2 py-1 rounded bg-redstone/20 hover:bg-redstone/40 border border-redstone/30 text-red-400 text-xs shrink-0 disabled:opacity-30 disabled:cursor-not-allowed">
                    <Sword size={11} /> Attack
                  </button>

                  {/* Effect button */}
                  <button onClick={() => setEffectPickerFor(effectPickerFor === c.id ? null : c.id)}
                    title="Apply status effect"
                    className={`flex items-center gap-1 px-2 py-1 rounded border text-xs shrink-0 transition-colors ${
                      effectPickerFor === c.id
                        ? 'bg-purple-700/30 border-purple-500/50 text-purple-300'
                        : 'bg-stone-700 border-stone-600 text-stone-400 hover:text-stone-200 hover:border-stone-500'
                    }`}>
                    <Zap size={11} /> Effect
                  </button>

                  {/* HP +/− */}
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => adjustCombatantHp(c.id, -1)} className="w-7 h-7 rounded bg-redstone/20 hover:bg-redstone/40 text-red-400 text-sm">-</button>
                    <button onClick={() => adjustCombatantHp(c.id, 1)} className="w-7 h-7 rounded bg-emerald/20 hover:bg-emerald/40 text-emerald text-sm">+</button>
                  </div>

                  <button onClick={() => removeComabtant(c.id)} className="p-1 text-stone-600 hover:text-red-400 shrink-0">
                    <X size={13} />
                  </button>
                </div>

                {/* Active effects badges */}
                {c.activeEffects.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {c.activeEffects.map(e => (
                      <span key={e.id} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs border ${
                        e.damagePerRound
                          ? 'bg-redstone/20 border-redstone/40 text-red-300'
                          : STATUS_EFFECTS.find(s => s.name === e.name)?.harmful === false
                            ? 'bg-emerald/10 border-emerald/30 text-emerald'
                            : 'bg-purple-900/30 border-purple-700/40 text-purple-300'
                      }`}>
                        {e.damagePerRound && <span className="text-red-400">🩸</span>}
                        {e.name}
                        {e.damagePerRound && <span className="text-red-400/70 font-mono text-xs">{e.damagePerRound}/turn</span>}
                        <button onClick={() => removeCombatantEffect(c.id, e.id)} className="ml-0.5 text-stone-500 hover:text-red-400">
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Effect picker — pass creature type tags for immunity warnings */}
                {effectPickerFor === c.id && (
                  <EffectPicker
                    onApply={(template) => applyStatusEffect(c.id, template)}
                    onClose={() => setEffectPickerFor(null)}
                    targetTags={c.kind === 'creature'
                      ? (creatures.find(cr => cr.id === c.sourceId)?.creatureType ?? [])
                      : []}
                  />
                )}

                <input value={c.notes} onChange={e => updateCombatantNotes(c.id, e.target.value)}
                  placeholder="Notes..." className="mt-2 w-full bg-stone-900 border border-stone-700 rounded px-2 py-1 text-stone-400 text-xs outline-none" />
              </div>
            ))}

            {session.combatants.length === 0 && (
              <div className="text-center text-stone-500 py-8 text-sm">No combatants yet. Add characters or creatures on the right.</div>
            )}
          </div>
        </div>

        {/* Add combatants panel */}
        <div className="w-80 shrink-0 border-l border-stone-700 p-4 overflow-y-auto">
          <div className="text-sm font-medium text-stone-300 mb-3 font-heading tracking-wide">Add Combatants</div>

          {/* Characters */}
          <div className="space-y-1 mb-4">
            {characters.map(c => (
              <button key={c.id} onClick={() => addCharacterCombatant(c)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded bg-stone-700 hover:bg-stone-600 text-stone-200 text-xs text-left">
                <TokenAvatar name={c.name} characterId={c.id} size={20} />
                <span className="flex-1 truncate">{c.name}</span>
                <span className="text-stone-500 font-mono">{c.damageDie}</span>
                <Plus size={12} />
              </button>
            ))}
          </div>

          {/* NPC Quick-Add — rulebook p.103 */}
          <div className="mb-4">
            <div className="text-xs text-stone-500 mb-1.5">Quick NPCs</div>
            <div className="grid grid-cols-2 gap-1">
              {([
                { name: 'Common Folk', hp: 4,  die: 'd4',  def: 0 },
                { name: 'Guard',       hp: 10, die: 'd8',  def: 1 },
                { name: 'Noble',       hp: 4,  die: 'd4',  def: 0 },
                { name: 'Soldier',     hp: 12, die: 'd10', def: 2 },
                { name: 'Brigand',     hp: 10, die: 'd8',  def: 1 },
                { name: 'Thief',       hp: 6,  die: 'd6',  def: 0 },
              ] as const).map(npc => (
                <button key={npc.name}
                  onClick={() => {
                    const fakeBestiaryEntry = { id: npc.name, name: npc.name, hpTier: 'average' as const, size: 'medium' as const, creatureType: ['natural'], isCustom: false }
                    addCreatureCombatant(fakeBestiaryEntry, npc.name, npc.hp, npc.def, npc.die)
                  }}
                  className="flex flex-col items-start px-2 py-1.5 rounded bg-stone-800 border border-stone-700 hover:border-stone-500 text-left text-xs transition-colors">
                  <span className="font-medium text-stone-200">{npc.name}</span>
                  <span className="text-stone-500 font-mono">{npc.hp}HP · {npc.die}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Creatures */}
          <div className="text-xs text-stone-500 mb-2">Bestiary Creatures</div>
          <div className="space-y-1.5">
            {creatures.map(c => {
              const img = loadCreatureImage(c.id)
              const defaultHp = c.maxHp ?? HP_TIER[c.hpTier]
              const hpVal = hpOverride[c.id] ?? String(defaultHp)
              const defVal = defOverride[c.id] ?? '0'
              const hp = parseInt(hpVal) || defaultHp
              const def = parseInt(defVal) || 0
              return (
                <div key={c.id} className="bg-stone-800 border border-stone-700 rounded-lg p-2">
                  <div className="flex items-center gap-1.5 mb-2">
                    {img && <img src={img} className="w-5 h-5 rounded object-cover shrink-0" />}
                    <span className="flex-1 truncate text-stone-200 text-xs font-medium">{c.name}</span>
                    <Badge variant={c.hpTier === 'mighty' ? 'red' : c.hpTier === 'strong' ? 'orange' : 'muted'}>{c.hpTier}</Badge>
                  </div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="flex items-center gap-1 flex-1">
                      <span className="text-xs text-stone-500 w-6">HP</span>
                      <input type="number" min={1} value={hpVal}
                        onChange={e => setHpOverride(prev => ({ ...prev, [c.id]: e.target.value }))}
                        className="flex-1 bg-stone-900 border border-stone-600 rounded px-1.5 py-0.5 text-stone-200 text-xs outline-none font-mono tabular-nums" />
                    </div>
                    <div className="flex items-center gap-1 flex-1">
                      <Shield size={11} className="text-blue-400 shrink-0" />
                      <span className="text-xs text-stone-500">DEF</span>
                      <input type="number" min={0} value={defVal}
                        onChange={e => setDefOverride(prev => ({ ...prev, [c.id]: e.target.value }))}
                        className="flex-1 bg-stone-900 border border-stone-600 rounded px-1.5 py-0.5 text-blue-300 text-xs outline-none font-mono tabular-nums" />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      addCreatureCombatant(c, undefined, hp, def)
                      setHpOverride(prev => ({ ...prev, [c.id]: String(defaultHp) }))
                      setDefOverride(prev => ({ ...prev, [c.id]: '0' }))
                    }}
                    className="w-full flex items-center justify-center gap-1 py-1 rounded bg-stone-700 hover:bg-stone-600 text-stone-300 text-xs">
                    <Plus size={10} /> Add to Combat
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Initiative overlay */}
      {initRolls !== null && (
        <InitiativeModal
          rolls={initRolls}
          revealedCount={revealedCount}
          rolling={rolling}
          onApply={applyInitiative}
          onDiscard={discardInitiative}
        />
      )}

      {/* Attack overlay */}
      {attack !== null && session && (
        <AttackModal
          attack={attack}
          session={session}
          onSetTarget={id => {
            const attacker = session.combatants.find(c => c.id === attack.attackerId)!
            const newTarget = session.combatants.find(c => c.id === id)!
            let newPhase = attack.phase
            if (attacker.kind === 'creature' && (attack.phase === 'defense-roll' || attack.phase === 'damage')) {
              newPhase = initialPhase(attacker, newTarget)
            }
            // Clear defender mods when target changes — they applied to the old defender
            setAttack(a => a ? { ...a, targetId: id, phase: newPhase, defenseRoll: undefined, damageRoll: undefined, defenderApplied: [] } : null)
          }}
          onSetBonus={b => setAttack(a => a ? { ...a, skillBonus: b } : null)}
          onSetApplied={applied => setAttack(a => a ? { ...a, applied } : null)}
          onSetDefenderApplied={defenderApplied => setAttack(a => a ? { ...a, defenderApplied } : null)}
          onRollAttack={rollAttack}
          onRollDefense={rollDefense}
          onSkipDefense={() => setAttack(a => a ? { ...a, phase: 'damage' } : null)}
          onRollDamage={rollDamage}
          onApplyDamage={applyDamage}
          onClose={() => setAttack(null)}
        />
      )}
    </div>
  )
}
