import { create } from 'zustand'
import type { RestEvent, RestConditions } from '../../types'
import { newId } from '../../lib/id'
import { useCampaignStore } from '../campaigns/store'
import { useCharacterStore } from '../characters/store'
import { log } from '../log/store'

interface RestStore {
  events: RestEvent[]
  hydrate: (events: RestEvent[]) => void
  logRest: (
    location: string,
    conditions: RestConditions,
    characterIds: string[],
    notes?: string
  ) => void
  missRest: (characterId: string) => void
}

function save(events: RestEvent[]) {
  useCampaignStore.getState().updateCampaignData({ restEvents: events })
}

function conditionsMet(c: RestConditions): number {
  return [c.fed, c.shelter, c.safe, c.calmMind].filter(Boolean).length
}

export const useRestStore = create<RestStore>((set, get) => ({
  events: [],

  hydrate(events) { set({ events }) },

  logRest(location, conditions, characterIds, notes) {
    const met = conditionsMet(conditions)
    // Rulebook: "Good Quality Rest if most or all conditions are met" = 3 or more out of 4
    const quality: RestEvent['quality'] = met >= 3 ? 'good' : 'poor'
    const event: RestEvent = {
      id: newId(),
      timestamp: Date.now(),
      location,
      conditions,
      quality,
      characterIds,
      notes,
    }
    const events = [...get().events, event]
    set({ events })
    save(events)

    // Apply HP/SD regen, clear effects, and reset class features for resting characters
    const charStore = useCharacterStore.getState()
    for (const charId of characterIds) {
      const char = charStore.characters.find(c => c.id === charId)
      if (!char) continue
      if (quality === 'good') {
        // Rulebook: fully restores HP and SD; eliminates negative effects
        // Clear: until-rest effects and any ongoing damage effects (poison, bleed etc.)
        // Keep: permanent beneficial effects and scene-duration buffs
        const clearedCount = char.activeEffects.filter(
          e => e.durationType === 'until-rest' || e.damagePerRound
        ).length
        charStore.updateCharacter(charId, {
          currentHp: char.maxHp,
          currentSd: char.maxSd,
          missedRests: 0,
          activeEffects: char.activeEffects.filter(
            e => e.durationType !== 'until-rest' && !e.damagePerRound
          ),
        })
        if (clearedCount > 0) {
          log('effect-expired', `✨ ${char.name}: ${clearedCount} effect${clearedCount !== 1 ? 's' : ''} cleared by Good Rest.`)
        }
      } else {
        // Rulebook: "Recovers half of lost HP (rounded up)" and SD up to half max (rounded up)
        const lostHp = char.maxHp - char.currentHp
        let hpGain = Math.ceil(lostHp / 2)
        let sdFloor = Math.ceil(char.maxSd / 2)

        // Survivalist discipline bonus: +2 HP and +1 SD on Poor Rest (for all resting party members)
        const hasSurvivorInParty = characterIds.some(id => {
          const c = charStore.characters.find(x => x.id === id)
          return c?.discipline === 'Survivalist'
        })
        if (hasSurvivorInParty) {
          hpGain += 2
          sdFloor = Math.min(char.maxSd, sdFloor + 1)
          log('rest', `🏕️ Survivalist bonus applied to ${char.name}: +2 HP, +1 SD.`)
        }

        charStore.updateCharacter(charId, {
          currentHp: Math.min(char.maxHp, char.currentHp + hpGain),
          currentSd: Math.max(char.currentSd, sdFloor),
          missedRests: 0,
        })
      }

      // Rulebook: rest consumes 1 ration per player
      if (char.rations > 0) {
        charStore.setRations(charId, char.rations - 1)
      } else {
        log('rest', `⚠️ ${char.name} has no rations — rest condition "Fed" may be unmet.`)
      }
    }

    charStore.resetAllClassFeaturesOnRest(characterIds)

    const condStr = [
      conditions.fed ? '🍖 Fed' : null,
      conditions.shelter ? '🏠 Shelter' : null,
      conditions.safe ? '🛡️ Safe' : null,
      conditions.calmMind ? '🧘 Calm Mind' : null,
    ].filter(Boolean).join(', ')

    const qualityStr = quality === 'good' ? '✅ Good Rest' : '⚠️ Poor Rest'
    log('rest', `${qualityStr} at ${location}. Conditions: ${condStr || 'none'}. ${quality === 'good' ? 'Full HP & SD restored.' : 'Partial HP & SD restored.'}`)
  },

  missRest(characterId) {
    useCharacterStore.getState().missRest(characterId)
  },
}))
