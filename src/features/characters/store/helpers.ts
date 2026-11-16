import type { StoreApi } from 'zustand'
import type { Character, XpEvent } from '../../../types'
import { newId } from '../../../lib/platform/id'
import { useCampaignStore } from '../../campaigns/store'
import { log } from '../../log/store'
import { BLOCK_CARRY_LIMIT, carryLimitOf, countBlocks, enforceCarryLimit, nextCarryLimit } from '../../../lib/world/building'
import { dropKey } from '../../../lib/world/stashes'
import type { CharacterStore } from './types'

export function save(characters: Character[], xpLog: XpEvent[]) {
  useCampaignStore.getState().updateCampaignData({ characters, xpLog })
}

export function mapChar(chars: Character[], id: string, fn: (c: Character) => Character): Character[] {
  return chars.map(c => c.id === id ? fn(c) : c)
}

/** Shared write helpers for the slices: every change goes through `commit`, which
 *  updates the store and syncs it to the campaign. */
export function committer(set: StoreApi<CharacterStore>['setState'], get: StoreApi<CharacterStore>['getState']) {
  const commit = (characters: Character[]) => {
    set({ characters })
    save(characters, get().xpLog)
  }
  return {
    commit,
    /** Change one character. */
    update: (id: string, fn: (c: Character) => Character) => commit(mapChar(get().characters, id, fn)),
    /** Change one character's on-hand items, then hold them to their carry limit. */
    updateCarried: (id: string, fn: (c: Character) => Character) =>
      commit(settleCarry(get().characters, mapChar(get().characters, id, fn), id)),
  }
}

/** Resolve what happens when a character is at 0 HP with no SD left to spend.
 *  - In the Tower of Trials: ejected with 1 HP (cannot die inside).
 *  - Otherwise: dies (rulebook — HP 0 and no SD to Avoid Death).
 *  Returns the (possibly updated) array and a log message when something changed.
 *  A character with SD remaining is left untouched — the player may still choose
 *  to Avoid Death by spending SD (1 SD → 1 HP). */
export function resolveDeathAtZero(chars: Character[], id: string): { characters: Character[]; message?: string } {
  const c = chars.find(x => x.id === id)
  if (!c || c.currentHp !== 0 || c.isDead || c.currentSd > 0) return { characters: chars }
  if (c.inTower) {
    return {
      characters: mapChar(chars, id, x => ({ ...x, currentHp: 1, inTower: false })),
      message: `🗼 ${c.name} was ejected from the Tower of Trials with 1 HP — the Tower does not permit death.`,
    }
  }
  return {
    characters: mapChar(chars, id, x => ({ ...x, isDead: true })),
    message: `💀 ${c.name} has fallen — no HP and no SD remaining.`,
  }
}

/** After anything that changes on-hand items: end a temporary limit if the blocks
 *  carried just fell below 10, then hold the character to their limit. */
export function settleCarry(before: Character[], after: Character[], id: string): Character[] {
  const was = before.find(x => x.id === id)
  const c = after.find(x => x.id === id)
  if (!was || !c) return after
  const carryLimit = nextCarryLimit(c.carryLimit, countBlocks(was.onHand.items), countBlocks(c.onHand.items))
  const ended = carryLimit !== c.carryLimit
  if (ended) log('character-move', `📦 ${c.name}'s carry limit is back to ${BLOCK_CARRY_LIMIT} blocks.`)
  const settled = ended ? { ...c, carryLimit } : c
  const { onHand, stashes, moved } = enforceCarryLimit(settled, newId)
  if (moved > 0) log('character-move', `📦 ${c.name} can only carry ${carryLimitOf(settled)} blocks, so ${moved} ${dropKey(c) === 'unplaced' ? 'were left behind' : 'went into storage here'}.`)
  return ended || moved > 0 ? mapChar(after, id, () => ({ ...settled, onHand, stashes })) : after
}
