// ── Player → GM requests ────────────────────────────────────────────────────
export type RequestType =
  | 'item'           // add item to on-hand
  | 'quest-complete' // mark quest completed
  | 'quest-fail'     // mark quest failed
  | 'quest-activate' // re-activate a quest
  | 'heal-full'      // restore full HP
  | 'heal-amount'    // heal a specific amount
  | 'sd-restore'     // restore all SD
  | 'xp'             // award XP
  | 'level-up'       // level up character
  | 'effect-remove'  // remove an active effect
  | 'currency'       // grant currency
  | 'buy-item'       // buy from a market at the engine's (GM-overridable) price
  | 'sell-item'      // sell an on-hand item to a market
  | 'reveal-area'    // reveal area on player map
  | 'skill-approval' // level up + new custom skill awaiting GM approval
  | 'custom'         // free-text request

export interface PlayerRequest {
  id: string
  characterId: string
  characterName: string
  type: RequestType
  payload: Record<string, unknown>
  label: string           // short human-readable summary shown to GM
  status: 'pending' | 'approved' | 'denied'
  createdAt: number
}
