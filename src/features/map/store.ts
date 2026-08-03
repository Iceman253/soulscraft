import { create } from 'zustand'
import type { Area, AreaEdge, SubNode, SubEdge, TravelingMarker, TowerTrials } from '../../types'
import { emptyTowerTrials } from '../../types'
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
  towerTrials: TowerTrials
  hydrate: (areas: Area[], edges: AreaEdge[], playerView?: { visibleAreaIds: string[]; travelingMarkers: TravelingMarker[]; sessionNote?: string }, towerTrials?: TowerTrials) => void

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

  // Tower of Trials (resurrection tracker, rulebook p.74)
  beginTowerTrials: () => void
  setTowerKeepersAgreed: (agreed: boolean) => void
  addTowerFloor: (label: string) => void
  toggleTowerFloor: (floorId: string) => void
  removeTowerFloor: (floorId: string) => void
  endTowerTrials: () => void

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

function saveTower(towerTrials: TowerTrials) {
  useCampaignStore.getState().updateCampaignData({ towerTrials })
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
  towerTrials: emptyTowerTrials(),

  hydrate(areas, edges, playerView?, towerTrials?) {
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

  // ── Tower of Trials ──────────────────────────────────────────────────────────
  beginTowerTrials() {
    // Randomly place the Tower on the map — near the party's spread but offset.
    const areas = get().areas
    let position = { x: Math.round(200 + Math.random() * 600), y: Math.round(150 + Math.random() * 400) }
    if (areas.length > 0) {
      const cx = areas.reduce((s, a) => s + a.position.x, 0) / areas.length
      const cy = areas.reduce((s, a) => s + a.position.y, 0) / areas.length
      const angle = Math.random() * Math.PI * 2
      const dist = 320 + Math.random() * 320
      position = { x: Math.round(cx + Math.cos(angle) * dist), y: Math.round(cy + Math.sin(angle) * dist) }
    }
    const towerAreaId = newId()
    const newAreas: Area[] = [...areas, {
      id: towerAreaId, name: 'Tower of Trials', type: 'stronghold', realm: 'end',
      description: 'A mystical tower watched over by the alien Tower Keepers, who alone can return the dead to life. No one can die within its floors.',
      position, subNodes: [], subEdges: [], revealed: true, isTower: true,
    }]
    const towerTrials: TowerTrials = {
      active: true,
      towerAreaId,
      keepersAgreed: false,
      floors: [
        { id: newId(), label: 'First Trial', done: false },
        { id: newId(), label: 'Second Trial', done: false },
        { id: newId(), label: 'Third Trial', done: false },
      ],
    }
    set({ areas: newAreas, towerTrials })
    save(newAreas, get().edges)
    saveTower(towerTrials)
    log('character-move', '🗼 The Echo Compass reveals the Tower of Trials somewhere on the map.')
  },

  setTowerKeepersAgreed(agreed) {
    const towerTrials = { ...get().towerTrials, keepersAgreed: agreed }
    set({ towerTrials }); saveTower(towerTrials)
    log('character-move', agreed
      ? '🗼 The Tower Keepers have agreed to help the party.'
      : '🗼 The Tower Keepers have not yet agreed to help.')
  },

  addTowerFloor(label) {
    const towerTrials = { ...get().towerTrials, floors: [...get().towerTrials.floors, { id: newId(), label, done: false }] }
    set({ towerTrials }); saveTower(towerTrials)
  },

  toggleTowerFloor(floorId) {
    const towerTrials = {
      ...get().towerTrials,
      floors: get().towerTrials.floors.map(f => f.id === floorId ? { ...f, done: !f.done } : f),
    }
    set({ towerTrials }); saveTower(towerTrials)
  },

  removeTowerFloor(floorId) {
    const towerTrials = { ...get().towerTrials, floors: get().towerTrials.floors.filter(f => f.id !== floorId) }
    set({ towerTrials }); saveTower(towerTrials)
  },

  endTowerTrials() {
    const { towerTrials, areas, edges } = get()
    // Remove the (mystical, transient) Tower area from the map, then reset the run.
    const newAreas = towerTrials.towerAreaId ? areas.filter(a => a.id !== towerTrials.towerAreaId) : areas
    const reset = emptyTowerTrials()
    set({ areas: newAreas, towerTrials: reset })
    save(newAreas, edges)
    saveTower(reset)
    log('character-move', '🗼 The Tower of Trials fades from the world.')
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
