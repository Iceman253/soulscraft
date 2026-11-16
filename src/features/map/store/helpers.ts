// Nested sub-location updates, and saving the map to campaign data.
import type { Area, AreaEdge, SubNode, SubEdge, TravelingMarker, TowerTrials } from '../../../types'
import { useCampaignStore } from '../../campaigns/store'
import type { WorldStore } from './types'
import { useWorldStore } from './index'

// ── Recursive path helpers ─────────────────────────────────────────────
export function updateAreaAtPath(
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

export function savePlayerView(visibleAreaIds: string[], travelingMarkers: TravelingMarker[]) {
  const { sessionNote } = useWorldStore.getState()
  useCampaignStore.getState().updateCampaignData({ playerView: { visibleAreaIds, travelingMarkers, sessionNote } })
}

export function save(areas: Area[], edges: AreaEdge[]) {
  useCampaignStore.getState().updateCampaignData({ areas, edges })
}

export function saveTower(towerTrials: TowerTrials) {
  useCampaignStore.getState().updateCampaignData({ towerTrials })
}

export function updAreas(areas: Area[], edges: AreaEdge[], set: (s: Partial<WorldStore>) => void) {
  set({ areas, edges })
  save(areas, edges)
}
