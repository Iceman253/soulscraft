import { useMemo } from 'react'
import { useCharacterStore } from './store'
import { useWorldStore } from '../map/store'
import { ENDER, UNPLACED, dropKey, enderReachable, placeExists, placesAround, type Section, type StoreKey } from '../../lib/stashes'
import type { Character } from '../../types'

export interface StorageReach {
  /** Storage at the places around the character, nearest first. */
  local: StoreKey[]
  /** Where things they put down go: their exact place, or UNPLACED. */
  drop: StoreKey
  /** Someone they're with is carrying an Ender Chest. */
  ender: boolean
  /** Everything they can take from right now, on hand last. */
  sections: Section[]
  /** Stores they have that nobody can walk to: a place that's gone, or UNPLACED.
   *  They can collect from these anywhere, so nothing is lost to a map edit. */
  orphaned: StoreKey[]
  /** The rest of their storage, which they'd have to go back for. */
  elsewhere: StoreKey[]
}

/** What a character can get at from where they are (see lib/stashes). */
export function useStorageReach(c: Character | undefined): StorageReach {
  const characters = useCharacterStore(s => s.characters)
  const areas = useWorldStore(s => s.areas)
  return useMemo(() => {
    if (!c) return { local: [], drop: UNPLACED, ender: false, sections: ['onHand'], orphaned: [], elsewhere: [] }
    const local = placesAround(c, areas)
    const ender = enderReachable(c, characters)
    const keys = Object.keys(c.stashes ?? {}).filter(k => k !== ENDER && !local.includes(k))
    const orphaned = keys.filter(k => k === UNPLACED || !placeExists(k, areas))
    return {
      local,
      drop: dropKey(c),
      ender,
      sections: [...local, ...(ender ? [ENDER] : []), 'onHand'],
      orphaned,
      elsewhere: keys.filter(k => !orphaned.includes(k)),
    }
  }, [c, characters, areas])
}
