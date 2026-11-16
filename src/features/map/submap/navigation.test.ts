import { describe, it, expect } from 'vitest'
import type { Area, Character, SubNode } from '../../../types'
import { findSubNodePath, getAtPath, getSiblingsAtDepth, getSubtreeCharacters } from './navigation'

const node = (id: string, subNodes: SubNode[] = []): SubNode =>
  ({ id, name: id.toUpperCase(), type: 'other', position: { x: 0, y: 0 }, subNodes, subEdges: [] }) as SubNode

// town → (hall → cellar), market
const cellar = node('cellar')
const hall = node('hall', [cellar])
const market = node('market')
const area = { id: 'a', subNodes: [hall, market], subEdges: [{ id: 'e1' }] } as unknown as Area

describe('findSubNodePath', () => {
  it('lists the parents above a nested node', () => {
    expect(findSubNodePath(area.subNodes, 'cellar')).toEqual([{ nodeId: 'hall', nodeName: 'HALL' }])
  })
  it('is empty for a top-level node and null for a missing one', () => {
    expect(findSubNodePath(area.subNodes, 'market')).toEqual([])
    expect(findSubNodePath(area.subNodes, 'nowhere')).toBeNull()
  })
})

describe('getAtPath', () => {
  it('returns the area level for an empty path', () => {
    expect(getAtPath(area, []).subNodes).toEqual([hall, market])
    expect(getAtPath(area, []).subEdges).toEqual([{ id: 'e1' }])
  })
  it('walks into a node', () => {
    expect(getAtPath(area, ['hall']).subNodes).toEqual([cellar])
  })
  it('is empty for a broken path', () => {
    expect(getAtPath(area, ['gone'])).toEqual({ subNodes: [], subEdges: [] })
  })
})

describe('getSiblingsAtDepth', () => {
  it('gives the nodes shown at each breadcrumb level', () => {
    const stack = [{ nodeId: 'hall', nodeName: 'HALL' }]
    expect(getSiblingsAtDepth(area, stack, 0)).toEqual([hall, market])
    expect(getSiblingsAtDepth(area, stack, 1)).toEqual([cellar])
  })
})

describe('getSubtreeCharacters', () => {
  it('finds characters in a node or anywhere under it', () => {
    const chars = [
      { id: '1', subLocationId: 'hall' },
      { id: '2', subLocationId: 'cellar' },
      { id: '3', subLocationId: 'market' },
      { id: '4' },
    ] as Character[]
    expect(getSubtreeCharacters(hall, chars).map(c => c.id)).toEqual(['1', '2'])
  })
})
