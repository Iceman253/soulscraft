/** Character classes, species, abilities, and disciplines */

export const SPECIES = [
  'Avatar', 'Hearthborn', 'Alfay', 'Tuskarin',
  'Grimborn', 'Golem', 'Dwymir', 'Enderling',
] as const

export const CLASSES = [
  'Warrior', 'Hunter', 'Vindicator', 'Enchanter',
  'Delver', 'Wildspeaker', 'Alchemist', 'Evoker', 'Tecton',
] as const

export const CLASS_BASE_HP: Record<string, number> = {
  Warrior: 10, Vindicator: 10,
  Hunter: 9,   Evoker: 9,
  Delver: 8,   Wildspeaker: 8, Enchanter: 8, Tecton: 8, Alchemist: 8,
}
export const CLASS_HP_PER_LEVEL: Record<string, number> = {
  Warrior: 4, Vindicator: 4,
  Hunter: 3,  Evoker: 3,
  Delver: 2,  Wildspeaker: 2, Enchanter: 2, Tecton: 2, Alchemist: 2,
}
export function calcMaxHp(className: string, level: number): number {
  return (CLASS_BASE_HP[className] ?? 8) + (CLASS_HP_PER_LEVEL[className] ?? 2) * level
}
export function calcMaxSd(level: number): number { return 5 + level }

export const CLASS_DAMAGE_DICE: Record<string, string> = {
  Warrior:     'd12',
  Vindicator:  'd10',
  Hunter:      'd8',
  Evoker:      'd8',
  Delver:      'd6',
  Tecton:      'd6',
  Wildspeaker: 'd4',
  Enchanter:   'd4',
  Alchemist:   'd4',
}

export const CLASS_DISCIPLINES: Record<string, string[]> = {
  Warrior:    ['Soldier', 'Mercenary', 'Swashbuckler'],
  Hunter:     ['Assassin', 'Guardian', 'Survivalist'],
  Vindicator: ['Priest', 'Inquisitor', 'Paragon'],
  Enchanter:  ['Maledict', 'War Mage', 'Aegis'],
  Delver:     ['Raider', 'Archaeologist', 'Reliquarian'],
  Wildspeaker:['Beastshaper', 'Shaman', 'Rotmancer'],
  Alchemist:  ['Thanaturge', 'Chronomancer', 'Monstrologist'],
  Evoker:     ['Revenant', 'Soulmender', 'Reaper'],
  Tecton:     ['Artisan', 'Mechanist', 'Architect'],
}

import type { CombatRole, AppliedStatusEffectSpec } from '../types'

export const DISCIPLINE_EDGES: Record<string, { name: string; description: string; resetsOn: 'rest' | 'scene'; combatRoles: CombatRole[]; appliedEffects?: AppliedStatusEffectSpec[] }> = {
  // Warrior disciplines
  Soldier:        { resetsOn: 'rest',  combatRoles: ['defense'],          name: 'Soldier Edge',        description: 'Once per rest, while fighting within Close range of an ally, you can grant yourself and that ally +1 DEF for the scene. This only applies to one ally.' },
  Mercenary:      { resetsOn: 'scene', combatRoles: ['attack'],           name: 'Mercenary Edge',      description: 'Once per scene, when you strike a creature who hasn\'t yet attacked you in this scene, add +1 damage.' },
  Swashbuckler:   { resetsOn: 'scene', combatRoles: ['attack', 'defense'], name: 'Swashbuckler Edge',   description: 'Once per scene, you may avoid an incoming attack, taking no damage and gaining +1 to your next action roll.' },
  // Hunter disciplines
  Assassin:       { resetsOn: 'scene', combatRoles: ['attack'],           name: 'Assassin Edge',       description: 'Once per scene, if you strike a creature with a ranged attack while unseen, you remain hidden.' },
  Guardian:       { resetsOn: 'rest',  combatRoles: ['utility'],          name: 'Guardian Edge',       description: 'Once per rest, you may ask for the location of a hidden creature within Far range and receive a truthful answer.' },
  Survivalist:    { resetsOn: 'rest',  combatRoles: ['utility'],          name: 'Survivalist Edge',    description: 'Once per rest, during a Poor Quality Rest, you and your companions heal an additional +2 HP and regenerate an additional +1 SD due to your preparation.' },
  // Vindicator disciplines
  Priest:         { resetsOn: 'rest',  combatRoles: ['attack', 'defense'],name: 'Priest Edge',         description: 'Once per rest, you can hallow the area within Nearby range around you for one scene. While inside, your Cause applies to allies — when they make an action roll clearly aligned with your Cause, they gain +1 to the roll.' },
  Inquisitor:     { resetsOn: 'rest',  combatRoles: ['attack'],           name: 'Inquisitor Edge',     description: 'Once per rest, you can intimidate a creature, inflicting them with Confusion for one scene.', appliedEffects: [{ effectName: 'Confusion', target: 'target', durationType: 'scenes', remaining: 1 }] },
  Paragon:        { resetsOn: 'rest',  combatRoles: ['defense'],          name: 'Paragon Edge',        description: 'Once per rest, when you make a stand for your Cause, all allies who can see you can remove one negative Status Effect.' },
  // Enchanter disciplines
  Maledict:       { resetsOn: 'rest',  combatRoles: ['attack'],           name: 'Maledict Edge',       description: 'You get a +2 bonus to any action rolls that concern handling Curses and to damage rolls when you use a Curse to harm a creature.' },
  'War Mage':     { resetsOn: 'rest',  combatRoles: ['attack'],           name: 'War Mage Edge',       description: 'Your damage die is d8 when using an enchanted weapon or when you deal damage directly through an enchantment or curse.' },
  Aegis:          { resetsOn: 'rest',  combatRoles: ['defense'],          name: 'Aegis Edge',          description: 'Damage rolls against an object or creature that you have imbued with any defensive enchantment suffer a -1 penalty.' },
  // Delver disciplines
  Raider:         { resetsOn: 'rest',  combatRoles: ['utility'],          name: 'Raider Edge',         description: 'You gain +2 to action rolls that involve searching for valuable loot.' },
  Archaeologist:  { resetsOn: 'rest',  combatRoles: ['utility'],          name: 'Archaeologist Edge',  description: 'Having studied ancient architecture, you gain a 1d4 bonus to action rolls made to understand or anticipate the layout of a ruin. You can often tell what lies beyond a corridor, where hidden chambers might be, or how rooms connect, even without direct sight.' },
  Reliquarian:    { resetsOn: 'rest',  combatRoles: ['attack', 'defense'],name: 'Reliquarian Edge',    description: 'You possess a relic containing an ancient Rite (a Level 1 or Level 2 Status Effect of your choice). You may activate this Rite up to twice per rest, targeting yourself or any creature you can see. When activated, the effect lasts for one scene.' },
  // Wildspeaker disciplines
  Beastshaper:    { resetsOn: 'rest',  combatRoles: ['utility'],          name: 'Beastshaper Edge',    description: 'Once per rest, you can transform into a natural animal you have seen before. You retain your HP, DEF, and intelligence, but cannot use weapons, speech, or Special Abilities. The form lasts until you drop it or the next rest.' },
  Shaman:         { resetsOn: 'rest',  combatRoles: ['utility'],          name: 'Shaman Edge',         description: 'Once per rest, you may commune with a local nature spirit to learn general knowledge of the immediate natural area.' },
  Rotmancer:      { resetsOn: 'rest',  combatRoles: ['attack'],           name: 'Rotmancer Edge',      description: 'One of your two Tethers must always be to the Primal Force of Rot. You may call upon Rot to cause harm to a creature without breaking the Tether.' },
  // Alchemist disciplines
  Thanaturge:     { resetsOn: 'rest',  combatRoles: ['attack'],           name: 'Thanaturge Edge',     description: 'By spending an Essence of Decay, you can compel an Undead creature within sight whose maximum HP is 10 or less to obey one simple command. You can command up to five such creatures at a time (1 Essence of Decay per creature).' },
  Chronomancer:   { resetsOn: 'rest',  combatRoles: ['attack', 'defense'], name: 'Chronomancer Edge',   description: 'By spending Essence of Transformation, you can increase or decrease the duration of an ongoing effect by one step: Turn (1 Essence), Round (2 Essence), or Scene (3 Essence). Targets must be your own abilities, potions you created/used, or Status Effects on a creature you can touch.' },
  Monstrologist:  { resetsOn: 'rest',  combatRoles: ['attack', 'defense'],name: 'Monstrologist Edge',  description: 'By spending an Essence of Transformation, you can take on a subtle aberrant trait (extra eyes, tendrils, gills, etc.) for one scene, granting +1 to action rolls related to that adaptation. You cannot maintain more than one mutation at a time.' },
  // Evoker disciplines
  Revenant:       { resetsOn: 'rest',  combatRoles: ['utility'],          name: 'Revenant Edge',       description: 'You have one permanent Vex companion that can fly, pass through walls, and follow your commands. It is intelligent and can speak. It shares your HP, DEF, and damage die, and reforms after a rest if destroyed.' },
  Soulmender:     { resetsOn: 'rest',  combatRoles: ['defense'],          name: 'Soulmender Edge',     description: 'Once per rest, when you restore HP to another creature by any means, you restore additional HP equal to your level and they may also remove a Status Effect.' },
  Reaper:         { resetsOn: 'rest',  combatRoles: ['attack'],           name: 'Reaper Edge',         description: 'Once per rest, when you reduce a creature to 0 HP, regain 1 SD.' },
  // Tecton disciplines
  Artisan:        { resetsOn: 'rest',  combatRoles: ['utility'],          name: 'Artisan Edge',        description: 'When you use enchanted or otherwise magical components in crafting, you can preserve their magical effect.' },
  Mechanist:      { resetsOn: 'rest',  combatRoles: ['utility'],          name: 'Mechanist Edge',      description: 'Twice per rest, you may add 1d4 to your action rolls associated with redstone items and structures you have crafted, built, or closely examined.' },
  Architect:      { resetsOn: 'rest',  combatRoles: ['utility'],          name: 'Architect Edge',      description: 'When you build a structure, you require half the usual amount of blocks and half the normal time, rounded down.' },
}

/** Default starting skills for each class, with rulebook-grounded descriptions
 *  and combat-role tags so the AbilityApplyPanel knows where to surface them.
 *  Tooltips on the panel buttons read from `description`. */
export interface DefaultSkill {
  name: string
  description: string
  combatRoles: CombatRole[]
}

export const DEFAULT_CLASS_SKILLS: Record<string, DefaultSkill[]> = {
  Warrior: [
    { name: 'Attack', combatRoles: ['attack'],
      description: 'Trained mastery of weapons and martial technique. Apply your Skill Bonus to attack rolls when striking with a weapon you know.' },
    { name: 'Parry', combatRoles: ['defense'],
      description: 'Deflect or block an incoming strike with weapon, shield, or trained reflex. Apply your Skill Bonus to defense rolls against melee or ranged attacks you can see.' },
  ],
  Hunter: [
    { name: 'Tracking', combatRoles: ['utility'],
      description: 'Examine your environment for signs of creatures that have passed through. Identify the creatures and how long ago they were present, and follow these signs to trail them. (Rulebook p.41)' },
    { name: 'Stealth', combatRoles: ['attack', 'utility'],
      description: 'Avoid being detected — hiding, sneaking, or moving in disguise. Apply your Skill Bonus when setting up an ambush or striking an unaware target, and when evading pursuit. (Rulebook p.41)' },
  ],
  Vindicator: [
    { name: 'Persuasion', combatRoles: ['general'],
      description: 'Use words, charm, or earnest conviction to sway others. Apply your Skill Bonus to social rolls — negotiating, convincing, or rallying — including in tense standoffs.' },
    { name: 'Leadership', combatRoles: ['general'],
      description: 'Use your presence, authority, or strength to make others follow your lead — by words or by force. Apply your Skill Bonus when commanding allies, intimidating foes, or holding a group together under pressure.' },
  ],
  Enchanter: [
    { name: 'Enchanting', combatRoles: ['utility'],
      description: 'Imbue objects with magical properties through ritual inscription of Runes and Signs. Apply your Skill Bonus to crafting rolls involving enchantment, rune-work, or magical preparation.' },
    { name: 'Magic Knowledge', combatRoles: ['utility'],
      description: 'Recognize magical effects, decipher arcane symbols, and understand spell theory. Apply your Skill Bonus to rolls identifying or analyzing enchantments, curses, or magical anomalies.' },
  ],
  Delver: [
    { name: 'Evasion', combatRoles: ['defense'],
      description: 'React with trained instinct to escape harm — duck, roll, sidestep, or take cover. Apply your Skill Bonus to defense rolls against attacks or hazards you can see coming.' },
    { name: 'Appraisal', combatRoles: ['utility'],
      description: 'Examine objects, relics, and ruins to determine their value, history, or function. Apply your Skill Bonus when assessing loot, identifying ancient items, or estimating worth.' },
  ],
  Wildspeaker: [
    { name: 'Nature Lore', combatRoles: ['utility'],
      description: 'Navigate wilderness, identify plants and minerals, and predict natural phenomena. Apply your Skill Bonus to rolls involving terrain, weather, wildlife, or natural hazards. (Rulebook p.32)' },
    { name: 'Survival', combatRoles: ['utility'],
      description: 'Find shelter, food, or safe rest in the wild. Endure harsh environments. Apply your Skill Bonus to rolls finding refuge, foraging, or surviving exposure.' },
  ],
  Alchemist: [
    { name: 'Brewing', combatRoles: ['utility'],
      description: 'Combine alchemical ingredients with care and proportion to produce potions and elixirs with reliable effects. Apply your Skill Bonus to potion-design and brewing rolls.' },
    { name: 'Ingredient Knowledge', combatRoles: ['utility'],
      description: 'Identify Essences, reagents, and their properties. Recognize what a substance can do before using it. Apply your Skill Bonus when analyzing substances or sourcing materials.' },
  ],
  Evoker: [
    { name: 'Lifesense', combatRoles: ['utility'],
      description: 'Sense the presence of living and undead creatures nearby — even those hidden or unconscious. Apply your Skill Bonus to rolls detecting beings through walls, darkness, or magical concealment.' },
    { name: 'Soul Craft', combatRoles: ['defense'],
      description: 'Manipulate soul energy for healing, anchoring, or transfer. Understand the boundary between life and death. Apply your Skill Bonus to rolls protecting allies from death-touched harm or assisting Soul Transfer effects.' },
  ],
  Tecton: [
    { name: 'Engineering', combatRoles: ['utility'],
      description: 'Understand how parts fit together — build, repair, or break complex systems. Apply your Skill Bonus to crafting, construction, and sabotage rolls. (Rulebook p.61)' },
    { name: 'Pattern Recognition', combatRoles: ['utility'],
      description: 'Spot hidden logic, repeating structures, and meaning in chaos. Apply your Skill Bonus when decoding ciphers, predicting enemy formations, or perceiving the underlying order of a place. (Rulebook p.61)' },
  ],
}

export interface SpeciesTrait { name: string; description: string; combatRoles: CombatRole[] }
export interface SpeciesVariant {
  name: string
  trait: SpeciesTrait
}

/** Species and their traits. Each trait carries a `combatRoles` tag specifying
 *  where it surfaces in the AbilityApplyPanel — `general`/`utility` means
 *  dice-roller only; `attack`/`defense` means it shows on that combat side
 *  with its +1 bonus. Descriptions include the combat application explicitly
 *  so tooltips read consistently with class abilities. */
export const SPECIES_DATA: Record<string, { description: string; tags: string; speciesTrait: SpeciesTrait; variants: SpeciesVariant[] }> = {
  Avatar: {
    description: 'Generally human in appearance, Avatars can shift their appearance on a whim — hair, skin, and even extra limbs, horns, or tails. Creativity, curiosity, and exploration define their societies.',
    tags: 'Magical (+1 to rolls involving magical knowledge or handling magic) · Medium',
    speciesTrait: { name: 'Changeling', combatRoles: ['general'],
      description: 'Avatars can change their appearance and physical traits — small changes like eye color quickly, larger changes over time. Cannot heal through this ability and always maintain a humanoid form. +1 to rolls involving disguise, infiltration, or social blending.' },
    variants: [
      { name: 'Shaper', trait: { name: 'Educated', combatRoles: ['utility'],
        description: 'Shaper Avatars are knowledgeable and well-educated across various subjects. +1 to rolls recalling lore, languages, or academic knowledge.' } },
      { name: 'Wilder', trait: { name: 'Survival Instinct', combatRoles: ['utility'],
        description: 'Wilder Avatars are adept at surviving in the wilderness. +1 to rolls foraging, finding shelter, or enduring natural hazards.' } },
    ],
  },
  Hearthborn: {
    description: 'Peace-loving and social humanoids with copper-toned skin, pointed ears, and no hair. They value community, industry, and diplomacy above all else.',
    tags: 'Natural (+1 to rolls for non-magical Travel and Rest) · Medium',
    speciesTrait: { name: 'Hearthlight', combatRoles: ['utility'],
      description: 'Hearthborn can create an apple-sized hovering orb of light in their palm, adjusting brightness and color at will. They can make it move through the air as long as they can see it. +1 to rolls involving illumination, signaling, or perceiving in dim conditions.' },
    variants: [
      { name: 'Steadfolk', trait: { name: 'Trade and Craft', combatRoles: ['utility'],
        description: 'Steadfolk Hearthborn are experts in their trade or craft of choice. Choose one: Farmer, Craftsman, Scholar, Merchant, or Mason. +1 to rolls within your chosen trade.' } },
      { name: 'Trailfolk', trait: { name: 'Well-Traveled', combatRoles: ['utility'],
        description: 'Trailfolk Hearthborn are experts at traversing terrain and making long journeys. +1 to rolls navigating, pacing travel, or recognizing distant landmarks.' } },
    ],
  },
  Alfay: {
    description: 'Small, winged humanoids with immortal lifespans and mischievous spirits. They dwell in hidden cities in wild places and retain a youthful energy that leads them into unexpected trouble.',
    tags: 'Magical (+1 to rolls involving magical knowledge or handling magic) · Small (+1 agility rolls, -1 strength rolls)',
    speciesTrait: { name: 'Flight', combatRoles: ['attack', 'defense'],
      description: 'Alfay can fly as fast and as high as a bird, slowed only by the weather and burdens they carry. +1 to rolls leveraging aerial mobility — diving strikes, evading ground-bound foes, or repositioning out of reach.' },
    variants: [
      { name: 'Azure Court',  trait: { name: 'Mocking',  combatRoles: ['general'],
        description: 'Alfay of the Azure Court use ridicule to goad, embarrass, or unnerve others. +1 to rolls provoking, distracting, or destabilizing an opponent emotionally.' } },
      { name: 'Golden Court', trait: { name: 'Meddling', combatRoles: ['general'],
        description: 'Alfay of the Golden Court gain leverage by nudging events, conversations, or decisions in their favor without appearing directly involved. +1 to rolls manipulating outcomes from the periphery.' } },
      { name: 'Courtless',    trait: { name: 'Malice',   combatRoles: ['general'],
        description: 'Courtless Alfay exploit weakness, using their craftiness to twist the knife and press emotional or psychological pressure points. +1 to rolls exploiting a known weakness, fear, or trauma.' } },
    ],
  },
  Tuskarin: {
    description: 'Muscular humanoids with pronounced snouts, sharp tusks, and cloven hooves, native to the Nether. Despite their love of gold and brash demeanor, they are valued for their honesty and honor.',
    tags: 'Natural (+1 to rolls for non-magical Travel and Rest) · Size varies by variant',
    speciesTrait: { name: 'Thick Skin', combatRoles: ['defense'],
      description: 'Tuskarin are built to withstand hardship, enduring pain and harsh conditions with unshakable resilience. +1 to defense rolls and rolls resisting environmental damage or fatigue.' },
    variants: [
      { name: 'Brute', trait: { name: 'Strong', combatRoles: ['attack'],
        description: 'Tuskarin Brutes can use their strength to overpower, lift, break, or smash through obstacles. (Large: Close and Reach treated as same; -1 agility rolls.) +1 to attack rolls leveraging raw strength and to rolls breaking or shoving.' } },
      { name: 'Wit',   trait: { name: 'Smart',  combatRoles: ['utility'],
        description: 'Tuskarin Wits can solve problems, recall knowledge, or use strategy or logic in tense situations. (Medium.) +1 to rolls planning, deducing, or out-thinking an opponent.' } },
      { name: 'Runt',  trait: { name: 'Fast',   combatRoles: ['attack', 'defense'],
        description: 'Tuskarin Runts can dodge, escape, move quickly, or act before others can react. (Small: +1 agility rolls, -1 strength rolls.) +1 to attack rolls striking first and to defense rolls dodging.' } },
    ],
  },
  Grimborn: {
    description: 'Ambitious and cunning, marked by gray skin, pointed ears, and no hair. They value power and individual achievement, forming complex networks of alliances and rivalries.',
    tags: 'Natural (+1 to rolls for non-magical Travel and Rest) · Medium',
    speciesTrait: { name: 'Undeath Mantle', combatRoles: ['defense'],
      description: 'Grimborn can be in the presence of Undead whose damage die is a d6 or less without being targeted by them — unless they make a hostile action. +1 to defense rolls against small-die Undead while unprovoked.' },
    variants: [
      { name: 'Silverblood', trait: { name: 'Influence',  combatRoles: ['general'],
        description: 'Silverblood Grimborn influence others through charm, subtle suggestion, and strategic flattery. +1 to rolls coaxing, persuading, or coercing through smooth diplomacy.' } },
      { name: 'Coalblood',   trait: { name: 'Dominance',  combatRoles: ['general'],
        description: 'Coalblood Grimborn know how to get what they want through presence, intimidation, or force of will. +1 to rolls dominating a room, intimidating, or breaking a foe\'s resolve.' } },
    ],
  },
  Golem: {
    description: 'Mechanical humanoid constructs ranging from hulking iron brutes to sleek articulated figures. Though artificial, they possess the spark of sentience.',
    tags: 'Construct (immune to poison, sleep, and mind-altering effects) · Choose size: Small / Medium / Large',
    speciesTrait: { name: 'Sleepless', combatRoles: ['utility'],
      description: 'Golems do not need to sleep, but instead enter a state of conscious restfulness to recharge. +1 to rolls maintaining vigilance, standing watch, or operating through the night.' },
    variants: [
      { name: 'Copper', trait: { name: 'Science',        combatRoles: ['utility'],
        description: 'Copper Golems were created to be researchers and possess an extensive library of information on various scientific topics. +1 to rolls recalling scientific knowledge or analyzing data.' } },
      { name: 'Golden', trait: { name: 'Communications', combatRoles: ['general'],
        description: 'Golden Golems can speak, write, and understand any language, and can navigate social situations with ease. +1 to rolls translating, communicating, or smoothing social friction.' } },
      { name: 'Iron',   trait: { name: 'Security',       combatRoles: ['defense'],
        description: 'Iron Golems were built to protect, with a reinforced frame and tactical awareness. +1 to defense rolls guarding allies and to rolls assessing threats or fortifying a position.' } },
    ],
  },
  Dwymir: {
    description: 'Short subterranean humanoids standing about three feet tall, with dark hair, dark eyes, and bluish-gray to teal skin. Their love for gems rivals even the Tuskarin\'s reverence for gold.',
    tags: 'Magical (+1 to rolls involving magical knowledge or handling magic) · Small (+1 agility rolls, -1 strength rolls)',
    speciesTrait: { name: 'Nightvision', combatRoles: ['attack', 'defense'],
      description: 'Adapted for life without light, Dwymir can see clearly in complete darkness. +1 to attack and defense rolls when fighting in darkness or dim conditions, and to rolls perceiving in the dark.' },
    variants: [
      { name: 'Deep Trove',   trait: { name: 'Miner',     combatRoles: ['utility'],
        description: 'Deep Dwymir are adept at mining and extracting valuable ores from the depths. +1 to rolls mining, breaking stone, or finding ore veins.' } },
      { name: 'Echo Trove',   trait: { name: 'Scavenger', combatRoles: ['utility'],
        description: 'Echo Dwymir are adept at finding lost valuables in unlikely places. +1 to rolls searching for hidden, lost, or overlooked items.' } },
      { name: 'Shadow Trove', trait: { name: 'Burglar',   combatRoles: ['attack', 'utility'],
        description: 'Shadow Dwymir are adept in thievery and the art of taking what is not freely given. +1 to rolls picking locks, palming items, or executing a sneak attack on an unaware target.' } },
    ],
  },
  Enderling: {
    description: 'Beings irreversibly altered by prolonged exposure to the Void. Most are bound to the Ender Dragon\'s will, but some have escaped her grasp to walk free across all realms. They do not age.',
    tags: 'Aberrant (+1 to rolls resisting a Status Effect) · Medium',
    speciesTrait: { name: 'Teleportation', combatRoles: ['attack', 'defense'],
      description: 'An Enderling may teleport to a visible, unoccupied space within Far range. Items worn or carried are transported. Other creatures cannot be transported. +1 to attack rolls closing distance for a strike and to defense rolls dodging out of reach.' },
    variants: [
      { name: 'Unbound',     trait: { name: 'Ender Gaze', combatRoles: ['general'],
        description: 'An Unbound\'s gaze holds remnants of the Ender Dragon\'s power. Prolonged eye contact may cause discomfort, confusion, or unease in others. +1 to rolls intimidating, unsettling, or breaking concentration via direct stare.' } },
      { name: 'Voidtouched', trait: { name: 'Lineage',    combatRoles: ['utility'],
        description: 'Voidtouched Enderlings retain elements of their previous species. Choose one Trait from another playable Species. (The chosen trait carries its own combat applicability.)' } },
    ],
  },
}

export const DEFAULT_SPECIES_TRAITS: Record<string, Array<{name: string; description: string}>> = Object.fromEntries(
  Object.entries(SPECIES_DATA).map(([species, data]) => [species, [data.speciesTrait]])
)

// ── Class-specific constants ─────────────────────────────────────────────
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

export const QUICK_EFFECTS: Array<{
  name: string
  durationType: 'scenes' | 'days' | 'until-rest' | 'permanent' | 'manual'
  defaultDuration?: number
  /** HP lost, rolled and applied each interval (scene/day/combat round). */
  damagePerRound?: string
  /** HP restored, rolled and applied each interval. */
  healPerRound?: string
  /** HP lost to damagePerRound can't be healed while active (Withering, Disintegration). */
  unhealable?: boolean
}> = [
  { name: 'Poison',          durationType: 'scenes',     defaultDuration: 3, damagePerRound: '1d6' },
  { name: 'Weakness',        durationType: 'scenes',     defaultDuration: 3 },
  { name: 'Withering',       durationType: 'manual'                                                },
  { name: 'Freezing',        durationType: 'scenes',     defaultDuration: 2, damagePerRound: '1d6' },
  { name: 'Disintegration',  durationType: 'scenes',     defaultDuration: 3, damagePerRound: '1d6', unhealable: true },
  { name: 'Slowness',        durationType: 'scenes',     defaultDuration: 2 },
  { name: 'Blindness',       durationType: 'scenes',     defaultDuration: 1 },
  { name: 'Fire Resistance', durationType: 'until-rest'                     },
  { name: 'Invisibility',    durationType: 'scenes',     defaultDuration: 3 },
  { name: 'Swiftness',       durationType: 'until-rest'                     },
  { name: 'Regeneration',    durationType: 'scenes',     defaultDuration: 3, healPerRound: '1d6' },
  { name: 'Strength',        durationType: 'scenes',     defaultDuration: 3 },
]

// ── Class Abilities ──────────────────────────────────────────────────────
export interface ClassAbilityDef {
  name: string
  sdCost: number
  recharge: 'rest' | 'scene' | 'day' | 'none'
  description: string
  materials?: string
}

export const CLASS_LEVEL1_ABILITIES: Record<string, ClassAbilityDef[]> = {
  Warrior: [
    { name: 'Precision Strike',   sdCost: 1, recharge: 'scene', description: 'Once per scene, spend 1 SD instead of rolling to attack, guaranteeing a successful hit.' },
    { name: 'Fortified Defense',  sdCost: 2, recharge: 'rest',  description: 'Spend 2 SD to increase your DEF by 2 for a scene.' },
    { name: 'Relentless Assault', sdCost: 1, recharge: 'rest',  description: 'Immediately after an attack, successful or failed, spend 1 SD to attack again.' },
  ],
  Hunter: [
    { name: 'Perceive Mind', sdCost: 1, recharge: 'rest', description: 'Spend 1 SD to read a creature\'s body language, gaining insight into its mental state or truthfulness. Roll: 10+ clear insight for the scene; 7-9 vague insight; 2-6 no insight.' },
    { name: 'Ambush',        sdCost: 1, recharge: 'rest', description: 'If you make a successful attack while unseen or hidden, spend 1 SD to ignore the target\'s DEF.' },
    { name: 'Predator',      sdCost: 1, recharge: 'rest', description: 'Spend 1 SD to mark a single creature you can see. Until your next rest, gain +1 damage against it and you can always detect its trail.' },
  ],
  Vindicator: [
    { name: 'Cause',      sdCost: 1, recharge: 'rest', description: 'Spend 1 SD, binding yourself to a Cause until your next rest (Protect the helpless; Serve the master; Conquer the enemy; Crush the unworthy; Uphold the order). When you act clearly aligned with your Cause, gain +1 to the roll.' },
    { name: 'Leadership', sdCost: 1, recharge: 'rest', description: 'Spend 1 SD to grant +1 to you and your allies\' action rolls for a scene, as long as they can see you.' },
    { name: 'Strengthen', sdCost: 1, recharge: 'rest', description: 'Spend 1 SD to increase your and your allies\' maximum damage by 2 each. Lasts until each creature makes a successful attack or until the next rest.' },
  ],
  Enchanter: [
    { name: 'Runemaster',          sdCost: 1, recharge: 'rest', description: 'Etch magical Runes onto objects using Lapis Lazuli (1 per Rune). Spend 1 SD to activate a Rune to apply an enchantment or curse from your Tome for one scene.', materials: '1 Lapis Lazuli per Rune' },
    { name: 'Magic Circle',        sdCost: 3, recharge: 'rest', description: 'Spend 3 SD and 5 Lapis Lazuli to etch an enchantment or curse in a circle on the ground that affects up to 5 Medium creatures inside for 1 day.', materials: '5 Lapis Lazuli' },
    { name: 'Reveal Enchantments', sdCost: 1, recharge: 'rest', description: 'Spend 1 SD to detect and identify any active enchantments or curses within Nearby range, even if hidden.' },
  ],
  Delver: [
    { name: 'Signs of Rites', sdCost: 1, recharge: 'rest', description: 'Spend 1 SD to study your surroundings for traces of ancient Rites. If present, determine where it resides and what its purpose was.' },
    { name: 'Ancient Rite',   sdCost: 1, recharge: 'rest', description: 'Spend 1 SD to trigger the power of a relic or ruin you touch that contains an ancient Rite. If ongoing, the effect remains active for one scene.' },
    { name: 'Quick Reflexes', sdCost: 1, recharge: 'rest', description: 'Once per rest, spend 1 SD to use an Evasion you have already used this rest.' },
  ],
  Wildspeaker: [
    { name: 'Change Tether', sdCost: 1, recharge: 'rest', description: 'Spend 1 SD to change an active Tether from one Primal Force to another.' },
    { name: 'Invoke Force',  sdCost: 1, recharge: 'rest', description: 'Spend 1 SD to make a simple request of a Tethered Force to affect a target or area you can see (cannot directly harm a creature). Roll: 10+ request granted; 7-9 granted with unintended consequence; 2-6 misunderstood.' },
    { name: 'Extend Tether', sdCost: 1, recharge: 'rest', description: 'Spend 1 SD to extend one active Tether to a willing creature you can see. They gain the Tether bonuses but cannot make requests of the Force. One creature at a time.' },
  ],
  Alchemist: [
    { name: 'Elixir',            sdCost: 1, recharge: 'rest', description: 'Spend 1 SD to combine up to three potions into a single elixir. All effects occur simultaneously when consumed. Duration matches the longest-lasting potion.' },
    { name: 'Analyze Substance', sdCost: 1, recharge: 'rest', description: 'Spend 1 SD to study a substance or object. Learn what Essences it contains and whether it has been altered by magic or poison.' },
    { name: 'Alchemical Bolt',   sdCost: 1, recharge: 'rest', description: 'Spend 1 SD to activate the Essences of a potion in your hand as a ranged effect at a single target within Far range. Matches the potion\'s effect but lasts only 1 round.' },
  ],
  Evoker: [
    { name: 'Summon Vex',    sdCost: 1, recharge: 'rest', description: 'Spend 1 SD or 5 HP to summon up to four Vex: small flying spirits that attack enemies within Nearby range. They can pass through walls and follow your commands. Persist until destroyed (1 HP) or dismissed.' },
    { name: 'Summon Fangs',  sdCost: 1, recharge: 'rest', description: 'Spend 1 SD or 5 HP to summon up to four Fangs: huge snapping maws that burst from solid surfaces within Nearby range. Cannot move but obey your commands. Persist until dismissed or destroyed (1 HP).' },
    { name: 'Soul Transfer', sdCost: 0, recharge: 'none', description: 'Transfer any amount of HP or SD from yourself to a creature you touch. Cannot reduce yourself to 0 HP.' },
  ],
  Tecton: [
    { name: 'Geometer\'s Sight',      sdCost: 1, recharge: 'rest', description: 'Spend 1 SD to study a structure or terrain. For the rest of the scene, you and your allies gain 1d4 to rolls for navigating that structure or terrain.' },
    { name: 'Seal of the Mind',        sdCost: 1, recharge: 'rest', description: 'Spend 1 SD to memorize any object. Reproduce it flawlessly later with proper materials (cannot replicate magical properties).' },
    { name: 'The Returning Principle', sdCost: 1, recharge: 'rest', description: 'When a creature within Reach strikes you, spend 1 SD to halve the incoming damage and deal 1 damage back to the attacker.' },
  ],
}

export const CLASS_LEVELUP_ABILITIES: Record<string, ClassAbilityDef[]> = {
  Warrior: [
    { name: 'Chosen Weapon',         sdCost: 1, recharge: 'rest',  description: 'After a rest, choose a weapon type. When using it, spend 1 SD to enhance attacks with 1d4 damage for the rest of the rest.' },
    { name: 'Steel Will',            sdCost: 1, recharge: 'scene', description: 'Once per scene, spend 1 SD to shrug off a Status Effect that affects your mind or senses.' },
    { name: 'Perfect Guard',         sdCost: 1, recharge: 'rest',  description: 'When you increase your DEF via Fortified Defense, also apply it to one ally within Reach for 1 additional SD.' },
    { name: 'Duelist',               sdCost: 1, recharge: 'rest',  description: 'When you target a single foe, spend 1 SD to keep them focused on you for a round.' },
    { name: 'Battlefield Instinct',  sdCost: 1, recharge: 'rest',  description: 'While facing a hostile creature, spend 1 SD to get a yes/no answer: Is it expecting reinforcements? Does it have a trick up its sleeve? Is it trying to escape?' },
    { name: 'Exploit Opening',       sdCost: 1, recharge: 'rest',  description: 'When an ally hits a target, spend 1 SD to immediately follow up with an attack against that target as part of your ally\'s turn.' },
    { name: 'Situational Awareness', sdCost: 1, recharge: 'rest',  description: 'Spend 1 SD to ask the GM: What is the biggest threat right now? What enemy is vulnerable? How can I gain the advantage?' },
    { name: 'Anti-magic Strike',     sdCost: 1, recharge: 'rest',  description: 'When you make an attack, spend 1 SD to ignore any enchantments your target has on their armor.' },
    { name: 'Warrior\'s Eye',        sdCost: 1, recharge: 'rest',  description: 'When you observe an enemy\'s weapon or fighting style, spend 1 SD to learn their maximum damage and if their weapon is enchanted.' },
  ],
  Hunter: [
    { name: 'Uncanny Focus',       sdCost: 1, recharge: 'rest', description: 'Spend 1 SD to sharpen one physical sense to superhuman level (sight, hearing, touch, smell, or taste) for a scene. Perceive information imperceivable by most.' },
    { name: 'Threat Assessment',   sdCost: 1, recharge: 'rest', description: 'Spend 1 SD to detect non-magical dangers in your area. Roll: 10+ aware of all dangers and how to avoid them for the scene; 7-9 aware of some; 2-6 unaware.' },
    { name: 'Quick Reflexes',      sdCost: 1, recharge: 'rest', description: 'Spend 1 SD to react with inhuman speed — dodge a trap, evade an attack, or catch a falling object.' },
    { name: 'Wisdom of the Prey',  sdCost: 1, recharge: 'rest', description: 'Spend 1 SD to instantly know if any creature is trying to hide from, sneak, or track you, and whether it\'s intelligent or animal. Does not reveal location.' },
    { name: 'No Escape',           sdCost: 1, recharge: 'rest', description: 'When a creature attempts to flee, spend 1 SD to quickly catch up. Roll: 10+ catch up easily; 7-9 catch up with complication; 2-6 creature evades.' },
    { name: 'Sense the Unnatural', sdCost: 1, recharge: 'rest', description: 'Spend 1 SD to detect Magical, Undead, Aberrant, Elemental, or Construct creatures within Far range. Learn category and direction, even through barriers.' },
    { name: 'Pathfinder',          sdCost: 1, recharge: 'rest', description: 'Spend 1 SD to find a way through a single impassable terrain obstacle (cliff, ravine, sheer wall). Guided creatures must also spend 1 SD.' },
    { name: 'Camouflage',          sdCost: 1, recharge: 'rest', description: 'Spend 1 SD to blend into your surroundings for a scene, unless you attack, move, or speak.' },
    { name: 'Hunter\'s Mask',      sdCost: 1, recharge: 'rest', description: 'When appearing as another humanoid, spend 1 SD to create a perfect disguise including mannerisms and voice. Lasts until your next rest.' },
  ],
  Vindicator: [
    { name: 'Vindictive Presence', sdCost: 1, recharge: 'rest', description: 'Spend 1 SD to intimidate enemies engaging you. For the rest of the scene, as long as they can see you, they try to move farther away. May still make ranged attacks.' },
    { name: 'Stand Strong',        sdCost: 1, recharge: 'rest', description: 'Allies within sight gain +1 DEF as long as you are actively fighting.' },
    { name: 'Inspiration',         sdCost: 1, recharge: 'rest', description: 'When you hit with an attack, spend 1 SD to inspire a nearby ally — they regain 1 spent SD.' },
    { name: 'Vengeful Smite',      sdCost: 1, recharge: 'rest', description: 'When you strike an enemy who has harmed an ally, spend 1 SD to deal double damage.' },
    { name: 'Incur the Wrath',     sdCost: 1, recharge: 'rest', description: 'When an ally drops to 0 HP from an attack, spend 1 SD to immediately strike the attacker if in range. If it hits, deal maximum damage.' },
    { name: 'War Cry',             sdCost: 1, recharge: 'rest', description: 'During combat, spend 1 SD to shout. For the rest of the scene, allies within Nearby range gain +1 to damage rolls and cannot be moved unwillingly.' },
    { name: 'Foil',                sdCost: 1, recharge: 'rest', description: 'Spend 1 SD to cause a creature you can see to falter mid-action. Roll: 10+ their attempt fails; 7-9 partial success; 2-6 they succeed and you are at a disadvantage.' },
    { name: 'Shrine',              sdCost: 3, recharge: 'rest', description: 'When binding yourself to a Cause, spend 2 additional SD to dedicate a shrine to it. Until next rest, while the shrine stands, you have the Clarity effect.', materials: 'Materials or symbol of devotion' },
    { name: 'Dedicated Weapon',    sdCost: 1, recharge: 'rest', description: 'Spend 1 SD to dedicate your weapon to your Cause until your next rest. Enemies damaged by it have their DEF reduced by -1 (once per creature).' },
  ],
  Enchanter: [
    { name: 'Runic Chain',    sdCost: 1, recharge: 'rest', description: 'When activating a Rune, spend 1 additional SD to also affect another item within Nearby range of the first, even without a Rune.' },
    { name: 'Magical Bomb',   sdCost: 2, recharge: 'rest', description: 'When activating a Rune, spend 2 SD instead of 1 to overcharge it, causing an explosion. Adds your damage die. Roll: 10+ item undamaged; 7-9 needs repair; 2-6 item broken.' },
    { name: 'Runeskin',       sdCost: 2, recharge: 'none', description: 'Spend 2 SD to tattoo a Rune permanently onto your skin. When activated, you take 1d4 damage.' },
    { name: 'Disenchant',     sdCost: 1, recharge: 'rest', description: 'Spend 1 SD to deactivate an enchantment or curse you are aware of. Roll: 10+ success; 7-9 weakened but remains; 2-6 fails and flares with extra potency for one scene.' },
    { name: 'Triggered Rune', sdCost: 1, recharge: 'none', description: 'When inscribing a Rune, spend 1 additional SD to bind it to a trigger condition. Activates automatically when the condition is met.' },
    { name: 'Incantation',    sdCost: 1, recharge: 'rest', description: 'Spend 1 SD to recite an enchantment or curse from your Tome targeting yourself or a creature/object you can see. The effect is instantaneous and fades immediately.' },
    { name: 'Runethief',      sdCost: 1, recharge: 'rest', description: 'If you see a Rune you didn\'t etch, spend 1 SD to try to control it. Roll: 10+ Rune is yours; 7-9 temporary control for a few minutes; 2-6 fail.' },
    { name: 'Sign of Binding',sdCost: 2, recharge: 'none', description: 'Add the Sign of Binding to a Tome enchantment/curse, making its effect persist until removed magically. Activation via Rune or Incantation costs 2 SD instead of 1.' },
    { name: 'Sign of Mind',   sdCost: 2, recharge: 'none', description: 'Add the Sign of Mind to a Tome enchantment/curse, allowing it to influence or alter the mind of a creature. Activation via Rune or Incantation costs 2 SD instead of 1.' },
  ],
  Delver: [
    { name: 'Ritual of Appeasing', sdCost: 1, recharge: 'rest', description: 'Spend 1 SD to conduct a ritual that calms an active hazardous Rite. Takes a few minutes; all involved offer something of genuine value (permanently lost). Until next rest, the Rite won\'t target anyone involved.' },
    { name: 'Dispel',              sdCost: 1, recharge: 'rest', description: 'Spend 1 SD to negate an ancient Rite you are aware of. Roll: 10+ Rite dissipates; 7-9 weakens for one round; 2-6 Rite resists and flares up.' },
    { name: 'Avoid',               sdCost: 1, recharge: 'rest', description: 'Spend 1 SD to pass safely through a hazardous Rite you are aware of. Allows you to bypass the effect once, applies only to you.' },
    { name: 'Clean Getaway',       sdCost: 1, recharge: 'rest', description: 'Spend 1 SD. Any creature pursuing you and any creature traveling with you immediately loses the trail.' },
    { name: 'Mind Map',            sdCost: 1, recharge: 'rest', description: 'Spend 1 SD to imagine a map of your location. Until next rest, always know where you are and your cardinal directions; you cannot become lost.' },
    { name: 'Decipher Language',   sdCost: 1, recharge: 'rest', description: 'Spend 1 SD to study a written language during a focused scene. Roll: 10+ learn it fully; 7-9 partial understanding; 2-6 misunderstand and cause confusion.' },
    { name: 'Disarm',              sdCost: 1, recharge: 'none', description: 'Spend 1 SD to permanently disarm a trap you have already identified or seen triggered. The trap won\'t activate again unless repaired.' },
    { name: 'Studious',            sdCost: 1, recharge: 'rest', description: 'When examining an ancient relic, ruin, or artifact, spend 1 SD to recall scholarly knowledge about its history, design, cultural significance, or original function.' },
    { name: 'Guide',               sdCost: 1, recharge: 'rest', description: 'Spend 1 SD while navigating a hazardous area to find the safest visible path. You and those guided avoid environmental dangers along this path.' },
  ],
  Wildspeaker: [
    { name: 'Earthsight',    sdCost: 1, recharge: 'rest', description: 'While Tethered to Earth, spend 1 SD to sense movement of all creatures within Nearby range through ground vibrations, even if invisible or obscured. Lasts one scene.' },
    { name: 'Deep Breather', sdCost: 1, recharge: 'rest', description: 'While Tethered to Water, spend 1 SD to gain Water Breathing for as long as you are submerged, up to the next rest.' },
    { name: 'Frostblood',    sdCost: 1, recharge: 'rest', description: 'While Tethered to Ice, spend 1 SD to be immune to cold damage and move across icy terrain without penalty for one scene.' },
    { name: 'Embermarked',   sdCost: 1, recharge: 'rest', description: 'While Tethered to Fire, spend 1 SD to be immune to burning damage and radiate heat for one scene.' },
    { name: 'Wind Guardian', sdCost: 1, recharge: 'rest', description: 'While Tethered to Air, spend 1 SD to be shielded from all non-magic ranged attacks for one scene.' },
    { name: 'Regrowth',      sdCost: 1, recharge: 'rest', description: 'While Tethered to Plant-life, spend 1 SD to restore the most recent HP loss suffered by you and any creatures you have extended this Tether to.' },
    { name: 'Beast-Tongue',  sdCost: 1, recharge: 'rest', description: 'Spend 1 SD to speak with natural animals fluently for one scene. Roll: 10+ accomplishes what you wanted; 7-9 friendly but uninterested; 2-6 frightened or hostile.' },
    { name: 'Wild Empath',   sdCost: 1, recharge: 'rest', description: 'Spend 1 SD to calm an animal, redirect it, or cause it to adopt you as part of its group. Roll: 10+ responds favorably; 7-9 unbothered but not friendly; 2-6 angered.' },
    { name: 'Beast Link',    sdCost: 1, recharge: 'rest', description: 'Spend 1 SD to bond with an animal you can see. Give it simple commands and sense what it sees, hears, or smells. While sensing, you are unaware of your own surroundings. Lasts one scene.' },
  ],
  Alchemist: [
    { name: 'Liminalis Gate',          sdCost: 1, recharge: 'rest', description: 'Once per rest, create an anchor circle (3 Essences of Element). Once per rest, create a portal circle to link to the anchor. Open for one round when ignited; all who pass through teleport to the anchor.', materials: '3 Essences of Element per circle' },
    { name: 'Scry',                    sdCost: 1, recharge: 'rest', description: 'Spend 1 SD and spread 2 Essences of Sense over a mirror to see and hear a known creature for one scene. Mirror faintly pulls toward their location for one day.', materials: '2 Essences of Sense + mirror' },
    { name: 'Solar Lens',              sdCost: 1, recharge: 'rest', description: 'Charge a glass/crystal sphere with 1 Essence of Element + 1 Vitality in sunlight (1 hour). Spend 1 SD to fire a blinding beam: 10+ Blinded for scene (Undead also ignites); 7-9 Blinded one round; 2-6 you or ally blinded.', materials: '1 Essence of Element + 1 Essence of Vitality (to charge)' },
    { name: 'Homunculus Agent',        sdCost: 1, recharge: 'rest', description: 'Spend 1 SD to shape clay or scrap metal into a Small humanoid that awakens for one day. Has your HP, no DEF, follows simple commands, can carry objects. See and hear through it at will.', materials: '1 Essence of Vitality + 1 Essence of Transformation + clay or scrap metal' },
    { name: 'Elemental Mastery',       sdCost: 1, recharge: 'rest', description: 'Spend 1 SD and 1 Essence of Element to compel an Elemental creature you can see to follow one simple command for a scene. Roll: 10+ obeys; 7-9 obeys imperfectly; 2-6 turns hostile.', materials: '1 Essence of Element' },
    { name: 'Arcane Traces',           sdCost: 1, recharge: 'rest', description: 'Spend 1 SD and 1 Essence of Sense scattered into the air to learn what magical forces are active in the area and their relative strength.', materials: '1 Essence of Sense' },
    { name: 'Seal of Karakat',         sdCost: 1, recharge: 'rest', description: 'Spend 1 SD to inscribe a circular anti-magic barrier. For one scene, magical effects are suppressed inside and Magical creatures gain Fatigue. Breaking the circle ends it.', materials: '1 Essence of Element + 1 Essence of Decay' },
    { name: 'Artegried\'s Abjuration', sdCost: 1, recharge: 'rest', description: 'Draw a line/circle to block Undead, Aberration, and Elemental creatures from crossing for a scene or until dissolved with salt water.', materials: '1 Essence of Decay + 1 Essence of Transformation + 1 Essence of Element' },
    { name: 'Alchemical Bread',        sdCost: 1, recharge: 'rest', description: 'Spend 1 SD and 1 Essence of Vitality to transmute a small amount of dirt into three nourishing loaves. Each grants 2 temporary HP; crumbles after one day if uneaten.', materials: '1 Essence of Vitality + small amount of dirt' },
  ],
  Evoker: [
    { name: 'Elsesight',          sdCost: 1, recharge: 'rest', description: 'Spend 1 SD or 2 HP to see from the perspective of one of your summoned creatures. You are blind while doing so.' },
    { name: 'Soul Weapon',        sdCost: 1, recharge: 'rest', description: 'Spend 1 SD or 2 HP to ignite your weapon with Soul Fire for one scene. Strikes ignore armor. Reducing a creature to 0 HP regains 1 SD and 5 HP.' },
    { name: 'Radiant Outpouring', sdCost: 1, recharge: 'rest', description: 'Spend 1 SD or 5 HP to heal up to three allies you can see for 2d4 HP each. Cannot heal yourself.' },
    { name: 'Soul Anchor',        sdCost: 1, recharge: 'rest', description: 'Once per rest, spend 1 SD or 5 HP to anchor a creature to your soul. If they would drop to 0 HP, they drop to 1 HP instead and the anchor is consumed. One at a time.' },
    { name: 'Soulguard',          sdCost: 1, recharge: 'rest', description: 'Spend 1 SD or 5 HP to nullify half the damage dealt to an ally within Reach (rounded down).' },
    { name: 'Mark of Passing',    sdCost: 1, recharge: 'rest', description: 'Spend 1 SD or 5 HP to mark a creature for death. Until end of scene, next damage they take is doubled then the mark fades. One mark active at a time.' },
    { name: 'Conjure Soul Fire',  sdCost: 1, recharge: 'rest', description: 'Spend 1 SD or 5 HP to conjure Soul Fire in your hand. Hurl as ranged attack (Far, ignores DEF), use as magical light, or ignite flammable material.' },
    { name: 'Fear of the Grave',  sdCost: 1, recharge: 'rest', description: 'Spend 1 SD or 5 HP to instill death-dread in a creature. Roll: 10+ Fear effect for scene; 7-9 flinches briefly; 2-6 creature resists.' },
    { name: 'Death\'s Memory',    sdCost: 1, recharge: 'rest', description: 'Spend 1 SD or 5 HP to touch a corpse and witness its final moments. Roll: 10+ clear memory, ask GM one truthful question; 7-9 fragmented, learn something useful but briefly stunned; 2-6 Cursed until next rest.' },
  ],
  Tecton: [
    { name: 'Unfolding Pattern',       sdCost: 1, recharge: 'rest', description: 'Spend 1 SD to predict actions of everything you can see for the next few moments. Roll: 10+ GM tells exact actions and you can react to change them; 7-9 general idea; 2-6 unknown.' },
    { name: 'Doctrine of the Body',    sdCost: 1, recharge: 'rest', description: 'When studying a creature, spend 1 SD to learn its DEF, current HP, Tags, and damage die.' },
    { name: 'Counterpoise',            sdCost: 1, recharge: 'rest', description: 'Spend 1 SD to observe combat flow. For the rest of the scene, if attacked by a creature with a larger damage die than yours, temporarily gain that die.' },
    { name: 'Discipline of the Body',  sdCost: 1, recharge: 'rest', description: 'Spend 1 SD to align body and mind. For the next round, become immune to all negative Status Effects and remove any currently affecting you.' },
    { name: 'Discordance',             sdCost: 1, recharge: 'rest', description: 'Spend 1 SD to disrupt a magical effect on an object or creature within Close range for the rest of the scene. Roll: 10+ effect collapses; 7-9 disrupted for one round; 2-6 take 1d4 backlash.' },
    { name: 'Illumination',            sdCost: 1, recharge: 'rest', description: 'Spend 1 SD to align focus with a creature within Nearby range. Both your Skill Bonuses are doubled until end of scene.' },
    { name: 'Fulcrum Strike',          sdCost: 1, recharge: 'rest', description: 'Spend 1 SD to meditate on force and motion. For the rest of the scene, your attacks ignore DEF.' },
    { name: 'Enlightenment',           sdCost: 1, recharge: 'rest', description: 'Once per rest, spend 1 SD to roll twice on any action roll and take the higher result.' },
    { name: 'Work of Wonder',          sdCost: 2, recharge: 'rest', description: 'Once per rest, spend 2 SD and a scene to craft something that instills awe. Friendly/neutral sentient creatures who see it make you gain +3 to persuasion, deception, or befriending rolls.', materials: 'Materials you possess' },
  ],
}
