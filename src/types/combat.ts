import type { ActiveEffect } from './character'

// ── Combat ─────────────────────────────────────────────────────────────
export interface Combatant {
  id: string
  name: string
  initiative: number
  maxHp: number
  currentHp: number
  def: number
  damageDie?: string
  kind: 'character' | 'creature'
  sourceId: string
  activeEffects: ActiveEffect[]
  notes: string
}

export interface CombatSession {
  id: string
  startedAt: number
  combatants: Combatant[]
  round: number
  activeIndex: number
  ended: boolean
}
