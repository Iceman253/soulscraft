/**
 * Barrel re-export — all game constants.
 *
 * Edit domain files directly for focused changes:
 *   lib/classes.ts    — species, classes, abilities, disciplines
 *   lib/world.ts      — area types, realms, bestiary tiers
 *   lib/potions.ts    — potion recipes
 *   lib/enchanting.ts — enchanter signs
 *   lib/currency.ts   — currency options and images
 */

export * from './classes'
export * from './world'
export * from './potions'
export * from './enchanting'

// Misc constants that don't warrant their own file
export const CURRENCIES = ['copper', 'iron', 'gold', 'emerald', 'diamond'] as const
export const CURRENCY_CONVERSION = '1 Diamond = 10 Emerald = 100 Gold = 1,000 Iron = 10,000 Copper'
export const GEAR_DURATION_TYPES = ['scenes', 'days', 'permanent', 'manual'] as const
