import { create } from 'zustand'
import type { PinnedNote } from '../../types'
import { newId } from '../../lib/id'
import { useCampaignStore } from '../campaigns/store'

interface NotesStore {
  notes: PinnedNote[]
  hydrate: (notes: PinnedNote[]) => void
  addNote: (text: string, color?: string) => void
  updateNote: (id: string, text: string) => void
  deleteNote: (id: string) => void
}

function save(notes: PinnedNote[]) {
  useCampaignStore.getState().updateCampaignData({ pinnedNotes: notes })
}

export const useNotesStore = create<NotesStore>((set, get) => ({
  notes: [],

  hydrate(notes) { set({ notes }) },

  addNote(text, color) {
    const note: PinnedNote = { id: newId(), text, color, createdAt: Date.now() }
    const notes = [note, ...get().notes]
    set({ notes })
    save(notes)
  },

  updateNote(id, text) {
    const notes = get().notes.map(n => n.id === id ? { ...n, text } : n)
    set({ notes })
    save(notes)
  },

  deleteNote(id) {
    const notes = get().notes.filter(n => n.id !== id)
    set({ notes })
    save(notes)
  },
}))
