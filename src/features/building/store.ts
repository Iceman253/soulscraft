import { create } from 'zustand'
import type { ProjectTier, Structure } from '../../types'
import { newId } from '../../lib/id'
import { log } from '../log/store'
import { useCampaignStore } from '../campaigns/store'
import { useCharacterStore } from '../characters/store'
import { useWorldStore } from '../map/store'
import { UNPLACED, addBlocksTo, dropKey, reachableStores, type Section } from '../../lib/stashes'
import type { Character } from '../../types'
import {
  PROJECT_TIERS, projectRequirements, isArchitect, structureProgress, repairLeft,
  takeBlocks, takeRedstone, addBlocks, enforceCarryLimit, minedStackName, miningDays, actionOutcome,
} from '../../lib/building'

/** Where mined blocks go: into storage at the place mined (or where the character
 *  is, if it wasn't a mapped place), or on hand. 'mine' is the same as 'storage';
 *  older requests used it for mines. */
export type MiningDestination = 'storage' | 'onHand' | 'mine'

export interface MineParams {
  characterId: string
  areaName?: string
  materials: string[]
  /** Blocks the player set out to mine (sets the time taken). */
  requested: number
  /** Action roll total (2d6 + tool + skill/trait). */
  total: number
  /** Blocks the GM awards after narrating the outcome. */
  gained: number
  destination: MiningDestination
  /** The place mined, where stored blocks are left. */
  placeId?: string
  /** Rolled double 6s: worth 1 XP on any action roll (p.8). */
  doubleSix?: boolean
}

interface BuildStore {
  structures: Structure[]
  hydrate: (structures: Structure[]) => void

  addStructure: (init: {
    name?: string; tier?: ProjectTier; description?: string; icon?: string
    areaId: string | null; subNodeId?: string | null
    position: { x: number; y: number }; builderIds?: string[]
  }) => string
  updateStructure: (id: string, patch: Partial<Omit<Structure, 'id'>>) => void
  /** Change tier and reset requirements to the rulebook values for it. */
  setTier: (id: string, tier: ProjectTier) => void
  /** Reset requirements to the rulebook values (halved if a builder is an Architect). */
  resetRequirements: (id: string) => void
  moveStructure: (id: string, position: { x: number; y: number }) => void
  deleteStructure: (id: string) => void

  /** Move up to `amount` blocks from a character's inventory into the build. Returns blocks taken. */
  commitBlocks: (id: string, characterId: string, amount: number) => number
  /** Same for redstone dust. Returns dust taken. */
  commitRedstone: (id: string, characterId: string, amount: number) => number
  /** Add a character to a build's builders. */
  joinBuild: (id: string, characterId: string) => void
  /** Add progress that doesn't come from a character's inventory (bought, gifted, days worked). */
  addProgress: (id: string, delta: { blocks?: number; redstone?: number; days?: number }) => void
  setCompleted: (id: string, completed: boolean) => void

  /** Damage a finished build: it needs `blocks` put back in to be whole again. */
  damageStructure: (id: string, blocks: number, note?: string) => void
  /** Put blocks from a character's inventory into repairing a build. Returns blocks taken. */
  repairStructure: (id: string, characterId: string, amount: number) => number
  /** The GM calls it repaired without the blocks. */
  markRepaired: (id: string) => void
  /** Destroy a build. It stays on the map as ruins. */
  destroyStructure: (id: string) => void
  /** Start over on a destroyed build: a fresh project of the same size, same place. */
  rebuildStructure: (id: string) => void

  /** Resolve a mining trip: add the awarded blocks to the character and log it. */
  mine: (p: MineParams) => void
}

function save(structures: Structure[]) {
  useCampaignStore.getState().updateCampaignData({ structures })
}

/** What a character can take blocks and dust from right now: storage where they
 *  are, their Ender Chest if one is with them, then what they carry. */
export function reachableSections(c: Character): Section[] {
  const characters = useCharacterStore.getState().characters
  const areas = useWorldStore.getState().areas ?? []
  return [...reachableStores(c, characters, areas), 'onHand']
}

function hasArchitect(builderIds: string[]): boolean {
  const chars = useCharacterStore.getState().characters
  return builderIds.some(id => {
    const c = chars.find(x => x.id === id)
    return !!c && isArchitect(c)
  })
}

/** Where a mining trip's blocks ended up, for the session log. */
function minedWhere(destination: 'storage' | 'onHand', qty: number, overflow: number, place: string | undefined, nowhere: boolean): string {
  const stored = nowhere ? 'left behind' : place ? `stored at ${place}` : 'stored here'
  if (destination === 'storage' || overflow >= qty) return ` (${stored})`
  return overflow > 0 ? ` (${qty - overflow} on hand, ${overflow} ${stored})` : ' (on hand)'
}

function withoutDamage(s: Structure): Structure {
  if (!s.damage) return s
  const rest = { ...s }
  delete rest.damage
  return rest
}

/** Mark a structure complete (and log it) once every requirement is met. */
function withCompletion(s: Structure): Structure {
  if (s.completedAt || !structureProgress(s).ready) return s
  log('building', `🏰 ${s.name} is complete!`)
  return { ...s, completedAt: Date.now() }
}

export const useBuildStore = create<BuildStore>((set, get) => {
  const commit = (structures: Structure[]) => { set({ structures }); save(structures) }
  const mapOne = (id: string, fn: (s: Structure) => Structure) =>
    commit(get().structures.map(s => s.id === id ? fn(s) : s))

  return {
    structures: [],

    hydrate(structures) { set({ structures }) },

    addStructure({ name, tier = 'small', description = '', icon, areaId, subNodeId, position, builderIds = [] }) {
      const req = projectRequirements(tier, hasArchitect(builderIds))
      const s: Structure = {
        id: newId(),
        name: name?.trim() || `New ${PROJECT_TIERS[tier].label}`,
        tier,
        description,
        ...(icon ? { icon } : {}),
        areaId,
        ...(subNodeId !== undefined ? { subNodeId } : {}),
        position,
        builderIds,
        blocksRequired: req.blocks,
        daysRequired: req.days,
        redstoneRequired: req.redstone,
        blocksCommitted: 0,
        redstoneCommitted: 0,
        daysWorked: 0,
        createdAt: Date.now(),
      }
      commit([...get().structures, s])
      log('building', `🏗️ Building phase: ${s.name} planned (${PROJECT_TIERS[tier].label} — ${req.blocks} blocks, ${req.days} day${req.days === 1 ? '' : 's'}).`)
      return s.id
    },

    updateStructure(id, patch) {
      mapOne(id, s => withCompletion({ ...s, ...patch }))
    },

    setTier(id, tier) {
      mapOne(id, s => {
        const req = projectRequirements(tier, hasArchitect(s.builderIds))
        return withCompletion({ ...s, tier, blocksRequired: req.blocks, daysRequired: req.days, redstoneRequired: req.redstone })
      })
    },

    resetRequirements(id) {
      mapOne(id, s => {
        const req = projectRequirements(s.tier, hasArchitect(s.builderIds))
        return withCompletion({ ...s, blocksRequired: req.blocks, daysRequired: req.days, redstoneRequired: req.redstone })
      })
    },

    moveStructure(id, position) {
      mapOne(id, s => ({ ...s, position }))
    },

    deleteStructure(id) {
      commit(get().structures.filter(s => s.id !== id))
    },

    commitBlocks(id, characterId, amount) {
      const s = get().structures.find(x => x.id === id)
      const charStore = useCharacterStore.getState()
      const c = charStore.characters.find(x => x.id === characterId)
      if (!s || !c || amount <= 0) return 0
      const { patch, taken } = takeBlocks(c, reachableSections(c), amount)
      if (taken === 0) return 0
      charStore.updateCharacter(characterId, patch)
      mapOne(id, x => withCompletion({ ...x, blocksCommitted: x.blocksCommitted + taken }))
      log('building', `🧱 ${c.name} put ${taken} block${taken === 1 ? '' : 's'} into ${s.name}.`)
      return taken
    },

    commitRedstone(id, characterId, amount) {
      const s = get().structures.find(x => x.id === id)
      const charStore = useCharacterStore.getState()
      const c = charStore.characters.find(x => x.id === characterId)
      if (!s || !c || amount <= 0) return 0
      const { patch, taken } = takeRedstone(c, reachableSections(c), amount)
      if (taken === 0) return 0
      charStore.updateCharacter(characterId, patch)
      mapOne(id, x => withCompletion({ ...x, redstoneCommitted: x.redstoneCommitted + taken }))
      log('building', `🔴 ${c.name} put ${taken} redstone dust into ${s.name}.`)
      return taken
    },

    joinBuild(id, characterId) {
      mapOne(id, s => s.builderIds.includes(characterId) ? s : { ...s, builderIds: [...s.builderIds, characterId] })
    },

    addProgress(id, { blocks = 0, redstone = 0, days = 0 }) {
      mapOne(id, s => withCompletion({
        ...s,
        blocksCommitted: Math.max(0, s.blocksCommitted + blocks),
        redstoneCommitted: Math.max(0, s.redstoneCommitted + redstone),
        daysWorked: Math.max(0, s.daysWorked + days),
      }))
    },

    setCompleted(id, completed) {
      mapOne(id, s => {
        if (completed && !s.completedAt) {
          log('building', `🏰 ${s.name} is complete!`)
          return { ...s, completedAt: Date.now() }
        }
        if (!completed && s.completedAt) {
          const rest = { ...s }
          delete rest.completedAt
          return rest
        }
        return s
      })
    },

    damageStructure(id, blocks, note) {
      const needed = Math.max(0, Math.floor(blocks))
      const s = get().structures.find(x => x.id === id)
      if (!s || !s.completedAt || s.destroyedAt || needed === 0) return
      const trimmed = note?.trim()
      mapOne(id, x => ({ ...x, damage: { needed, repaired: 0, ...(trimmed ? { note: trimmed } : {}) } }))
      log('building', `💥 ${s.name} was damaged${trimmed ? ` (${trimmed})` : ''}: ${needed} block${needed === 1 ? '' : 's'} to repair.`)
    },

    repairStructure(id, characterId, amount) {
      const s = get().structures.find(x => x.id === id)
      const charStore = useCharacterStore.getState()
      const c = charStore.characters.find(x => x.id === characterId)
      if (!s?.damage || !c || amount <= 0) return 0
      const { patch, taken } = takeBlocks(c, reachableSections(c), Math.min(amount, repairLeft(s)))
      if (taken === 0) return 0
      charStore.updateCharacter(characterId, patch)
      const repaired = s.damage.repaired + taken
      if (repaired >= s.damage.needed) {
        mapOne(id, x => withoutDamage(x))
        log('building', `🔨 ${c.name} put ${taken} block${taken === 1 ? '' : 's'} into ${s.name}. It's fully repaired.`)
      } else {
        mapOne(id, x => x.damage ? { ...x, damage: { ...x.damage, repaired } } : x)
        log('building', `🔨 ${c.name} put ${taken} block${taken === 1 ? '' : 's'} into repairing ${s.name} (${repaired}/${s.damage.needed}).`)
      }
      return taken
    },

    markRepaired(id) {
      const s = get().structures.find(x => x.id === id)
      if (!s?.damage) return
      mapOne(id, x => withoutDamage(x))
      log('building', `🔨 ${s.name} is repaired.`)
    },

    destroyStructure(id) {
      const s = get().structures.find(x => x.id === id)
      if (!s || s.destroyedAt) return
      mapOne(id, x => ({ ...withoutDamage(x), destroyedAt: Date.now() }))
      log('building', `🪨 ${s.name} was destroyed.`)
    },

    rebuildStructure(id) {
      const s = get().structures.find(x => x.id === id)
      if (!s?.destroyedAt) return
      const req = projectRequirements(s.tier, hasArchitect(s.builderIds))
      mapOne(id, x => {
        const fresh: Structure = {
          ...withoutDamage(x),
          blocksRequired: req.blocks, daysRequired: req.days, redstoneRequired: req.redstone,
          blocksCommitted: 0, redstoneCommitted: 0, daysWorked: 0,
        }
        delete fresh.completedAt
        delete fresh.destroyedAt
        return fresh
      })
      log('building', `🏗️ Rebuilding ${s.name} from its ruins (${req.blocks} blocks, ${req.days} day${req.days === 1 ? '' : 's'}).`)
    },

    mine({ characterId, areaName, materials, requested, total, gained, destination, placeId, doubleSix }) {
      const charStore = useCharacterStore.getState()
      const c = charStore.characters.find(x => x.id === characterId)
      if (!c) return
      const qty = Math.max(0, Math.floor(gained))
      const where = destination === 'onHand' ? 'onHand' : 'storage'
      const key = placeId ?? dropKey(c)
      let overflow = 0
      if (qty > 0) {
        const name = minedStackName(materials)
        if (where === 'onHand') {
          // Mining goes on hand where they mined: anything they can't carry stays there.
          const { onHand, stashes, moved } = enforceCarryLimit({ ...c, onHand: addBlocks(c.onHand, name, qty, newId) }, newId, key)
          overflow = moved
          charStore.updateCharacter(characterId, { onHand, stashes })
        } else {
          charStore.updateCharacter(characterId, { stashes: addBlocksTo(c, key, name, qty, newId) })
        }
      }
      const days = miningDays(requested)
      const outcome = actionOutcome(total)
      const at = areaName ? ` at ${areaName}` : ''
      const what = materials.length ? materials.join(' & ') : 'blocks'
      log('building',
        `⛏️ ${c.name} mined for ${requested} blocks of ${what}${at} — rolled ${total} (${outcome}), ` +
        `${days} day${days === 1 ? '' : 's'}: gained ${qty} block${qty === 1 ? '' : 's'}` +
        `${qty > 0 ? minedWhere(where, qty, overflow, areaName, key === UNPLACED) : ''}.`)
      if (doubleSix) {
        charStore.awardXp(characterId, 1, 'double-six', 'Double 6 while mining')
        log('building', `⭐ ${c.name} rolled double 6s mining: +1 XP.`)
      }
    },
  }
})
