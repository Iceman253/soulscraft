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
    const quality: RestEvent['quality'] = met >= 4 ? 'good' : 'poor'
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

    // Apply HP/SD regen and reset class features for resting characters
    const charStore = useCharacterStore.getState()
    for (const charId of characterIds) {
      const char = charStore.characters.find(c => c.id === charId)
      if (!char) continue
      if (quality === 'good') {
        charStore.updateCharacter(charId, {
          currentHp: char.maxHp,
          currentSd: char.maxSd,
          missedRests: 0,
        })
      } else {
        // Poor rest: half SD (rounded up), partial HP
        charStore.updateCharacter(charId, {
          currentHp: Math.min(char.maxHp, char.currentHp + Math.ceil(char.maxHp / 2)),
          currentSd: Math.ceil(char.maxSd / 2),
          missedRests: 0,
        })
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
