/** All 41 status effects from Soulscraft 3.1e Guidebook, pp. 78–80 */

export interface StatusTemplate {
  name: string
  description: string
  harmful: boolean
  level: 1 | 2 | 3 | 4 | 5
  damagePerRound?: string  // e.g. '1d6' — HP lost at the start of each turn
  healPerRound?: string    // e.g. '1d6' — HP restored at the start of each turn
}

export const STATUS_EFFECTS: StatusTemplate[] = [
  // Level 1
  { name: 'Glowing',          level: 1, harmful: false, description: 'Emits a steady glow; outline visible through cover.' },
  { name: 'Slow Falling',     level: 1, harmful: false, description: 'Falls slowly; no harm from falling.' },
  { name: 'Jump Boost',       level: 1, harmful: false, description: 'Covers great distances when leaping; twice normal height.' },
  { name: 'Night Vision',     level: 1, harmful: false, description: 'Can see perfectly in total darkness.' },
  { name: 'Eagle Eye',        level: 1, harmful: false, description: 'Vision incredibly sharp; spot hidden objects or creatures at distance.' },
  { name: "Dolphin's Grace",  level: 1, harmful: false, description: 'Moves effortlessly through water; currents do not hinder.' },
  { name: 'Silence',          level: 1, harmful: true,  description: 'Cannot speak, whisper, or make any vocal sounds.' },
  { name: 'Deafness',         level: 1, harmful: true,  description: 'Cannot hear.' },
  { name: 'Clarity',          level: 1, harmful: false, description: 'Can see through illusions and deceptions; cannot be fooled.' },
  // Level 2
  { name: 'Speed',            level: 2, harmful: false, description: 'Moves with incredible swiftness.' },
  { name: 'Strength',         level: 2, harmful: false, description: 'Physical power enhanced; breaks, pushes, or damages with more ease.' },
  { name: 'Resistance',       level: 2, harmful: false, description: 'Environmental damage reduced by half. Does not apply to magical or weapon attacks.' },
  { name: 'Fire Resistance',  level: 2, harmful: false, description: 'Cannot be harmed by fire, lava, or extreme heat.' },
  { name: 'Health Boost',     level: 2, harmful: false, description: 'Gains 1d6 temporary HP (lost first; cannot be regained by healing).' },
  { name: 'Vertigo',          level: 2, harmful: true,  description: 'Severe dizziness; difficulty with precise movements; may fall prone.' },
  { name: 'Slowness',         level: 2, harmful: true,  description: 'Moves slowly.' },
  { name: 'Nausea',           level: 2, harmful: true,  description: 'Wracked with sickness.' },
  { name: 'Hunger',           level: 2, harmful: true,  description: 'Starving; eating does not remove this effect.' },
  { name: 'Darkness',         level: 2, harmful: true,  description: 'Vision obscured by oppressive black haze; can only see within Close range.' },
  // Level 3
  { name: 'Absorption',       level: 3, harmful: false, description: 'Takes only half damage.' },
  { name: 'Regeneration',     level: 3, harmful: false, description: 'Heals 1d6 HP after taking any amount of damage.', healPerRound: '1d6' },
  { name: 'Luck',             level: 3, harmful: false, description: 'Can reroll any action and use the best result for the scene.' },
  { name: 'Levitation',       level: 3, harmful: true,  description: 'Becomes weightless and floats up into the air.' },
  { name: 'Fear',             level: 3, harmful: true,  description: 'Overcome by dread; hesitates, cowers, or flees.' },
  { name: 'Charm',            level: 3, harmful: true,  description: 'Becomes amiable or passive toward the source; unwilling to act against it.' },
  { name: 'Blindness',        level: 3, harmful: true,  description: 'Cannot see.' },
  { name: 'Confusion',        level: 3, harmful: true,  description: 'Cannot tell friend from foe; may attack randomly.' },
  { name: 'Poison',           level: 3, harmful: true,  description: 'Poisoned — weak and sick. Deals 1d6 damage per round.', damagePerRound: '1d6' },
  { name: 'Freezing',         level: 3, harmful: true,  description: 'Extreme cold slows movements. Deals 1d6 damage per round.', damagePerRound: '1d6' },
  { name: 'Weakness',         level: 3, harmful: true,  description: 'All damage dealt is reduced by half (rounded down).' },
  // Level 4
  { name: 'Cursed',           level: 4, harmful: true,  description: 'Must reroll any successful action and use the worse result.' },
  { name: 'Fatigue',          level: 4, harmful: true,  description: 'Completely exhausted; cannot make impactful physical effort or spend Souls Dice.' },
  { name: 'Brittle',          level: 4, harmful: true,  description: 'Takes double damage from all physical attacks.' },
  { name: 'Invisibility',     level: 4, harmful: false, description: 'Completely invisible.' },
  { name: 'Hallucination',    level: 4, harmful: true,  description: 'Cannot distinguish reality from illusion; may react to imaginary threats.' },
  { name: 'Spectral Form',    level: 4, harmful: false, description: 'Can pass through solid objects as if made of mist.' },
  { name: 'Water Breathing',  level: 4, harmful: false, description: 'Can breathe and speak underwater.' },
  // Level 5
  { name: 'Withering',        level: 5, harmful: true,  description: 'Necromantic curse: target has 0 Souls Dice until removed.' },
  { name: 'Petrification',    level: 5, harmful: true,  description: 'Immobilized after 1 round; full stone after 1 scene.' },
  { name: 'Disintegration',   level: 5, harmful: true,  description: 'Body breaks down: 1d6 unhealing damage per round. Crumbles to dust at 0 HP.', damagePerRound: '1d6' },
  { name: 'Stasis',           level: 5, harmful: true,  description: 'Frozen in a single instant until end of scene; cannot act or be affected.' },
]
