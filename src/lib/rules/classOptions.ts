// Option lists used by the class feature panels and new-character setup.
export const PRIMAL_FORCES = [
  'Earth', 'Fire', 'Water', 'Air', 'Ice', 'Plant-life', 'Rot',
] as const

export const TETHER_BONUSES = ['+5 max HP', '+1 action rolls', '+1 damage rolls'] as const

export const WARD_TYPES = [
  'Burning', 'Drowning', 'Bludgeoning', 'Withering', 'Poison', 'Bleeding',
] as const

export const HUNTER_PREY_TYPES = [
  'Natural', 'Construct', 'Magical', 'Aberration', 'Elemental', 'Undead',
] as const

export const ENCHANTER_SIGNS = [
  'Creature', 'Harm', 'Defense', 'Element', 'Movement',
] as const

export const ESSENCE_TYPES = [
  'vitality', 'transformation', 'element', 'sense', 'decay',
] as const

export const VINDICATOR_VOICES = [
  { id: 'evangel',   name: 'Evangel',   description: 'Charm neutrals and friendlies', used: false },
  { id: 'arbiter',   name: 'Arbiter',   description: 'Persuade to act favorably',     used: false },
  { id: 'harbinger', name: 'Harbinger', description: 'Intimidate',                    used: false },
  { id: 'heretic',   name: 'Heretic',   description: 'Deceive',                       used: false },
] as const

export const WARRIOR_MANEUVERS = [
  { id: 'charge',        name: 'Charge',        description: 'Cross Far distance and knock aside creatures in path', used: false },
  { id: 'hold-ground',   name: 'Hold Ground',   description: 'Cannot be moved; creatures cannot pass Close range',  used: false },
  { id: 'deadly-strike', name: 'Deadly Strike', description: 'Declare before rolling — deal double damage on hit',  used: false },
] as const

export const DELVER_EVASIONS = [
  { id: 'dodge',    name: 'Dodge',    description: 'Take no damage and reposition',                         used: false },
  { id: 'block',    name: 'Block',    description: 'Take half damage and gain +1 DEF for the scene',        used: false },
  { id: 'redirect', name: 'Redirect', description: 'Take half damage; remaining damage deflected to source', used: false },
] as const
