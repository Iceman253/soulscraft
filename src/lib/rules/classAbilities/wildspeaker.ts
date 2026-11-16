import type { ClassAbility } from './types'

/** Wildspeaker abilities from the Wildspeaker class page. */
export const WILDSPEAKER_ABILITIES: ClassAbility[] = [
  // Level 1
  {
    name: 'Change Tether',
    sdCost: 1,
    description: 'Spend 1 SD to change an active Tether from one Primal Force to another.',
    tier: 'level1',
    combatRole: 'utility',
  },
  {
    name: 'Invoke Force',
    sdCost: 1,
    description: 'Spend 1 SD to make a simple request of a Tethered Force to affect a target or local area you can see - except for requests that directly harm a creature (doing so fails and breaks your Tether). Roll to succeed. 10+ Your request is granted. 7-9 Your request is granted, but in an indirect way with unintended consequences. 2-6 Your request is misunderstood, and something else happens instead.',
    tier: 'level1',
    combatRoles: ['general'],
    requiresRoll: true,
  },
  {
    name: 'Extend Tether',
    sdCost: 1,
    description: 'You can spend 1 SD to extend one of your active Tethers to a willing creature you can see. Their Tether lasts as long as yours is active. You can extend a Tether to one creature at a time. They cannot make a request of the Tethered Force, but the bonuses you gained from the Tether apply to them as well.',
    tier: 'level1',
    combatRole: 'utility',
  },
  // Level Up
  {
    name: 'Earthsight',
    sdCost: 1,
    description: 'While Tethered to Earth, you can spend 1 SD to sense the movement of creatures within Nearby range, even if they are invisible or obscured, through vibrations in the ground. Any creatures you have extended this Tether to can also spend 1 SD to use this ability. This lasts for one scene.',
    tier: 'levelUp',
    combatRole: 'utility',
  },
  {
    name: 'Deep Breather',
    sdCost: 1,
    description: 'While Tethered to Water, you can spend 1 SD to gain the Water Breathing effect for as long as you are submerged, up to the next rest. Any creatures you have extended this Tether to can also spend 1 SD to use this ability.',
    tier: 'levelUp',
    combatRole: 'utility',
    appliedEffects: [{ effectName: 'Water Breathing', target: 'self', durationType: 'until-rest' }],
  },
  {
    name: 'Frostblood',
    sdCost: 1,
    description: 'While Tethered to Ice, you can spend 1 SD to be immune to cold damage and move across icy terrain without penalty. Any creatures you have extended this Tether to can also spend 1 SD to use this ability. This lasts for one scene.',
    tier: 'levelUp',
    combatRole: 'defense',
  },
  {
    name: 'Embermarked',
    sdCost: 1,
    description: 'While Tethered to Fire, you can spend 1 SD and be immune to burning damage, and you radiate with heat. Any creatures you have extended this Tether to can also spend 1 SD to use this ability. This lasts for one scene.',
    tier: 'levelUp',
    combatRole: 'defense',
  },
  {
    name: 'Wind Guardian',
    sdCost: 1,
    description: 'While Tethered to Air, you can spend 1 SD to be shielded from all non-magic ranged attacks. Any creatures you have extended this Tether to can also spend 1 SD to use this ability. This lasts for one scene.',
    tier: 'levelUp',
    combatRole: 'defense',
  },
  {
    name: 'Regrowth',
    sdCost: 1,
    description: 'While Tethered to Plant-life, you can spend 1 SD to restore the most recent HP loss suffered by you and any creatures you have extended this Tether to.',
    tier: 'levelUp',
    combatRole: 'defense',
  },
  {
    name: 'Beast-Tongue',
    sdCost: 1,
    description: 'Spend 1 SD to speak with animals (non-sentient Natural creatures) fluently for one scene. Most will treat you as a trusted ally unless given reason not to. Roll to succeed. 10+ Your communication with the animal accomplishes what you wanted. 7-9 The animal understands you and is friendly, but doesn\'t seem interested. 2-6 The animal does not understand you and is frightened or becomes hostile.',
    tier: 'levelUp',
    combatRole: 'utility',
    requiresRoll: true,
  },
  {
    name: 'Wild Empath',
    sdCost: 1,
    description: 'You may spend 1 SD to calm an animal, redirect it, or cause it to adopt you or an ally as part of its group. This works even in moments of fear or aggression. Roll to succeed. 10+ The animal responds favorably to your actions. 7-9 The animal is unbothered by you, but is not interested in being friendly. 2-6 Your actions anger or frighten the animal.',
    tier: 'levelUp',
    combatRole: 'utility',
    requiresRoll: true,
  },
  {
    name: 'Beast Link',
    sdCost: 1,
    description: 'Spend 1 SD to bond with an animal you can see. You can give it simple commands and, at will, sense what it sees, hears, or smells. While sensing, you\'re unaware of your own surroundings. The bond ends after one scene or when the animal is no longer willing.',
    tier: 'levelUp',
    combatRole: 'utility',
  },
]
