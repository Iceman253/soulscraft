import type { ClassAbility } from './types'

/** Delver abilities from the Delver class page. */
export const DELVER_ABILITIES: ClassAbility[] = [
  // Level 1
  {
    name: 'Signs of Rites',
    sdCost: 1,
    description: 'Spend 1 SD to study your surroundings for traces of ancient Rites. If present, you determine where it resides and what its purpose was meant to be.',
    tier: 'level1',
    combatRole: 'utility',
  },
  {
    name: 'Ancient Rite',
    sdCost: 1,
    description: 'Spend 1 SD to trigger the power of a relic or ruin you touch that contains an ancient Rite. If the effect is ongoing, it remains active for one scene.',
    tier: 'level1',
    combatRole: 'utility',
  },
  {
    name: 'Quick Reflexes',
    sdCost: 1,
    description: 'Once per rest, you may spend 1 SD to use an Evasion you\'ve already used.',
    tier: 'level1',
    combatRole: 'defense',
  },
  // Level Up
  {
    name: 'Ritual of Appeasing',
    sdCost: 1,
    description: 'Spend 1 SD to conduct a ritual that calms or satisfies an active hazardous Rite in the area. The ritual takes a few minutes to perform. Until your next rest, that Rite will not target anyone involved in the ritual. You must describe the ritual and everyone involved must offer something of genuine value (to the GM\'s satisfaction) as sacrifice. The item or offering is permanently lost.',
    tier: 'levelUp',
    combatRole: 'utility',
  },
  {
    name: 'Dispel',
    sdCost: 1,
    description: 'Spend 1 SD to negate the effect of an ancient Rite in your area you are aware of. Roll to succeed. 10+ The Rite dissipates. 7-9 The Rite weakens or fades away for one round. 2-6 The Rite resists and flares up, possibly altering its behavior. The GM describes how.',
    tier: 'levelUp',
    combatRoles: ['attack', 'defense'],
    requiresRoll: true,
  },
  {
    name: 'Avoid',
    sdCost: 1,
    description: 'Spend 1 SD to pass safely through the vicinity of a hazardous Rite you are aware of. This allows you to bypass the effect once, and only applies to you.',
    tier: 'levelUp',
    combatRoles: ['defense'],
  },
  {
    name: 'Clean Getaway',
    sdCost: 1,
    description: 'Spend 1 SD. Any creature pursuing you and any creature traveling with you through non-magical means immediately loses the trail.',
    tier: 'levelUp',
    combatRole: 'utility',
  },
  {
    name: 'Mind Map',
    sdCost: 1,
    description: 'Spend 1 SD to imagine a map of your location. Until your next rest, you always know where you are, where the cardinal directions are, and cannot become lost.',
    tier: 'levelUp',
    combatRole: 'utility',
  },
  {
    name: 'Decipher Language',
    sdCost: 1,
    description: 'Spend 1 SD to study a written language during a focused scene. Roll to succeed. 10+ You fully learn to read, write, and speak the language fluently. Record it for future use. 7-9 You grasp general ideas, basic terms, and can communicate in broken form. Record it for future use, but note it as incomplete. 2-6 You misunderstand the language. Attempts to communicate cause confusion, and attempts to understand lead to misinterpretation.',
    tier: 'levelUp',
    combatRole: 'utility',
    requiresRoll: true,
  },
  {
    name: 'Disarm',
    sdCost: 1,
    description: 'Spend 1 SD to permanently disarm a trap you have already identified or seen triggered. The trap is neutralized and will not activate again unless repaired or rearmed.',
    tier: 'levelUp',
    combatRole: 'utility',
  },
  {
    name: 'Studious',
    sdCost: 1,
    description: 'When examining an ancient relic, ruin, or artifact – magical or mundane – you may spend 1 SD to recall scholarly knowledge. You learn relevant history, design purpose, cultural significance, or original function, as determined by the GM.',
    tier: 'levelUp',
    combatRole: 'utility',
  },
  {
    name: 'Guide',
    sdCost: 1,
    description: 'Spend 1 SD while navigating a hazardous area to determine the safest visible path forward. You and those who are guided by you avoid environmental dangers along this path until it\'s disrupted or you reach an unseen area.',
    tier: 'levelUp',
    combatRole: 'utility',
  },
]
