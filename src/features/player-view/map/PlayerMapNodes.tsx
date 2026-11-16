// React Flow node types for the player map.
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useShallow } from 'zustand/react/shallow'
import { useWorldStore } from '../../map/store'
import { useCharacterStore } from '../../characters/store'
import { TokenAvatar } from '../../../ui/TokenAvatar'
import { AREA_TYPE_ICONS } from '../../../lib/world/places'
import type { Area, Character } from '../../../types'

// ── Realm colors (same as GM map) ────────────────────────────────────────
const REALM_COLORS: Record<string, string> = {
  overworld: 'border-overworld',
  nether:    'border-nether',
  end:       'border-end',
}

const TYPE_ICONS = AREA_TYPE_ICONS

// ── Player-visible area node ──────────────────────────────────────────────
interface PlayerAreaNodeData {
  area: Area
  hasActiveCharacters: boolean
}

export function PlayerAreaNode({ data }: NodeProps) {
  const { area, hasActiveCharacters } = data as unknown as PlayerAreaNodeData
  const allAtLocation = useCharacterStore(useShallow(s => s.characters.filter(c => c.locationId === area.id)))
  const travelingIds = useWorldStore(useShallow(s => new Set(s.travelingMarkers.map(m => m.characterId))))

  // Hide tokens for characters in transit — they're between places.
  // Dead characters don't appear as tokens (they have fallen); ghosts show with 👻.
  const onMap   = allAtLocation.filter(c => !travelingIds.has(c.id))
  const living  = onMap.filter(c => !c.isDead && !c.isGhost)
  const ghosts  = onMap.filter(c => c.isGhost && !c.isDead)
  const visible = [...living, ...ghosts]

  return (
    <div className={`relative min-w-32 rounded-lg border-2 bg-stone-800 shadow-lg ${
      REALM_COLORS[area.realm] ?? 'border-stone-600'
    } ${hasActiveCharacters ? 'ring-2 ring-gold shadow-gold/20' : ''}`}>
      <Handle id="top"    type="source" position={Position.Top}    className="bg-stone-500! w-3! h-3! border-stone-400!" />
      <Handle id="bottom" type="source" position={Position.Bottom} className="bg-stone-500! w-3! h-3! border-stone-400!" />
      <Handle id="left"   type="source" position={Position.Left}   className="bg-stone-500! w-3! h-3! border-stone-400!" />
      <Handle id="right"  type="source" position={Position.Right}  className="bg-stone-500! w-3! h-3! border-stone-400!" />
      <div className="p-2.5">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-base leading-none">{TYPE_ICONS[area.type] ?? '📍'}</span>
          <span className="text-sm font-semibold text-stone-100 max-w-28 truncate">{area.name}</span>
        </div>
        <div className="text-xs text-stone-400 capitalize">{area.realm} · {area.type}</div>
        {visible.length > 0 && (
          <div className="flex flex-wrap gap-0.5 mt-1.5">
            {visible.slice(0, 4).map(c => (
              <div key={c.id} className="relative">
                <TokenAvatar name={c.name} characterId={c.id} size={20} className={c.isGhost ? 'opacity-50 grayscale' : ''} />
                {c.isGhost && (
                  <span className="absolute -top-1 -right-1 text-[8px] leading-none">👻</span>
                )}
              </div>
            ))}
            {visible.length > 4 && <span className="text-xs text-stone-500">+{visible.length - 4}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Unknown destination node (travel markers) ────────────────────────────
interface UnknownNodeData { label?: string }

export function UnknownDestinationNode({ data }: NodeProps) {
  const { label } = data as unknown as UnknownNodeData
  return (
    <div className="min-w-28 rounded-lg border-2 border-dashed border-stone-600 bg-stone-900 shadow-sm">
      <Handle id="top"    type="source" position={Position.Top}    className="bg-stone-600! w-3! h-3! border-stone-500!" />
      <Handle id="bottom" type="source" position={Position.Bottom} className="bg-stone-600! w-3! h-3! border-stone-500!" />
      <Handle id="left"   type="source" position={Position.Left}   className="bg-stone-600! w-3! h-3! border-stone-500!" />
      <Handle id="right"  type="source" position={Position.Right}  className="bg-stone-600! w-3! h-3! border-stone-500!" />
      <div className="p-2.5">
        <div className="text-stone-500 text-sm font-medium">???</div>
        {label && <div className="text-xs text-stone-500 mt-0.5 italic">{label}</div>}
      </div>
    </div>
  )
}

// ── Ghost destination node (unrevealed area at end of a known road) ───────
// Invisible endpoint — just handles so the dashed ghost edge can connect to it.
export function GhostDestNode() {
  return (
    <div style={{ width: 1, height: 1, opacity: 0 }}>
      <Handle id="top"    type="target" position={Position.Top}    style={{ opacity: 0 }} />
      <Handle id="bottom" type="target" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle id="left"   type="target" position={Position.Left}   style={{ opacity: 0 }} />
      <Handle id="right"  type="target" position={Position.Right}  style={{ opacity: 0 }} />
    </div>
  )
}

// ── Free-floating character token (mirrors the GM's map tokens) ──────────────
export function PlayerTokenNode({ data }: NodeProps) {
  const c = (data as unknown as { char: Character }).char
  return (
    <div className="flex flex-col items-center gap-0.5" title={c.name}>
      <div className="rounded-full ring-2 ring-gold/70 shadow-lg">
        <TokenAvatar name={c.name} characterId={c.id} size={28} className={c.isGhost ? 'opacity-50 grayscale' : ''} />
      </div>
      <span className="text-[10px] text-stone-100 bg-stone-900/85 px-1 rounded-sm whitespace-nowrap max-w-24 truncate">{c.name}</span>
    </div>
  )
}

// ── Map background (flow-space, read-only) ────────────────────────────────────
export function PlayerBgNode({ data }: NodeProps) {
  const { url, w, h } = data as unknown as { url: string; w: number; h: number }
  return (
    <div style={{ width: w, height: h, backgroundImage: `url(${url})`, backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', opacity: 0.5, borderRadius: 4 }} />
  )
}

