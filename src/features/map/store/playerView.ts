// Fog, what players can see, travel markers, the session note and the map background.
import { useCampaignStore } from '../../campaigns/store'
import { log } from '../../log/store'
import type { WorldSlice } from './types'
import { savePlayerView } from './helpers'

export const createPlayerViewSlice: WorldSlice<'toggleFog' | 'revealArea' | 'addPlayerVisibleArea' | 'removePlayerVisibleArea' | 'setTravelingMarker' | 'clearTravelingMarker' | 'setSessionNote' | 'setMapBackground'> = (set, get) => ({
  toggleFog() { set(s => ({ fogEnabled: !s.fogEnabled })) },

  revealArea(id) {
    const area = get().areas.find(a => a.id === id)
    if (area) {
      get().updateArea(id, { revealed: true })
      log('character-move', `📍 ${area.name} revealed.`)
    }
  },

  addPlayerVisibleArea(areaId) {
    const current = get().playerVisibleAreaIds
    if (current.includes(areaId)) return
    const playerVisibleAreaIds = [...current, areaId]
    set({ playerVisibleAreaIds })
    savePlayerView(playerVisibleAreaIds, get().travelingMarkers)
  },

  removePlayerVisibleArea(areaId) {
    const playerVisibleAreaIds = get().playerVisibleAreaIds.filter(id => id !== areaId)
    set({ playerVisibleAreaIds })
    savePlayerView(playerVisibleAreaIds, get().travelingMarkers)
  },

  setTravelingMarker(marker) {
    const travelingMarkers = [
      ...get().travelingMarkers.filter(m => m.characterId !== marker.characterId),
      marker,
    ]
    set({ travelingMarkers })
    savePlayerView(get().playerVisibleAreaIds, travelingMarkers)
  },

  clearTravelingMarker(characterId) {
    const travelingMarkers = get().travelingMarkers.filter(m => m.characterId !== characterId)
    set({ travelingMarkers })
    savePlayerView(get().playerVisibleAreaIds, travelingMarkers)
  },

  setSessionNote(note) {
    set({ sessionNote: note })
    useCampaignStore.getState().updateCampaignData({
      playerView: {
        visibleAreaIds: get().playerVisibleAreaIds,
        travelingMarkers: get().travelingMarkers,
        sessionNote: note,
      },
    })
  },

  setMapBackground(bg) {
    set({ mapBackground: bg })
    useCampaignStore.getState().updateCampaignData({ mapBackground: bg ?? undefined })
  },
})
