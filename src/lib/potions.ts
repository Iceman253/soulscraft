/**
 * Potion recipes from Soulscraft 3.1e Guidebook, pp. 92–94.
 *
 * Duration of ongoing effects is set by Redstone Dust added during brewing:
 *   1 measure = 1 scene | 2 measures = 2 scenes | 3 measures = 3 scenes (max)
 */

export interface PotionRecipe {
  name: string
  effect: string
  instant: boolean   // true = no duration; false = duration set by Redstone Dust
  ingredients: string[]
  notes?: string
}

export const POTION_RECIPES: PotionRecipe[] = [
  {
    name: 'Awkward Potion',
    effect: 'Has no effect if consumed. Acts as the base ingredient for all other potions.',
    instant: true,
    ingredients: ['Nether Wart', 'Water'],
  },
  {
    name: 'Bottle of Dragon\'s Breath',
    effect: 'Has no effect if consumed. Used to convert a finished potion into a lingering potion that releases a cloud of its effect when uncorked or broken.',
    instant: true,
    ingredients: ['Dragon\'s Breath', 'Water'],
    notes: 'Dragon\'s Breath is harvested from Dragon Flowers in the End dimension.',
  },
  {
    name: 'Potion of Healing',
    effect: 'Instantly restores 2d6 HP.',
    instant: true,
    ingredients: ['Awkward Potion', 'Glistering Melon Slice'],
  },
  {
    name: 'Potion of Regeneration',
    effect: 'Restores 1d6 HP after taking any amount of damage. Wounds begin to heal rapidly.',
    instant: false,
    ingredients: ['Awkward Potion', 'Ghast Tear'],
  },
  {
    name: 'Potion of Restoration',
    effect: 'Removes any active Status Effects.',
    instant: true,
    ingredients: ['Awkward Potion', 'Glowberries'],
  },
  {
    name: 'Potion of Fire Resistance',
    effect: 'Grants full protection from fire and lava damage.',
    instant: false,
    ingredients: ['Awkward Potion', 'Magma Cream'],
  },
  {
    name: 'Potion of Swiftness',
    effect: 'Increases movement speed significantly.',
    instant: false,
    ingredients: ['Awkward Potion', 'Sugar'],
  },
  {
    name: 'Potion of Strength',
    effect: 'The user\'s physical power is enhanced. They can break, push, or damage with more ease than normal.',
    instant: false,
    ingredients: ['Awkward Potion', 'Blaze Powder'],
  },
  {
    name: 'Potion of Night Vision',
    effect: 'Allows the user to see clearly in darkness.',
    instant: false,
    ingredients: ['Awkward Potion', 'Golden Carrot'],
  },
  {
    name: 'Potion of Water Breathing',
    effect: 'Enables the user to breathe underwater.',
    instant: false,
    ingredients: ['Awkward Potion', 'Pufferfish'],
  },
  {
    name: 'Potion of Invisibility',
    effect: 'Renders the user invisible to others.',
    instant: false,
    ingredients: ['Potion of Night Vision', 'Fermented Spider Eye'],
  },
  {
    name: 'Potion of Leaping',
    effect: 'When the user leaps, they can cover great distances or reach twice as high as they normally could.',
    instant: false,
    ingredients: ['Awkward Potion', 'Rabbit\'s Foot'],
  },
  {
    name: 'Potion of Slow Falling',
    effect: 'When the user falls, they drift down slowly, taking no harm from falling.',
    instant: false,
    ingredients: ['Awkward Potion', 'Phantom Membrane'],
  },
  {
    name: 'Potion of the Turtle Master',
    effect: 'Provides substantial physical resistance but significantly reduces movement speed.',
    instant: false,
    ingredients: ['Awkward Potion', 'Turtle Shell'],
  },
  {
    name: 'Potion of Luck',
    effect: 'The target can reroll any action and use the best roll.',
    instant: false,
    ingredients: ['Awkward Potion', 'Rabbit\'s Foot', 'Powdered Quartz'],
  },
  {
    name: 'Potion of Poison',
    effect: 'Inflicts 1d6 poison damage per round.',
    instant: false,
    ingredients: ['Awkward Potion', 'Spider Eye'],
  },
  {
    name: 'Potion of Weakness',
    effect: 'The target becomes weak and faint.',
    instant: false,
    ingredients: ['Water Bottle', 'Fermented Spider Eye'],
  },
  {
    name: 'Potion of Slowness',
    effect: 'The target moves slowly.',
    instant: false,
    ingredients: ['Potion of Swiftness or Potion of Leaping', 'Fermented Spider Eye'],
  },
  {
    name: 'Potion of Harming',
    effect: 'Instantly deals 1d12 damage.',
    instant: true,
    ingredients: ['Potion of Healing or Potion of Poison', 'Fermented Spider Eye'],
  },
  {
    name: 'Potion of Wither',
    effect: 'A necromantic curse affects the target and drains their vitality. While active, the target has 0 SD. SD are restored fully when the effect is removed.',
    instant: false,
    ingredients: ['Awkward Potion', 'Wither Rose'],
  },
]
