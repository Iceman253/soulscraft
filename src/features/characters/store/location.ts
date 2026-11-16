import { useWorldStore } from '../../map/store'
import { committer } from './helpers'
import type { CharacterSlice } from './types'

/** Where a character is: an area, a sub-location inside it, or a free spot on the
 *  world map. An area and a free map position are mutually exclusive. */
export interface LocationActions {
  setLocation: (id: string, locationId: string | null) => void
  setMapPos: (id: string, pos: { x: number; y: number } | null) => void
  setSubLocation: (id: string, subLocationId: string | null) => void
}

export const createLocationSlice: CharacterSlice<LocationActions> = (set, get) => {
  const { update } = committer(set, get)
  return {
    setMapPos(id, pos) {
      update(id, c => ({
        ...c, mapPos: pos ?? undefined, locationId: pos ? null : c.locationId, subLocationId: pos ? null : c.subLocationId,
      }))
    },

    setLocation(id, locationId) {
      update(id, c => ({ ...c, locationId, mapPos: undefined }))
      if (!locationId) return
      // Arriving reveals the area to players and ends a journey that ends here.
      const world = useWorldStore.getState()
      world.addPlayerVisibleArea(locationId)
      const marker = world.travelingMarkers.find(m => m.characterId === id)
      if (marker && marker.toAreaId === locationId) world.clearTravelingMarker(id)
    },

    setSubLocation(id, subLocationId) {
      update(id, c => ({ ...c, subLocationId }))
    },
  }
}
