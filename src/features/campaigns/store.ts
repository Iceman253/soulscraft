import { create } from 'zustand'
import type { CampaignMeta, CampaignData } from '../../types'
import {
  loadCampaignIndex, saveCampaignIndex,
  loadCampaign, saveCampaign, deleteCampaignData,
  getActiveCampaignId, setActiveCampaignId,
  getCampaignSizeBytes,
} from '../../lib/storage'
import { downloadJson, deserializeCampaign } from '../../lib/export'
import { newId } from '../../lib/id'

function emptyData(id: string, name: string): CampaignData {
  return {
    id, name,
    areas: [], edges: [],
    characters: [], items: [],
    quests: [], bestiary: [],
    restEvents: [], logEntries: [],
    pinnedNotes: [], xpLog: [],
    schemaVersion: 1,
  }
}

interface CampaignStore {
  index: CampaignMeta[]
  activeId: string | null
  activeCampaign: CampaignData | null
  dirty: boolean

  // Boot
  init: () => void

  // CRUD
  createCampaign: (name: string, description?: string) => string
  deleteCampaign: (id: string) => void
  switchCampaign: (id: string) => void
  exitToSwitcher: () => void

  // Persist
  flushCurrent: () => void
  updateCampaignData: (patch: Partial<CampaignData>) => void

  // Export / Import
  exportCampaign: (id: string) => void
  importCampaign: (json: string) => string | null

  // Helpers
  getSizeBytes: (id: string) => number
}

export const useCampaignStore = create<CampaignStore>((set, get) => ({
  index: [],
  activeId: null,
  activeCampaign: null,
  dirty: false,

  init() {
    const index = loadCampaignIndex()
    const activeId = getActiveCampaignId()
    const activeCampaign = activeId ? loadCampaign(activeId) : null
    set({ index, activeId: activeCampaign ? activeId : null, activeCampaign, dirty: false })
  },

  createCampaign(name, description) {
    const id = newId()
    const now = Date.now()
    const meta: CampaignMeta = {
      id, name, description,
      createdAt: now, lastPlayedAt: now,
      sessionCount: 0, playerCount: 0,
    }
    const data = emptyData(id, name)
    const index = [...get().index, meta]
    saveCampaignIndex(index)
    saveCampaign(data)
    set({ index })
    return id
  },

  deleteCampaign(id) {
    deleteCampaignData(id)
    const index = get().index.filter(m => m.id !== id)
    saveCampaignIndex(index)
    if (get().activeId === id) {
      setActiveCampaignId(null)
      set({ index, activeId: null, activeCampaign: null })
    } else {
      set({ index })
    }
  },

  switchCampaign(id) {
    get().flushCurrent()
    const data = loadCampaign(id)
    if (!data) return
    setActiveCampaignId(id)
    // Update lastPlayedAt in index
    const index = get().index.map(m =>
      m.id === id ? { ...m, lastPlayedAt: Date.now() } : m
    )
    saveCampaignIndex(index)
    set({ activeId: id, activeCampaign: data, index, dirty: false })
  },

  exitToSwitcher() {
    get().flushCurrent()
    setActiveCampaignId(null)
    set({ activeId: null, activeCampaign: null, dirty: false })
  },

  flushCurrent() {
    const { activeCampaign } = get()
    if (activeCampaign) saveCampaign(activeCampaign)
  },

  updateCampaignData(patch) {
    const current = get().activeCampaign
    if (!current) return
    const updated = { ...current, ...patch }
    saveCampaign(updated)
    set({ activeCampaign: updated, dirty: false })
  },

  exportCampaign(id) {
    const data = id === get().activeId ? get().activeCampaign : loadCampaign(id)
    if (data) downloadJson(data)
  },

  importCampaign(json) {
    const data = deserializeCampaign(json)
    if (!data) return null
    const now = Date.now()
    const meta: CampaignMeta = {
      id: data.id,
      name: data.name,
      createdAt: now,
      lastPlayedAt: now,
      sessionCount: 0,
      playerCount: 0,
    }
    saveCampaign(data)
    const index = [...get().index, meta]
    saveCampaignIndex(index)
    set({ index })
    return data.id
  },

  getSizeBytes: (id) => getCampaignSizeBytes(id),
}))
