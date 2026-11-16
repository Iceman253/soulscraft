// Tower of Trials: the resurrection tracker (rulebook p.74).
import type { Area, TowerTrials } from '../../../types'
import { emptyTowerTrials } from '../../../types'
import { newId } from '../../../lib/platform/id'
import { log } from '../../log/store'
import type { WorldSlice } from './types'
import { save, saveTower } from './helpers'

export const createTowerSlice: WorldSlice<'beginTowerTrials' | 'setTowerKeepersAgreed' | 'addTowerFloor' | 'toggleTowerFloor' | 'removeTowerFloor' | 'endTowerTrials'> = (set, get) => ({
  beginTowerTrials() {
    // Randomly place the Tower on the map — near the party's spread but offset.
    const areas = get().areas
    let position = { x: Math.round(200 + Math.random() * 600), y: Math.round(150 + Math.random() * 400) }
    if (areas.length > 0) {
      const cx = areas.reduce((s, a) => s + a.position.x, 0) / areas.length
      const cy = areas.reduce((s, a) => s + a.position.y, 0) / areas.length
      const angle = Math.random() * Math.PI * 2
      const dist = 320 + Math.random() * 320
      position = { x: Math.round(cx + Math.cos(angle) * dist), y: Math.round(cy + Math.sin(angle) * dist) }
    }
    const towerAreaId = newId()
    const newAreas: Area[] = [...areas, {
      id: towerAreaId, name: 'Tower of Trials', type: 'stronghold', realm: 'end',
      description: 'A mystical tower watched over by the alien Tower Keepers, who alone can return the dead to life. No one can die within its floors.',
      position, subNodes: [], subEdges: [], revealed: true, isTower: true,
    }]
    const towerTrials: TowerTrials = {
      active: true,
      towerAreaId,
      keepersAgreed: false,
      floors: [
        { id: newId(), label: 'First Trial', done: false },
        { id: newId(), label: 'Second Trial', done: false },
        { id: newId(), label: 'Third Trial', done: false },
      ],
    }
    set({ areas: newAreas, towerTrials })
    save(newAreas, get().edges)
    saveTower(towerTrials)
    log('character-move', '🗼 The Echo Compass reveals the Tower of Trials somewhere on the map.')
  },

  setTowerKeepersAgreed(agreed) {
    const towerTrials = { ...get().towerTrials, keepersAgreed: agreed }
    set({ towerTrials }); saveTower(towerTrials)
    log('character-move', agreed
      ? '🗼 The Tower Keepers have agreed to help the party.'
      : '🗼 The Tower Keepers have not yet agreed to help.')
  },

  addTowerFloor(label) {
    const towerTrials = { ...get().towerTrials, floors: [...get().towerTrials.floors, { id: newId(), label, done: false }] }
    set({ towerTrials }); saveTower(towerTrials)
  },

  toggleTowerFloor(floorId) {
    const towerTrials = {
      ...get().towerTrials,
      floors: get().towerTrials.floors.map(f => f.id === floorId ? { ...f, done: !f.done } : f),
    }
    set({ towerTrials }); saveTower(towerTrials)
  },

  removeTowerFloor(floorId) {
    const towerTrials = { ...get().towerTrials, floors: get().towerTrials.floors.filter(f => f.id !== floorId) }
    set({ towerTrials }); saveTower(towerTrials)
  },

  endTowerTrials() {
    const { towerTrials, areas, edges } = get()
    // Remove the (mystical, transient) Tower area from the map, then reset the run.
    const newAreas = towerTrials.towerAreaId ? areas.filter(a => a.id !== towerTrials.towerAreaId) : areas
    const reset = emptyTowerTrials()
    set({ areas: newAreas, towerTrials: reset })
    save(newAreas, edges)
    saveTower(reset)
    log('character-move', '🗼 The Tower of Trials fades from the world.')
  },
})
