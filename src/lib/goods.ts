import type { Good } from '../types'

// ── Built-in goods catalog ──────────────────────────────────────────────
// All prices in COPPER. Anchored to the manual:
//   • 1 Diamond = 10 Emeralds = 100 Gold = 1,000 Iron = 10,000 Copper (p.3)
//   • Starting gear offers "10 Gold or 5 Rations" → 1 Ration = 200c (class pages)
//   • Gem goods are priced at exactly their currency value, since emeralds
//     and diamonds ARE money in Soulscraft.
// IDs are stable strings — market listings reference them, so never rename.

const g = (
  id: string,
  name: string,
  category: Good['category'],
  basePriceCopper: number,
  tags: Good['tags'],
  extra?: Partial<Good>,
): Good => ({ id, name, category, basePriceCopper, tags, ...extra })

export const GOODS_CATALOG: Good[] = [
  // ── Food & lodging ────────────────────────────────────────────────────
  g('bread',          'Bread Loaf',            'food', 15,  ['grain'], { unit: 'each' }),
  g('meal-common',    'Common Meal',           'food', 25,  ['grain', 'meat'], { unit: 'each' }),
  g('meal-fine',      'Fine Meal',             'food', 120, ['meat', 'luxury'], { unit: 'each' }),
  g('ration',         'Ration',                'food', 200, ['grain', 'meat'], { unit: 'per day', description: 'One day of preserved travel food. Manual-anchored: 5 rations ≈ 10 gold.' }),
  g('cooked-meat',    'Cooked Meat',           'food', 40,  ['meat'], { unit: 'each' }),
  g('fish-fresh',     'Fresh Fish',            'food', 30,  ['fish'], { unit: 'each' }),
  g('golden-apple',   'Golden Apple',          'food', 1500, ['luxury', 'magic'], { unit: 'each' }),
  g('ale',            'Mug of Ale',            'food', 8,   ['grain'], { unit: 'each' }),
  g('inn-common',     'Inn — Common Room',     'service', 50,  ['grain'], { unit: 'per night' }),
  g('inn-private',    'Inn — Private Room',    'service', 150, ['luxury'], { unit: 'per night' }),
  g('inn-fine',       'Inn — Fine Suite',      'service', 500, ['luxury'], { unit: 'per night' }),
  g('stable-night',   'Stabling',              'service', 40,  ['livestock'], { unit: 'per night' }),

  // ── Weapons ───────────────────────────────────────────────────────────
  g('wood-sword',     'Wood Sword',     'weapon', 100,    ['weapon', 'wood']),
  g('stone-sword',    'Stone Sword',    'weapon', 250,    ['weapon', 'stone']),
  g('iron-sword',     'Iron Sword',     'weapon', 800,    ['weapon', 'metal'], { recipe: [{ goodId: 'iron-ingot', qty: 2 }, { goodId: 'oak-planks', qty: 1 }], craftLabour: 0.5 }),
  g('gold-sword',     'Gold Sword',     'weapon', 1500,   ['weapon', 'metal', 'luxury'], { recipe: [{ goodId: 'gold-ingot', qty: 2 }, { goodId: 'oak-planks', qty: 1 }], craftLabour: 0.4 }),
  g('diamond-sword',  'Diamond Sword',  'weapon', 24000,  ['weapon', 'gem', 'luxury'], { recipe: [{ goodId: 'diamond-gem', qty: 2 }, { goodId: 'oak-planks', qty: 1 }], craftLabour: 0.6 }),
  g('wood-axe',       'Wood Axe',       'weapon', 120,    ['weapon', 'wood']),
  g('stone-axe',      'Stone Axe',      'weapon', 280,    ['weapon', 'stone']),
  g('iron-axe',       'Iron Axe',       'weapon', 900,    ['weapon', 'metal'], { recipe: [{ goodId: 'iron-ingot', qty: 3 }, { goodId: 'oak-planks', qty: 1 }], craftLabour: 0.4 }),
  g('gold-axe',       'Gold Axe',       'weapon', 1700,   ['weapon', 'metal', 'luxury']),
  g('diamond-axe',    'Diamond Axe',    'weapon', 26000,  ['weapon', 'gem', 'luxury']),
  g('iron-dagger',    'Iron Dagger',    'weapon', 400,    ['weapon', 'metal'], { recipe: [{ goodId: 'iron-ingot', qty: 1 }], craftLabour: 0.5 }),
  g('bow',            'Bow',            'weapon', 500,    ['weapon', 'wood'], { recipe: [{ goodId: 'oak-planks', qty: 1 }, { goodId: 'string', qty: 3 }], craftLabour: 0.6 }),
  g('crossbow',       'Crossbow',       'weapon', 900,    ['weapon', 'wood', 'metal']),
  g('arrows-20',      'Arrows',         'weapon', 100,    ['weapon', 'wood'], { unit: 'bundle of 20' }),
  g('trident',        'Trident',        'weapon', 6000,   ['weapon', 'metal', 'imported']),

  // ── Armor ─────────────────────────────────────────────────────────────
  g('leather-armor',  'Leather Armor (set)',   'armor', 600,   ['armor', 'cloth', 'livestock']),
  g('chain-armor',    'Chainmail Armor (set)', 'armor', 2000,  ['armor', 'metal']),
  g('iron-armor',     'Iron Armor (set)',      'armor', 4000,  ['armor', 'metal'], { recipe: [{ goodId: 'iron-ingot', qty: 24 }], craftLabour: 0.6 }),
  g('gold-armor',     'Gold Armor (set)',      'armor', 7000,  ['armor', 'metal', 'luxury']),
  g('diamond-armor',  'Diamond Armor (set)',   'armor', 80000, ['armor', 'gem', 'luxury'], { recipe: [{ goodId: 'diamond-gem', qty: 7 }], craftLabour: 0.15 }),
  g('leather-shield', 'Leather Shield',        'armor', 200,   ['armor', 'cloth', 'wood']),
  g('iron-shield',    'Iron Shield',           'armor', 1000,  ['armor', 'metal'], { recipe: [{ goodId: 'iron-ingot', qty: 6 }, { goodId: 'oak-planks', qty: 1 }], craftLabour: 0.35 }),

  // ── Tools ─────────────────────────────────────────────────────────────
  g('wood-pickaxe',   'Wood Pickaxe',    'tool', 80,    ['tool', 'wood']),
  g('stone-pickaxe',  'Stone Pickaxe',   'tool', 200,   ['tool', 'stone']),
  g('iron-pickaxe',   'Iron Pickaxe',    'tool', 600,   ['tool', 'metal'], { recipe: [{ goodId: 'iron-ingot', qty: 3 }, { goodId: 'oak-planks', qty: 1 }], craftLabour: 0.4 }),
  g('diamond-pickaxe','Diamond Pickaxe', 'tool', 32000, ['tool', 'gem', 'luxury']),
  g('iron-shovel',    'Iron Shovel',     'tool', 300,   ['tool', 'metal']),
  g('fishing-rod',    'Fishing Rod',     'tool', 150,   ['tool', 'wood', 'fish']),
  g('shears',         'Shears',          'tool', 250,   ['tool', 'metal']),
  g('torch-bundle',   'Torches',         'tool', 25,    ['wood', 'fuel'], { unit: 'bundle of 10' }),
  g('lantern',        'Lantern',         'tool', 300,   ['metal', 'fuel']),
  g('rope-50',        'Rope (50 ft)',    'tool', 50,    ['cloth']),
  g('tent',           'Tent',            'tool', 450,   ['cloth', 'wood']),
  g('crafting-table', 'Crafting Table',  'tool', 1000,  ['magic', 'wood'], { description: 'Non-craftable magical item; easily found, bought, or earned (manual p.84).' }),

  // ── Raw materials & blocks ────────────────────────────────────────────
  g('oak-planks',     'Oak Planks',      'material', 40,    ['wood'], { unit: 'stack of 10 blocks' }),
  g('stone-blocks',   'Stone Blocks',    'material', 50,    ['stone'], { unit: 'stack of 10 blocks' }),
  g('glass-blocks',   'Glass Blocks',    'material', 150,   ['stone', 'luxury'], { unit: 'stack of 10 blocks' }),
  g('wool',           'Wool',            'material', 30,    ['cloth', 'livestock'], { unit: 'stack of 10 blocks' }),
  g('string',         'String',          'material', 15,    ['cloth'], { unit: 'each' }),
  g('coal',           'Coal',            'material', 20,    ['fuel', 'stone'], { unit: 'each' }),
  g('iron-ingot',     'Iron Ingot',      'material', 60,    ['metal'], { unit: 'each' }),
  g('gold-ingot',     'Gold Ingot',      'material', 600,   ['metal', 'luxury'], { unit: 'each' }),
  g('emerald-gem',    'Emerald',         'material', 1000,  ['gem', 'luxury'], { unit: 'each', description: 'Worth exactly 1 Emerald of currency — emeralds are money.' }),
  g('diamond-gem',    'Diamond',         'material', 10000, ['gem', 'luxury'], { unit: 'each', description: 'Worth exactly 1 Diamond of currency — diamonds are money.' }),
  g('redstone-dust',  'Redstone Dust',   'material', 150,   ['magic', 'alchemy'], { unit: 'pouch', description: 'Extends ongoing potions by one scene per pouch.' }),
  g('glowstone-dust', 'Glowstone Dust',  'material', 200,   ['magic'], { unit: 'pouch' }),
  g('obsidian',       'Obsidian',        'material', 800,   ['stone', 'magic'], { unit: 'block' }),

  // ── Alchemy & magic ───────────────────────────────────────────────────
  g('lapis',          'Lapis Lazuli',         'enchanting', 250,   ['magic', 'gem'], { unit: 'each', description: 'Enchanting fuel — an enchantment costs lapis equal to its level (manual p.86).' }),
  g('ench-book-1',    'Enchanted Book (Lv 1)','enchanting', 2500,  ['magic'], { unit: 'each' }),
  g('ench-book-2',    'Enchanted Book (Lv 2)','enchanting', 5000,  ['magic', 'luxury'], { unit: 'each' }),
  g('ench-book-3',    'Enchanted Book (Lv 3)','enchanting', 10000, ['magic', 'luxury'], { unit: 'each' }),
  g('potion-healing', 'Potion of Healing',    'potion', 600,  ['alchemy', 'magic'], { unit: 'bottle' }),
  g('potion-swift',   'Potion of Swiftness',  'potion', 500,  ['alchemy', 'magic'], { unit: 'bottle' }),
  g('potion-strength','Potion of Strength',   'potion', 700,  ['alchemy', 'magic'], { unit: 'bottle' }),
  g('potion-fire-res','Potion of Fire Resistance', 'potion', 650, ['alchemy', 'magic'], { unit: 'bottle' }),
  g('glass-bottle',   'Glass Bottle',         'material', 25, ['stone', 'alchemy'], { unit: 'each' }),
  g('ender-pearl',    'Ender Pearl',          'material', 3000, ['magic', 'imported'], { unit: 'each' }),
  g('blaze-rod',      'Blaze Rod',            'material', 2500, ['magic', 'imported', 'fuel'], { unit: 'each' }),

  // ── Mounts & transport ────────────────────────────────────────────────
  g('horse',          'Riding Horse',    'mount', 8000,  ['livestock'], { unit: 'each' }),
  g('draft-horse',    'Draft Horse',     'mount', 6000,  ['livestock'], { unit: 'each' }),
  g('saddle',         'Saddle',          'mount', 1200,  ['cloth', 'livestock'], { unit: 'each' }),
  g('boat',           'Rowboat',         'mount', 1500,  ['wood'], { unit: 'each' }),
  g('cart',           'Cart',            'mount', 3000,  ['wood'], { unit: 'each' }),

  // ── Services ──────────────────────────────────────────────────────────
  g('healing-service','Healer\'s Care',       'service', 800, ['magic'], { unit: 'per visit' }),
  g('passage-land',   'Caravan Passage',      'service', 150, ['livestock'], { unit: 'per day' }),
  g('passage-sea',    'Ship Passage',         'service', 300, ['fish', 'imported'], { unit: 'per day' }),
  g('hireling',       'Hireling Labourer',    'service', 250, ['grain'], { unit: 'per day' }),
  g('guide',          'Local Guide',          'service', 400, [], { unit: 'per day' }),
  g('bath',           'Bathhouse Visit',      'service', 30,  ['luxury'], { unit: 'each' }),
  g('smith-repair',   'Smith — Gear Repair',  'service', 350, ['metal', 'tool'], { unit: 'per piece' }),

  // ── Luxury & trade goods ──────────────────────────────────────────────
  g('silk',           'Silk Cloth',      'luxury', 900,   ['cloth', 'luxury', 'imported'], { unit: 'bolt' }),
  g('spices',         'Rare Spices',     'luxury', 1200,  ['luxury', 'imported'], { unit: 'pouch' }),
  g('jewelry',        'Fine Jewelry',    'luxury', 5000,  ['gem', 'luxury'], { unit: 'piece' }),
  g('music-box',      'Music Box',       'luxury', 2200,  ['luxury', 'metal'], { unit: 'each' }),
  g('dye-rare',       'Rare Dyes',       'luxury', 350,   ['cloth', 'luxury'], { unit: 'pouch' }),
]

const CATALOG_BY_ID = new Map(GOODS_CATALOG.map(good => [good.id, good]))

/** Look up a built-in good. Custom goods live in the economy store. */
export function getCatalogGood(id: string): Good | undefined {
  return CATALOG_BY_ID.get(id)
}

export const GOOD_CATEGORIES: { id: Good['category']; label: string; icon: string }[] = [
  { id: 'weapon',     label: 'Weapons',     icon: '⚔️' },
  { id: 'armor',      label: 'Armor',       icon: '🛡️' },
  { id: 'tool',       label: 'Tools',       icon: '⛏️' },
  { id: 'food',       label: 'Food',        icon: '🍞' },
  { id: 'material',   label: 'Materials',   icon: '🧱' },
  { id: 'potion',     label: 'Potions',     icon: '🧪' },
  { id: 'enchanting', label: 'Enchanting',  icon: '📖' },
  { id: 'mount',      label: 'Mounts',      icon: '🐎' },
  { id: 'service',    label: 'Services',    icon: '🛎️' },
  { id: 'luxury',     label: 'Luxuries',    icon: '💎' },
  { id: 'misc',       label: 'Misc',        icon: '📦' },
]

export const ALL_GOOD_TAGS = [
  'metal', 'grain', 'meat', 'wood', 'stone', 'cloth',
  'magic', 'luxury', 'livestock', 'fish', 'gem',
  'alchemy', 'fuel', 'tool', 'weapon', 'armor', 'imported',
] as const
