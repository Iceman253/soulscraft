import { useState } from 'react'
import type { CharacterItem } from '../../../types'
import { potionRecipeFor } from '../../../lib/rules/potions'
import { drinkPotion, drinkOngoingPotion } from '../../characters/drinkPotion'

/** Potion drinking on a player sheet. `pending` holds an ongoing potion while the
 *  player picks its duration; `notify` hears each result for a toast. */
export function usePotionUse(notify: (message: string) => void) {
  const [pending, setPending] = useState<{ charId: string; item: CharacterItem } | null>(null)

  return {
    isPotion: (item: CharacterItem) => !!potionRecipeFor(item),
    pending,
    use(charId: string, item: CharacterItem) {
      const result = drinkPotion(charId, item)
      if (result.kind === 'choose-duration') setPending({ charId, item })
      if (result.kind === 'done') notify(result.message)
    },
    applyPending(scenes: number) {
      if (!pending) return
      setPending(null)
      const message = drinkOngoingPotion(pending.charId, pending.item, scenes)
      if (message) notify(message)
    },
    cancel: () => setPending(null),
  }
}
