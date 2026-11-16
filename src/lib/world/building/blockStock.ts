// Moving blocks and redstone dust between a character's inventory sections.
import type { Character, CharacterItem, InventorySection } from '../../../types'
import { countIn, takeFrom } from '../stashes'
import type { Section } from '../stashes'

const isBlock = (i: CharacterItem) => !!i.isBlock
const isRedstoneDust = (i: CharacterItem) => !i.isBlock && /redstone/i.test(i.name)

/** Take up to `amount` blocks from the sections a character can reach (see
 *  lib/stashes reachableStores), in the order given. Returns the patch and how many. */
export function takeBlocks(c: Pick<Character, 'stashes' | 'onHand'>, sections: Section[], amount: number) {
  return takeFrom(c, sections, amount, isBlock)
}

/** Blocks in the given sections. */
export function countBlocksIn(c: Pick<Character, 'stashes' | 'onHand'>, sections: Section[]): number {
  return countIn(c, sections, isBlock)
}

/** Redstone dust in the given sections. */
export function countRedstone(c: Pick<Character, 'stashes' | 'onHand'>, sections: Section[]): number {
  return countIn(c, sections, isRedstoneDust)
}

export function takeRedstone(c: Pick<Character, 'stashes' | 'onHand'>, sections: Section[], amount: number) {
  return takeFrom(c, sections, amount, isRedstoneDust)
}

/** Add `quantity` blocks named `name` to a section, stacking onto an existing
 *  block item of the same name (case-insensitive). */
export function addBlocks(section: InventorySection, name: string, quantity: number, newId: () => string): InventorySection {
  if (quantity <= 0) return section
  const key = name.trim().toLowerCase()
  const existing = section.items.find(i => i.isBlock && i.name.trim().toLowerCase() === key)
  if (existing) {
    return { items: section.items.map(i => i === existing ? { ...i, quantity: (i.quantity ?? 1) + quantity } : i) }
  }
  return { items: [...section.items, { id: newId(), name: name.trim(), quantity, isBlock: true }] }
}

/** Move up to `amount` blocks between two sections, newest stacks first, stacking by
 *  name. Other items stay put. Returns how many actually moved. */
export function moveBlocks(from: InventorySection, to: InventorySection, amount: number, newId: () => string) {
  const items = [...from.items]
  let dest = to
  let left = Math.max(0, Math.floor(amount))
  const wanted = left
  for (let i = items.length - 1; i >= 0 && left > 0; i--) {
    const item = items[i]
    if (!item.isBlock) continue
    const qty = item.quantity ?? 1
    const take = Math.min(qty, left)
    left -= take
    dest = addBlocks(dest, item.name, take, newId)
    if (take === qty) items.splice(i, 1)
    else items[i] = { ...item, quantity: qty - take }
  }
  return { from: { items }, to: dest, moved: wanted - left }
}
