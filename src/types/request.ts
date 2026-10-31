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
  | 'effect-add'     // apply a new effect/condition
  | 'currency'       // grant currency
  | 'buy-item'       // buy from a market at the engine's (GM-overridable) price
  | 'sell-item'      // sell an on-hand item to a market
  | 'reveal-area'    // reveal area on player map
  | 'skill-approval' // level up + new custom skill awaiting GM approval
  | 'mine'           // mining trip already rolled by the player; GM awards the blocks
  | 'build-start'    // player-designed build: icon, purpose and placement
  | 'build-days'     // days the builders worked on a build
  | 'build-speedup'  // fewer days needed, with the player's reason
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
