/** Where a character's things are kept (Guidebook p.7).
 *
 *  Storage is chests, and chests are fixed in place: each character has storage at
 *  the places they've left things, keyed by that area or sub-location's id. They can
 *  only get at the storage where they are (or in the place around it, like a town's
 *  storage from one of its streets).
 *
 *  The Ender Chest is separate: each character has their own, holding only what was
 *  deliberately put in it. It can be opened from anywhere, but only while someone
 *  they're with is carrying an Ender Chest. */
import type { Area, Character, CharacterItem, InventorySection, SubNode } from '../types'
import { addBlocks } from './building'
import { findSubPath, levelLabel } from './places'

/** Key for a character's own Ender Chest contents. */
export const ENDER = 'ender'
/** Key for things that ended up nowhere in particular: overflow while travelling,
 *  or old storage from before chests had a place. It can be collected from anywhere,
 *  and the GM can say where it really is. */
export const UNPLACED = 'unplaced'

/** A place id, ENDER or UNPLACED. */
export type StoreKey = string
/** Anywhere an item can be: on hand, or one of the stores. */
export type Section = 'onHand' | StoreKey

const EMPTY: InventorySection = { items: [] }

/** The exact place a character is standing: their sub-location, else their area. */
export function placeOf(c: Pick<Character, 'locationId' | 'subLocationId'>): string | null {
  return c.subLocationId ?? c.locationId ?? null
}

/** Where things a character puts down (or can't carry) end up. */
export function dropKey(c: Pick<Character, 'locationId' | 'subLocationId'>): StoreKey {
  return placeOf(c) ?? UNPLACED
}

const subPath = (nodes: SubNode[] | undefined, id: string) => findSubPath(nodes ?? [], id)

/** The places around a character, nearest first: their sub-location, the ones it
 *  sits inside, then the area. Their storage in any of these is within reach. */
export function placesAround(c: Pick<Character, 'locationId' | 'subLocationId'>, areas: Pick<Area, 'id' | 'subNodes'>[]): string[] {
  if (!c.locationId) return []
  const area = areas.find(a => a.id === c.locationId)
  const path = c.subLocationId && area ? subPath(area.subNodes, c.subLocationId) ?? [c.subLocationId] : []
  return [...path.reverse(), c.locationId]
}

export function stashOf(c: Pick<Character, 'stashes'>, key: StoreKey): InventorySection {
  return c.stashes?.[key] ?? EMPTY
}

/** The character's stores with one replaced; an emptied store is dropped. */
export function withStash(c: Pick<Character, 'stashes'>, key: StoreKey, section: InventorySection): Record<string, InventorySection> {
  const stashes = { ...c.stashes, [key]: section }
  if (section.items.length === 0) delete stashes[key]
  return stashes
}

export function sectionOf(c: Pick<Character, 'onHand' | 'stashes'>, section: Section): InventorySection {
  return section === 'onHand' ? c.onHand : stashOf(c, section)
}

/** Patch that puts `items` into a section. */
export function setSection(c: Pick<Character, 'stashes'>, section: Section, items: InventorySection): Partial<Character> {
  return section === 'onHand' ? { onHand: items } : { stashes: withStash(c, section, items) }
}

const ENDER_CHEST = /\bender\s*chests?\b/i

/** Is this character carrying an Ender Chest? */
export function carriesEnderChest(c: Pick<Character, 'onHand'>): boolean {
  return c.onHand.items.some(i => ENDER_CHEST.test(`${i.customName ?? ''} ${i.name}`))
}

type PartyMember = Pick<Character, 'id' | 'onHand' | 'locationId' | 'subLocationId' | 'isDead'>

/** Who a character is with: living characters at the same place. Characters who
 *  aren't at any place (out on the world map) count as together. */
export function partyOf<C extends PartyMember>(c: C, characters: C[]): C[] {
  const here = placeOf(c)
  return characters.filter(x => x.id === c.id || (!x.isDead && placeOf(x) === here))
}

/** Can this character open their Ender Chest? Only if someone they're with (or
 *  they themselves) is carrying one. */
export function enderReachable<C extends PartyMember>(c: C, characters: C[]): boolean {
  return partyOf(c, characters).some(carriesEnderChest)
}

/** Every store a character can reach right now, nearest first: storage where they
 *  are and in the places around it, then their Ender Chest if one is with them. */
export function reachableStores<C extends PartyMember>(c: C, characters: C[], areas: Pick<Area, 'id' | 'subNodes'>[]): StoreKey[] {
  return [...placesAround(c, areas), ...(enderReachable(c, characters) ? [ENDER] : [])]
}

/** Move a whole item between sections. Returns the patch, or null if it isn't there. */
export function moveItem(c: Pick<Character, 'onHand' | 'stashes'>, itemId: string, from: Section, to: Section): Partial<Character> | null {
  if (from === to) return null
  const source = sectionOf(c, from)
  const item = source.items.find(i => i.id === itemId)
  if (!item) return null
  const withoutIt = { items: source.items.filter(i => i.id !== itemId) }
  const after = { ...c, ...setSection(c, from, withoutIt) }
  const target = sectionOf(after, to)
  return { ...setSection(c, from, withoutIt), ...setSection(after, to, { items: [...target.items, item] }) }
}

/** Take up to `amount` of the matching items from the given sections, in order.
 *  Stacks that run out are removed. Returns the patch and how many were taken. */
export function takeFrom(
  c: Pick<Character, 'onHand' | 'stashes'>,
  sections: Section[],
  amount: number,
  matches: (item: CharacterItem) => boolean,
): { patch: Partial<Character>; taken: number } {
  const wanted = Math.max(0, Math.floor(amount))
  let left = wanted
  let current: Pick<Character, 'onHand' | 'stashes'> = c
  let patch: Partial<Character> = {}
  for (const section of sections) {
    if (left === 0) break
    const items: CharacterItem[] = []
    let changed = false
    for (const item of sectionOf(current, section).items) {
      if (left > 0 && matches(item)) {
        const qty = item.quantity ?? 1
        const take = Math.min(qty, left)
        left -= take
        changed = true
        if (qty - take > 0) items.push({ ...item, quantity: qty - take })
      } else {
        items.push(item)
      }
    }
    if (!changed) continue
    const step = setSection(current, section, { items })
    current = { ...current, ...step }
    patch = { ...patch, ...step }
  }
  return { patch, taken: wanted - left }
}

/** How many of the matching items are in the given sections. */
export function countIn(c: Pick<Character, 'onHand' | 'stashes'>, sections: Section[], matches: (item: CharacterItem) => boolean): number {
  return sections.flatMap(s => sectionOf(c, s).items).filter(matches).reduce((n, i) => n + (i.quantity ?? 1), 0)
}

/** Add blocks to a store, stacking by name. */
export function addBlocksTo(c: Pick<Character, 'stashes'>, key: StoreKey, name: string, quantity: number, newId: () => string): Record<string, InventorySection> {
  return withStash(c, key, addBlocks(stashOf(c, key), name, quantity, newId))
}

/** Bring a character saved before storage had a place up to date. Their old storage
 *  goes to where they are now (or UNPLACED if they're nowhere), and blocks left at
 *  mines become storage at those mines. Returns the same object if nothing changed. */
export function migrateStorage<C extends Character>(c: C): C {
  const legacy = c.storage?.items ?? []
  const mines = c.mineStashes ?? {}
  if (legacy.length === 0 && Object.keys(mines).length === 0 && !('storage' in c) && !('mineStashes' in c)) return c
  const stashes: Record<string, InventorySection> = { ...c.stashes }
  const merge = (key: string, items: CharacterItem[]) => {
    if (items.length) stashes[key] = { items: [...(stashes[key]?.items ?? []), ...items] }
  }
  for (const [key, section] of Object.entries(mines)) merge(key, section.items)
  merge(dropKey(c), legacy)
  const next = { ...c, stashes }
  delete next.storage
  delete next.mineStashes
  return next
}

/** Does a place id still exist on the map? */
export function placeExists(id: string, areas: Area[]): boolean {
  return areas.some(a => a.id === id || !!subPath(a.subNodes, id))
}

/** A store's name for people: "Ender Chest", "Oakvale › Mine", and so on. */
export function storeLabel(key: StoreKey, areas: Area[]): string {
  if (key === ENDER) return 'Ender Chest'
  if (key === UNPLACED) return 'Left behind, no place yet'
  const area = areas.find(a => a.id === key)
  if (area) return levelLabel({ areaId: area.id, path: [] }, areas)
  for (const a of areas) {
    const path = subPath(a.subNodes, key)
    if (path) return levelLabel({ areaId: a.id, path }, areas)
  }
  return 'A place that no longer exists'
}
