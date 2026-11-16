import type { ClassAbility } from './types'

/** Tecton abilities from the Tecton class page. */
export const TECTON_ABILITIES: ClassAbility[] = [
  // Level 1
  {
    name: 'Geometer\'s Sight',
    sdCost: 1,
    description: 'Spend 1 SD to study a structure or terrain. For the rest of the scene, you and your allies gain 1d4 to rolls for navigating that structure or terrain.',
    tier: 'level1',
    combatRole: 'utility',
  },
  {
    name: 'Seal of the Mind',
    sdCost: 1,
    description: 'Spend 1 SD to memorize any object. You can reproduce it flawlessly from memory later as long as you have the proper materials, although you cannot replicate any magical properties the original possessed.',
    tier: 'level1',
    combatRole: 'utility',
  },
  {
    name: 'The Returning Principle',
    sdCost: 1,
    description: 'When a creature within Reach strikes you, you may spend 1 SD to half the incoming damage and deal 1 damage back to the attacking creature.',
    tier: 'level1',
    combatRole: 'defense',
  },
  // Level Up
  {
    name: 'Unfolding Pattern',
    sdCost: 1,
    description: 'Spend 1 SD to predict the actions of everything you can currently see for the next few moments. Roll to succeed. 10+ The GM summarizes the exact actions of everything you can see for the next few moments, and you can react to change the events. 7-9 The GM provides a general idea of what is about to happen. 2-6 You don\'t know what is going to happen.',
    tier: 'levelUp',
    combatRoles: ['general'],
    requiresRoll: true,
  },
  {
    name: 'Doctrine of the Body',
    sdCost: 1,
    description: 'When studying a creature, spend 1 SD to learn its DEF, current HP, Tags, and damage die.',
    tier: 'levelUp',
    combatRoles: ['utility'],
  },
  {
    name: 'Counterpoise',
    sdCost: 1,
    description: 'Spend 1 SD to observe the flow of combat and adjust to the rhythm of each attack. For the rest of the scene, if attacked by a creature whose damage die is larger than yours, you temporarily gain its damage die.',
    tier: 'levelUp',
    combatRoles: ['attack', 'defense'],
  },
  {
    name: 'Discipline of the Body',
    sdCost: 1,
    description: 'Spend 1 SD to align your body and mind. For the next round, you become immune to all negative Status Effects. Any unwanted Status Effect currently afflicting you is removed.',
    tier: 'levelUp',
    combatRole: 'defense',
  },
  {
    name: 'Discordance',
    sdCost: 1,
    description: 'Spend 1 SD to use strikes or pressure points to disrupt a magical effect on an object or creature within Close range for the rest of the scene. This includes magically inflicted Status Effects, enchantments, and curses. Roll to succeed. 10+ The effect collapses harmlessly. 7–9 The effect is disrupted for one round. 2–6 You misjudge the effect\'s strength and take 1d4 damage from backlash. The effect persists.',
    tier: 'levelUp',
    combatRoles: ['attack', 'defense'],
    requiresRoll: true,
  },
  {
    name: 'Illumination',
    sdCost: 1,
    description: 'Spend 1 SD to align focus with another creature within Nearby range, sharing a unified clarity of thought and purpose. Skill Bonuses are doubled for you and this creature until the end of the scene.',
    tier: 'levelUp',
    combatRoles: ['attack', 'defense'],
  },
  {
    name: 'Fulcrum Strike',
    sdCost: 1,
    description: 'Spend 1 SD to meditate on the laws of force and motion. For the rest of the scene, your attacks ignore DEF.',
    tier: 'levelUp',
    combatRole: 'attack',
  },
  {
    name: 'Enlightenment',
    sdCost: 1,
    description: 'Once per rest, you may spend 1 SD to roll twice on any action roll and take the higher result.',
    tier: 'levelUp',
    combatRoles: ['attack', 'defense', 'general'],
  },
  {
    name: 'Work of Wonder',
    sdCost: 2,
    description: 'Once per rest, you may spend 2 SD to spend the scene creating a Work of Wonder. Using materials you possess, craft, build, or fabricate something that instills awe. This can be a work of art, an article of clothing, an intricate mechanism, or any other thing that captures your skill and knowledge. Friendly or neutral sentient creatures who see this creation become inspired by you, and you gain +3 to action rolls concerned with persuading, deceiving, or befriending them.',
    tier: 'levelUp',
    combatRole: 'utility',
  },
]
