import type { ClassAbility } from './types'

/** Enchanter abilities from the Enchanter class page. */
export const ENCHANTER_ABILITIES: ClassAbility[] = [
  // Level 1
  {
    name: 'Runemaster',
    sdCost: 1,
    description: 'You can etch magical Runes onto objects using Lapis Lazuli. Each Rune uses 1 Lapis Lazuli. You can then activate the Runes to temporarily apply enchantments or curses from your Tome to those objects if you can see them, but only one enchantment or curse can be applied to a Rune at a time. Activating a Rune costs 1 SD. Runes remain active for the duration of a scene or until deactivated.',
    tier: 'level1',
    combatRole: 'utility',
  },
  {
    name: 'Magic Circle',
    sdCost: 3,
    description: 'You can spend 3 SD and use 5 Lapis Lazuli to etch an enchantment or curse you know in a circle on the ground that can fit up to five Medium creatures inside. Smaller circles can be etched as well. The circle lasts for a day, and the area within is affected by the enchantment or curse.',
    tier: 'level1',
    combatRole: 'utility',
  },
  {
    name: 'Reveal Enchantments',
    sdCost: 1,
    description: 'You can spend 1 SD to detect and identify any active enchantments or curses within Nearby range, even if they\'re hidden.',
    tier: 'level1',
    combatRole: 'utility',
  },
  // Level Up
  {
    name: 'Runic Chain',
    sdCost: 1,
    description: 'When you activate a Rune, you may spend 1 additional SD to have the enchantment or curse affect an additional item within Nearby range of the first, even if that item has no Rune.',
    tier: 'levelUp',
    combatRole: 'utility',
  },
  {
    name: 'Magical Bomb',
    sdCost: 2,
    description: 'When activating a Rune, spend 2 SD instead of 1 to overcharge it, causing an explosion that damages nearby creatures except the item holder. This can be done as part of the item holder\'s attack, adding your damage die to the damage. Roll to determine if the item is damaged: 10+ The item suffers no damage. 7-9 The item needs repair, but remains mostly functional. 2-6 The item is no longer functional and needs extensive repair.',
    tier: 'levelUp',
    combatRole: 'attack',
    requiresRoll: true,
  },
  {
    name: 'Runeskin',
    sdCost: 2,
    description: 'You may spend 2 SD to tattoo a Rune permanently onto your skin. When this Rune is activated, you take 1d4 damage.',
    tier: 'levelUp',
    combatRole: 'utility',
  },
  {
    name: 'Disenchant',
    sdCost: 1,
    description: 'Spend 1 SD to attempt to deactivate an enchantment or curse you are aware of. Roll to succeed: 10+ You succeed. 7-9 The targeted enchantment or curse is weakened, but remains. 2-6 Your attempt fails and the targeted enchantment or curse flares with a burst of extra potency for one scene.',
    tier: 'levelUp',
    combatRoles: ['attack', 'defense'],
    requiresRoll: true,
  },
  {
    name: 'Triggered Rune',
    sdCost: 1,
    description: 'When inscribing a Rune, you may spend 1 additional SD to bind it to a specific trigger condition. The Rune activates automatically when the condition is met with an enchantment or curse from your Tome. You must describe the trigger clearly when the Rune is inscribed. Once set, the trigger condition cannot be changed.',
    tier: 'levelUp',
    combatRole: 'utility',
  },
  {
    name: 'Incantation',
    sdCost: 1,
    description: 'Spend 1 SD to recite an enchantment or curse from your Tome, targeting yourself or a creature or object you can see. The effect is instantaneous and fades immediately.',
    tier: 'levelUp',
    combatRoles: ['attack', 'defense'],
  },
  {
    name: 'Runethief',
    sdCost: 1,
    description: 'If you can see a Rune you did not etch, you may spend 1 SD to try to gain control over it. Roll to succeed. 10+ The Rune becomes yours to control. 7-9 You gain a little control over the Rune, but it lasts for a few minutes. 2-6 You fail to control the Rune.',
    tier: 'levelUp',
    combatRoles: ['utility'],
    requiresRoll: true,
  },
  {
    name: 'Sign of Binding',
    sdCost: 2,
    description: 'When creating an enchantment or curse in your Tome, you may add the Sign of Binding. This sign allows the effect to persist on its target until it is removed magically (for example, by a Potion of Restoration or another enchantment). If an enchantment or curse containing the Sign of Binding is activated through a Rune or through Incantation, it costs 2 SD instead of 1.',
    tier: 'levelUp',
    combatRole: 'utility',
  },
  {
    name: 'Sign of Mind',
    sdCost: 2,
    description: 'When creating an enchantment or curse in your Tome, you may add the Sign of Mind. This sign allows the effect to influence or alter the mind of a creature it targets. If an enchantment or curse containing the Sign of Mind is activated through a Rune or through Incantation, it costs 2 SD instead of 1.',
    tier: 'levelUp',
    combatRole: 'utility',
  },
]
