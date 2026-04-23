import { create } from 'zustand'
import type { LogEntry, LogEntryType } from '../../types'
import { newId } from '../../lib/id'
import { useCampaignStore } from '../campaigns/store'

interface LogStore {
  entries: LogEntry[]
  hydrate: (entries: LogEntry[]) => void
  addEntry: (type: LogEntryType, text: string, meta?: Record<string, unknown>) => void
  addManualEntry: (text: string) => void
  deleteEntry: (id: string) => void
  clearLog: () => void
}

function save(entries: LogEntry[]) {
  const { activeCampaign, updateCampaignData } = useCampaignStore.getState()
  if (activeCampaign) updateCampaignData({ logEntries: entries })
}

export const useLogStore = create<LogStore>((set, get) => ({
  entries: [],

  hydrate(entries) { set({ entries }) },

  addEntry(type, text, meta) {
    const entry: LogEntry = { id: newId(), timestamp: Date.now(), type, text, meta }
    const entries = [entry, ...get().entries].slice(0, 500)
    set({ entries })
    save(entries)
  },

  addManualEntry(text) {
    get().addEntry('manual', text)
  },

  deleteEntry(id) {
    const entries = get().entries.filter(e => e.id !== id)
    set({ entries })
    save(entries)
  },

  clearLog() {
    set({ entries: [] })
    save([])
  },
}))

export function log(type: LogEntryType, text: string, meta?: Record<string, unknown>) {
  useLogStore.getState().addEntry(type, text, meta)
}
