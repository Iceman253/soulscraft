// World map store, composed from slices:
//   areas.ts       areas and roads
//   playerView.ts  fog, player visibility, travel markers, session note, map background
//   tower.ts       Tower of Trials
//   subNodes.ts    nested sub-locations
//   helpers.ts     path updates and saving
import { create } from 'zustand'
import { emptyTowerTrials } from '../../../types'
import type { WorldStore } from './types'
import { createAreasSlice } from './areas'
import { createPlayerViewSlice } from './playerView'
import { createTowerSlice } from './tower'
import { createSubNodesSlice } from './subNodes'

export type { WorldStore } from './types'

export const useWorldStore = create<WorldStore>()((...a) => {
  const [set] = a
  return {
    areas: [],
    edges: [],
    fogEnabled: false,
    playerVisibleAreaIds: [],
    travelingMarkers: [],
    sessionNote: '',
    towerTrials: emptyTowerTrials(),
    mapBackground: null,

    hydrate(areas, edges, playerView?, towerTrials?, mapBackground?) {
      const areaIds = new Set(areas.map(a => a.id))
      // Drop any visible-area IDs that no longer exist (area was deleted but ID wasn't cleaned up)
      const playerVisibleAreaIds = (playerView?.visibleAreaIds ?? []).filter(id => areaIds.has(id))
      set({
        areas,
        edges,
        playerVisibleAreaIds,
        travelingMarkers: playerView?.travelingMarkers ?? [],
        sessionNote: playerView?.sessionNote ?? '',
        towerTrials: towerTrials ?? emptyTowerTrials(),
        mapBackground: mapBackground ?? null,
      })
    },

    ...createAreasSlice(...a),
    ...createPlayerViewSlice(...a),
    ...createTowerSlice(...a),
    ...createSubNodesSlice(...a),
  }
})
