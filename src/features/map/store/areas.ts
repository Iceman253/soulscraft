// Areas and the roads between them.
import { newId } from '../../../lib/platform/id'
import type { WorldSlice } from './types'
import { savePlayerView, save, updAreas } from './helpers'

export const createAreasSlice: WorldSlice<'addArea' | 'updateArea' | 'deleteArea' | 'moveArea' | 'addEdge' | 'updateEdge' | 'deleteEdge' | 'splitEdge'> = (set, get) => ({
  addArea(area) {
    const id = newId()
    const areas = [...get().areas, { ...area, id, subNodes: [], subEdges: [], revealed: true }]
    updAreas(areas, get().edges, set)
    // New areas are visible to players by default so they appear on the player
    // map immediately (the GM can hide any area via right-click → Hide from Players).
    get().addPlayerVisibleArea(id)
    return id
  },

  updateArea(id, patch) {
    const areas = get().areas.map(a => a.id === id ? { ...a, ...patch } : a)
    updAreas(areas, get().edges, set)
  },

  deleteArea(id) {
    const areas = get().areas.filter(a => a.id !== id)
    const edges = get().edges.filter(e => e.sourceId !== id && e.targetId !== id)
    updAreas(areas, edges, set)
    // Clean up any stale visibility entry for the deleted area
    const playerVisibleAreaIds = get().playerVisibleAreaIds.filter(v => v !== id)
    if (playerVisibleAreaIds.length !== get().playerVisibleAreaIds.length) {
      set({ playerVisibleAreaIds })
      savePlayerView(playerVisibleAreaIds, get().travelingMarkers)
    }
  },

  moveArea(id, position) {
    const areas = get().areas.map(a => a.id === id ? { ...a, position } : a)
    set({ areas })
    save(areas, get().edges)
  },

  addEdge(edge) {
    const edges = [...get().edges, { ...edge, id: newId() }]
    updAreas(get().areas, edges, set)
  },

  updateEdge(id, patch) {
    const edges = get().edges.map(e => e.id === id ? { ...e, ...patch } : e)
    updAreas(get().areas, edges, set)
  },

  deleteEdge(id) {
    const edges = get().edges.filter(e => e.id !== id)
    updAreas(get().areas, edges, set)
  },

  splitEdge(edgeId, newAreaName) {
    const edge = get().edges.find(e => e.id === edgeId)
    if (!edge) return
    const newId_ = newId()
    // Place new node midpoint (React Flow will position it; we set placeholder)
    const src = get().areas.find(a => a.id === edge.sourceId)
    const tgt = get().areas.find(a => a.id === edge.targetId)
    const position = src && tgt
      ? { x: (src.position.x + tgt.position.x) / 2, y: (src.position.y + tgt.position.y) / 2 }
      : { x: 200, y: 200 }
    const areas = [...get().areas, {
      id: newId_, name: newAreaName, type: 'other' as const,
      realm: 'overworld' as const, description: '', position,
      subNodes: [], subEdges: [], revealed: true,
    }]
    const edges = [
      ...get().edges.filter(e => e.id !== edgeId),
      { id: newId(), sourceId: edge.sourceId, targetId: newId_ },
      { id: newId(), sourceId: newId_, targetId: edge.targetId },
    ]
    updAreas(areas, edges, set)
    get().addPlayerVisibleArea(newId_)
  },
})
