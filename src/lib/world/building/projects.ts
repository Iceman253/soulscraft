// Build projects: tiers, progress, condition, shelter and the player's proposal (Guidebook pp. 81–83).
import type { Character, ProjectTier, Structure } from '../../../types'
import { normalizeIcon } from '../../art/pixelArt'

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
