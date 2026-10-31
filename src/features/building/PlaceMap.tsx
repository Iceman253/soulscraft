import { useMemo } from 'react'
import { ReactFlow, ReactFlowProvider, Background, useReactFlow, type Node, type NodeProps } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useWorldStore } from '../map/store'
import { useCampaignStore } from '../campaigns/store'
import { useBuildStore } from './store'
import { loadMapBg } from '../../lib/imageCache'
import { levelKey, placesOnLevel, structuresOnLevel, structureVisibleToPlayers, type MapLevel, type MapPlace, type PlaceFilter, type XY } from '../../lib/places'
import { StructureNode } from './StructureNode'
import { PixelIcon } from './PixelIcon'
import { ChevronRight } from 'lucide-react'
import type { ProjectTier } from '../../types'

function PlaceNode({ data }: NodeProps) {
  const { place } = data as unknown as { place: MapPlace }
  return (
    <div className="flex items-center gap-1.5 rounded-lg border-2 border-stone-600 bg-stone-800 px-2.5 py-2 shadow-lg">
      <span className="text-base leading-none">{place.icon}</span>
      <span className="max-w-32 truncate text-sm font-semibold text-stone-100">{place.name}</span>
      {place.enter && <ChevronRight size={14} className="shrink-0 text-gold" />}
    </div>
  )
}

function PinNode({ data }: NodeProps) {
  const { icon, tier } = data as unknown as { icon?: string; tier?: ProjectTier }
  return (
    <div className="rounded bg-stone-900/80 p-0.5 ring-2 ring-gold shadow-lg shadow-gold/30">
      <PixelIcon icon={icon} tier={tier} size={36} />
    </div>
  )
}

function BgNode({ data }: NodeProps) {
  const { url, w, h } = data as unknown as { url: string; w: number; h: number }
  return <div style={{ width: w, height: h, backgroundImage: `url(${url})`, backgroundSize: '100% 100%', opacity: 0.5, borderRadius: 4 }} />
}

const nodeTypes = { place: PlaceNode, structure: StructureNode, pin: PinNode, bg: BgNode }

/** Half the pin's size, so it lands centered under the finger. */
const PIN_CENTER = 20

export interface PlaceMapProps extends PlaceFilter {
  level: MapLevel
  pin?: { position: XY; icon?: string; tier?: ProjectTier } | null
  /** Tap a place to go inside it. */
  onEnter?: (level: MapLevel) => void
  /** Tap an open spot; the position is ready to store. */
  onPick?: (position: XY) => void
  onSelectStructure?: (id: string) => void
  /** No panning or zooming, for a small preview inside a scrolling list. */
  still?: boolean
}

function PlaceMapCanvas({ level, pin, onEnter, onPick, onSelectStructure, still, visibleAreaIds, hideSecretsExcept }: PlaceMapProps) {
  const areas = useWorldStore(s => s.areas)
  const mapBackground = useWorldStore(s => s.mapBackground)
  const structures = useBuildStore(s => s.structures)
  const activeId = useCampaignStore(s => s.activeId)
  const { screenToFlowPosition } = useReactFlow()
  const interactive = !!(onEnter || onPick || onSelectStructure)

  const nodes = useMemo<Node[]>(() => {
    const onThisMap: Node[] = placesOnLevel(level, areas, { visibleAreaIds, hideSecretsExcept }).map(place => ({
      id: place.id, type: 'place', position: place.position, data: { place }, draggable: false, selectable: false,
    }))
    const builds: Node[] = structuresOnLevel(structures, level, areas)
      .filter(st => !visibleAreaIds || structureVisibleToPlayers(st, areas, visibleAreaIds))
      .map(st => ({
        id: 'st:' + st.id, type: 'structure', position: st.position, data: { structure: st }, draggable: false, selectable: false, zIndex: 5,
      }))
    const bgUrl = level.areaId === null && activeId ? loadMapBg(activeId) : null
    const bg: Node[] = bgUrl && mapBackground ? [{
      id: 'mapbg', type: 'bg', position: { x: mapBackground.x, y: mapBackground.y },
      data: { url: bgUrl, w: mapBackground.w, h: mapBackground.h },
      draggable: false, selectable: false, zIndex: -1, style: { pointerEvents: 'none' },
    }] : []
    const pinNode: Node[] = pin ? [{
      id: 'pin', type: 'pin', position: pin.position, data: { icon: pin.icon, tier: pin.tier },
      draggable: false, selectable: false, zIndex: 10, style: { pointerEvents: 'none' },
    }] : []
    return [...bg, ...onThisMap, ...builds, ...pinNode]
  }, [level, areas, structures, visibleAreaIds, hideSecretsExcept, activeId, mapBackground, pin])

  const pick = (e: { clientX: number; clientY: number }) => {
    const at = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    onPick?.({ x: Math.round(at.x - PIN_CENTER), y: Math.round(at.y - PIN_CENTER) })
  }

  const onNodeClick = (e: React.MouseEvent, node: Node) => {
    if (node.id.startsWith('st:')) { onSelectStructure?.(node.id.slice(3)); return }
    const place = (node.data as { place?: MapPlace }).place
    if (place?.enter && onEnter) onEnter(place.enter)
    else if (place) pick(e)   // deepest level: nothing to enter, so build here
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={[]}
      nodeTypes={nodeTypes}
      onNodeClick={interactive ? onNodeClick : undefined}
      onPaneClick={onPick ? pick : undefined}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      zoomOnDoubleClick={false}
      panOnDrag={!still}
      zoomOnPinch={!still}
      zoomOnScroll={!still}
      preventScrolling={!still}
      fitView
      fitViewOptions={{ padding: 0.25, maxZoom: 1.1 }}
      minZoom={0.02}
      proOptions={{ hideAttribution: true }}
      style={{ background: '#1a1a1a' }}
    >
      <Background color="#555555" gap={24} size={2} />
    </ReactFlow>
  )
}

/** One read-mostly map level, shared by the placement picker, the map explorer
 *  and the GM's sign-off card. Remounts per level so each map starts fitted. */
export function PlaceMap(props: PlaceMapProps) {
  return (
    <ReactFlowProvider key={levelKey(props.level)}>
      <PlaceMapCanvas {...props} />
    </ReactFlowProvider>
  )
}
