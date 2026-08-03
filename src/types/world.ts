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
  /** The randomly-placed Tower of Trials (rulebook p.74). Characters whose token
   *  is dropped here enter Tower Mode (cannot die). */
  isTower?: boolean
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

// ── Tower of Trials (character resurrection, rulebook p.74) ─────────────
export interface TowerFloor {
  id: string
  label: string
  done: boolean
}

/** A resurrection attempt at the Tower of Trials. Gates the Resurrect action:
 *  the Keepers must agree and every floor's challenge must be cleared. */
export interface TowerTrials {
  active: boolean
  towerAreaId: string | null   // the randomly-placed Tower area
  keepersAgreed: boolean
  floors: TowerFloor[]
}

export function emptyTowerTrials(): TowerTrials {
  return { active: false, towerAreaId: null, keepersAgreed: false, floors: [] }
}
