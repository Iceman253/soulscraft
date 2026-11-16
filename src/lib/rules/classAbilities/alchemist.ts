import type { ClassAbility } from './types'

/** Alchemist abilities from the Alchemist class page. */
export const ALCHEMIST_ABILITIES: ClassAbility[] = [
  // Level 1
  {
    name: 'Elixir',
    sdCost: 1,
    description: 'Spend 1 SD to combine up to three potions into a single elixir. All effects occur simultaneously when consumed. The elixir\'s duration matches the longest-lasting potion used in the mix.',
    tier: 'level1',
    combatRole: 'utility',
  },
  {
    name: 'Analyze Substance',
    sdCost: 1,
    description: 'Spend 1 SD to study a substance or object. You learn what Essences it contains (if any), and whether it has been altered by magic or poison.',
    tier: 'level1',
    combatRole: 'utility',
  },
  {
    name: 'Alchemical Bolt',
    sdCost: 1,
    description: 'Spend 1 SD to activate the Essences of a potion you designed in your hand. The reaction releases instantly as a ranged effect at a single target within Far range. The result matches the potion\'s usual effect but lasts only 1 round.',
    tier: 'level1',
    combatRole: 'attack',
  },
  // Level Up
  {
    name: 'Liminalis Gate',
    sdCost: 1,
    description: 'You can create a means of travel between two points in the same dimension. Anchor Circle: Once per rest, spend 1 SD to form a circle of 3 Essences of Element as an anchor circle on the ground. Only one may exist at a time. Creating a new one renders the previous inert. Portal Circle: Once per rest, spend 1 SD to form a circle of 3 Essences of Element to link instantly to the anchor circle. Once ignited with fire, the portal opens and remains open for one round, then collapses into ash. All creatures who pass through the portal before it collapses are teleported to the anchor circle instantly. If the anchor circle is obstructed, the creatures are teleported to an unoccupied space close to the anchor circle.',
    tier: 'levelUp',
    combatRole: 'utility',
  },
  {
    name: 'Scry',
    sdCost: 1,
    description: 'Spend 1 SD and 2 Essences of Sense. Spread the Essence over a mirror and gaze into its surface. You can see and hear a known creature for one scene. If the target creature is in the same dimension as you, the mirror faintly pulls toward their location, even across great distances. The effect lasts for one day.',
    tier: 'levelUp',
    combatRole: 'utility',
  },
  {
    name: 'Solar Lens',
    sdCost: 1,
    description: 'Coat a glass, crystal, or metal sphere with 1 Essence of Element and 1 Essence of Vitality and leave it in sunlight for an hour to charge it with solar energy. The charge is permanent until the sphere is destroyed. You can spend 1 SD to release a blinding beam from the sphere at a target within Far range. Roll to succeed. 10+ The target is Blinded for one scene. If Undead, it also ignites on fire for one round. 7–9 The target is Blinded for one round. 2–6 You or an ally is struck and Blinded for one round.',
    tier: 'levelUp',
    combatRole: 'attack',
    requiresRoll: true,
    appliedEffects: [{ effectName: 'Blindness', target: 'target', durationType: 'scenes', remaining: 1, onSuccess: true }],
  },
  {
    name: 'Homunculus Agent',
    sdCost: 1,
    description: 'Spend 1 SD, 1 Essence of Vitality, and 1 Essence of Transformation. Shape clay or scrap metal into a Small humanoid figure that awakens for one day. The Homunculus Agent has your HP but no DEF, and follows simple commands. It can carry and manipulate small objects. You may see and hear through its senses at will. It can repeat phrases or messages you tell it. After a day, it crumbles.',
    tier: 'levelUp',
    combatRole: 'utility',
  },
  {
    name: 'Elemental Mastery',
    sdCost: 1,
    description: 'Spend 1 SD and 1 Essence of Element to compel an Elemental creature you can see to follow one simple command for a scene. Roll to succeed: 10+ The Elemental obeys without resistance and acts to fulfill your command. 7–9 The Elemental obeys, but only briefly or imperfectly. It may twist your command or stop if harmed. 2–6 The Elemental resists and turns hostile toward you.',
    tier: 'levelUp',
    combatRoles: ['attack'],
    requiresRoll: true,
  },
  {
    name: 'Arcane Traces',
    sdCost: 1,
    description: 'Spend 1 SD and 1 Essence of Sense. Scatter the Essence into the air; it reacts visibly to lingering magic. You learn what kind of magical forces are active in the area and their relative strength, but not their exact effects.',
    tier: 'levelUp',
    combatRole: 'utility',
  },
  {
    name: 'Seal of Karakat',
    sdCost: 1,
    description: 'Spend 1 SD, 1 Essence of Element, and 1 Essence of Decay to inscribe a circular barrier upon the ground. For one scene, the area inside becomes an anti-magic field: magical effects and enchanted items are suppressed, and Magical creatures within gain Fatigue. Breaking the circle ends the seal.',
    tier: 'levelUp',
    combatRoles: ['attack', 'defense'],
  },
  {
    name: 'Artegried\'s Abjuration',
    sdCost: 1,
    description: 'Spend 1 SD, and draw a line or circle of 1 Essence of Decay, 1 Essence of Transformation, and 1 Essence of Element upon the ground. Undead, Aberration, and Elemental creatures cannot cross the line for a scene. The line holds until your next rest or the line is dissolved with salt water.',
    tier: 'levelUp',
    combatRoles: ['defense'],
  },
  {
    name: 'Alchemical Bread',
    sdCost: 1,
    description: 'Spend 1 SD and 1 Essence of Vitality to transmute a small amount of dirt into three palm-sized loaves of dense, nourishing bread. Each loaf grants 2 temporary HP when eaten and crumbles after one day if uneaten.',
    tier: 'levelUp',
    combatRole: 'utility',
  },
]
