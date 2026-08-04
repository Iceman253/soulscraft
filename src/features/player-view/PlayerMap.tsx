import { useEffect, useMemo } from 'react'
import {
  ReactFlow, type Node, type Edge,
  Handle, Position, type NodeProps,
  useReactFlow, ReactFlowProvider,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useShallow } from 'zustand/react/shallow'
import { useWorldStore } from '../map/store'
import { useCharacterStore } from '../characters/store'
import { TokenAvatar } from '../../ui/TokenAvatar'
import type { Area, Character } from '../../types'

// ── Realm colors (same as GM map) ────────────────────────────────────────
const REALM_COLORS: Record<string, string> = {
  overworld: 'border-overworld',
  nether:    'border-nether',
  end:       'border-end',
}

const TYPE_ICONS: Record<string, string> = {
  settlement: '🏘️', dungeon: '⚔️', wilderness: '🌲',
  portal: '🌀', stronghold: '🏰', ruins: '🏚️', other: '📍',
}

// ── Player-visible area node ──────────────────────────────────────────────
interface PlayerAreaNodeData {
  area: Area
  hasActiveCharacters: boolean
}

function PlayerAreaNode({ data }: NodeProps) {
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
      <Handle id="top"    type="source" position={Position.Top}    className="!bg-stone-500 !w-3 !h-3 !border-stone-400" />
      <Handle id="bottom" type="source" position={Position.Bottom} className="!bg-stone-500 !w-3 !h-3 !border-stone-400" />
      <Handle id="left"   type="source" position={Position.Left}   className="!bg-stone-500 !w-3 !h-3 !border-stone-400" />
      <Handle id="right"  type="source" position={Position.Right}  className="!bg-stone-500 !w-3 !h-3 !border-stone-400" />
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

function UnknownDestinationNode({ data }: NodeProps) {
  const { label } = data as unknown as UnknownNodeData
  return (
    <div className="min-w-28 rounded-lg border-2 border-dashed border-stone-600 bg-stone-900 shadow">
      <Handle id="top"    type="source" position={Position.Top}    className="!bg-stone-600 !w-3 !h-3 !border-stone-500" />
      <Handle id="bottom" type="source" position={Position.Bottom} className="!bg-stone-600 !w-3 !h-3 !border-stone-500" />
      <Handle id="left"   type="source" position={Position.Left}   className="!bg-stone-600 !w-3 !h-3 !border-stone-500" />
      <Handle id="right"  type="source" position={Position.Right}  className="!bg-stone-600 !w-3 !h-3 !border-stone-500" />
      <div className="p-2.5">
        <div className="text-stone-500 text-sm font-medium">???</div>
        {label && <div className="text-xs text-stone-500 mt-0.5 italic">{label}</div>}
      </div>
    </div>
  )
}

// ── Ghost destination node (unrevealed area at end of a known road) ───────
// Invisible endpoint — just handles so the dashed ghost edge can connect to it.
function GhostDestNode(_: NodeProps) {
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
function PlayerTokenNode({ data }: NodeProps) {
  const c = (data as unknown as { char: Character }).char
  return (
    <div className="flex flex-col items-center gap-0.5" title={c.name}>
      <div className="rounded-full ring-2 ring-gold/70 shadow-lg">
        <TokenAvatar name={c.name} characterId={c.id} size={28} className={c.isGhost ? 'opacity-50 grayscale' : ''} />
      </div>
      <span className="text-[10px] text-stone-100 bg-stone-900/85 px-1 rounded whitespace-nowrap max-w-24 truncate">{c.name}</span>
    </div>
  )
}

const nodeTypes = {
  playerArea:  PlayerAreaNode,
  unknownDest: UnknownDestinationNode,
  ghostDest:   GhostDestNode,
  playerToken: PlayerTokenNode,
}

// ── Inner canvas (needs ReactFlowProvider context for useReactFlow) ──────────
function PlayerMapCanvas() {
  const { areas, edges, playerVisibleAreaIds, travelingMarkers } = useWorldStore()
  const characters = useCharacterStore(s => s.characters)
  const { fitView } = useReactFlow()

  const { rfNodes, rfEdges } = useMemo(() => {
    const visibleSet = new Set(playerVisibleAreaIds)

    // Build visible area nodes
    const areaNodes: Node[] = areas
      .filter(a => visibleSet.has(a.id))
      .map(a => ({
        id: a.id,
        type: 'playerArea',
        position: a.position,
        data: {
          area: a,
          // Only living, non-ghost, non-traveling characters trigger the gold "you are here" glow.
          // Travelers are between places — the dashed travel edge represents them instead.
          hasActiveCharacters: characters.some(c =>
            c.locationId === a.id
            && !c.isDead
            && !c.isGhost
            && !travelingMarkers.some(m => m.characterId === c.id)
          ),
        },
        draggable: false,
        selectable: false,
      }))

    // Build placeholder nodes for unknown travel destinations
    const placeholderNodes: Node[] = []
    for (const marker of travelingMarkers) {
      if (!visibleSet.has(marker.toAreaId)) {
        // Destination is unknown to players — show a ??? placeholder
        const fromArea = areas.find(a => a.id === marker.fromAreaId)
        if (!fromArea) continue
        const placeholderId = `travel-placeholder-${marker.characterId}`

        // Try to derive position from the actual edge's other endpoint (toArea position)
        // even though toArea is hidden, we can use its position to place the placeholder
        // in the correct direction. If we can't find it, fall back to a fixed offset.
        const toArea = areas.find(a => a.id === marker.toAreaId)
        let offsetPos: { x: number; y: number }
        if (toArea) {
          // Direction vector from fromArea to toArea, clamped to ~160px distance
          const dx = toArea.position.x - fromArea.position.x
          const dy = toArea.position.y - fromArea.position.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const clamp = Math.min(dist, 200)
          offsetPos = {
            x: fromArea.position.x + (dx / dist) * clamp,
            y: fromArea.position.y + (dy / dist) * clamp,
          }
        } else {
          offsetPos = { x: fromArea.position.x + 160, y: fromArea.position.y - 80 }
        }

        placeholderNodes.push({
          id: placeholderId,
          type: 'unknownDest',
          position: offsetPos,
          data: { label: marker.label },
          draggable: false,
          selectable: false,
        })
      }
    }

    // Also add ghost nodes for edges that lead from a visible area to a hidden area —
    // this lets players see "there's a road going somewhere" without revealing the destination.
    const ghostNodes: Node[] = []
    const usedGhostIds = new Set<string>()

    for (const edge of edges) {
      const srcVisible = visibleSet.has(edge.sourceId)
      const tgtVisible = visibleSet.has(edge.targetId)

      if (srcVisible && !tgtVisible) {
        const ghostId = `ghost-dest-${edge.targetId}`
        if (!usedGhostIds.has(ghostId)) {
          const fromArea = areas.find(a => a.id === edge.sourceId)
          const toArea   = areas.find(a => a.id === edge.targetId)
          if (fromArea && toArea) {
            const dx = toArea.position.x - fromArea.position.x
            const dy = toArea.position.y - fromArea.position.y
            const dist = Math.sqrt(dx * dx + dy * dy) || 1
            const clamp = Math.min(dist * 0.5, 120) // halfway or 120px max
            ghostNodes.push({
              id: ghostId,
              type: 'ghostDest',
              position: {
                x: fromArea.position.x + (dx / dist) * clamp,
                y: fromArea.position.y + (dy / dist) * clamp,
              },
              data: {},
              draggable: false,
              selectable: false,
            })
            usedGhostIds.add(ghostId)
          }
        }
      }

      if (!srcVisible && tgtVisible) {
        const ghostId = `ghost-dest-${edge.sourceId}`
        if (!usedGhostIds.has(ghostId)) {
          const fromArea = areas.find(a => a.id === edge.targetId)
          const toArea   = areas.find(a => a.id === edge.sourceId)
          if (fromArea && toArea) {
            const dx = toArea.position.x - fromArea.position.x
            const dy = toArea.position.y - fromArea.position.y
            const dist = Math.sqrt(dx * dx + dy * dy) || 1
            const clamp = Math.min(dist * 0.5, 120)
            ghostNodes.push({
              id: ghostId,
              type: 'ghostDest',
              position: {
                x: fromArea.position.x + (dx / dist) * clamp,
                y: fromArea.position.y + (dy / dist) * clamp,
              },
              data: {},
              draggable: false,
              selectable: false,
            })
            usedGhostIds.add(ghostId)
          }
        }
      }
    }

    // Free-floating character tokens (GM dropped them on empty canvas) — shown to
    // players regardless of area visibility, since the GM placed them deliberately.
    const tokenNodes: Node[] = characters
      .filter(c => c.mapPos && !c.isDead)
      .map(c => ({
        id: 'tok:' + c.id,
        type: 'playerToken',
        position: c.mapPos!,
        data: { char: c },
        draggable: false,
        selectable: false,
      }))

    const rfNodes = [...areaNodes, ...placeholderNodes, ...ghostNodes, ...tokenNodes]

    // Build edges
    const shownNodeIds = new Set(rfNodes.map(n => n.id))

    // Regular area edges (both endpoints visible)
    const areaEdges: Edge[] = edges
      .filter(e => visibleSet.has(e.sourceId) && visibleSet.has(e.targetId))
      .map(e => ({
        id: e.id,
        source: e.sourceId,
        target: e.targetId,
        label: e.label,
        type: 'default',
        style: { stroke: '#57534e', strokeWidth: 2 },
        labelStyle: { fill: '#a8a29e', fontSize: 10 },
      }))

    // Ghost edges — from a visible area toward a hidden connected area
    const ghostEdges: Edge[] = []
    for (const edge of edges) {
      const srcVisible = visibleSet.has(edge.sourceId)
      const tgtVisible = visibleSet.has(edge.targetId)
      if (srcVisible && !tgtVisible && shownNodeIds.has(`ghost-dest-${edge.targetId}`)) {
        ghostEdges.push({
          id: `ghost-edge-${edge.id}-fwd`,
          source: edge.sourceId,
          target: `ghost-dest-${edge.targetId}`,
          type: 'default',
          style: { stroke: '#44403c', strokeWidth: 1.5, strokeDasharray: '4 4', opacity: 0.5 },
        })
      }
      if (!srcVisible && tgtVisible && shownNodeIds.has(`ghost-dest-${edge.sourceId}`)) {
        ghostEdges.push({
          id: `ghost-edge-${edge.id}-rev`,
          source: edge.targetId,
          target: `ghost-dest-${edge.sourceId}`,
          type: 'default',
          style: { stroke: '#44403c', strokeWidth: 1.5, strokeDasharray: '4 4', opacity: 0.5 },
        })
      }
    }

    // Traveling edges (to placeholder or to known destination)
    const travelEdges: Edge[] = []
    for (const marker of travelingMarkers) {
      const targetId = visibleSet.has(marker.toAreaId)
        ? marker.toAreaId
        : `travel-placeholder-${marker.characterId}`
      if (!shownNodeIds.has(marker.fromAreaId) || !shownNodeIds.has(targetId)) continue
      travelEdges.push({
        id: `travel-edge-${marker.characterId}`,
        source: marker.fromAreaId,
        target: targetId,
        label: marker.label,
        animated: true,
        style: { stroke: '#f5c842', strokeWidth: 2, strokeDasharray: '6 3' },
        labelStyle: { fill: '#f5c842', fontSize: 10 },
      })
    }

    return { rfNodes, rfEdges: [...areaEdges, ...ghostEdges, ...travelEdges] }
  }, [areas, edges, playerVisibleAreaIds, travelingMarkers, characters])

  // Re-fit whenever the set of visible nodes changes so newly revealed areas
  // are always in view rather than appearing off-screen.
  useEffect(() => {
    if (rfNodes.length > 0) {
      setTimeout(() => fitView({ padding: 0.3, duration: 400 }), 50)
    }
  }, [rfNodes.length, fitView])

  const hasFreeTokens = characters.some(c => c.mapPos && !c.isDead)
  if (playerVisibleAreaIds.length === 0 && travelingMarkers.length === 0 && !hasFreeTokens) {
    return (
      <div className="h-full flex items-center justify-center bg-stone-950 text-stone-500 text-sm">
        <div className="text-center">
          <div className="text-4xl mb-3 opacity-30">🗺️</div>
          <div>No locations revealed yet.</div>
          <div className="text-xs mt-1 text-stone-500">The GM will reveal locations as you discover them.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full bg-stone-950 relative">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnScroll
        zoomOnScroll
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
      />
    </div>
  )
}

// ── Public export — wrapped in provider so useReactFlow works inside ─────────
export function PlayerMap() {
  return (
    <ReactFlowProvider>
      <PlayerMapCanvas />
    </ReactFlowProvider>
  )
}
