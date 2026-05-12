import { useState } from 'react'
import { Modal } from '../../ui/Modal'
import { useCharacterStore } from './store'
import { calcMaxHp, calcMaxSd } from '../../lib/constants'
import { CLASS_ABILITIES } from '../../lib/classAbilities'
import type { Character } from '../../types'

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
}

export function LevelUpModal({ character: c, onClose }: Props) {
  const { levelUp, addAbility, addSkill } = useCharacterStore()

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

  const [selectedAbilityName, setSelectedAbilityName] = useState<string | null>(null)
  const [newSkillName, setNewSkillName] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  const selectedAbility = levelUpAbilities.find(a => a.name === selectedAbilityName) ?? null

  const handleConfirm = () => {
    if (confirmed) return

    // Commit the level-up stats
    levelUp(c.id)

    // Add chosen ability
    if (selectedAbility) {
      addAbility(c.id, {
        name: selectedAbility.name,
        sdCost: selectedAbility.sdCost,
        description: selectedAbility.description,
        recharge: 'rest',
        combatRole: selectedAbility.combatRole,
      })
    }

    // Add new skill if provided
    const trimmedSkill = newSkillName.trim()
    if (trimmedSkill) {
      const bonus = CLASS_SKILL_BONUS[c.class] ?? 1
      addSkill(c.id, {
        name: trimmedSkill,
        bonus,
        description: '',
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
      <div className="mb-6">
        <label className="block text-sm font-semibold text-stone-300 uppercase tracking-wider mb-1.5 font-heading">
          Also: Add New Skill
        </label>
        <input
          type="text"
          value={newSkillName}
          onChange={e => setNewSkillName(e.target.value)}
          placeholder="Skill name from roleplay..."
          className="w-full bg-stone-700 border border-stone-600 rounded px-3 py-2 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
        />
        {newSkillName.trim() && (
          <p className="text-xs text-stone-400 mt-1">
            Will be added with +{CLASS_SKILL_BONUS[c.class] ?? 1} bonus.
          </p>
        )}
      </div>

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
          Confirm Level Up
        </button>
      </div>
    </Modal>
  )
}
