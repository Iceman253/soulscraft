import { create } from 'zustand'
import type { ProjectTier, Structure } from '../../types'
import { newId } from '../../lib/id'
import { log } from '../log/store'
import { useCampaignStore } from '../campaigns/store'
import { useCharacterStore } from '../characters/store'
import {
  PROJECT_TIERS, projectRequirements, isArchitect, structureProgress,
  takeBlocks, takeRedstone, addBlocks, minedStackName, miningDays, actionOutcome,
} from '../../lib/building'

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
  destination: 'storage' | 'onHand'
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

  /** Resolve a mining trip: add the awarded blocks to the character and log it. */
  mine: (p: MineParams) => void
}

function save(structures: Structure[]) {
  useCampaignStore.getState().updateCampaignData({ structures })
}

function hasArchitect(builderIds: string[]): boolean {
  const chars = useCharacterStore.getState().characters
  return builderIds.some(id => {
    const c = chars.find(x => x.id === id)
    return !!c && isArchitect(c)
  })
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
      const { storage, onHand, taken } = takeBlocks(c, amount)
      if (taken === 0) return 0
      charStore.updateCharacter(characterId, { storage, onHand })
      mapOne(id, x => withCompletion({ ...x, blocksCommitted: x.blocksCommitted + taken }))
      log('building', `🧱 ${c.name} put ${taken} block${taken === 1 ? '' : 's'} into ${s.name}.`)
      return taken
    },

    commitRedstone(id, characterId, amount) {
      const s = get().structures.find(x => x.id === id)
      const charStore = useCharacterStore.getState()
      const c = charStore.characters.find(x => x.id === characterId)
      if (!s || !c || amount <= 0) return 0
      const { storage, onHand, taken } = takeRedstone(c, amount)
      if (taken === 0) return 0
      charStore.updateCharacter(characterId, { storage, onHand })
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

    mine({ characterId, areaName, materials, requested, total, gained, destination, doubleSix }) {
      const charStore = useCharacterStore.getState()
      const c = charStore.characters.find(x => x.id === characterId)
      if (!c) return
      const qty = Math.max(0, Math.floor(gained))
      if (qty > 0) {
        const name = minedStackName(materials)
        if (destination === 'onHand') charStore.updateCharacter(characterId, { onHand: addBlocks(c.onHand, name, qty, newId) })
        else charStore.updateCharacter(characterId, { storage: addBlocks(c.storage, name, qty, newId) })
      }
      const days = miningDays(requested)
      const outcome = actionOutcome(total)
      const where = areaName ? ` at ${areaName}` : ''
      const what = materials.length ? materials.join(' & ') : 'blocks'
      log('building',
        `⛏️ ${c.name} mined for ${requested} blocks of ${what}${where} — rolled ${total} (${outcome}), ` +
        `${days} day${days === 1 ? '' : 's'}: gained ${qty} block${qty === 1 ? '' : 's'}` +
        `${qty > 0 ? (destination === 'onHand' ? ' (on hand)' : ' (to storage)') : ''}.`)
      if (doubleSix) {
        charStore.awardXp(characterId, 1, 'double-six', 'Double 6 while mining')
        log('building', `⭐ ${c.name} rolled double 6s mining: +1 XP.`)
      }
    },
  }
})
