import { create } from 'zustand'
import type { CampaignData } from '../../types'
import { downloadJson, deserializeCampaign } from '../../lib/export'
import { newId } from '../../lib/id'
import { emptyEconomy } from '../../lib/economyEngine'
import {
  listCampaigns, createCampaignOnServer, enterCampaign as apiEnter,
  putCampaign, deleteCampaignOnServer, ApiError,
} from '../../lib/api'
import { setImageSyncContext, hydrateImages } from '../../lib/imageCache'

export interface CampaignListItem { id: string; name: string; updatedAt: number }

const ACTIVE_KEY = 'soulscraft_active'   // sessionStorage: { id, code } to re-enter on reload

function emptyData(id: string, name: string): CampaignData {
  return {
    id, name,
    areas: [], edges: [],
    characters: [], items: [],
    quests: [], bestiary: [],
    restEvents: [], logEntries: [],
    pinnedNotes: [], xpLog: [],
    economy: emptyEconomy(),
    playerView: { visibleAreaIds: [], travelingMarkers: [], sessionNote: '' },
    towerTrials: { active: false, towerAreaId: null, keepersAgreed: false, floors: [] },
    schemaVersion: 1,
  }
}

interface CampaignStore {
  index: CampaignListItem[]
  activeId: string | null
  activeCode: string | null
  activeCampaign: CampaignData | null
  // Staged: code validated, data loaded, but not yet activated (character picker
  // runs against this before we commit and swap the UI to the app).
  staged: { id: string; code: string; data: CampaignData } | null
  loading: boolean

  init: () => Promise<void>
  refreshList: () => Promise<void>
  createCampaign: (name: string, code: string) => Promise<string | null>
  stageCampaign: (id: string, code: string) => Promise<boolean>   // false = bad code / not found
  commitStaged: () => Promise<void>
  deleteCampaign: (id: string, code: string) => Promise<void>
  exitToSwitcher: () => void

  updateCampaignData: (patch: Partial<CampaignData>) => void
  applyRemote: (data: CampaignData) => void   // called by the WS sync handler
  flushCurrent: () => void

  exportCampaign: (id: string) => void
  importCampaign: (json: string, code: string) => Promise<string | null>
}

// ── Debounced server save ──────────────────────────────────────────────────────
let saveTimer: ReturnType<typeof setTimeout> | null = null
function scheduleSave(get: () => CampaignStore) {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => { saveTimer = null; flush(get) }, 400)
}
function flush(get: () => CampaignStore) {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null }
  const { activeId, activeCode, activeCampaign } = get()
  if (activeId && activeCode != null && activeCampaign) {
    void putCampaign(activeId, activeCode, activeCampaign).catch(() => { /* offline — retried on next change */ })
  }
}

export const useCampaignStore = create<CampaignStore>((set, get) => ({
  index: [],
  activeId: null,
  activeCode: null,
  activeCampaign: null,
  staged: null,
  loading: false,

  async init() {
    set({ loading: true })
    await get().refreshList()
    // Restore the previous session (re-enter with the saved code) if present.
    try {
      const saved = sessionStorage.getItem(ACTIVE_KEY)
      if (saved) {
        const { id, code } = JSON.parse(saved)
        const ok = await get().stageCampaign(id, code)
        if (ok) await get().commitStaged()
        else sessionStorage.removeItem(ACTIVE_KEY)
      }
    } catch { sessionStorage.removeItem(ACTIVE_KEY) }
    set({ loading: false })
  },

  async refreshList() {
    try { set({ index: await listCampaigns() }) } catch { /* offline */ }
  },

  async createCampaign(name, code) {
    const id = newId()
    try {
      await createCampaignOnServer(id, name, code, emptyData(id, name))
      await get().refreshList()
      return id
    } catch { return null }
  },

  async stageCampaign(id, code) {
    try {
      const res = await apiEnter(id, code)
      set({ staged: { id, code, data: res.data } })
      return true
    } catch (e) {
      if (e instanceof ApiError && (e.status === 403 || e.status === 404)) return false
      return false
    }
  },

  async commitStaged() {
    const s = get().staged
    if (!s) return
    setImageSyncContext({ campaignId: s.id, code: s.code })
    await hydrateImages(s.id)   // seed the image cache before the app renders
    sessionStorage.setItem(ACTIVE_KEY, JSON.stringify({ id: s.id, code: s.code }))
    set({ activeId: s.id, activeCode: s.code, activeCampaign: s.data, staged: null })
  },

  async deleteCampaign(id, code) {
    try { await deleteCampaignOnServer(id, code) } catch { /* ignore */ }
    if (get().activeId === id) get().exitToSwitcher()
    await get().refreshList()
  },

  exitToSwitcher() {
    flush(get)
    setImageSyncContext(null)
    sessionStorage.removeItem(ACTIVE_KEY)
    set({ activeId: null, activeCode: null, activeCampaign: null, staged: null })
    void get().refreshList()
  },

  updateCampaignData(patch) {
    const current = get().activeCampaign
    if (!current) return
    set({ activeCampaign: { ...current, ...patch } })
    scheduleSave(get)
  },

  applyRemote(data) {
    // A change arrived from another device — adopt it without re-broadcasting.
    set({ activeCampaign: data })
  },

  flushCurrent() { flush(get) },

  exportCampaign(id) {
    const { activeId, activeCampaign } = get()
    if (id === activeId && activeCampaign) downloadJson(activeCampaign)
  },

  async importCampaign(json, code) {
    const data = deserializeCampaign(json)
    if (!data) return null
    const id = data.id || newId()
    try {
      await createCampaignOnServer(id, data.name, code, { ...data, id })
      await get().refreshList()
      return id
    } catch { return null }
  },
}))
