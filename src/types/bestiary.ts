// ── Bestiary ───────────────────────────────────────────────────────────
export interface BestiaryEntry {
  id: string
  name: string
  hpTier: 'weak' | 'average' | 'strong' | 'mighty'
  maxHp?: number
  size: 'small' | 'medium' | 'large' | 'massive'
  creatureType: string[]
  speed?: 'slow' | 'normal' | 'fast'
  abilities?: string
  notes?: string
  isCustom: boolean
  imageKey?: string
}
