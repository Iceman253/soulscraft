import { create } from 'zustand'
import { newId } from '../../lib/id'

// ── Request types ─────────────────────────────────────────────────────────────
export type RequestType =
  | 'item'           // add item to on-hand
  | 'quest-complete' // mark quest completed
  | 'quest-fail'     // mark quest failed
  | 'quest-activate' // re-activate a quest
  | 'heal-full'      // restore full HP
  | 'heal-amount'    // heal a specific amount
  | 'sd-restore'     // restore all SD
  | 'xp'             // award XP
  | 'level-up'       // level up character
  | 'effect-remove'  // remove an active effect
  | 'currency'       // grant currency
  | 'reveal-area'    // reveal area on player map
  | 'custom'         // free-text request

export interface PlayerRequest {
  id: string
  characterId: string
  characterName: string
  type: RequestType
  payload: Record<string, unknown>
  label: string           // short human-readable summary shown to GM
  status: 'pending' | 'approved' | 'denied'
  createdAt: number
}

interface RequestStore {
  requests: PlayerRequest[]
  addRequest: (req: Omit<PlayerRequest, 'id' | 'status' | 'createdAt'>) => void
  approveRequest: (id: string) => void   // just marks status; caller executes
  denyRequest: (id: string) => void
  clearRequest: (id: string) => void
  clearAll: () => void
}

export const useRequestStore = create<RequestStore>((set, get) => ({
  requests: [],

  addRequest(req) {
    const request: PlayerRequest = {
      ...req,
      id: newId(),
      status: 'pending',
      createdAt: Date.now(),
    }
    set({ requests: [request, ...get().requests] })
  },

  approveRequest(id) {
    set({ requests: get().requests.map(r => r.id === id ? { ...r, status: 'approved' } : r) })
  },

  denyRequest(id) {
    set({ requests: get().requests.map(r => r.id === id ? { ...r, status: 'denied' } : r) })
  },

  clearRequest(id) {
    set({ requests: get().requests.filter(r => r.id !== id) })
  },

  clearAll() {
    set({ requests: [] })
  },
}))
