import type { ClassAbility } from './types'

/** Vindicator abilities from the Vindicator class page. */
export const VINDICATOR_ABILITIES: ClassAbility[] = [
  // Level 1
  {
    name: 'Cause',
    sdCost: 1,
    description: 'Spend 1 SD, binding yourself to your chosen Cause until your next rest (choose one): Protect the helpless; Serve the master; Conquer the enemy; Crush the unworthy; Uphold the order. When you attempt an action that clearly aligns with your Cause, you gain +1 to the roll.',
    tier: 'level1',
    combatRole: 'utility',
  },
  {
    name: 'Leadership',
    sdCost: 1,
    description: 'Spend 1 SD to grant +1 to you and your allies\' action rolls for a scene, as long as they can see you.',
    tier: 'level1',
    combatRoles: ['attack', 'defense'],
  },
  {
    name: 'Strengthen',
    sdCost: 1,
    description: 'Spend 1 SD to increase your and your allies\' maximum damage by 2. For each creature affected, this lasts until they make a successful attack or the next rest.',
    tier: 'level1',
    combatRole: 'attack',
  },
  // Level Up
  {
    name: 'Vindictive Presence',
    sdCost: 1,
    description: 'Spend 1 SD to intimidate enemies engaging you in combat. For the rest of the scene, as long as they can see you, they will try to move farther away from you. They may still make ranged attacks against you.',
    tier: 'levelUp',
    combatRoles: ['defense'],
  },
  {
    name: 'Stand Strong',
    sdCost: 1,
    description: 'Allies within sight gain +1 DEF as long as you are actively fighting. Costs 1 SD.',
    tier: 'levelUp',
    combatRole: 'defense',
  },
  {
    name: 'Inspiration',
    sdCost: 1,
    description: 'When you hit with an attack, you may spend 1 SD to inspire a nearby ally. That ally regains 1 spent SD.',
    tier: 'levelUp',
    combatRoles: ['attack'],
  },
  {
    name: 'Vengeful Smite',
    sdCost: 1,
    description: 'When you strike an enemy who has harmed an ally, you may spend 1 SD to deal double damage.',
    tier: 'levelUp',
    combatRole: 'attack',
  },
  {
    name: 'Incur the Wrath',
    sdCost: 1,
    description: 'When an ally drops to 0 HP as a result of an attack, you may spend 1 SD to immediately make a strike against the attacker, if they are within range. If it hits, deal maximum damage.',
    tier: 'levelUp',
    combatRole: 'attack',
  },
  {
    name: 'War Cry',
    sdCost: 1,
    description: 'During combat, spend 1 SD and let out a mighty shout. For the rest of the scene, allies who fight within Nearby range of you gain +1 to damage rolls and cannot be moved unwillingly.',
    tier: 'levelUp',
    combatRoles: ['attack'],
  },
  {
    name: 'Foil',
    sdCost: 1,
    description: 'Spend 1 SD to cause a creature you can see to falter as they attempt an action. Roll to succeed. 10+ Their attempt fails. 7-9 They partially succeed, but not to the extent they wished. 2-6 They succeed in their attempt, and you are at a disadvantage against them.',
    tier: 'levelUp',
    combatRoles: ['defense'],
    requiresRoll: true,
  },
  {
    name: 'Shrine',
    sdCost: 1,
    description: 'When you spend 1 SD to bind yourself to a Cause, you may build a shrine out of materials in your possession or use the symbol of your devotion and spend 2 SD to dedicate it to your Cause. Until your next rest, as long as the shrine remains standing, you have the Clarity effect. If you act against your Cause, the effect ends.',
    tier: 'levelUp',
    combatRole: 'utility',
    appliedEffects: [{ effectName: 'Clarity', target: 'self', durationType: 'until-rest' }],
  },
  {
    name: 'Dedicated Weapon',
    sdCost: 1,
    description: 'Spend 1 SD to dedicate your weapon to your Cause until your next rest. Enemies who take damage from that weapon have their DEF reduced by -1. This applies once to each creature you deal damage to.',
    tier: 'levelUp',
    combatRole: 'attack',
  },
]
