/** Map, world, and bestiary constants */

export const AREA_TYPES = [
  'settlement', 'dungeon', 'wilderness', 'portal',
  'stronghold', 'ruins', 'other',
] as const

export const REALMS = ['overworld', 'nether', 'end'] as const

export const SUB_NODE_TYPES = [
  'rest-spot', 'dungeon', 'merchant', 'shrine', 'hazard', 'secret', 'other',
] as const

export const CREATURE_TYPES = [
  'natural', 'construct', 'magical', 'aberration', 'elemental', 'undead',
] as const

export const HP_TIERS = ['weak', 'average', 'strong', 'mighty'] as const
export const HP_TIER_RANGES = { weak: '1–4', average: '5–10', strong: '11–12', mighty: '13+' }
