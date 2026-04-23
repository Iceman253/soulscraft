// ── XP ─────────────────────────────────────────────────────────────────
export type XpSource = 'double-six' | 'session-milestone' | 'character-goal' | 'gm-award' | 'manual'

export interface XpEvent {
  id: string
  timestamp: number
  characterId: string
  amount: number
  source: XpSource
  note?: string
}
