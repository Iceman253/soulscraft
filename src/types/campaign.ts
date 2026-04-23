import type { Area, AreaEdge, TravelingMarker } from './world'
import type { Character } from './character'
import type { BestiaryEntry } from './bestiary'
import type { Quest } from './quest'
import type { RestEvent } from './rest'
import type { LogEntry } from './log'
import type { PinnedNote } from './notes'
import type { XpEvent } from './xp'
import type { Item } from './items'

// ── Campaign ───────────────────────────────────────────────────────────
export interface CampaignMeta {
  id: string
  name: string
  description?: string
  createdAt: number
  lastPlayedAt: number
  sessionCount: number
  playerCount: number
}

export interface PlayerViewData {
  visibleAreaIds: string[]
  travelingMarkers: TravelingMarker[]
  sessionNote: string   // GM-editable message shown at top of Player View
}

export interface CampaignData {
  id: string
  name: string
  areas: Area[]
  edges: AreaEdge[]
  characters: Character[]
  items: Item[]
  quests: Quest[]
  bestiary: BestiaryEntry[]
  restEvents: RestEvent[]
  logEntries: LogEntry[]
  pinnedNotes: PinnedNote[]
  xpLog: XpEvent[]
  schemaVersion: number
  playerView: PlayerViewData
}
