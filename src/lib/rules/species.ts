// The playable species and their variants, with each one's trait.
import type { CombatRole } from '../../types'

export const SPECIES = [
  'Avatar', 'Hearthborn', 'Alfay', 'Tuskarin',
  'Grimborn', 'Golem', 'Dwymir', 'Enderling',
] as const

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
