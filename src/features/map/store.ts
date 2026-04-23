import { create } from 'zustand'
import type { Area, AreaEdge, SubNode, SubEdge, TravelingMarker } from '../../types'
import { newId } from '../../lib/id'
import { useCampaignStore } from '../campaigns/store'
import { log } from '../log/store'

// ── Recursive path helpers ─────────────────────────────────────────────
function updateAreaAtPath(
  area: Area,
  path: string[],
  fn: (subNodes: SubNode[], subEdges: SubEdge[]) => { subNodes: SubNode[]; subEdges: SubEdge[] }
): Area {
  if (path.length === 0) {
    const r = fn(area.subNodes, area.subEdges)
    return { ...area, subNodes: r.subNodes, subEdges: r.subEdges }
  }
  return { ...area, subNodes: updateSubNodesAtPath(area.subNodes, path, fn) }
}

function updateSubNodesAtPath(
  nodes: SubNode[],
  path: string[],
  fn: (subNodes: SubNode[], subEdges: SubEdge[]) => { subNodes: SubNode[]; subEdges: SubEdge[] }
): SubNode[] {
  const [head, ...tail] = path
  return nodes.map(n => {
    if (n.id !== head) return n
    const kids = n.subNodes ?? []
    const kidEdges = n.subEdges ?? []
    if (tail.length === 0) {
      const r = fn(kids, kidEdges)
      return { ...n, subNodes: r.subNodes, subEdges: r.subEdges }
    }
    return { ...n, subNodes: updateSubNodesAtPath(kids, tail, fn) }
  })
}

interface WorldStore {
  areas: Area[]
  edges: AreaEdge[]
  fogEnabled: boolean
  playerVisibleAreaIds: string[]
  travelingMarkers: TravelingMarker[]
  sessionNote: string
  hydrate: (areas: Area[], edges: AreaEdge[], playerView?: { visibleAreaIds: string[]; travelingMarkers: TravelingMarker[]; sessionNote?: string }) => void

  // Areas
  addArea: (area: Omit<Area, 'id' | 'subNodes' | 'subEdges' | 'revealed'>) => string
  updateArea: (id: string, patch: Partial<Area>) => void
  deleteArea: (id: string) => void
  moveArea: (id: string, position: { x: number; y: number }) => void

  // Edges
  addEdge: (edge: Omit<AreaEdge, 'id'>) => void
  updateEdge: (id: string, patch: Partial<AreaEdge>) => void
  deleteEdge: (id: string) => void
  splitEdge: (edgeId: string, newAreaName: string) => void

  // Fog of war
  toggleFog: () => void
  revealArea: (id: string) => void

  // Player view visibility
  addPlayerVisibleArea: (areaId: string) => void
  removePlayerVisibleArea: (areaId: string) => void

  // Traveling markers
  setTravelingMarker: (marker: TravelingMarker) => void
  clearTravelingMarker: (characterId: string) => void

  // Session note
  setSessionNote: (note: string) => void

  // Sub-nodes (path = [] for top-level, [id, ...] for nested)
  addSubNode: (areaId: string, node: Omit<SubNode, 'id' | 'subNodes' | 'subEdges'>, path?: string[]) => string
  updateSubNode: (areaId: string, nodeId: string, patch: Partial<SubNode>, path?: string[]) => void
  deleteSubNode: (areaId: string, nodeId: string, path?: string[]) => void
  moveSubNode: (areaId: string, nodeId: string, position: { x: number; y: number }, path?: string[]) => void

  // Sub-edges
  addSubEdge: (areaId: string, edge: Omit<SubEdge, 'id'>, path?: string[]) => void
  updateSubEdge: (areaId: string, edgeId: string, patch: Partial<SubEdge>, path?: string[]) => void
  deleteSubEdge: (areaId: string, edgeId: string, path?: string[]) => void
}

function savePlayerView(visibleAreaIds: string[], travelingMarkers: TravelingMarker[]) {
  const { sessionNote } = useWorldStore.getState()
  useCampaignStore.getState().updateCampaignData({ playerView: { visibleAreaIds, travelingMarkers, sessionNote } })
}

function save(areas: Area[], edges: AreaEdge[]) {
  useCampaignStore.getState().updateCampaignData({ areas, edges })
}

function updAreas(areas: Area[], edges: AreaEdge[], set: (s: Partial<WorldStore>) => void) {
  set({ areas, edges })
  save(areas, edges)
}

export const useWorldStore = create<WorldStore>((set, get) => ({
  areas: [],
  edges: [],
  fogEnabled: false,
  playerVisibleAreaIds: [],
  travelingMarkers: [],
  sessionNote: '',

  hydrate(areas, edges, playerView?) {
    set({
      areas,
      edges,
      playerVisibleAreaIds: playerView?.visibleAreaIds ?? [],
      travelingMarkers: playerView?.travelingMarkers ?? [],
      sessionNote: playerView?.sessionNote ?? '',
    })
  },

  addArea(area) {
    const id = newId()
    const areas = [...get().areas, { ...area, id, subNodes: [], subEdges: [], revealed: true }]
    updAreas(areas, get().edges, set)
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
  },

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

  addSubNode(areaId, node, path = []) {
    const id = newId()
    const areas = get().areas.map(a => {
      if (a.id !== areaId) return a
      return updateAreaAtPath(a, path, (subNodes, subEdges) => ({
        subNodes: [...subNodes, { ...node, id, subNodes: [], subEdges: [] }],
        subEdges,
      }))
    })
    updAreas(areas, get().edges, set)
    return id
  },

  updateSubNode(areaId, nodeId, patch, path = []) {
    const areas = get().areas.map(a => {
      if (a.id !== areaId) return a
      return updateAreaAtPath(a, path, (subNodes, subEdges) => ({
        subNodes: subNodes.map(n => n.id === nodeId ? { ...n, ...patch } : n),
        subEdges,
      }))
    })
    updAreas(areas, get().edges, set)
  },

  deleteSubNode(areaId, nodeId, path = []) {
    const areas = get().areas.map(a => {
      if (a.id !== areaId) return a
      return updateAreaAtPath(a, path, (subNodes, subEdges) => ({
        subNodes: subNodes.filter(n => n.id !== nodeId),
        subEdges: subEdges.filter(e => e.sourceId !== nodeId && e.targetId !== nodeId),
      }))
    })
    updAreas(areas, get().edges, set)
  },

  moveSubNode(areaId, nodeId, position, path = []) {
    get().updateSubNode(areaId, nodeId, { position }, path)
  },

  addSubEdge(areaId, edge, path = []) {
    const areas = get().areas.map(a => {
      if (a.id !== areaId) return a
      return updateAreaAtPath(a, path, (subNodes, subEdges) => ({
        subNodes,
        subEdges: [...subEdges, { ...edge, id: newId() }],
      }))
    })
    updAreas(areas, get().edges, set)
  },

  updateSubEdge(areaId, edgeId, patch, path = []) {
    const areas = get().areas.map(a => {
      if (a.id !== areaId) return a
      return updateAreaAtPath(a, path, (subNodes, subEdges) => ({
        subNodes,
        subEdges: subEdges.map(e => e.id === edgeId ? { ...e, ...patch } : e),
      }))
    })
    updAreas(areas, get().edges, set)
  },

  deleteSubEdge(areaId, edgeId, path = []) {
    const areas = get().areas.map(a => {
      if (a.id !== areaId) return a
      return updateAreaAtPath(a, path, (subNodes, subEdges) => ({
        subNodes,
        subEdges: subEdges.filter(e => e.id !== edgeId),
      }))
    })
    updAreas(areas, get().edges, set)
  },
}))
