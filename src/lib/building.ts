import type { Character, CharacterItem, InventorySection, ProjectTier, Structure, Trait, WeaponMaterial, WeaponType } from '../types'
import { rollDiceSpec } from './dice'
import { normalizeIcon } from './pixelArt'

// Mining, Building and block-carrying rules — Guidebook pp. 7, 81–83 (3.1e).

/** "You may carry 10 blocks of any material at a time" (on hand; storage is unlimited). */
export const BLOCK_CARRY_LIMIT = 10

/** Total blocks in a list of items (only items flagged as blocks, summing quantities). */
export function countBlocks(items: CharacterItem[]): number {
  return items.filter(i => i.isBlock).reduce((sum, i) => sum + (i.quantity ?? 1), 0)
}

// ── Mining ──────────────────────────────────────────────────────────────

/** Rulebook mining periods: 25 → ½ day, 50 → 1, 100 → 2, 200 → 4, 400 → 8. */
export const MINING_AMOUNTS: { blocks: number; days: number }[] = [
  { blocks: 25, days: 0.5 },
  { blocks: 50, days: 1 },
  { blocks: 100, days: 2 },
  { blocks: 200, days: 4 },
  { blocks: 400, days: 8 },
]

/** In-game days to mine `blocks`. The rulebook table is linear (50 blocks/day);
 *  amounts off the table round up to the next half day. */
export function miningDays(blocks: number): number {
  if (!(blocks > 0)) return 0
  return Math.ceil(blocks / 25) / 2
}

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

const signed = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(n)}`

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

export type ActionOutcome = 'success' | 'partial' | 'failure'

/** Action roll bands (p.4): 10+ full success, 7–9 partial, 6- failure. */
export function actionOutcome(total: number): ActionOutcome {
  if (total >= 10) return 'success'
  if (total >= 7) return 'partial'
  return 'failure'
}

/** Traits that sound like mining, such as a Deep Dwymir's "Miner" (+1 each). */
export function miningTraits(traits: Trait[]): Trait[] {
  return traits.filter(t => /\b(min(e|er|ers|ing)|excavat\w*|dig(s|ger|gers|ging)?)\b/i.test(t.name))
}

/** Blocks the GM is offered by default: what was asked for, or nothing on a failure. */
export function suggestedMiningBlocks(total: number, requested: number): number {
  return actionOutcome(total) === 'failure' ? 0 : requested
}

/** A mining action roll (p.4): 2d6 + bonuses, plus 1d4 if a Souls Die was spent,
 *  minus the missed-rest penalty (1d4 each, p.90). A natural 12 is double 6s, worth
 *  1 XP on any action roll (p.8). */
export function rollMiningCheck(
  bonus: number,
  missedRests: number,
  { boost = false, roll = rollDiceSpec }: { boost?: boolean; roll?: (spec: string) => number } = {},
) {
  const dice = roll('2d6')
  const sdBoost = boost ? roll('1d4') : 0
  const penalty = missedRests > 0 ? roll(`${missedRests}d4`) : 0
  return { dice, sdBoost, penalty, total: dice + bonus + sdBoost - penalty, doubleSix: dice === 12 }
}

/** Can this character spend a Souls Die on a roll? Fatigue forbids it (p.79). */
export function canBoostWithSd(c: Pick<Character, 'currentSd' | 'activeEffects'>): boolean {
  return c.currentSd > 0 && !c.activeEffects.some(e => /fatigue/i.test(e.name))
}

/** Effects that change an action roll or what a character can do, for the GM to rule
 *  on: Cursed rerolls successes for the worse result, Luck allows a reroll, and
 *  Fatigue forbids impactful physical effort (pp.79-80). */
export function miningEffectNotes(c: Pick<Character, 'activeEffects'>): string[] {
  return c.activeEffects.filter(e => /^(cursed|luck|fatigue)$/i.test(e.name.trim())).map(e => e.name)
}

/** The roll spelled out for the GM, e.g. "9 (2d6) +1 Iron pickaxe +1 Miner +2 Delving". */
export function miningBreakdown(parts: {
  dice: number
  tool: CarriedTool | null
  materials?: string[]
  traits: string[]
  skill?: { name: string; bonus: number }
  other?: number
  sdBoost?: number
  penalty?: number
}): string {
  const bits = [`${parts.dice} (2d6)`, miningToolLabel(parts.tool, parts.materials ?? [])]
  for (const t of parts.traits) bits.push(`+1 ${t}`)
  if (parts.skill) bits.push(`+${parts.skill.bonus} ${parts.skill.name}`)
  if (parts.other) bits.push(`${signed(parts.other)} other`)
  if (parts.sdBoost) bits.push(`+${parts.sdBoost} SD`)
  if (parts.penalty) bits.push(`−${parts.penalty} missed rest`)
  return bits.join(' ')
}

/** A character's carry limit right now: 10, unless the GM granted a temporary raise. */
export function carryLimitOf(c: Pick<Character, 'carryLimit'>): number {
  return c.carryLimit ?? BLOCK_CARRY_LIMIT
}

/** Blocks a character can still pick up before reaching their carry limit (p.7). */
export function carryRoom(c: Pick<Character, 'onHand' | 'carryLimit'>): number {
  return Math.max(0, carryLimitOf(c) - countBlocks(c.onHand.items))
}

/** A temporary limit ends the moment the blocks carried fall below the usual 10.
 *  Only a drop from 10 or more counts, so a raise granted to someone holding 3 blocks
 *  doesn't end before they've used it. */
export function nextCarryLimit(limit: number | undefined, before: number, after: number): number | undefined {
  return before >= BLOCK_CARRY_LIMIT && after < BLOCK_CARRY_LIMIT ? undefined : limit
}

/** A limit the GM entered, or null if it wouldn't raise the usual 10. */
export function parseCarryLimit(value: unknown): number | null {
  const n = Math.floor(Number(value))
  return Number.isFinite(n) && n > BLOCK_CARRY_LIMIT ? n : null
}

/** Hold a character to their carry limit (p.7): anything past it goes to storage,
 *  which has no limit, so blocks are never lost. The newest stacks go first. */
export function enforceCarryLimit(
  c: Pick<Character, 'onHand' | 'storage' | 'carryLimit'>,
  newId: () => string,
): { onHand: InventorySection; storage: InventorySection; moved: number } {
  const moved = Math.max(0, countBlocks(c.onHand.items) - carryLimitOf(c))
  if (moved === 0) return { onHand: c.onHand, storage: c.storage, moved }
  const items = [...c.onHand.items]
  let storage = c.storage
  let left = moved
  for (let i = items.length - 1; i >= 0 && left > 0; i--) {
    const item = items[i]
    if (!item.isBlock) continue
    const qty = item.quantity ?? 1
    const take = Math.min(qty, left)
    left -= take
    storage = addBlocks(storage, item.name, take, newId)
    if (take === qty) items.splice(i, 1)
    else items[i] = { ...item, quantity: qty - take }
  }
  return { onHand: { items }, storage, moved }
}

/** Blocks in one unit of a market good: 10 for "stack of 10 blocks", 1 for "block",
 *  0 if it isn't sold as blocks. */
export function blocksPerUnit(unit: string | undefined): number {
  if (!unit) return 0
  const stack = unit.match(/stack of (\d+) blocks?/i)
  if (stack) return parseInt(stack[1])
  return /\bblocks?\b/i.test(unit) ? 1 : 0
}

/** Does a free-text item name mean building blocks, like "Stone Blocks"? */
export function looksLikeBlocks(name: string): boolean {
  return /\bblocks?\b/i.test(name)
}

// ── Building ────────────────────────────────────────────────────────────

export interface ProjectTierInfo {
  label: string
  examples: string
  blocks: number
  days: number
  redstone: number
}

/** Project requirements (p.83). */
export const PROJECT_TIERS: Record<ProjectTier, ProjectTierInfo> = {
  redstone: { label: 'Redstone Project', examples: 'technical contraption, machine', blocks: 25, days: 1, redstone: 10 },
  tiny:     { label: 'Tiny Project',     examples: 'shed, lean-to, temporary shelter', blocks: 25, days: 1, redstone: 0 },
  small:    { label: 'Small Project',    examples: 'hut, small cabin', blocks: 50, days: 2, redstone: 0 },
  medium:   { label: 'Medium Project',   examples: 'house, small tower', blocks: 100, days: 4, redstone: 0 },
  large:    { label: 'Large Project',    examples: 'manor, fortified base, tall tower', blocks: 200, days: 8, redstone: 0 },
  mega:     { label: 'Mega Project',     examples: 'castle, mansion, fortress', blocks: 400, days: 16, redstone: 0 },
}

/** Fallback map icon for a build with no drawing yet. */
export const TIER_EMOJI: Record<ProjectTier, string> = {
  redstone: '⚙️', tiny: '⛺', small: '🛖', medium: '🏠', large: '🏯', mega: '🏰',
}

export const PROJECT_TIER_ORDER: ProjectTier[] = ['redstone', 'tiny', 'small', 'medium', 'large', 'mega']

/** Rulebook requirements for a tier. The Tecton Architect Edge (p.62) halves the
 *  blocks and time, rounded down (redstone dust is unaffected). */
export function projectRequirements(tier: ProjectTier, architect = false): { blocks: number; days: number; redstone: number } {
  const t = PROJECT_TIERS[tier]
  if (!architect) return { blocks: t.blocks, days: t.days, redstone: t.redstone }
  return { blocks: Math.floor(t.blocks / 2), days: Math.floor(t.days / 2), redstone: t.redstone }
}

/** Tecton with the Architect Discipline. */
export function isArchitect(c: Pick<Character, 'class' | 'discipline'>): boolean {
  return c.class === 'Tecton' && c.discipline === 'Architect'
}

/** Progress of a structure toward its requirements. */
export function structureProgress(s: Pick<Structure, 'blocksRequired' | 'blocksCommitted' | 'daysRequired' | 'daysWorked' | 'redstoneRequired' | 'redstoneCommitted' | 'completedAt'>) {
  const blocksMet = s.blocksCommitted >= s.blocksRequired
  const daysMet = s.daysWorked >= s.daysRequired
  const redstoneMet = s.redstoneCommitted >= s.redstoneRequired
  const parts = [
    s.blocksRequired > 0 ? Math.min(1, s.blocksCommitted / s.blocksRequired) : 1,
    s.daysRequired > 0 ? Math.min(1, s.daysWorked / s.daysRequired) : 1,
    ...(s.redstoneRequired > 0 ? [Math.min(1, s.redstoneCommitted / s.redstoneRequired)] : []),
  ]
  const fraction = s.completedAt ? 1 : parts.reduce((a, b) => a + b, 0) / parts.length
  const started = s.blocksCommitted > 0 || s.daysWorked > 0 || s.redstoneCommitted > 0
  return {
    blocksMet, daysMet, redstoneMet,
    ready: blocksMet && daysMet && redstoneMet,
    fraction,
    status: s.completedAt ? 'complete' as const : started ? 'building' as const : 'planned' as const,
  }
}

export type BuildCondition = 'planned' | 'building' | 'complete' | 'damaged' | 'destroyed'

/** Where a build stands: its progress, or damaged / destroyed once finished. */
export function buildCondition(s: Parameters<typeof structureProgress>[0] & Pick<Structure, 'damage' | 'destroyedAt'>): BuildCondition {
  if (s.destroyedAt) return 'destroyed'
  if (s.completedAt && s.damage) return 'damaged'
  return structureProgress(s).status
}

/** Blocks still needed to repair a damaged build. */
export function repairLeft(s: Pick<Structure, 'damage'>): number {
  return s.damage ? Math.max(0, s.damage.needed - s.damage.repaired) : 0
}

/** Does the build count as a proper shelter for a rest (p.89)? Only a finished one
 *  that is still whole. */
export function sheltersRest(s: Parameters<typeof buildCondition>[0]): boolean {
  return buildCondition(s) === 'complete'
}

/** Builds a party could rest in, for the rest log: finished ones that aren't ruins,
 *  those in the party's areas first. Damaged ones are listed but don't shelter. */
export function restBuilds<S extends Parameters<typeof buildCondition>[0] & Pick<Structure, 'name' | 'areaId'>>(
  structures: S[],
  partyAreaIds: Set<string | null> = new Set(),
): { structure: S; shelters: boolean }[] {
  return structures
    .filter(s => { const c = buildCondition(s); return c === 'complete' || c === 'damaged' })
    .map(s => ({ structure: s, shelters: sheltersRest(s) }))
    .sort((a, b) =>
      Number(partyAreaIds.has(b.structure.areaId)) - Number(partyAreaIds.has(a.structure.areaId))
      || Number(b.shelters) - Number(a.shelters)
      || a.structure.name.localeCompare(b.structure.name))
}

/** Tectons among a build's builders. The Prime Order (p.62) applies to anything a
 *  Tecton builds. */
export function tectonBuilders<C extends Pick<Character, 'id' | 'class'>>(s: Pick<Structure, 'builderIds'>, characters: C[]): C[] {
  return characters.filter(c => c.class === 'Tecton' && s.builderIds.includes(c.id))
}

/** The Prime Order (p.62) on a build: +1 to action rolls made with it, +2 when its
 *  Tecton builder is the one using it. Not attack rolls. Nothing until it's finished,
 *  or once it's destroyed. */
export function tectonBuildBonus(
  s: Parameters<typeof buildCondition>[0] & Pick<Structure, 'builderIds'>,
  characters: Pick<Character, 'id' | 'class'>[],
  userId?: string,
): number {
  const condition = buildCondition(s)
  if (condition !== 'complete' && condition !== 'damaged') return 0
  const tectons = tectonBuilders(s, characters)
  if (tectons.length === 0) return 0
  return userId && tectons.some(c => c.id === userId) ? 2 : 1
}

// ── Inventory helpers ───────────────────────────────────────────────────

/** Take up to `amount` blocks from a character, storage first, then on hand.
 *  Stacks that run out are removed. Returns the new sections and how many were taken. */
export function takeBlocks(c: Pick<Character, 'storage' | 'onHand'>, amount: number) {
  return takeItems(c, amount, i => !!i.isBlock)
}

const isRedstoneDust = (i: CharacterItem) => !i.isBlock && /redstone/i.test(i.name)

/** Redstone dust a character holds across storage and on hand. */
export function countRedstone(c: Pick<Character, 'storage' | 'onHand'>): number {
  return [...c.storage.items, ...c.onHand.items].filter(isRedstoneDust).reduce((sum, i) => sum + (i.quantity ?? 1), 0)
}

export function takeRedstone(c: Pick<Character, 'storage' | 'onHand'>, amount: number) {
  return takeItems(c, amount, isRedstoneDust)
}

function takeItems(
  c: Pick<Character, 'storage' | 'onHand'>,
  amount: number,
  matches: (item: CharacterItem) => boolean,
): { storage: InventorySection; onHand: InventorySection; taken: number } {
  let left = Math.max(0, Math.floor(amount))
  const drain = (section: InventorySection): InventorySection => {
    const items: CharacterItem[] = []
    for (const item of section.items) {
      if (left > 0 && matches(item)) {
        const qty = item.quantity ?? 1
        const take = Math.min(qty, left)
        left -= take
        if (qty - take > 0) items.push({ ...item, quantity: qty - take })
      } else {
        items.push(item)
      }
    }
    return { items }
  }
  const storage = drain(c.storage)
  const onHand = drain(c.onHand)
  return { storage, onHand, taken: Math.max(0, Math.floor(amount)) - left }
}

/** Add `quantity` blocks named `name` to a section, stacking onto an existing
 *  block item of the same name (case-insensitive). */
export function addBlocks(section: InventorySection, name: string, quantity: number, newId: () => string): InventorySection {
  if (quantity <= 0) return section
  const key = name.trim().toLowerCase()
  const existing = section.items.find(i => i.isBlock && i.name.trim().toLowerCase() === key)
  if (existing) {
    return { items: section.items.map(i => i === existing ? { ...i, quantity: (i.quantity ?? 1) + quantity } : i) }
  }
  return { items: [...section.items, { id: newId(), name: name.trim(), quantity, isBlock: true }] }
}

/** Move up to `amount` blocks between two sections, newest stacks first, stacking by
 *  name. Other items stay put. Returns how many actually moved. */
export function moveBlocks(from: InventorySection, to: InventorySection, amount: number, newId: () => string) {
  const items = [...from.items]
  let dest = to
  let left = Math.max(0, Math.floor(amount))
  const wanted = left
  for (let i = items.length - 1; i >= 0 && left > 0; i--) {
    const item = items[i]
    if (!item.isBlock) continue
    const qty = item.quantity ?? 1
    const take = Math.min(qty, left)
    left -= take
    dest = addBlocks(dest, item.name, take, newId)
    if (take === qty) items.splice(i, 1)
    else items[i] = { ...item, quantity: qty - take }
  }
  return { from: { items }, to: dest, moved: wanted - left }
}

/** Display name for a stack of mined materials, e.g. ["Stone", "Iron"] → "Stone & Iron blocks". */
export function minedStackName(materials: string[]): string {
  const m = materials.map(s => s.trim()).filter(Boolean)
  return m.length ? `${m.join(' & ')} blocks` : 'Blocks'
}

/** Everything a player sends to propose a build. */
export interface BuildProposal {
  name: string
  description: string
  tier: ProjectTier
  icon: string
  areaId: string | null
  subNodeId?: string | null
  position: { x: number; y: number }
  builderIds: string[]
}

/** Read a build-start request back safely: it has crossed the network, so a bad
 *  value falls back to something usable and the proposer is always a builder. */
export function parseBuildProposal(p: Record<string, unknown>, proposerId: string): BuildProposal {
  const pos = (p.position ?? {}) as { x?: unknown; y?: unknown }
  const builders = Array.isArray(p.builderIds) ? p.builderIds.filter((id): id is string => typeof id === 'string') : []
  const tier = String(p.tier)
  return {
    name: typeof p.name === 'string' ? p.name : '',
    description: typeof p.description === 'string' ? p.description : '',
    tier: PROJECT_TIER_ORDER.includes(tier as ProjectTier) ? tier as ProjectTier : 'small',
    icon: normalizeIcon(typeof p.icon === 'string' ? p.icon : undefined),
    areaId: typeof p.areaId === 'string' ? p.areaId : null,
    ...(typeof p.subNodeId === 'string' || p.subNodeId === null ? { subNodeId: p.subNodeId as string | null } : {}),
    position: { x: Number(pos.x) || 0, y: Number(pos.y) || 0 },
    builderIds: [...new Set([proposerId, ...builders])],
  }
}

/** Common materials a GM can tag an area with (anything else can be typed in). */
export const COMMON_MATERIALS = [
  'Wood', 'Stone', 'Dirt', 'Sand', 'Clay', 'Gravel', 'Coal', 'Copper', 'Iron', 'Gold',
  'Redstone', 'Lapis', 'Diamond', 'Emerald', 'Obsidian', 'Netherrack', 'Quartz',
  'Ancient Debris', 'End Stone', 'Ice',
]
