import type { ClassAbility } from './types'

/** Hunter abilities from the Hunter class page. */
export const HUNTER_ABILITIES: ClassAbility[] = [
  // Level 1
  {
    name: 'Perceive Mind',
    sdCost: 1,
    description: 'Spend 1 SD to read a creature\'s body language, gaining insight into its mental state, intentions, or to understand if it is being deceptive or truthful. Roll to succeed. 10+ For the scene, you gain clear insight concerning the creature. 7-9 For the scene, you have vague insight concerning the creature. 2-6 You have no insight concerning the creature.',
    tier: 'level1',
    combatRole: 'utility',
    requiresRoll: true,
  },
  {
    name: 'Ambush',
    sdCost: 1,
    description: 'If you make a successful attack while unseen or hidden from your target, you can spend 1 SD to ignore the target\'s DEF.',
    tier: 'level1',
    combatRole: 'attack',
  },
  {
    name: 'Predator',
    sdCost: 1,
    description: 'Spend 1 SD to mark a single creature you can see. Until your next rest, you gain +1 damage against it, and you can always detect its trail.',
    tier: 'level1',
    combatRole: 'attack',
  },
  // Level Up
  {
    name: 'Uncanny Focus',
    sdCost: 1,
    description: 'Spend 1 SD to sharpen one of your physical senses to an almost superhuman level: sight, hearing, touch, smell, or taste. For the rest of the scene, when you focus on that sense, you can perceive information that would be imperceivable by most (for example: reading lips across a room, understanding conversations through a wall, detecting the smell of poison in a drink).',
    tier: 'levelUp',
    combatRole: 'utility',
  },
  {
    name: 'Threat Assessment',
    sdCost: 1,
    description: 'Spend 1 SD to detect any non-magical danger in your area. These can be natural hazards, traps, or dangerous creatures. Roll to succeed. 10+ You are aware of all non-magical dangers in your area and how to avoid them for the rest of the scene. 7-9 For the rest of the scene, you become aware of some non-magical dangers, but not all, or are unaware of how to avoid them. 2-6 You remain unaware of the dangers in your area.',
    tier: 'levelUp',
    combatRole: 'utility',
    requiresRoll: true,
  },
  {
    name: 'Quick Reflexes',
    sdCost: 1,
    description: 'Spend 1 SD to react with inhuman speed, such as dodging a trap, evading an attack, or catching a falling object.',
    tier: 'levelUp',
    combatRole: 'defense',
  },
  {
    name: 'Wisdom of the Prey',
    sdCost: 1,
    description: 'Spend 1 SD to become instantly aware if any creature is trying to hide from, sneak, or track you, and know whether it\'s intelligent or animal. You do not know where the creature is.',
    tier: 'levelUp',
    combatRole: 'utility',
  },
  {
    name: 'No Escape',
    sdCost: 1,
    description: 'When a creature attempts to flee from you, you may spend 1 SD to quickly catch up to them. Roll to succeed. 10+ You catch up to the creature with no issue. 7-9 You catch up to the creature, but there is an unexpected complication. 2-6 The creature evades you.',
    tier: 'levelUp',
    combatRoles: ['attack'],
    requiresRoll: true,
  },
  {
    name: 'Sense the Unnatural',
    sdCost: 1,
    description: 'Spend 1 SD to attune your senses to detect Magical, Undead, Aberrant, Elemental, or Construct creatures within Far range. You know the category and general direction of each, even through barriers, but not precise details.',
    tier: 'levelUp',
    combatRole: 'utility',
  },
  {
    name: 'Pathfinder',
    sdCost: 1,
    description: 'Spend 1 SD to find a way through a single, localized terrain obstacle that would normally be impassable without risk, such as a cliff, ravine, or sheer wall. This ability cannot be used to traverse large regions or extended hazards. Creatures guided by you must also spend 1 SD to follow.',
    tier: 'levelUp',
    combatRole: 'utility',
  },
  {
    name: 'Camouflage',
    sdCost: 1,
    description: 'You can spend 1 SD to blend into your surroundings for a scene, unless you attack, move, or speak.',
    tier: 'levelUp',
    combatRole: 'utility',
  },
  {
    name: 'Hunter\'s Mask',
    sdCost: 1,
    description: 'When attempting to appear as another humanoid creature, spend 1 SD to create a perfect disguise, including mannerisms and voice. This lasts until your next rest.',
    tier: 'levelUp',
    combatRole: 'utility',
  },
]
