import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Modal } from '../../ui/Modal'
import { useCharacterStore } from './store'
import { useRequestStore } from '../requests/store'
import { calcMaxHp, calcMaxSd } from '../../lib/constants'
import { CLASS_ABILITIES } from '../../lib/classAbilities'
import { STATUS_EFFECTS } from '../combat/statusEffects'
import type { Character, CombatRole, AppliedStatusEffectSpec, StatusEffectTarget, EffectDuration } from '../../types'

/** Optional pre-filled state passed when reopening the modal after the GM
 *  denied a previous skill proposal — lets the player adjust rather than redo. */
export interface LevelUpInitialState {
  abilityName?: string | null
  skillName?: string
  skillDescription?: string
  skillRoles?: CombatRole[]
  skillEffects?: AppliedStatusEffectSpec[]
}

const ALL_ROLES: { role: CombatRole; label: string; hint: string }[] = [
  { role: 'attack',  label: 'Attack',  hint: 'Surfaces when this character is attacking' },
  { role: 'defense', label: 'Defense', hint: 'Surfaces when this character is being attacked' },
  { role: 'general', label: 'General', hint: 'Surfaces on both combat sides + the dice roller' },
  { role: 'utility', label: 'Utility', hint: 'Out-of-combat only (skill checks, social, exploration)' },
]

const ALL_TARGETS: { target: StatusEffectTarget; label: string }[] = [
  { target: 'self',        label: 'Self' },
  { target: 'target',      label: 'Target' },
  { target: 'ally',        label: 'Ally' },
  { target: 'all-allies',  label: 'All allies' },
]

const DURATION_OPTIONS: { value: EffectDuration; label: string; needsCount: boolean }[] = [
  { value: 'manual',     label: 'Manual',     needsCount: false },
  { value: 'scenes',     label: 'Scenes',     needsCount: true  },
  { value: 'days',       label: 'Days',       needsCount: true  },
  { value: 'until-rest', label: 'Until rest', needsCount: false },
  { value: 'permanent',  label: 'Permanent',  needsCount: false },
]

// Skill bonus per class at character creation
const CLASS_SKILL_BONUS: Record<string, 1 | 2 | 3> = {
  Warrior:     1,
  Vindicator:  1,
  Hunter:      2,
  Evoker:      2,
  Delver:      3,
  Wildspeaker: 3,
  Enchanter:   3,
  Tecton:      3,
  Alchemist:   3,
}

interface Props {
  character: Character
  onClose: () => void
  initialState?: LevelUpInitialState
}

export function LevelUpModal({ character: c, onClose, initialState }: Props) {
  const { levelUp, addAbility } = useCharacterStore()
  const addRequest = useRequestStore(s => s.addRequest)

  const newLevel = c.level + 1
  const newMaxHp = calcMaxHp(c.class, newLevel)
  const hpGain = newMaxHp - c.maxHp
  const newMaxSd = calcMaxSd(newLevel)
  const sdGain = newMaxSd - c.maxSd

  // Abilities available at level-up for this class, excluding ones already owned
  const ownedNames = new Set(c.abilities.map(a => a.name))
  const levelUpAbilities = (CLASS_ABILITIES[c.class] ?? []).filter(
    a => a.tier === 'levelUp' && !ownedNames.has(a.name)
  )

  const [selectedAbilityName, setSelectedAbilityName] = useState<string | null>(initialState?.abilityName ?? null)
  const [newSkillName, setNewSkillName] = useState(initialState?.skillName ?? '')
  const [newSkillDesc, setNewSkillDesc] = useState(initialState?.skillDescription ?? '')
  const [newSkillRoles, setNewSkillRoles] = useState<CombatRole[]>(initialState?.skillRoles ?? ['general'])
  const [newSkillEffects, setNewSkillEffects] = useState<AppliedStatusEffectSpec[]>(initialState?.skillEffects ?? [])
  const [confirmed, setConfirmed] = useState(false)

  const toggleRole = (role: CombatRole) =>
    setNewSkillRoles(rs => rs.includes(role) ? rs.filter(r => r !== role) : [...rs, role])

  const addBlankEffect = () =>
    setNewSkillEffects(es => [...es, { effectName: STATUS_EFFECTS[0].name, target: 'target', durationType: 'manual', onSuccess: false }])

  const updateEffect = (i: number, patch: Partial<AppliedStatusEffectSpec>) =>
    setNewSkillEffects(es => es.map((e, idx) => idx === i ? { ...e, ...patch } : e))

  const removeEffect = (i: number) =>
    setNewSkillEffects(es => es.filter((_, idx) => idx !== i))

  const selectedAbility = levelUpAbilities.find(a => a.name === selectedAbilityName) ?? null

  const trimmedSkill = newSkillName.trim()
  const proposingSkill = trimmedSkill.length > 0
  const bonus = CLASS_SKILL_BONUS[c.class] ?? 1

  const handleConfirm = () => {
    if (confirmed) return

    if (proposingSkill) {
      // ── Skill-approval path ─────────────────────────────────────────────
      // Custom skills require GM approval. We package the entire level-up
      // (stats + ability + skill) as a single atomic request — if the GM
      // denies it, none of it applies and the player can adjust and resubmit.
      const safeRoles = newSkillRoles.length > 0 ? newSkillRoles : ['general' as CombatRole]
      addRequest({
        characterId: c.id,
        characterName: c.name,
        type: 'skill-approval',
        payload: {
          abilityName: selectedAbility?.name ?? null,
          skillName: trimmedSkill,
          skillDescription: newSkillDesc.trim(),
          skillBonus: bonus,
          skillCombatRoles: safeRoles,
          skillAppliedEffects: newSkillEffects.length > 0 ? newSkillEffects : [],
        },
        label: `Level Up → L${newLevel}${selectedAbility ? ` · learn "${selectedAbility.name}"` : ''} · propose new Skill "${trimmedSkill}"`,
      })
      setConfirmed(true)
      onClose()
      return
    }

    // ── No-approval path ─────────────────────────────────────────────────
    // No custom skill proposed — commit the level-up immediately.
    levelUp(c.id)
    if (selectedAbility) {
      addAbility(c.id, {
        name: selectedAbility.name,
        sdCost: selectedAbility.sdCost,
        description: selectedAbility.description,
        recharge: 'rest',
        combatRole: selectedAbility.combatRole,
        combatRoles: selectedAbility.combatRoles ?? (selectedAbility.combatRole ? [selectedAbility.combatRole] : undefined),
        appliedEffects: selectedAbility.appliedEffects,
      })
    }
    setConfirmed(true)
    onClose()
  }

  const hasSubclass = Boolean(c.discipline)

  return (
    <Modal title={`Level Up — ${c.name}`} onClose={onClose}>
      {/* Celebration header */}
      <div className="text-center mb-5">
        <div className="text-3xl font-bold text-amber-400 font-heading tracking-wide">
          Level {newLevel}!
        </div>
        <div className="text-stone-400 text-sm mt-1">{c.name} grows stronger.</div>
      </div>

      {/* Stat gains */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-stone-700 border border-stone-600 rounded-lg p-3 text-center">
          <div className="text-xs text-stone-400 uppercase tracking-wider mb-1 font-heading">HP</div>
          <div className="text-lg font-bold text-green-400 font-mono tabular-nums">+{hpGain}</div>
          <div className="text-xs text-stone-400 font-mono tabular-nums">{c.maxHp} → {newMaxHp}</div>
        </div>
        <div className="bg-stone-700 border border-stone-600 rounded-lg p-3 text-center">
          <div className="text-xs text-stone-400 uppercase tracking-wider mb-1 font-heading">SD</div>
          <div className="text-lg font-bold text-blue-400 font-mono tabular-nums">+{sdGain}</div>
          <div className="text-xs text-stone-400 font-mono tabular-nums">{c.maxSd} → {newMaxSd}</div>
        </div>
      </div>

      {/* Special Ability picker */}
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-stone-300 uppercase tracking-wider mb-2 font-heading">
          Choose a Special Ability
        </h3>

        {levelUpAbilities.length === 0 ? (
          <p className="text-stone-500 text-sm italic">
            All {c.class} level-up abilities are already learned.
          </p>
        ) : (
          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
            {levelUpAbilities.map(ability => {
              const isSelected = selectedAbilityName === ability.name
              return (
                <button
                  key={ability.name}
                  onClick={() => setSelectedAbilityName(isSelected ? null : ability.name)}
                  className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                    isSelected
                      ? 'border-amber-500 bg-amber-900/30 text-amber-200'
                      : 'border-stone-600 bg-stone-700 hover:bg-stone-700/80 hover:border-stone-500 text-stone-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-medium text-sm">{ability.name}</span>
                    <span className={`text-xs shrink-0 ${isSelected ? 'text-amber-400' : 'text-stone-400'}`}>
                      {ability.sdCost > 0
                        ? ability.hpCostAlt
                          ? `${ability.sdCost} SD / ${ability.hpCostAlt} HP`
                          : `${ability.sdCost} SD`
                        : 'Free'}
                      {ability.requiresRoll ? ' · Roll' : ''}
                    </span>
                  </div>
                  <p className={`text-xs leading-relaxed ${isSelected ? 'text-stone-200' : 'text-stone-400'}`}>
                    {ability.description}
                  </p>
                </button>
              )
            })}
          </div>
        )}

        {/* Subclass note */}
        {hasSubclass && (
          <p className="mt-2 text-xs text-stone-500 italic">
            You could also take a Level 1 ability from your subclass ({c.discipline}) instead — ask your GM.
          </p>
        )}
      </div>

      {/* New skill */}
      <div className="mb-6 space-y-3">
        <label className="block text-sm font-semibold text-stone-300 uppercase tracking-wider mb-1.5 font-heading">
          Also: Add New Skill
        </label>

        {/* Name */}
        <input
          type="text"
          value={newSkillName}
          onChange={e => setNewSkillName(e.target.value)}
          placeholder="Skill name from roleplay..."
          className="w-full bg-stone-700 border border-stone-600 rounded px-3 py-2 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
        />

        {newSkillName.trim() && (
          <>
            {/* Description */}
            <textarea
              value={newSkillDesc}
              onChange={e => setNewSkillDesc(e.target.value)}
              placeholder="When does this skill apply? e.g. 'Climbing sheer walls or rough cliffs'"
              rows={2}
              className="w-full bg-stone-700 border border-stone-600 rounded px-3 py-2 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 resize-none"
            />

            {/* Combat roles (multi-select) */}
            <div>
              <div className="text-xs text-stone-400 mb-1.5">Surfaces in <span className="text-stone-500">(pick any combination)</span></div>
              <div className="flex flex-wrap gap-1.5">
                {ALL_ROLES.map(r => {
                  const on = newSkillRoles.includes(r.role)
                  return (
                    <button
                      key={r.role}
                      type="button"
                      onClick={() => toggleRole(r.role)}
                      title={r.hint}
                      className={`px-2.5 py-1 rounded border text-xs font-medium transition-colors ${
                        on
                          ? 'bg-amber-900/40 border-amber-500/70 text-amber-200'
                          : 'bg-stone-700 border-stone-600 text-stone-400 hover:text-stone-200 hover:border-stone-400'
                      }`}
                    >
                      {on ? '✓ ' : ''}{r.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Status effect picker */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-xs text-stone-400">Auto-apply status effect <span className="text-stone-500">(optional)</span></div>
                <button
                  type="button"
                  onClick={addBlankEffect}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-stone-700 border border-stone-600 text-stone-300 hover:border-amber-500/60 hover:text-amber-300 text-xs transition-colors"
                >
                  <Plus size={11} /> Add effect
                </button>
              </div>

              {newSkillEffects.length === 0 ? (
                <div className="text-xs text-stone-500 italic px-2 py-1">
                  None. Fine for most skills — only add if this skill literally applies a named status (e.g. "Eagle Eye on a successful tracking check").
                </div>
              ) : (
                <div className="space-y-1.5">
                  {newSkillEffects.map((eff, i) => {
                    const dur = DURATION_OPTIONS.find(d => d.value === (eff.durationType ?? 'manual'))!
                    return (
                      <div key={i} className="bg-stone-700/50 border border-stone-600 rounded p-2 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <select
                            value={eff.effectName}
                            onChange={e => updateEffect(i, { effectName: e.target.value })}
                            className="flex-1 bg-stone-800 border border-stone-600 rounded px-2 py-1 text-stone-200 text-xs outline-none"
                          >
                            {STATUS_EFFECTS.map(s => (
                              <option key={s.name} value={s.name}>
                                {s.name} (Lv{s.level}){s.harmful ? '' : ' ✨'}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => removeEffect(i)}
                            className="p-1 text-stone-500 hover:text-red-400"
                            title="Remove this effect"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                          <span className="text-stone-500">to</span>
                          <select
                            value={eff.target}
                            onChange={e => updateEffect(i, { target: e.target.value as StatusEffectTarget })}
                            className="bg-stone-800 border border-stone-600 rounded px-1.5 py-0.5 text-stone-200 outline-none"
                          >
                            {ALL_TARGETS.map(t => <option key={t.target} value={t.target}>{t.label}</option>)}
                          </select>

                          <span className="text-stone-500">for</span>
                          <select
                            value={eff.durationType ?? 'manual'}
                            onChange={e => updateEffect(i, { durationType: e.target.value as EffectDuration })}
                            className="bg-stone-800 border border-stone-600 rounded px-1.5 py-0.5 text-stone-200 outline-none"
                          >
                            {DURATION_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                          </select>

                          {dur.needsCount && (
                            <input
                              type="number"
                              min={1}
                              value={eff.remaining ?? 1}
                              onChange={e => updateEffect(i, { remaining: Math.max(1, parseInt(e.target.value) || 1) })}
                              className="w-12 bg-stone-800 border border-stone-600 rounded px-1.5 py-0.5 text-stone-200 outline-none text-xs font-mono"
                            />
                          )}

                          <label className="flex items-center gap-1 ml-auto cursor-pointer text-stone-400 hover:text-stone-200">
                            <input
                              type="checkbox"
                              checked={!!eff.onSuccess}
                              onChange={e => updateEffect(i, { onSuccess: e.target.checked })}
                              className="accent-amber-500"
                            />
                            <span>Only on 10+</span>
                          </label>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <p className="text-xs text-stone-400">
              Will be proposed with +{bonus} bonus. <span className="text-amber-300">Requires GM approval before it applies.</span>
            </p>
          </>
        )}
      </div>

      {/* Pending-approval warning */}
      {proposingSkill && (
        <div className="mb-3 rounded-lg border border-amber-700/40 bg-amber-950/30 px-3 py-2 text-xs text-amber-200 leading-relaxed">
          ⏳ Because you're proposing a new Skill, this level-up will be sent to the GM for approval.
          Your stats, ability, and skill will only apply once the GM accepts it.
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm rounded bg-stone-700 border border-stone-600 text-stone-300 hover:bg-stone-600 hover:text-stone-100 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={confirmed}
          className="px-5 py-2 text-sm rounded bg-amber-700 border border-amber-600 text-amber-100 font-semibold hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {proposingSkill ? 'Send to GM' : 'Confirm Level Up'}
        </button>
      </div>
    </Modal>
  )
}
