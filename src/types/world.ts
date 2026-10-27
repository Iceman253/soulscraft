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
  /** Materials that can be mined here (Guidebook p.81: you can only mine a
   *  material where it's available — a forest for wood, a mineshaft for ore). */
  materials?: string[]
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

/** Map background placement in FLOW coordinates (top-left x/y + width/height), so
 *  it pans and zooms with the nodes. The image itself lives in the image cache. */
export interface MapBackground {
  x: number
  y: number
  w: number
  h: number
}

// ── Building (Guidebook p.83) ───────────────────────────────────────────
export type ProjectTier = 'redstone' | 'tiny' | 'small' | 'medium' | 'large' | 'mega'

/** A player-built structure: a Building-phase project tracked from plan to
 *  completion, shown on the world map with a hand-drawn pixel icon. */
export interface Structure {
  id: string
  name: string
  tier: ProjectTier
  description: string
  /** Area it stands in, or null for a free-standing build on the world map. */
  areaId: string | null
  /** World-map position (flow coordinates). */
  position: { x: number; y: number }
  builderIds: string[]
  /** Requirements — start at the rulebook values for the tier (halved for an
   *  Architect); the GM can lower them when the party optimizes progress. */
  blocksRequired: number
  daysRequired: number
  redstoneRequired: number
  blocksCommitted: number
  redstoneCommitted: number
  daysWorked: number
  /** 16×16 pixel-art icon (see lib/pixelArt.ts); empty/absent = tier emoji. */
  icon?: string
  createdAt: number
  completedAt?: number
}
