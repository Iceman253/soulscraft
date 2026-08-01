// ── World ──────────────────────────────────────────────────────────────
export type AreaType = 'settlement' | 'dungeon' | 'wilderness' | 'portal' | 'stronghold' | 'ruins' | 'other'
export type Realm = 'overworld' | 'nether' | 'end'
export type SubNodeType = 'rest-spot' | 'dungeon' | 'merchant' | 'shrine' | 'hazard' | 'secret' | 'other'

export interface SubNode {
  id: string
  name: string
  type: SubNodeType
  description?: string
  position: { x: number; y: number }
  subNodes?: SubNode[]
  subEdges?: SubEdge[]
}

export interface SubEdge {
  id: string
  sourceId: string
  targetId: string
  sourceHandle?: string
  targetHandle?: string
  label?: string
}

export interface Area {
  id: string
  name: string
  type: AreaType
  realm: Realm
  description: string
  position: { x: number; y: number }
  subNodes: SubNode[]
  subEdges: SubEdge[]
  revealed: boolean
}

export interface AreaEdge {
  id: string
  sourceId: string
  targetId: string
  sourceHandle?: string
  targetHandle?: string
  label?: string
  travelDanger?: 'safe' | 'risky' | 'deadly'
  /** In-game days the journey takes — feeds remoteness suggestions and travel cost (rations). */
  travelDays?: number
}

export interface TravelingMarker {
  characterId: string
  fromAreaId: string
  toAreaId: string     // hidden from players unless already in visibleAreaIds
  edgeId?: string      // which edge to highlight
  label?: string       // shown to players on the path, e.g. "3 days north by sea"
}
