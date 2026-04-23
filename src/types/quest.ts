// ── Quests ─────────────────────────────────────────────────────────────
export interface QuestObjective {
  id: string
  text: string
  completed: boolean
}

export interface Quest {
  id: string
  title: string
  description: string
  status: 'active' | 'completed' | 'failed' | 'inactive'
  objectives: QuestObjective[]
  reward?: string
}
