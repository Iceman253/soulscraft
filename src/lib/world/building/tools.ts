// Mining tools: which carried tools count, and the bonus each gives.
import type { Character, WeaponMaterial, WeaponType } from '../../../types'

export type ToolTier = 'none' | 'wooden' | 'stone' | 'copper' | 'iron' | 'gold' | 'diamond' | 'netherite'

/** Mining tool bonuses (p.82). The Guidebook gives no value for having no tool, so
 *  'none' is a house rule set one below its worst tool; the GM still decides
 *  whether the material can be mined at all. */
export const TOOL_BONUS: Record<ToolTier, number> = {
  none: -3,
  wooden: -2,
  stone: -1,
  copper: 0,
  iron: 1,
  gold: 2,
  diamond: 3,
  netherite: 4,
}

export type ToolKind = 'pickaxe' | 'axe' | 'shovel' | 'hoe'

const KIND_WORDS: [ToolKind, RegExp][] = [
  ['pickaxe', /\b(pickaxe|pick)\b/i],
  ['axe', /\baxe\b/i],
  ['shovel', /\b(shovel|spade)\b/i],
  ['hoe', /\bhoe\b/i],
]

/** What each tool other than a pickaxe is made for (a pickaxe suits everything).
 *  Off its material it is far worse: see miningToolBonus. */
const SUITED: Record<Exclude<ToolKind, 'pickaxe'>, { what: string; re: RegExp }> = {
  axe: { what: 'wood', re: /\b(wood\w*|logs?|planks?|timber|lumber|oak|spruce|birch|jungle|acacia|mangrove|cherry|bamboo|stems?|hyphae|trees?)\b/i },
  shovel: { what: 'dirt, sand or gravel', re: /\b(dirt|sand|gravel|clay|mud|snow|soil|grass|podzol|mycelium)\b/i },
  hoe: { what: 'leaves and plants', re: /\b(leaves|leaf|hay|moss|sculk|warts?|sponges?|vines?)\b/i },
}

/** How much worse an axe, shovel or hoe is than a pickaxe of the same material
 *  when used on something it isn't made for. Never worse than no tool at all. */
export const OFF_TOOL_PENALTY = 3

const TIER_WORDS: [ToolTier, RegExp][] = [
  ['netherite', /\bnetherite\b/i],
  ['diamond', /\bdiamond\b/i],
  ['gold', /\bgold(en)?\b/i],
  ['iron', /\biron\b/i],
  ['copper', /\bcopper\b/i],
  ['stone', /\bstone\b/i],
  ['wooden', /\bwood(en)?\b/i],
]

// Mining equipment that can sit in a weapon slot. Swords, maces and the like can't mine.
const SLOT_TOOL_TYPES: WeaponType[] = ['pickaxe', 'axe', 'shovel']
const TIER_OF_MATERIAL: Partial<Record<WeaponMaterial, ToolTier>> = {
  wood: 'wooden', stone: 'stone', iron: 'iron', gold: 'gold', diamond: 'diamond', netherite: 'netherite',
}

export interface CarriedTool {
  tier: Exclude<ToolTier, 'none'>
  kind: ToolKind
  itemName: string
}

/** Identifies one carried tool in a picker, e.g. "axe:iron". */
export const toolKey = (t: Pick<CarriedTool, 'kind' | 'tier'>) => `${t.kind}:${t.tier}`

/** Mining tools a character actually has with them, best material first: on-hand
 *  items whose name gives a tool and its material, plus mining equipment in a weapon
 *  slot. Other weapons don't count, and chests stay at base (p.7), so storage doesn't
 *  either. One entry per kind and material. */
export function carriedMiningTools(c: Pick<Character, 'onHand' | 'weaponLoadout'>): CarriedTool[] {
  const found = new Map<string, CarriedTool>()
  const add = (kind: ToolKind | undefined, tier: ToolTier | undefined, itemName: string) => {
    if (!kind || !tier || tier === 'none') return
    const tool = { tier, kind, itemName }
    if (!found.has(toolKey(tool))) found.set(toolKey(tool), tool)
  }
  for (const item of c.onHand.items) {
    const name = `${item.customName ?? ''} ${item.name}`
    const kind = KIND_WORDS.find(([, re]) => re.test(name))?.[0]
    if (kind) add(kind, TIER_WORDS.find(([, re]) => re.test(name))?.[0], item.customName ?? item.name)
  }
  for (const weapon of [c.weaponLoadout?.mainHand, c.weaponLoadout?.offHand]) {
    if (weapon && SLOT_TOOL_TYPES.includes(weapon.type)) add(weapon.type as ToolKind, TIER_OF_MATERIAL[weapon.material], weapon.name)
  }
  return [...found.values()].sort((a, b) => TOOL_BONUS[b.tier] - TOOL_BONUS[a.tier])
}

/** Is this tool made for everything being mined? A pickaxe always is; an axe only
 *  when it's all wood, and so on. Nothing named yet counts as not suited. */
export function toolSuits(kind: ToolKind, materials: string[]): boolean {
  if (kind === 'pickaxe') return true
  return materials.length > 0 && materials.every(m => SUITED[kind].re.test(m))
}

/** What a tool adds to a mining roll. A pickaxe gets its material's bonus (p.82). An
 *  axe, shovel or hoe gets it only on what it's made for (an axe on wood); otherwise
 *  it is OFF_TOOL_PENALTY worse, and never worse than no tool. */
export function miningToolBonus(tool: Pick<CarriedTool, 'kind' | 'tier'> | null, materials: string[]): number {
  if (!tool) return TOOL_BONUS.none
  if (toolSuits(tool.kind, materials)) return TOOL_BONUS[tool.tier]
  return Math.max(TOOL_BONUS.none, TOOL_BONUS[tool.tier] - OFF_TOOL_PENALTY)
}

/** The tool in use: what was picked (by toolKey) if the character still has it,
 *  otherwise their best tool for these materials. 'none' (no tool) is always allowed. */
export function resolveMiningTool(picked: string | null, tools: CarriedTool[], materials: string[] = []): CarriedTool | null {
  if (picked === 'none') return null
  const chosen = picked ? tools.find(t => toolKey(t) === picked) : undefined
  if (chosen) return chosen
  // Best bonus wins; on a tie, the earlier (better material) tool.
  return tools.reduce<CarriedTool | null>((best, t) =>
    !best || miningToolBonus(t, materials) > miningToolBonus(best, materials) ? t : best, null)
}

export const signed = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(n)}`

/** The tool picker's choices: only tools the character has, best for these
 *  materials first, plus no tool. */
export function miningToolOptions(tools: CarriedTool[], materials: string[] = []): { value: string; label: string }[] {
  return [
    ...[...tools]
      .sort((a, b) => miningToolBonus(b, materials) - miningToolBonus(a, materials))
      .map(t => {
        const bonus = miningToolBonus(t, materials)
        const off = t.kind !== 'pickaxe' && !toolSuits(t.kind, materials)
        return { value: toolKey(t), label: `${t.itemName} (${signed(bonus)}${off ? `, best on ${SUITED[t.kind as Exclude<ToolKind, 'pickaxe'>].what}` : ''})` }
      }),
    { value: 'none', label: `No tool (${signed(TOOL_BONUS.none)})` },
  ]
}

/** "+1 Iron pickaxe", or "−3 Iron axe (not wood)" for the roll breakdown. */
export function miningToolLabel(tool: CarriedTool | null, materials: string[]): string {
  if (!tool) return `${signed(TOOL_BONUS.none)} no tool`
  const name = `${tool.tier[0].toUpperCase()}${tool.tier.slice(1)} ${tool.kind}`
  const off = tool.kind !== 'pickaxe' && !toolSuits(tool.kind, materials)
  return `${signed(miningToolBonus(tool, materials))} ${name}${off ? ` (not ${SUITED[tool.kind as Exclude<ToolKind, 'pickaxe'>].what})` : ''}`
}
