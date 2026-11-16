import type { ClassAbility } from './types'

/** Warrior abilities from the Warrior class page. */
export const WARRIOR_ABILITIES: ClassAbility[] = [
  // Level 1
  {
    name: 'Precision Strike',
    sdCost: 1,
    description: 'Once per scene, you can spend 1 SD instead of rolling to attack, guaranteeing a successful hit.',
    tier: 'level1',
    combatRole: 'attack',
  },
  {
    name: 'Fortified Defense',
    sdCost: 2,
    description: 'You can spend 2 SD to increase your DEF by 2 for a scene.',
    tier: 'level1',
    combatRole: 'defense',
  },
  {
    name: 'Relentless Assault',
    sdCost: 1,
    description: 'Immediately after an attack, successful or failed, you can spend 1 SD to attack again.',
    tier: 'level1',
    combatRole: 'attack',
  },
  // Level Up
  {
    name: 'Chosen Weapon',
    sdCost: 1,
    description: 'After a rest, choose a specific weapon type (sword, axe, bow, etc.). When using this weapon, you can spend 1 SD to enhance your attacks with 1d4 damage. This effect lasts until your next rest.',
    tier: 'levelUp',
    combatRole: 'attack',
  },
  {
    name: 'Steel Will',
    sdCost: 1,
    description: 'Once per scene, you can spend 1 SD to shrug off a Status Effect that affects your mind or senses.',
    tier: 'levelUp',
    combatRole: 'defense',
  },
  {
    name: 'Perfect Guard',
    sdCost: 1,
    description: 'When you spend SD to increase your DEF, it also applies to one ally within Reach if you spend an additional SD.',
    tier: 'levelUp',
    combatRole: 'defense',
  },
  {
    name: 'Duelist',
    sdCost: 1,
    description: 'When you target a single foe, you can spend 1 SD to keep them focused on you for a round.',
    tier: 'levelUp',
    combatRoles: ['attack'],
  },
  {
    name: 'Battlefield Instinct',
    sdCost: 1,
    description: 'While facing a hostile creature, you can spend 1 SD to get a yes or no answer to one of these questions: Is this creature expecting reinforcements? Does this creature have a trick up their sleeve? Is this creature trying to escape?',
    tier: 'levelUp',
    combatRoles: ['utility'],
  },
  {
    name: 'Exploit Opening',
    sdCost: 1,
    description: 'When an ally hits a target, spend 1 SD to immediately follow up with an attack against that target as part of your ally\'s turn.',
    tier: 'levelUp',
    combatRole: 'attack',
  },
  {
    name: 'Situational Awareness',
    sdCost: 1,
    description: 'Spend 1 SD to ask the GM one of the following, and get a clear answer: What is the biggest threat right now? What enemy is vulnerable or exposed? How can I gain the advantage?',
    tier: 'levelUp',
    combatRoles: ['utility'],
  },
  {
    name: 'Anti-magic Strike',
    sdCost: 1,
    description: 'When you make an attack, spend 1 SD to ignore any enchantments your target has on their armor.',
    tier: 'levelUp',
    combatRole: 'attack',
  },
  {
    name: 'Warrior\'s Eye',
    sdCost: 1,
    description: 'When you observe an enemy\'s weapon or fighting style, you may spend 1 SD to learn their maximum damage and if their weapon is enchanted or has any special traits.',
    tier: 'levelUp',
    combatRole: 'utility',
  },
]
