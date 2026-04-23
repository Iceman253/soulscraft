import { create } from 'zustand'
import type { Quest, QuestObjective } from '../../types'
import { newId } from '../../lib/id'
import { useCampaignStore } from '../campaigns/store'
import { log } from '../log/store'

interface QuestStore {
  quests: Quest[]
  hydrate: (quests: Quest[]) => void
  addQuest: (quest: Omit<Quest, 'id'>) => void
  updateQuest: (id: string, patch: Partial<Quest>) => void
  deleteQuest: (id: string) => void
  setStatus: (id: string, status: Quest['status']) => void
  toggleObjective: (questId: string, objectiveId: string) => void
  addObjective: (questId: string, text: string) => void
  deleteObjective: (questId: string, objectiveId: string) => void
}

function save(quests: Quest[]) {
  useCampaignStore.getState().updateCampaignData({ quests })
}

export const useQuestStore = create<QuestStore>((set, get) => ({
  quests: [],

  hydrate(quests) { set({ quests }) },

  addQuest(q) {
    const quest: Quest = { ...q, id: newId() }
    const quests = [...get().quests, quest]
    set({ quests }); save(quests)
  },

  updateQuest(id, patch) {
    const quests = get().quests.map(q => q.id === id ? { ...q, ...patch } : q)
    set({ quests }); save(quests)
  },

  deleteQuest(id) {
    const quests = get().quests.filter(q => q.id !== id)
    set({ quests }); save(quests)
  },

  setStatus(id, status) {
    const quest = get().quests.find(q => q.id === id)
    if (!quest) return
    get().updateQuest(id, { status })
    const icon = status === 'completed' ? '✅' : status === 'failed' ? '❌' : '🔄'
    log('quest-update', `${icon} Quest "${quest.title}" marked as ${status}.`)
  },

  toggleObjective(questId, objectiveId) {
    const quests = get().quests.map(q => {
      if (q.id !== questId) return q
      return {
        ...q,
        objectives: q.objectives.map((o: QuestObjective) =>
          o.id === objectiveId ? { ...o, completed: !o.completed } : o
        ),
      }
    })
    set({ quests }); save(quests)
  },

  addObjective(questId, text) {
    const obj: QuestObjective = { id: newId(), text, completed: false }
    const quests = get().quests.map(q =>
      q.id === questId ? { ...q, objectives: [...q.objectives, obj] } : q
    )
    set({ quests }); save(quests)
  },

  deleteObjective(questId, objectiveId) {
    const quests = get().quests.map(q =>
      q.id === questId
        ? { ...q, objectives: q.objectives.filter((o: QuestObjective) => o.id !== objectiveId) }
        : q
    )
    set({ quests }); save(quests)
  },
}))
