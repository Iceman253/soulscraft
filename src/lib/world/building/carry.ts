// Block carry limit: 10 on hand unless the GM raises it (Guidebook p.7).
import type { Character, CharacterItem, InventorySection } from '../../../types'
import { dropKey, stashOf, withStash } from '../stashes'
import { addBlocks } from './blockStock'

/** "You may carry 10 blocks of any material at a time" (on hand; storage is unlimited). */
export const BLOCK_CARRY_LIMIT = 10

/** Total blocks in a list of items (only items flagged as blocks, summing quantities). */
export function countBlocks(items: CharacterItem[]): number {
  return items.filter(i => i.isBlock).reduce((sum, i) => sum + (i.quantity ?? 1), 0)
}

/** A character's carry limit right now: 10, unless the GM granted a temporary raise. */
export function carryLimitOf(c: Pick<Character, 'carryLimit'>): number {
  return c.carryLimit ?? BLOCK_CARRY_LIMIT
}

/** Blocks a character can still pick up before reaching their carry limit (p.7). */
export function carryRoom(c: Pick<Character, 'onHand' | 'carryLimit'>): number {
  return Math.max(0, carryLimitOf(c) - countBlocks(c.onHand.items))
}

/** A temporary limit ends the moment the blocks carried fall below the usual 10.
 *  Only a drop from 10 or more counts, so a raise granted to someone holding 3 blocks
 *  doesn't end before they've used it. */
export function nextCarryLimit(limit: number | undefined, before: number, after: number): number | undefined {
  return before >= BLOCK_CARRY_LIMIT && after < BLOCK_CARRY_LIMIT ? undefined : limit
}

/** A limit the GM entered, or null if it wouldn't raise the usual 10. */
export function parseCarryLimit(value: unknown): number | null {
  const n = Math.floor(Number(value))
  return Number.isFinite(n) && n > BLOCK_CARRY_LIMIT ? n : null
}

/** Hold a character to their carry limit (p.7): anything past it goes into storage
 *  where they are (see lib/stashes dropKey), which has no limit, so blocks are never
 *  lost. The newest stacks go first. */
export function enforceCarryLimit(
  c: Pick<Character, 'onHand' | 'stashes' | 'carryLimit' | 'locationId' | 'subLocationId'>,
  newId: () => string,
  key: string = dropKey(c),
): { onHand: InventorySection; stashes: Record<string, InventorySection> | undefined; moved: number } {
  const moved = Math.max(0, countBlocks(c.onHand.items) - carryLimitOf(c))
  if (moved === 0) return { onHand: c.onHand, stashes: c.stashes, moved }
  const items = [...c.onHand.items]
  let storage = stashOf(c, key)
  let left = moved
  for (let i = items.length - 1; i >= 0 && left > 0; i--) {
    const item = items[i]
    if (!item.isBlock) continue
    const qty = item.quantity ?? 1
    const take = Math.min(qty, left)
    left -= take
    storage = addBlocks(storage, item.name, take, newId)
    if (take === qty) items.splice(i, 1)
    else items[i] = { ...item, quantity: qty - take }
  }
  return { onHand: { items }, stashes: withStash(c, key, storage), moved }
}

/** Blocks in one unit of a market good: 10 for "stack of 10 blocks", 1 for "block",
 *  0 if it isn't sold as blocks. */
export function blocksPerUnit(unit: string | undefined): number {
  if (!unit) return 0
  const stack = unit.match(/stack of (\d+) blocks?/i)
  if (stack) return parseInt(stack[1])
  return /\bblocks?\b/i.test(unit) ? 1 : 0
}

/** Does a free-text item name mean building blocks, like "Stone Blocks"? */
export function looksLikeBlocks(name: string): boolean {
  return /\bblocks?\b/i.test(name)
}
