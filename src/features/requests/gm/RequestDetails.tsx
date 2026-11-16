// Detail cards the GM sees on a pending request.
import type { PlayerRequest } from '../store'
import { useCharacterStore } from '../../characters/store'
import { useWorldStore } from '../../map/store'
import { PixelIcon } from '../../building/PixelIcon'
import { PlaceMap } from '../../building/PlaceMap'
import { BLOCK_CARRY_LIMIT, countBlocks, parseBuildProposal } from '../../../lib/world/building'
import { levelOfPlacement, placementLabel } from '../../../lib/world/places'

// ── Temporary carry limit: asks the GM how many blocks to allow ────────────────
export function CarryLimitPrompt({ req, onChange }: { req: PlayerRequest; onChange: (limit: number | '') => void }) {
  const character = useCharacterStore(s => s.characters.find(c => c.id === req.characterId))
  const value = req.payload.limit
  return (
    <div className="bg-stone-900/60 border border-stone-700 rounded-sm p-2 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-stone-300">Temporary limit</span>
        <input
          type="number" min={BLOCK_CARRY_LIMIT + 1} autoFocus placeholder="blocks"
          value={typeof value === 'number' ? value : ''}
          onChange={e => onChange(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
          className="w-20 bg-stone-800 border border-gold/40 rounded-sm px-1.5 py-0.5 text-stone-100 text-xs text-right outline-hidden focus:border-gold font-mono tabular-nums"
        />
      </div>
      <div className="text-stone-500 leading-snug">
        Carrying {character ? countBlocks(character.onHand.items) : 0} now. Goes back to {BLOCK_CARRY_LIMIT} once they drop below {BLOCK_CARRY_LIMIT}.
      </div>
    </div>
  )
}

// ── Build sign-off: the icon, what it's for and where it goes ─────────────────
export function BuildRequestCard({ req }: { req: PlayerRequest }) {
  const areas = useWorldStore(s => s.areas)
  const proposal = parseBuildProposal(req.payload, req.characterId)
  return (
    <div className="bg-stone-900/60 border border-stone-700 rounded-sm p-2 space-y-2">
      <div className="flex gap-2">
        <div className="shrink-0 rounded-sm border border-stone-600 bg-stone-950 p-1"><PixelIcon icon={proposal.icon} tier={proposal.tier} size={64} /></div>
        <div className="min-w-0 text-stone-200 leading-snug whitespace-pre-wrap">{proposal.description}</div>
      </div>
      <div className="text-stone-400">📍 {placementLabel(proposal, areas)}</div>
      {req.status === 'pending' && (
        <div className="h-36 overflow-hidden rounded-sm border border-stone-700">
          <PlaceMap level={levelOfPlacement(proposal, areas)} pin={{ position: proposal.position, icon: proposal.icon, tier: proposal.tier }} still />
        </div>
      )}
    </div>
  )
}
