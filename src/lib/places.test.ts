import { describe, it, expect } from 'vitest'
import type { Area, Structure, SubNode } from '../types'
import {
  allPlaceOptions, characterLevel, defaultPositionFor, findSubPath, levelCrumbs, levelLabel, levelOfPlacement,
  MAX_SUBMAP_DEPTH, nearestArea, placeOptionValue, placementAt, placementLabel, placesOnLevel, sameLevel,
  structuresOnLevel, structureVisibleToPlayers, subNodesOnLevel, WORLD_LEVEL,
} from './places'

const sub = (id: string, subNodes: SubNode[] = [], type: SubNode['type'] = 'other'): SubNode =>
  ({ id, name: id.toUpperCase(), type, position: { x: 1, y: 2 }, subNodes, subEdges: [] })

const area = (id: string, subNodes: SubNode[] = [], x = 0): Area => ({
  id, name: id.toUpperCase(), type: 'settlement', realm: 'overworld', description: '',
  position: { x, y: 0 }, subNodes, subEdges: [], revealed: true,
})

const town = area('town', [sub('market', [sub('stall', [sub('crate')])]), sub('vault', [], 'secret')])
const areas = [town, area('forest', [], 1000)]

const build = (over: Partial<Structure> = {}): Structure => ({
  id: 's', name: 'S', tier: 'small', description: '', areaId: null, position: { x: 0, y: 0 }, builderIds: [],
  blocksRequired: 50, daysRequired: 2, redstoneRequired: 0, blocksCommitted: 0, redstoneCommitted: 0, daysWorked: 0,
  createdAt: 0, ...over,
})

describe('finding levels', () => {
  it('walks down nested sub-locations', () => {
    expect(findSubPath(town.subNodes, 'crate')).toEqual(['market', 'stall', 'crate'])
    expect(findSubPath(town.subNodes, 'nowhere')).toBeNull()
  })

  it('puts a build on the map it was placed on', () => {
    expect(levelOfPlacement({ areaId: null }, areas)).toEqual(WORLD_LEVEL)
    expect(levelOfPlacement({ areaId: 'town' }, areas)).toEqual(WORLD_LEVEL)
    expect(levelOfPlacement({ areaId: 'town', subNodeId: null }, areas)).toEqual({ areaId: 'town', path: [] })
    expect(levelOfPlacement({ areaId: 'town', subNodeId: 'stall' }, areas)).toEqual({ areaId: 'town', path: ['market', 'stall'] })
  })

  it('never loses a build when its place is deleted', () => {
    expect(levelOfPlacement({ areaId: 'town', subNodeId: 'gone' }, areas)).toEqual({ areaId: 'town', path: [] })
    expect(levelOfPlacement({ areaId: 'gone', subNodeId: 'stall' }, areas)).toEqual(WORLD_LEVEL)
  })

  it('finds the map a character is standing on', () => {
    expect(characterLevel({ locationId: 'town', subLocationId: 'stall' }, areas)).toEqual({ areaId: 'town', path: ['market', 'stall'] })
    expect(characterLevel({ locationId: 'town', subLocationId: null }, areas)).toEqual({ areaId: 'town', path: [] })
    expect(characterLevel({ locationId: null, subLocationId: null }, areas)).toEqual(WORLD_LEVEL)
    expect(characterLevel({ locationId: 'gone', subLocationId: null }, areas)).toEqual(WORLD_LEVEL)
  })

  it('compares levels by their whole path', () => {
    expect(sameLevel({ areaId: 'town', path: ['market'] }, { areaId: 'town', path: ['market'] })).toBe(true)
    expect(sameLevel({ areaId: 'town', path: [] }, { areaId: 'town', path: ['market'] })).toBe(false)
    expect(sameLevel({ areaId: 'town', path: [] }, WORLD_LEVEL)).toBe(false)
  })
})

describe('what shows on a level', () => {
  it('splits builds across the maps they stand on', () => {
    const onWorld = build({ id: 'a', areaId: 'town' })
    const inTown = build({ id: 'b', areaId: 'town', subNodeId: null })
    const inMarket = build({ id: 'c', areaId: 'town', subNodeId: 'market' })
    const all = [onWorld, inTown, inMarket]
    expect(structuresOnLevel(all, WORLD_LEVEL, areas)).toEqual([onWorld])
    expect(structuresOnLevel(all, { areaId: 'town', path: [] }, areas)).toEqual([inTown])
    expect(structuresOnLevel(all, { areaId: 'town', path: ['market'] }, areas)).toEqual([inMarket])
  })

  it('lists sub-locations at any depth', () => {
    expect(subNodesOnLevel({ areaId: 'town', path: ['market', 'stall'] }, areas).map(n => n.id)).toEqual(['crate'])
    expect(subNodesOnLevel(WORLD_LEVEL, areas)).toEqual([])
    expect(subNodesOnLevel({ areaId: 'town', path: ['gone'] }, areas)).toEqual([])
  })

  it('shows only revealed areas to players', () => {
    expect(placesOnLevel(WORLD_LEVEL, areas, { visibleAreaIds: ['forest'] }).map(p => p.id)).toEqual(['forest'])
    expect(placesOnLevel(WORLD_LEVEL, areas).map(p => p.id)).toEqual(['town', 'forest'])
  })

  it('hides secret sub-locations from players unless they are inside one', () => {
    const level = { areaId: 'town', path: [] }
    expect(placesOnLevel(level, areas, { hideSecretsExcept: [] }).map(p => p.id)).toEqual(['market'])
    expect(placesOnLevel(level, areas, { hideSecretsExcept: ['vault'] }).map(p => p.id)).toEqual(['market', 'vault'])
    expect(placesOnLevel(level, areas).map(p => p.id)).toEqual(['market', 'vault'])
  })

  it('stops offering to go deeper at the nesting limit', () => {
    expect(placesOnLevel({ areaId: 'town', path: [] }, areas)[0].enter).toEqual({ areaId: 'town', path: ['market'] })
    const deepest = { areaId: 'town', path: ['market', 'stall', 'crate'] }
    expect(deepest.path).toHaveLength(MAX_SUBMAP_DEPTH)
    const level = { areaId: 'town', path: ['market', 'stall', 'crate'] }
    const nested = [area('town', [sub('market', [sub('stall', [sub('crate', [sub('bottom')])])])])]
    expect(placesOnLevel(level, nested)[0].enter).toBeNull()
  })
})

describe('labels', () => {
  it('builds a breadcrumb that can jump back up', () => {
    const crumbs = levelCrumbs({ areaId: 'town', path: ['market', 'stall'] }, areas)
    expect(crumbs.map(c => c.label)).toEqual(['World', 'TOWN', 'MARKET', 'STALL'])
    expect(crumbs[2].level).toEqual({ areaId: 'town', path: ['market'] })
    expect(levelCrumbs(WORLD_LEVEL, areas).map(c => c.label)).toEqual(['World'])
  })

  it('reads clearly for each kind of placement', () => {
    expect(levelLabel({ areaId: 'town', path: ['market'] }, areas)).toBe('TOWN › MARKET')
    expect(placementLabel({ areaId: 'town', subNodeId: 'market' }, areas)).toBe('TOWN › MARKET')
    expect(placementLabel({ areaId: 'town', subNodeId: null }, areas)).toBe('TOWN')
    expect(placementLabel({ areaId: 'town' }, areas)).toBe('Beside TOWN')
    expect(placementLabel({ areaId: null }, areas)).toBe('World map')
  })
})

describe('placing from a tap', () => {
  it('ties a world-map tap to a nearby area', () => {
    expect(nearestArea({ x: 900, y: 0 }, areas)?.id).toBe('forest')
    expect(nearestArea({ x: 500, y: 0 }, areas)).toBeNull()
    expect(placementAt(WORLD_LEVEL, { x: 50, y: 0 }, areas)).toEqual({ areaId: 'town', position: { x: 50, y: 0 } })
    expect(placementAt(WORLD_LEVEL, { x: 500, y: 0 }, areas)).toEqual({ areaId: null, position: { x: 500, y: 0 } })
  })

  it('places inside an area or sub-location', () => {
    const at = { x: 7, y: 8 }
    expect(placementAt({ areaId: 'town', path: [] }, at, areas)).toEqual({ areaId: 'town', subNodeId: null, position: at })
    expect(placementAt({ areaId: 'town', path: ['market', 'stall'] }, at, areas)).toEqual({ areaId: 'town', subNodeId: 'stall', position: at })
  })

  it('never attaches to an area left out of the list (one the player cannot see)', () => {
    const known = areas.filter(a => a.id !== 'town')
    expect(placementAt(WORLD_LEVEL, { x: 50, y: 0 }, known).areaId).toBeNull()
    expect(placementAt({ areaId: 'town', path: [] }, { x: 1, y: 1 }, known).areaId).toBeNull()
  })
})

describe('player visibility', () => {
  it('follows the area, and keeps free-standing and orphaned builds', () => {
    expect(structureVisibleToPlayers({ areaId: null }, areas, [])).toBe(true)
    expect(structureVisibleToPlayers({ areaId: 'town' }, areas, ['town'])).toBe(true)
    expect(structureVisibleToPlayers({ areaId: 'town' }, areas, [])).toBe(false)
    expect(structureVisibleToPlayers({ areaId: 'gone' }, areas, [])).toBe(true)
  })
})

describe('GM move-to dropdown', () => {
  it('lists every level, including nested sub-locations', () => {
    const options = allPlaceOptions(areas)
    expect(options[0]).toMatchObject({ value: '', placement: { areaId: null } })
    expect(options.find(o => o.value === 'town|beside')?.placement).toEqual({ areaId: 'town' })
    expect(options.find(o => o.value === 'town|inside')?.placement).toEqual({ areaId: 'town', subNodeId: null })
    expect(options.find(o => o.value === 'town|crate')).toMatchObject({ depth: 4, placement: { areaId: 'town', subNodeId: 'crate' } })
  })

  it('round-trips each placement to its option', () => {
    for (const o of allPlaceOptions(areas)) expect(placeOptionValue(o.placement)).toBe(o.value)
  })

  it('staggers builds moved to the same map', () => {
    const existing = [build({ areaId: 'town', subNodeId: null })]
    expect(defaultPositionFor({ areaId: 'town', subNodeId: null }, existing, areas)).toEqual({ x: 256, y: 300 })
    expect(defaultPositionFor({ areaId: 'town', subNodeId: null }, [], areas)).toEqual({ x: 200, y: 300 })
    expect(defaultPositionFor({ areaId: 'forest' }, [], areas)).toEqual({ x: 1000, y: 120 })
    expect(defaultPositionFor({ areaId: null }, [], areas)).toEqual({ x: 300, y: 300 })
  })
})
