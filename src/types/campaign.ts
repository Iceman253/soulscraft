import type { Area, AreaEdge, TravelingMarker, TowerTrials, MapBackground } from './world'
import type { Character } from './character'
import type { BestiaryEntry } from './bestiary'
import type { Quest } from './quest'
import type { RestEvent } from './rest'
import type { LogEntry } from './log'
import type { PinnedNote } from './notes'
import type { XpEvent } from './xp'
import type { Item } from './items'
import type { EconomyData } from './economy'
import type { CombatSession } from './combat'
import type { PlayerRequest } from './request'

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
  economy: EconomyData
  schemaVersion: number
  playerView: PlayerViewData
  /** Tower of Trials resurrection tracker. Optional for backward compatibility. */
  towerTrials?: TowerTrials
  /** Map background placement (flow coords). The image is in the image cache
   *  under soulscraft_mapbg_{id}. Optional for backward compatibility. */
  mapBackground?: MapBackground
  /** Active combat session, synced across devices so players see the fight.
   *  Optional for backward compatibility. */
  combat?: CombatSession | null
  /** Player→GM requests, synced so they reach the GM across devices. */
  requests?: PlayerRequest[]
}
