import type { PlayerRequest } from '../store'
import { useCharacterStore } from '../../characters/store'
import { useQuestStore } from '../../quests/store'
import { useWorldStore } from '../../map/store'
import { useEconomyStore } from '../../economy/store'
import { useBuildStore } from '../../building/store'
import { looksLikeBlocks, parseBuildProposal, parseCarryLimit } from '../../../lib/world/building'
import { log } from '../../log/store'
import { CURRENCY_OPTIONS } from '../../../lib/economy/currency'
import { CLASS_ABILITIES } from '../../../lib/rules/classAbilities'
import type { CombatRole, AppliedStatusEffectSpec, EffectDuration } from '../../../types'


// ── Execute an approved request against the appropriate stores ─────────────────
// Returns false when execution failed (e.g. buyer can't afford it) so the
// caller can leave the request pending instead of falsely marking it approved.
export function useExecuteRequest() {
  const { adjustHp, adjustSd, awardXp, levelUp, removeEffect, addEffect, addOnHandItem, setCurrency, addAbility, addSkill } = useCharacterStore()
  const { setStatus } = useQuestStore()
  const { addPlayerVisibleArea } = useWorldStore()
  const characters = useCharacterStore(s => s.characters)
  const quests = useQuestStore(s => s.quests)

  return function execute(req: PlayerRequest): boolean {
    const p = req.payload
    const charId = req.characterId
    const char = characters.find(c => c.id === charId)

    switch (req.type) {
      case 'buy-item': {
        const result = useEconomyStore.getState().buy(
          String(p.marketId), String(p.goodId), Number(p.quantity) || 1,
          charId, Number(p.unitPriceCopper) || 0,
        )
        if (!result.ok) {
          log('manual', `🛒 Purchase request from ${req.characterName} not completed: ${result.reason}`)
          return false
        }
        break
      }
      case 'sell-item': {
        const result = useEconomyStore.getState().sell(
          String(p.marketId), charId, String(p.itemId),
          Number(p.quantity) || 1, Number(p.unitPriceCopper) || 0,
        )
        if (!result.ok) {
          log('manual', `💰 Sale request from ${req.characterName} not completed: ${result.reason}`)
          return false
        }
        break
      }
      case 'item': {
        addOnHandItem(charId, { name: String(p.itemName), quantity: Number(p.quantity) || 1, isBlock: looksLikeBlocks(String(p.itemName)) })
        log('character-move', `🎒 ${req.characterName} received ${p.quantity}× ${p.itemName}.`)
        break
      }
      case 'heal-full': {
        if (char) { adjustHp(charId, char.maxHp); log('character-move', `❤️ ${req.characterName} fully healed.`) }
        break
      }
      case 'heal-amount': {
        adjustHp(charId, Number(p.amount))
        log('character-move', `❤️ ${req.characterName} healed ${p.amount} HP.`)
        break
      }
      case 'sd-restore': {
        if (char) { adjustSd(charId, char.maxSd); log('character-move', `✨ ${req.characterName}'s SD fully restored.`) }
        break
      }
      case 'xp': {
        awardXp(charId, Number(p.amount), 'manual', 'Player request')
        log('xp-awarded', `⭐ ${req.characterName} awarded ${p.amount} XP by request.`)
        break
      }
      case 'level-up': {
        levelUp(charId)
        log('level-up', `🆙 ${req.characterName} leveled up!`)
        break
      }
      case 'effect-add': {
        addEffect(charId, {
          name: String(p.name),
          durationType: (typeof p.durationType === 'string' ? p.durationType : 'manual') as EffectDuration,
          remaining: typeof p.remaining === 'number' ? p.remaining : undefined,
          damagePerRound: typeof p.damagePerRound === 'string' ? p.damagePerRound : undefined,
          healPerRound: typeof p.healPerRound === 'string' ? p.healPerRound : undefined,
        })
        log('effect-applied', `🧪 ${req.characterName}: effect "${p.name}" applied by GM.`)
        break
      }
      case 'effect-remove': {
        removeEffect(charId, String(p.effectId))
        log('effect-expired', `🧹 ${req.characterName}: effect "${p.effectName}" removed by GM.`)
        break
      }
      case 'quest-complete': {
        const quest = quests.find(q => q.id === String(p.questId))
        if (quest) setStatus(quest.id, 'completed')
        break
      }
      case 'quest-fail': {
        const quest = quests.find(q => q.id === String(p.questId))
        if (quest) setStatus(quest.id, 'failed')
        break
      }
      case 'quest-activate': {
        const quest = quests.find(q => q.id === String(p.questId))
        if (quest) setStatus(quest.id, 'active')
        break
      }
      case 'currency': {
        if (char) {
          const key = String(p.currencyType) as keyof typeof char.currency
          const current = char.currency[key] ?? 0
          setCurrency(charId, { [key]: current + Number(p.amount) })
          const opt = CURRENCY_OPTIONS.find(o => o.key === key)
          log('character-move', `💰 ${req.characterName} received ${p.amount} ${opt?.label ?? key}.`)
        }
        break
      }
      case 'reveal-area': {
        // Player sent a name; find matching area (case-insensitive)
        const areas = useWorldStore.getState().areas
        const area = areas.find(a => a.name.toLowerCase() === String(p.areaName).toLowerCase())
        if (area) {
          addPlayerVisibleArea(area.id)
          log('character-move', `🗺️ Area "${area.name}" revealed to players.`)
        } else {
          log('manual', `🗺️ Reveal request for "${p.areaName}" — no matching area found on map.`)
        }
        break
      }
      case 'build-start': {
        useBuildStore.getState().addStructure(parseBuildProposal(p, charId))
        break
      }
      case 'mine': {
        useBuildStore.getState().mine({
          characterId: charId,
          areaName: typeof p.areaName === 'string' ? p.areaName : undefined,
          materials: Array.isArray(p.materials) ? p.materials.map(String) : [],
          requested: Number(p.requested) || 0,
          total: Number(p.total) || 0,
          gained: Number(p.gained) || 0,
          destination: p.destination === 'onHand' || p.destination === 'mine' ? p.destination : 'storage',
          placeId: typeof p.placeId === 'string' ? p.placeId : undefined,
          doubleSix: p.doubleSix === true,
        })
        break
      }
      case 'carry-limit': {
        const limit = parseCarryLimit(p.limit)
        if (limit === null) return false
        useCharacterStore.getState().setCarryLimit(charId, limit)
        break
      }
      case 'build-days': {
        const build = useBuildStore.getState().structures.find(s => s.id === p.structureId)
        if (!build) return false
        useBuildStore.getState().addProgress(build.id, { days: Number(p.days) || 0 })
        log('building', `🔨 ${req.characterName} logged ${p.days} day(s) on ${build.name}.`)
        break
      }
      case 'build-speedup': {
        const build = useBuildStore.getState().structures.find(s => s.id === p.structureId)
        if (!build) return false
        useBuildStore.getState().updateStructure(build.id, { daysRequired: Math.max(0, Number(p.days) || 0) })
        log('building', `⏱️ ${build.name} now takes ${p.days} day(s), thanks to ${req.characterName}.`)
        break
      }
      case 'custom': {
        log('manual', `💬 GM approved request from ${req.characterName}: "${p.text}"`)
        break
      }
      case 'skill-approval': {
        // Atomic level-up bundle: stat gains + chosen ability + new custom skill.
        // Held until this moment because the skill required GM approval.
        if (!char) break
        levelUp(charId)

        const abilityName = p.abilityName ? String(p.abilityName) : null
        if (abilityName) {
          const master = (CLASS_ABILITIES[char.class] ?? []).find(a => a.name === abilityName)
          if (master) {
            addAbility(charId, {
              name: master.name,
              sdCost: master.sdCost,
              description: master.description,
              recharge: 'rest',
              combatRole: master.combatRole,
              combatRoles: master.combatRoles ?? (master.combatRole ? [master.combatRole] : undefined),
              appliedEffects: master.appliedEffects,
            })
          }
        }

        const skillName = p.skillName ? String(p.skillName) : ''
        if (skillName) {
          const rawRoles = Array.isArray(p.skillCombatRoles) ? p.skillCombatRoles as CombatRole[] : []
          const rawEffects = Array.isArray(p.skillAppliedEffects) ? p.skillAppliedEffects as AppliedStatusEffectSpec[] : []
          addSkill(charId, {
            name: skillName,
            bonus: (Number(p.skillBonus) || 1) as 1 | 2 | 3,
            description: String(p.skillDescription ?? ''),
            combatRoles: rawRoles.length > 0 ? rawRoles : ['general'],
            appliedEffects: rawEffects.length > 0 ? rawEffects : undefined,
          })
        }

        log('level-up', `🆙 ${req.characterName} leveled up${abilityName ? ` and learned "${abilityName}"` : ''}${skillName ? ` and gained new Skill "${skillName}"` : ''}.`)
        break
      }
    }
    return true
  }
}
