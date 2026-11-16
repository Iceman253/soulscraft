/**
 * Enchanter Sign data from Soulscraft 3.1e Guidebook, pp. 47–49.
 *
 * Enchanters do NOT use a fixed enchantment list. They combine Signs to design
 * custom enchantments and curses, recorded in their personal Tome.
 */

export interface EnchanterSign {
  name: string
  description: string
  advanced?: boolean   // requires a Special Ability to unlock
  notes?: string
}

export const ENCHANTER_SIGNS_DATA: EnchanterSign[] = [
  {
    name: 'Sign of Creature',
    description: 'Affects or interacts with beings or entities.',
  },
  {
    name: 'Sign of Harm',
    description: 'Deals damage or inflicts negative effects.',
  },
  {
    name: 'Sign of Defense',
    description: 'Prevents harm or provides protection.',
  },
  {
    name: 'Sign of Element',
    description: 'Channels elemental forces — Fire, Ice, Lightning, Wind, Stone, and more.',
  },
  {
    name: 'Sign of Movement',
    description: 'Controls motion — push, pull, blink, anchor, or lift.',
  },
  {
    name: 'Sign of Binding',
    description: 'Makes the effect persist on its target until removed magically (e.g. by a Potion of Restoration). Activating through a Rune or Incantation costs 2 SD instead of 1.',
    advanced: true,
    notes: 'Requires the Sign of Binding Special Ability.',
  },
  {
    name: 'Sign of Mind',
    description: 'Allows the effect to influence or alter the mind of a creature it targets. Activating through a Rune or Incantation costs 2 SD instead of 1.',
    advanced: true,
    notes: 'Requires the Sign of Mind Special Ability.',
  },
]
