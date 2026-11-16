// Sub-locations inside an area, nested by path ([] = top level).
import { newId } from '../../../lib/platform/id'
import type { WorldSlice } from './types'
import { updateAreaAtPath, updAreas } from './helpers'

export const createSubNodesSlice: WorldSlice<'addSubNode' | 'updateSubNode' | 'deleteSubNode' | 'moveSubNode' | 'addSubEdge' | 'updateSubEdge' | 'deleteSubEdge'> = (set, get) => ({
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
})
