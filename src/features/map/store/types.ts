// Shape of the world map store.
import type { StateCreator } from 'zustand'
import type { Area, AreaEdge, SubNode, SubEdge, TravelingMarker, TowerTrials, MapBackground } from '../../../types'

export interface WorldStore {
  areas: Area[]
  edges: AreaEdge[]
  fogEnabled: boolean
  playerVisibleAreaIds: string[]
  travelingMarkers: TravelingMarker[]
  sessionNote: string
  towerTrials: TowerTrials
  mapBackground: MapBackground | null
  hydrate: (areas: Area[], edges: AreaEdge[], playerView?: { visibleAreaIds: string[]; travelingMarkers: TravelingMarker[]; sessionNote?: string }, towerTrials?: TowerTrials, mapBackground?: MapBackground | null) => void

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

  // Map background placement
  setMapBackground: (bg: MapBackground | null) => void

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

/** A slice of the store that provides the actions named in K. */
export type WorldSlice<K extends keyof WorldStore> = StateCreator<WorldStore, [], [], Pick<WorldStore, K>>
