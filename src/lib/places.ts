import type { Area, Character, Structure, SubNode } from '../types'

// Where things sit on the nested maps: the world map, an area's sub-map, or the
// map inside a sub-location. Shared by the player's placement picker, the GM's
// sign-off preview and the map views.

/** Sub-map nesting limit (sub-locations inside sub-locations). */
export const MAX_SUBMAP_DEPTH = 3

export const AREA_TYPE_ICONS: Record<string, string> = {
  settlement: '🏘️', dungeon: '⚔️', wilderness: '🌲',
  portal: '🌀', stronghold: '🏰', ruins: '🏚️', other: '📍',
}

export const SUB_TYPE_ICONS: Record<string, string> = {
  'rest-spot': '🛏️', dungeon: '⚔️', merchant: '🛒',
  shrine: '✨', hazard: '💀', secret: '🔮', other: '📍',
}

/** One map: `areaId` null is the world map; `path` walks down the sub-locations. */
export interface MapLevel {
  areaId: string | null
  path: string[]
}

export const WORLD_LEVEL: MapLevel = { areaId: null, path: [] }

export type XY = { x: number; y: number }

/** Where a build goes, in Structure's terms. */
export interface Placement {
  areaId: string | null
  subNodeId?: string | null
  position: XY
}

export function sameLevel(a: MapLevel, b: MapLevel): boolean {
  return a.areaId === b.areaId && a.path.join('/') === b.path.join('/')
}

export function levelKey(level: MapLevel): string {
  return [level.areaId ?? 'world', ...level.path].join('/')
}

/** Ids from the top of an area down to `targetId` (inclusive), or null if it's gone. */
export function findSubPath(nodes: SubNode[], targetId: string): string[] | null {
  for (const n of nodes) {
    if (n.id === targetId) return [n.id]
    const below = findSubPath(n.subNodes ?? [], targetId)
    if (below) return [n.id, ...below]
  }
  return null
}

/** The map a build stands on. If its sub-location was deleted it falls back to the
 *  area's map, and if the area was deleted to the world map, so it never vanishes. */
export function levelOfPlacement(p: Pick<Placement, 'areaId' | 'subNodeId'>, areas: Area[]): MapLevel {
  if (p.subNodeId === undefined || !p.areaId) return WORLD_LEVEL
  const area = areas.find(a => a.id === p.areaId)
  if (!area) return WORLD_LEVEL
  if (p.subNodeId === null) return { areaId: area.id, path: [] }
  return { areaId: area.id, path: findSubPath(area.subNodes, p.subNodeId) ?? [] }
}

/** The map a character is on, as far down as their location goes. */
export function characterLevel(c: Pick<Character, 'locationId' | 'subLocationId'>, areas: Area[]): MapLevel {
  const area = c.locationId ? areas.find(a => a.id === c.locationId) : null
  if (!area) return WORLD_LEVEL
  const path = c.subLocationId ? findSubPath(area.subNodes, c.subLocationId) : null
  return { areaId: area.id, path: path ?? [] }
}

export function structuresOnLevel(structures: Structure[], level: MapLevel, areas: Area[]): Structure[] {
  return structures.filter(s => sameLevel(levelOfPlacement(s, areas), level))
}

/** The sub-locations directly on a level (none on the world map). */
export function subNodesOnLevel(level: MapLevel, areas: Area[]): SubNode[] {
  let nodes = areas.find(a => a.id === level.areaId)?.subNodes ?? []
  for (const id of level.path) nodes = nodes.find(n => n.id === id)?.subNodes ?? []
  return nodes
}

export interface MapPlace {
  id: string
  name: string
  icon: string
  position: XY
  /** The map you reach by going inside, or null at the nesting limit. */
  enter: MapLevel | null
}

export interface PlaceFilter {
  /** Areas the viewer may see; undefined shows them all (the GM). */
  visibleAreaIds?: string[]
  /** Hide 'secret' sub-locations, other than these ids. */
  hideSecretsExcept?: string[]
}

/** What's drawn on a level. Players only see revealed areas, and secret
 *  sub-locations stay hidden unless they're already inside one. */
export function placesOnLevel(level: MapLevel, areas: Area[], filter: PlaceFilter = {}): MapPlace[] {
  if (level.areaId === null) {
    const visible = filter.visibleAreaIds && new Set(filter.visibleAreaIds)
    return areas.filter(a => !visible || visible.has(a.id)).map(a => ({
      id: a.id,
      name: a.name,
      icon: AREA_TYPE_ICONS[a.type] ?? '📍',
      position: a.position,
      enter: { areaId: a.id, path: [] },
    }))
  }
  const keep = filter.hideSecretsExcept
  return subNodesOnLevel(level, areas)
    .filter(n => n.type !== 'secret' || !keep || keep.includes(n.id))
    .map(n => ({
      id: n.id,
      name: n.name,
      icon: SUB_TYPE_ICONS[n.type] ?? '📍',
      position: n.position,
      enter: level.path.length < MAX_SUBMAP_DEPTH ? { areaId: level.areaId, path: [...level.path, n.id] } : null,
    }))
}

/** Breadcrumb from the world map down to this level. */
export function levelCrumbs(level: MapLevel, areas: Area[]): { label: string; level: MapLevel }[] {
  const crumbs: { label: string; level: MapLevel }[] = [{ label: 'World', level: WORLD_LEVEL }]
  const area = areas.find(a => a.id === level.areaId)
  if (!area) return crumbs
  crumbs.push({ label: area.name, level: { areaId: area.id, path: [] } })
  let nodes = area.subNodes
  const walked: string[] = []
  for (const id of level.path) {
    const node = nodes.find(n => n.id === id)
    if (!node) break
    walked.push(id)
    crumbs.push({ label: node.name, level: { areaId: area.id, path: [...walked] } })
    nodes = node.subNodes ?? []
  }
  return crumbs
}

/** "Hilltown › Market", or "World map" at the top. */
export function levelLabel(level: MapLevel, areas: Area[]): string {
  const crumbs = levelCrumbs(level, areas).slice(1)
  return crumbs.length ? crumbs.map(c => c.label).join(' › ') : 'World map'
}

/** Closest area to a world-map point, if one is within `within`. */
export function nearestArea(pos: XY, areas: Area[], within = 200): Area | null {
  let best: Area | null = null
  let bestDist = within
  for (const a of areas) {
    const dist = Math.hypot(a.position.x - pos.x, a.position.y - pos.y)
    if (dist <= bestDist) { best = a; bestDist = dist }
  }
  return best
}

/** A tap on a map, as a placement. On the world map a build next to an area
 *  belongs to that area, which also ties it to that area's fog of war. */
export function placementAt(level: MapLevel, position: XY, areas: Area[]): Placement {
  if (level.areaId === null) return { areaId: nearestArea(position, areas)?.id ?? null, position }
  const area = areas.find(a => a.id === level.areaId)
  if (!area) return { areaId: null, position }
  return { areaId: area.id, subNodeId: level.path[level.path.length - 1] ?? null, position }
}

/** A short plain description of a placement, for lists and the GM's card. */
export function placementLabel(p: Pick<Placement, 'areaId' | 'subNodeId'>, areas: Area[]): string {
  const level = levelOfPlacement(p, areas)
  if (level.areaId) return levelLabel(level, areas)
  const near = p.areaId ? areas.find(a => a.id === p.areaId) : null
  return near ? `Beside ${near.name}` : 'World map'
}

/** Can a player see this build? Free-standing builds always show; otherwise its
 *  area must be revealed. Builds whose area was deleted stay visible. */
export function structureVisibleToPlayers(s: Pick<Structure, 'areaId'>, areas: Area[], visibleAreaIds: string[]): boolean {
  return !s.areaId || visibleAreaIds.includes(s.areaId) || !areas.some(a => a.id === s.areaId)
}

export interface PlaceOption {
  value: string
  label: string
  depth: number
  placement: Pick<Placement, 'areaId' | 'subNodeId'>
}

/** Every spot a build can go, as a flat indented list for the GM's dropdown. */
export function allPlaceOptions(areas: Area[]): PlaceOption[] {
  const options: PlaceOption[] = [{ value: '', label: 'Free-standing on the world map', depth: 0, placement: { areaId: null } }]
  const walk = (areaId: string, nodes: SubNode[], depth: number) => {
    for (const n of nodes) {
      options.push({ value: `${areaId}|${n.id}`, label: `Inside ${n.name}`, depth, placement: { areaId, subNodeId: n.id } })
      walk(areaId, n.subNodes ?? [], depth + 1)
    }
  }
  for (const a of areas) {
    options.push({ value: `${a.id}|beside`, label: `Beside ${a.name}`, depth: 0, placement: { areaId: a.id } })
    options.push({ value: `${a.id}|inside`, label: `Inside ${a.name}`, depth: 1, placement: { areaId: a.id, subNodeId: null } })
    walk(a.id, a.subNodes, 2)
  }
  return options
}

/** The dropdown value for a build's current placement. */
export function placeOptionValue(p: Pick<Placement, 'areaId' | 'subNodeId'>): string {
  if (!p.areaId) return ''
  if (p.subNodeId === undefined) return `${p.areaId}|beside`
  return `${p.areaId}|${p.subNodeId ?? 'inside'}`
}

/** A sensible open spot when the GM moves a build to another map, staggered so
 *  several builds there don't stack. */
export function defaultPositionFor(
  target: Pick<Placement, 'areaId' | 'subNodeId'>,
  structures: Structure[],
  areas: Area[],
): XY {
  const level = levelOfPlacement(target, areas)
  const others = target.areaId ? structures.filter(s => s.areaId === target.areaId).length : 0
  if (level.areaId) return { x: 200 + structuresOnLevel(structures, level, areas).length * 56, y: 300 }
  const area = target.areaId ? areas.find(a => a.id === target.areaId) : null
  return area ? { x: area.position.x + others * 56, y: area.position.y + 120 } : { x: 300, y: 300 }
}
