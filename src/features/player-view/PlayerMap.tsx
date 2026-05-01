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
import type { Area } from '../../types'

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
  const characters = useCharacterStore(useShallow(s => s.characters.filter(c => c.locationId === area.id)))

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
        {characters.length > 0 && (
          <div className="flex flex-wrap gap-0.5 mt-1.5">
            {characters.slice(0, 4).map(c => (
              <TokenAvatar key={c.id} name={c.name} characterId={c.id} size={20} />
            ))}
            {characters.length > 4 && <span className="text-xs text-stone-500">+{characters.length - 4}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Unknown destination node ──────────────────────────────────────────────
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
        {label && <div className="text-xs text-stone-600 mt-0.5 italic">{label}</div>}
      </div>
    </div>
  )
}

const nodeTypes = {
  playerArea: PlayerAreaNode,
  unknownDest: UnknownDestinationNode,
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
          hasActiveCharacters: characters.some(c => c.locationId === a.id),
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

    const rfNodes = [...areaNodes, ...placeholderNodes]

    // Build edges
    const shownNodeIds = new Set(rfNodes.map(n => n.id))

    // Regular area edges (both endpoints visible)
    const areaEdges: Edge[] = edges
      .filter(e => shownNodeIds.has(e.sourceId) && shownNodeIds.has(e.targetId))
      .map(e => ({
        id: e.id,
        source: e.sourceId,
        target: e.targetId,
        label: e.label,
        type: 'default',
        style: { stroke: '#57534e', strokeWidth: 2 },
        labelStyle: { fill: '#a8a29e', fontSize: 10 },
      }))

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

    return { rfNodes, rfEdges: [...areaEdges, ...travelEdges] }
  }, [areas, edges, playerVisibleAreaIds, travelingMarkers, characters])

  // Re-fit whenever the set of visible nodes changes so newly revealed areas
  // are always in view rather than appearing off-screen.
  useEffect(() => {
    if (rfNodes.length > 0) {
      setTimeout(() => fitView({ padding: 0.3, duration: 400 }), 50)
    }
  }, [rfNodes.length, fitView])

  if (playerVisibleAreaIds.length === 0 && travelingMarkers.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-stone-950 text-stone-500 text-sm">
        <div className="text-center">
          <div className="text-4xl mb-3 opacity-30">🗺️</div>
          <div>No locations revealed yet.</div>
          <div className="text-xs mt-1 text-stone-600">Move characters to areas or right-click areas on the GM map to show them here.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full bg-stone-950">
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
