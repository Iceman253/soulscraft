// ── Session Log ────────────────────────────────────────────────────────
export type LogEntryType =
  | 'manual' | 'rest' | 'missed-rest' | 'item-purchase' | 'dice-roll'
  | 'character-move' | 'level-up' | 'xp-awarded' | 'quest-update'
  | 'combat-end' | 'effect-applied' | 'effect-expired' | 'item-transfer'

export interface LogEntry {
  id: string
  timestamp: number
  type: LogEntryType
  text: string
  meta?: Record<string, unknown>
}
