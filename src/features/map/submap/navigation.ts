// Pure helpers for walking the nested sub-location tree of an area.
import type { Area, SubNode, SubEdge, Character } from '../../../types'

export interface NavEntry { nodeId: string; nodeName: string }

export function findSubNodePath(nodes: SubNode[], targetId: string): NavEntry[] | null {
  for (const n of nodes) {
    if (n.id === targetId) return []
    const found = findSubNodePath(n.subNodes ?? [], targetId)
    if (found !== null) return [{ nodeId: n.id, nodeName: n.name }, ...found]
  }
  return null
}

export function getSubtreeCharacters(node: SubNode, all: Character[]): Character[] {
  const ids = new Set<string>()
  const collect = (n: SubNode) => { ids.add(n.id); (n.subNodes ?? []).forEach(collect) }
  collect(node)
  return all.filter(c => c.subLocationId != null && ids.has(c.subLocationId))
}

export function getAtPath(area: Area, path: string[]): { subNodes: SubNode[]; subEdges: SubEdge[] } {
  if (path.length === 0) return { subNodes: area.subNodes, subEdges: area.subEdges }
  let subNodes = area.subNodes
  let subEdges: SubEdge[] = []
  for (const id of path) {
    const node = subNodes.find(n => n.id === id)
    if (!node) return { subNodes: [], subEdges: [] }
    subNodes = node.subNodes ?? []
    subEdges = node.subEdges ?? []
  }
  return { subNodes, subEdges }
}

/** Get the sibling nodes at a given depth in the navStack (depth 0 = top level of area.subNodes). */
export function getSiblingsAtDepth(area: Area, navStack: NavEntry[], depth: number): SubNode[] {
  return getAtPath(area, navStack.slice(0, depth).map(e => e.nodeId)).subNodes
}
