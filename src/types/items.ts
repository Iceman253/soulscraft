// ── Items (world/area) ─────────────────────────────────────────────────
export type ItemLocation =
  | { kind: 'area'; areaId: string }
  | { kind: 'subnode'; areaId: string; subNodeId: string }
  | { kind: 'character'; characterId: string }
  | { kind: 'unassigned' }

export interface Item {
  id: string
  name: string
  quantity: number
  description?: string
  location: ItemLocation
}
