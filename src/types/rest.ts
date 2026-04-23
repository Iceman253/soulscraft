// ── Rest ───────────────────────────────────────────────────────────────
export interface RestConditions {
  fed: boolean
  shelter: boolean
  safe: boolean
  calmMind: boolean
}

export interface RestEvent {
  id: string
  timestamp: number
  location: string
  conditions: RestConditions
  quality: 'good' | 'poor'
  characterIds: string[]
  notes?: string
}
