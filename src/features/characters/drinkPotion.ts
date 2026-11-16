import type { CharacterItem } from '../../types'
import { potionRecipeFor, ongoingPotionEffect, type PotionRecipe } from '../../lib/rules/potions'
import { rollDiceSpec } from '../../lib/rules/dice'
import { useCharacterStore } from './store'

export type DrinkResult =
  | { kind: 'done'; message: string }
  /** An ongoing potion: ask how much Redstone Dust (1–3 scenes), then call drinkOngoingPotion. */
  | { kind: 'choose-duration' }
  | { kind: 'not-a-potion' }

function consumeOne(charId: string, item: CharacterItem) {
  const store = useCharacterStore.getState()
  if (item.quantity > 1) store.updateOnHandItem(charId, item.id, { quantity: item.quantity - 1 })
  else store.removeOnHandItem(charId, item.id)
}

function instantResult(charId: string, recipe: PotionRecipe): string {
  const store = useCharacterStore.getState()
  switch (recipe.name) {
    case 'Potion of Healing': {
      const roll = rollDiceSpec('2d6')
      store.adjustHp(charId, roll)
      return `🧪 ${recipe.name}: healed ${roll} HP (2d6)`
    }
    case 'Potion of Harming': {
      const roll = rollDiceSpec('1d12')
      store.adjustHp(charId, -roll)
      return `💀 ${recipe.name}: took ${roll} damage (1d12)`
    }
    case 'Potion of Restoration': {
      const char = store.characters.find(c => c.id === charId)
      char?.activeEffects.forEach(e => store.removeEffect(charId, e.id))
      return `✨ ${recipe.name}: all effects cleared`
    }
    default:
      return `🧪 Used ${recipe.name}`
  }
}

/** A character drinks one potion from their pack (Guidebook pp. 92–94). Instant
 *  potions are used up and resolve now; ongoing ones wait for a duration. */
export function drinkPotion(charId: string, item: CharacterItem): DrinkResult {
  const recipe = potionRecipeFor(item)
  if (!recipe) return { kind: 'not-a-potion' }
  if (!recipe.instant) return { kind: 'choose-duration' }
  consumeOne(charId, item)
  return { kind: 'done', message: instantResult(charId, recipe) }
}

/** Finish an ongoing potion: use it up and apply its effect for `scenes` scenes.
 *  Returns the message to show, or null if the item isn't a potion. */
export function drinkOngoingPotion(charId: string, item: CharacterItem, scenes: number): string | null {
  const recipe = potionRecipeFor(item)
  if (!recipe) return null
  consumeOne(charId, item)
  useCharacterStore.getState().addEffect(charId, ongoingPotionEffect(recipe, scenes))
  return `🧪 ${recipe.name}: active for ${scenes} scene${scenes !== 1 ? 's' : ''}`
}
