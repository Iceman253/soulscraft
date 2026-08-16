import { create } from 'zustand'
import { newId } from '../../lib/id'
import { useCampaignStore } from '../campaigns/store'
import type { PlayerRequest } from '../../types'

// Re-exported for existing imports from this module.
export type { RequestType, PlayerRequest } from '../../types'

interface RequestStore {
  requests: PlayerRequest[]
  /** Adopt synced requests from campaign data (remote change / initial load). */
  hydrate: (requests: PlayerRequest[]) => void
  addRequest: (req: Omit<PlayerRequest, 'id' | 'status' | 'createdAt'>) => void
  approveRequest: (id: string) => void   // just marks status; caller executes
  denyRequest: (id: string) => void
  clearRequest: (id: string) => void
  clearAll: () => void
  /** GM tweaks to a pending request before approving (e.g. final price). */
  updateRequestPayload: (id: string, patch: Record<string, unknown>) => void
}

export const useRequestStore = create<RequestStore>((set, get) => ({
  requests: [],

  hydrate(requests) {
    set({ requests })
  },

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

  updateRequestPayload(id, patch) {
    set({
      requests: get().requests.map(r =>
        r.id === id ? { ...r, payload: { ...r.payload, ...patch } } : r
      ),
    })
  },
}))

// Persist requests into the shared campaign data so a player's request reaches
// the GM (and status changes reach the player). App wraps hydration in
// runWithoutSave, so adopting a remote list doesn't echo back to the server.
useRequestStore.subscribe((state) => {
  useCampaignStore.getState().updateCampaignData({ requests: state.requests })
})
