// Classes: hit points, damage dice, descriptions, disciplines and their Edges,
// and each class's default skills.
import type { CombatRole, AppliedStatusEffectSpec } from '../../types'

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

/** What each class IS — shown while creating a character so the choice means
 *  something before you've read the rulebook. `summary` is the one-line
 *  archetype; `description` is condensed from the class's manual intro. */
export interface ClassInfo { summary: string; description: string }

export const CLASS_DATA: Record<string, ClassInfo> = {
  Warrior: {
    summary: 'Frontline martial powerhouse — the biggest damage die and the most HP.',
    description: 'Your body is a weapon honed by years of training. You know the rhythm of combat, the weight of steel, and the cost of victory — first into the breach and last to fall.',
  },
  Hunter: {
    summary: 'Stealthy tracker and striker — perception, ambushes, and marked prey.',
    description: 'The shadow that haunts monsters and mortals in the dark. The world is a map of motion, sound, and scent, and you read it like a book — striking from silence before your prey knows you are there.',
  },
  Vindicator: {
    summary: 'Devoted leader — rallies allies and fights for a chosen Cause.',
    description: 'The beacon that drives back the dark — or the flame that consumes all in its path. Devotion to your Cause burns like a second soul, and when you fight, others follow because they believe.',
  },
  Enchanter: {
    summary: 'Rune-scribing spellcrafter — enchants and curses objects via the Tome.',
    description: 'To you, magic is a language and you are fluent in it. You inscribe Runes that shimmer with enchanted or cursed power, imbuing objects with arcane energy beyond their crafted purpose.',
  },
  Delver: {
    summary: 'Ruin-delving explorer — relics, traps, ancient Rites, and evasion.',
    description: 'Archaeologist, treasure hunter, tomb raider — you go where others dare not, unearthing what was meant to stay buried and waking Rites that still linger beneath the world\'s dust.',
  },
  Wildspeaker: {
    summary: 'Nature mystic — tethers to the Primal Forces for aid and power.',
    description: 'Connected to the most ancient of magics: the natural order itself. You tether yourself to the Primal Forces and draw on their essence — you do not conquer nature, you are part of it.',
  },
  Alchemist: {
    summary: 'Essence-brewing crafter — potions, elixirs, and transmutation.',
    description: 'Magic saturates the world and you have learned to draw it forth — capturing Essences from living things, mineral and flame, then mixing and refining them into potent creations. Your craft is both science and art.',
  },
  Evoker: {
    summary: 'Summoner of souls — Vex, Fangs, Soul Fire, healing and reaping.',
    description: 'You died — and a voice commanded you to return. Now you summon phantasmal Vex and monstrous Fangs, conjure Soul Fire that burns through armor, and rebalance the scales of life and death themselves.',
  },
  Tecton: {
    summary: 'Scholar of the Prime Order — master crafter, builder, and tactician.',
    description: 'Your studies revealed the Prime Order: the hidden structure beneath all things. Imprinted by the Hosts, you read the composition of creation and act as a living instrument of structure and balance.',
  },
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

/** Each Discipline's bonus Skill ("This will provide a bonus Skill and an
 *  Edge" — class pages). Shown during creation beside the Edge, and granted
 *  to the character at creation with the class's Skill Bonus. Descriptions
 *  are the manual's own flavor lines. */
export const DISCIPLINE_INFO: Record<string, { skill: DefaultSkill }> = {
  // Warrior
  Soldier:        { skill: { name: 'Tactics',             combatRoles: ['utility'],            description: 'You are skilled at coordination and decision making during combat.' } },
  Mercenary:      { skill: { name: 'Brawling',            combatRoles: ['attack'],             description: 'Unarmed strikes, improvised weapons, and fighting dirty all come naturally to you.' } },
  Swashbuckler:   { skill: { name: 'Acrobatics',          combatRoles: ['defense', 'utility'], description: 'You are practiced at balancing, tumbling, or maneuvering nimbly.' } },
  // Hunter
  Assassin:       { skill: { name: 'Precision',           combatRoles: ['attack'],             description: 'You were trained to strike while your target is unaware or distracted.' } },
  Guardian:       { skill: { name: 'Observant',           combatRoles: ['utility'],            description: 'Not much goes unnoticed when you scan your area or stand guard.' } },
  Survivalist:    { skill: { name: 'Endurance',           combatRoles: ['utility'],            description: 'You have developed the ability to endure harsh environments, exhaustion, and natural hazards.' } },
  // Vindicator
  Priest:         { skill: { name: 'Sacred Lore',         combatRoles: ['utility'],            description: 'You are adept at navigating, interpreting, or interacting with religious places, practices, and texts.' } },
  Inquisitor:     { skill: { name: 'Friend or Foe',       combatRoles: ['utility'],            description: 'You have keen insight when determining whether a creature is aligned or opposed to your Cause.' } },
  Paragon:        { skill: { name: 'Take the Lead',       combatRoles: ['general'],            description: 'You are a natural leader, and push confidently forward even into danger or uncertainty.' } },
  // Enchanter
  Maledict:       { skill: { name: 'Forbidden Arts',      combatRoles: ['utility'],            description: 'You are an expert in the study of Curses and malevolent magic.' } },
  'War Mage':     { skill: { name: 'Arcane Warfare',      combatRoles: ['attack'],             description: 'You are an expert in the study of weaponized and martial magic.' } },
  Aegis:          { skill: { name: 'Shielding Magic',     combatRoles: ['defense'],            description: 'You are an expert in the study of enchantments that protect or preserve.' } },
  // Delver
  Raider:         { skill: { name: 'Light Feet',          combatRoles: ['utility'],            description: 'You tread carefully so as to not disturb your environment, leaving little evidence of your passing.' } },
  Archaeologist:  { skill: { name: 'Scholarly Reputation', combatRoles: ['general'],           description: 'You can easily gain access to restricted archives, libraries, or historical information that would usually be off limits to others.' } },
  Reliquarian:    { skill: { name: 'Arcane Touch',        combatRoles: ['utility'],            description: 'You are an expert in identifying, interpreting, and handling relics of ancient arcana.' } },
  // Wildspeaker
  Beastshaper:    { skill: { name: 'Know the Beast',      combatRoles: ['utility'],            description: 'You are able to calm, control, and predict animal behavior.' } },
  Shaman:         { skill: { name: 'Augury',              combatRoles: ['utility'],            description: 'You can read omens to sense danger or safety in natural places.' } },
  Rotmancer:      { skill: { name: 'Medicine',            combatRoles: ['utility'],            description: 'You know what plants and fungi can help cure ailments.' } },
  // Alchemist
  Thanaturge:     { skill: { name: 'Undeath Alchemy',     combatRoles: ['utility'],            description: 'You are an expert in the subject of undeath and Undead creatures.' } },
  Chronomancer:   { skill: { name: 'Temporal Theory',     combatRoles: ['utility'],            description: 'You study how time influences magical and physical change.' } },
  Monstrologist:  { skill: { name: 'Aberrant Studies',    combatRoles: ['utility'],            description: 'You are an expert on Aberration creatures.' } },
  // Evoker
  Revenant:       { skill: { name: 'Sworn Enemy',         combatRoles: ['general'],            description: 'Undead creatures generally find your presence intimidating or fear-inspiring.' } },
  Soulmender:     { skill: { name: 'Restoration',         combatRoles: ['utility'],            description: 'You have an innate ability to tend to the hurt or ailing.' } },
  Reaper:         { skill: { name: 'Lifesense',           combatRoles: ['utility'],            description: 'Living creatures find it hard to hide from you.' } },
  // Tecton
  Artisan:        { skill: { name: 'Fine Craft',          combatRoles: ['utility'],            description: 'You are an expert in refined craftsmanship.' } },
  Mechanist:      { skill: { name: 'Advanced Technology', combatRoles: ['utility'],            description: 'You are an expert in complex systems, mechanisms, and redstone.' } },
  Architect:      { skill: { name: 'Architecture',        combatRoles: ['utility'],            description: 'You are an expert in building and understanding structures.' } },
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
