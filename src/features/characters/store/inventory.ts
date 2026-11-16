import type { Character, CharacterItem } from '../../../types'
import { newId } from '../../../lib/platform/id'
import { log } from '../../log/store'
import { BLOCK_CARRY_LIMIT, carryRoom, enforceCarryLimit, moveBlocks } from '../../../lib/world/building'
import { dropKey, moveItem, sectionOf, setSection, stashOf, withStash, type Section, type StoreKey } from '../../../lib/world/stashes'
import { committer, mapChar, settleCarry } from './helpers'
import type { CharacterSlice } from './types'

/** Items on hand and in storage (lib/world/stashes), the carry limit, coins and rations. */
export interface InventoryActions {
  addOnHandItem: (id: string, item: Omit<CharacterItem, 'id'>) => string
  updateOnHandItem: (id: string, itemId: string, patch: Partial<CharacterItem>) => void
  removeOnHandItem: (id: string, itemId: string) => void
  /** Add an item to one of a character's stores (storage at a place, their Ender
   *  Chest, or unplaced). */
  addStoredItem: (id: string, key: StoreKey, item: Omit<CharacterItem, 'id'>) => void
  updateStoredItem: (id: string, key: StoreKey, itemId: string, patch: Partial<CharacterItem>) => void
  removeStoredItem: (id: string, key: StoreKey, itemId: string) => void
  /** Move an item between on hand and a store, or between stores. Blocks going on
   *  hand stop at the carry limit and the rest stays where it was. */
  moveItem: (id: string, itemId: string, from: Section, to: Section) => void
  /** GM: everything in one store goes to another (say, old storage to the base). */
  moveStore: (id: string, from: StoreKey, to: StoreKey) => void
  /** Set a temporary carry limit, or end it with null. Extra blocks are put down where they are. */
  setCarryLimit: (id: string, limit: number | null) => void
  /** Put up to `amount` on-hand blocks into a store. Returns blocks left there. */
  leaveBlocks: (id: string, key: StoreKey, amount: number) => number
  /** Pick up blocks from a store, up to the carry limit. Returns blocks taken. */
  pickUpBlocks: (id: string, key: StoreKey, amount: number) => number
  giveItemToCharacter: (fromId: string, itemId: string, fromSection: Section, toId: string) => void
  setCurrency: (id: string, patch: Partial<Character['currency']>) => void
  setRations: (id: string, count: number) => void
}

export const createInventorySlice: CharacterSlice<InventoryActions> = (set, get) => {
  const { commit, update, updateCarried } = committer(set, get)
  const find = (id: string) => get().characters.find(c => c.id === id)

  return {
    addOnHandItem(id, item) {
      const itemId = newId()
      updateCarried(id, c => ({ ...c, onHand: { items: [...c.onHand.items, { ...item, id: itemId }] } }))
      return itemId
    },
    updateOnHandItem: (id, itemId, patch) =>
      updateCarried(id, c => ({ ...c, onHand: { items: c.onHand.items.map(i => i.id === itemId ? { ...i, ...patch } : i) } })),
    removeOnHandItem: (id, itemId) =>
      updateCarried(id, c => ({ ...c, onHand: { items: c.onHand.items.filter(i => i.id !== itemId) } })),

    addStoredItem: (id, key, item) =>
      update(id, c => ({ ...c, stashes: withStash(c, key, { items: [...stashOf(c, key).items, { ...item, id: newId() }] }) })),
    updateStoredItem: (id, key, itemId, patch) =>
      update(id, c => ({ ...c, stashes: withStash(c, key, { items: stashOf(c, key).items.map(i => i.id === itemId ? { ...i, ...patch } : i) }) })),
    removeStoredItem: (id, key, itemId) =>
      update(id, c => ({ ...c, stashes: withStash(c, key, { items: stashOf(c, key).items.filter(i => i.id !== itemId) }) })),

    moveItem(id, itemId, from, to) {
      const c = find(id)
      if (!c || from === to) return
      const item = sectionOf(c, from).items.find(i => i.id === itemId)
      if (!item) return
      let patch: Partial<Character> | null
      if (to === 'onHand' && item.isBlock) {
        // Only what fits: the rest of the stack stays where it was.
        const qty = Math.min(item.quantity ?? 1, carryRoom(c))
        if (qty === 0) return
        const { from: source, to: hand } = moveBlocks({ items: [item] }, c.onHand, qty, newId)
        const rest = sectionOf(c, from).items.flatMap(i => i.id !== itemId ? [i] : source.items)
        patch = { ...setSection(c, from, { items: rest }), onHand: hand }
      } else {
        patch = moveItem(c, itemId, from, to)
      }
      if (patch) updateCarried(id, x => ({ ...x, ...patch }))
    },

    moveStore(id, from, to) {
      const c = find(id)
      if (!c || from === to || stashOf(c, from).items.length === 0) return
      const merged = { items: [...stashOf(c, to).items, ...stashOf(c, from).items] }
      update(id, x => {
        const stashes = withStash(x, to, merged)
        delete stashes[from]
        return { ...x, stashes }
      })
    },

    setCarryLimit(id, limit) {
      const character = find(id)
      if (!character) return
      const withLimit = mapChar(get().characters, id, c => ({ ...c, carryLimit: limit ?? undefined }))
      const c = withLimit.find(x => x.id === id)!
      const { onHand, stashes, moved } = enforceCarryLimit(c, newId)
      commit(moved > 0 ? mapChar(withLimit, id, x => ({ ...x, onHand, stashes })) : withLimit)
      log('character-move', limit
        ? `📦 ${character.name} can carry up to ${limit} blocks for now. This ends once they're carrying fewer than ${BLOCK_CARRY_LIMIT}.`
        : `📦 ${character.name}'s carry limit is back to ${BLOCK_CARRY_LIMIT} blocks.`)
      if (moved > 0) log('character-move', `📦 ${moved} of ${character.name}'s blocks ${dropKey(c) === 'unplaced' ? 'were left behind' : 'went into storage here'}.`)
    },

    leaveBlocks(id, key, amount) {
      const c = find(id)
      if (!c) return 0
      const { from, to, moved } = moveBlocks(c.onHand, stashOf(c, key), amount, newId)
      if (moved > 0) updateCarried(id, x => ({ ...x, onHand: from, stashes: withStash(x, key, to) }))
      return moved
    },

    pickUpBlocks(id, key, amount) {
      const c = find(id)
      if (!c) return 0
      const { from, to, moved } = moveBlocks(stashOf(c, key), c.onHand, Math.min(amount, carryRoom(c)), newId)
      if (moved > 0) updateCarried(id, x => ({ ...x, onHand: to, stashes: withStash(x, key, from) }))
      return moved
    },

    giveItemToCharacter(fromId, itemId, fromSection, toId) {
      const fromChar = find(fromId)
      const toChar = find(toId)
      if (!fromChar || !toChar) return
      const item = sectionOf(fromChar, fromSection).items.find(i => i.id === itemId)
      if (!item) return
      let characters = get().characters
      characters = settleCarry(characters, mapChar(characters, fromId, c => ({
        ...c, ...setSection(c, fromSection, { items: sectionOf(c, fromSection).items.filter(i => i.id !== itemId) }),
      })), fromId)
      characters = settleCarry(characters, mapChar(characters, toId, c => ({
        ...c, onHand: { items: [...c.onHand.items, { ...item, id: newId() }] },
      })), toId)
      commit(characters)
      log('item-transfer', `🎁 ${fromChar.name} gave ${item.name || 'an item'} to ${toChar.name}.`)
    },

    setCurrency: (id, patch) => update(id, c => ({ ...c, currency: { ...c.currency, ...patch } })),
    setRations: (id, count) => update(id, c => ({ ...c, rations: count })),
  }
}
