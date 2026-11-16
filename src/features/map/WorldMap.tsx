import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap, ConnectionMode,
  applyNodeChanges,
  type Node, type Edge, type NodeChange, type EdgeChange,
  type Connection, type ReactFlowInstance,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Plus, Image, Eye, EyeOff } from 'lucide-react'
import { useWorldStore } from './store'
import { useCharacterStore } from '../characters/store'
import { useMapBackground } from './world/useMapBackground'
import { CHAR_DND } from './AreaNode'
import { NodePanel } from './NodePanel'
import { SubMap } from './SubMap'
import { AddNodeModal } from './AddNodeModal'
import { ContextMenu } from '../../ui/ContextMenu'
import { useBuildStore } from '../building/store'
import { StructurePanel } from '../building/StructurePanel'
import { MiningModal } from '../building/MiningModal'
import { structuresOnLevel, WORLD_LEVEL } from '../../lib/world/places'
import type { AreaEdge as AreaEdgeType } from '../../types'
import { TokenNode, MapBackgroundNode } from './world/WorldMapNodes'
import { AreaNodeComponent } from './AreaNode'
import { AreaEdgeComponent } from './AreaEdgeComponent'
import { StructureNode } from '../building/StructureNode'
import { RevealPartyButton } from './world/RevealPartyButton'
import { PartyTray } from './world/PartyTray'
import { ScaleBackgroundBar } from './world/ScaleBackgroundBar'


const nodeTypes = { area: AreaNodeComponent, token: TokenNode, mapBackground: MapBackgroundNode, structure: StructureNode }
const edgeTypes = { area: AreaEdgeComponent }

export function WorldMap() {
  const { areas, edges, fogEnabled, playerVisibleAreaIds, mapBackground, setMapBackground, addArea, deleteArea, moveArea, addEdge: addWorldEdge, updateEdge, deleteEdge, toggleFog, revealArea, addPlayerVisibleArea, removePlayerVisibleArea } = useWorldStore()
  const background = useMapBackground()
  const { characters, setLocation, setSubLocation, setInTower, setMapPos } = useCharacterStore()
  const rfRef = useRef<ReactFlowInstance | null>(null)
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null)
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<Set<string>>(new Set())
  const [subMapAreaId, setSubMapAreaId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; areaId: string | null } | null>(null)
  const [subMapInitialSubNodeId, setSubMapInitialSubNodeId] = useState<string | null>(null)
  const { structures, addStructure, moveStructure } = useBuildStore()
  const [selectedStructureId, setSelectedStructureId] = useState<string | null>(null)
  // undefined = closed; null = open with no area preselected.
  const [miningAreaId, setMiningAreaId] = useState<string | null | undefined>(undefined)
  const selectStructure = useCallback((id: string | null) => { setSelectedStructureId(id); if (id) setSelectedAreaId(null) }, [])
  /** Plan a new build, placed under its area (staggered) or at a free map position. */
  const planBuild = useCallback((areaId: string | null, at?: { x: number; y: number }) => {
    const area = areaId ? areas.find(a => a.id === areaId) : null
    const siblings = areaId ? structures.filter(st => st.areaId === areaId).length : 0
    const position = at ?? (area ? { x: area.position.x + siblings * 56, y: area.position.y + 120 } : { x: 300, y: 300 })
    selectStructure(addStructure({ areaId, position }))
  }, [areas, structures, addStructure, selectStructure])

  const onNodeContextMenu = useCallback((e: React.MouseEvent, node: Node) => {
    e.preventDefault()
    if (node.id.startsWith('st:')) { selectStructure(node.id.slice(3)); return }
    setCtxMenu({ x: e.clientX, y: e.clientY, areaId: node.id })
  }, [selectStructure])

  const onPaneContextMenu = useCallback((e: MouseEvent | React.MouseEvent) => {
    e.preventDefault()
    setCtxMenu({ x: e.clientX, y: e.clientY, areaId: null })
  }, [])

  const selectedArea = areas.find(a => a.id === selectedAreaId) ?? null
  const subMapArea = areas.find(a => a.id === subMapAreaId) ?? null

  // Derived from the store — this is the "source of truth" for nodes.
  const baseNodes: Node[] = useMemo(() => areas.map(area => ({
    id: area.id,
    type: 'area',
    position: area.position,
    data: {
      area,
      fogEnabled,
      onReveal: () => revealArea(area.id),
      onOpenSubMap: () => { setSubMapAreaId(area.id); setSubMapInitialSubNodeId(null) },
      onSelect: () => { setSelectedAreaId(area.id); setSelectedStructureId(null) },
      selected: selectedAreaId === area.id,
      onCharClick: (subLocationId: string | null) => {
        setSubMapAreaId(area.id)
        setSubMapInitialSubNodeId(subLocationId)
      },
      // Drag-to-place: dropping a party token here moves the character to this
      // area (clearing any sub-location) and toggles Tower Mode if it's the Tower.
      onDropCharacter: (charId: string) => {
        setLocation(charId, area.id)
        setSubLocation(charId, null)
        setInTower(charId, !!area.isTower)
      },
    },
    draggable: true,
  })), [areas, fogEnabled, selectedAreaId, revealArea, setLocation, setSubLocation, setInTower])

  // Free-floating character tokens (dropped on empty canvas, not inside an area).
  const tokenNodes: Node[] = useMemo(() => characters
    .filter(c => c.mapPos && !c.isDead)
    .map(c => ({
      id: 'tok:' + c.id,
      type: 'token',
      position: c.mapPos!,
      data: { char: c },
      draggable: true,
    })), [characters])

  // Player builds (pixel icons), drawn above areas so they can sit on top. Builds
  // placed inside an area show on its sub-map instead.
  const structureNodes: Node[] = useMemo(() => structuresOnLevel(structures, WORLD_LEVEL, areas).map(st => ({
    id: 'st:' + st.id,
    type: 'structure',
    position: st.position,
    data: { structure: st, selected: st.id === selectedStructureId },
    draggable: true,
    zIndex: 5,
  })), [structures, areas, selectedStructureId])


  const allNodes = useMemo(
    () => [background.bgNode, ...baseNodes, ...structureNodes, ...tokenNodes].filter(Boolean) as Node[],
    [background.bgNode, baseNodes, structureNodes, tokenNodes],
  )

  // Local state for ReactFlow to apply smooth drag updates against without round-tripping the store.
  const [rfNodes, setRfNodes] = useState<Node[]>(allNodes)

  // Sync local node state when the base (store-derived) nodes change — new areas, selection changes, etc.
  // During a drag, we write to the local state via applyNodeChanges; the store isn't touched until drag end,
  // so this won't clobber the in-progress movement.
  useEffect(() => { setRfNodes(allNodes) }, [allNodes])

  const rfEdges: Edge[] = useMemo(() => edges.map(e => ({
    id: e.id,
    source: e.sourceId,
    target: e.targetId,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
    type: 'area',
    selected: selectedEdgeIds.has(e.id),
    data: {
      edge: e,
      onDelete: () => deleteEdge(e.id),
      onUpdate: (patch: Partial<AreaEdgeType>) => updateEdge(e.id, patch),
    },
    label: e.label,
  })), [edges, deleteEdge, updateEdge, selectedEdgeIds])

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    // Apply every change (drag, select, etc.) to the LOCAL state so the node follows the cursor smoothly.
    setRfNodes(nds => applyNodeChanges(changes, nds))
    // Persist only the final drag position to the store. Updating mid-drag causes re-render loops.
    for (const change of changes) {
      if (change.type === 'position' && change.position && change.dragging === false) {
        if (change.id === 'mapbg') {
          if (mapBackground) setMapBackground({ ...mapBackground, x: change.position.x, y: change.position.y })
        } else if (change.id.startsWith('tok:')) setMapPos(change.id.slice(4), change.position)
        else if (change.id.startsWith('st:')) moveStructure(change.id.slice(3), change.position)
        else moveArea(change.id, change.position)
      }
    }
  }, [moveArea, setMapPos, moveStructure, mapBackground, setMapBackground])

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setSelectedEdgeIds(prev => {
      const next = new Set(prev)
      for (const change of changes) {
        if (change.type === 'select') {
          change.selected ? next.add(change.id) : next.delete(change.id)
        }
      }
      return next
    })
  }, [])

  const onConnect = useCallback((connection: Connection) => {
    if (connection.source && connection.target) {
      addWorldEdge({
        sourceId: connection.source,
        targetId: connection.target,
        sourceHandle: connection.sourceHandle ?? undefined,
        targetHandle: connection.targetHandle ?? undefined,
      })
    }
  }, [addWorldEdge])

  const onReconnect = useCallback((oldEdge: Edge, newConnection: Connection) => {
    if (newConnection.source && newConnection.target) {
      updateEdge(oldEdge.id, {
        sourceId: newConnection.source,
        targetId: newConnection.target,
        sourceHandle: newConnection.sourceHandle ?? undefined,
        targetHandle: newConnection.targetHandle ?? undefined,
      })
    }
  }, [updateEdge])


  if (subMapArea) {
    return (
      <SubMap
        area={subMapArea}
        onBack={() => { setSubMapAreaId(null); setSubMapInitialSubNodeId(null) }}
        initialSubNodeId={subMapInitialSubNodeId}
      />
    )
  }

  return (
    <div
      className="w-full h-full relative"
      onDragOver={e => { if (e.dataTransfer.types.includes(CHAR_DND)) { e.preventDefault(); e.dataTransfer.dropEffect = 'move' } }}
      onDrop={e => {
        // Reached here only if the drop missed an area node and the tray
        // (both stopPropagation) → free-place the token at the cursor.
        const charId = e.dataTransfer.getData(CHAR_DND)
        if (!charId || !rfRef.current) return
        e.preventDefault()
        const pos = rfRef.current.screenToFlowPosition({ x: e.clientX, y: e.clientY })
        setMapPos(charId, pos)
      }}
    >
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onInit={inst => { rfRef.current = inst }}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
        edgesReconnectable
        onPaneClick={() => { setSelectedAreaId(null); setSelectedStructureId(null); setCtxMenu(null); setSelectedEdgeIds(new Set()) }}
        onNodeClick={(_, node) => { if (node.id.startsWith('st:')) selectStructure(node.id.slice(3)) }}
        onNodeContextMenu={onNodeContextMenu}
        onPaneContextMenu={onPaneContextMenu}
        connectionMode={ConnectionMode.Loose}
        fitView
        minZoom={0.02}
        proOptions={{ hideAttribution: true }}
        style={{ background: '#1a1a1a' }}
      >
        <Background color="#666666" gap={28} size={2} />
        <Controls />
        <MiniMap nodeColor={n => {
          const area = areas.find(a => a.id === n.id)
          if (!area) return '#3a3a3a'
          if (fogEnabled && !area.revealed) return '#1a1a1a'
          return area.realm === 'nether' ? '#8b2500' : area.realm === 'end' ? '#3d1a6e' : '#2d6a2d'
        }} style={{ background: '#242424', border: '1px solid #3a3a3a' }} />
      </ReactFlow>

      {/* Toolbar */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-stone-800 border border-stone-600 text-stone-200 hover:border-gold/50 text-sm shadow-lg">
          <Plus size={14} /> Add Area
        </button>
        <button
          onClick={toggleFog}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-sm shadow-lg ${fogEnabled ? 'bg-stone-900 border-gold/50 text-gold' : 'bg-stone-800 border-stone-600 text-stone-400 hover:text-stone-200'}`}
        >
          {fogEnabled ? <Eye size={14} /> : <EyeOff size={14} />} Fog {fogEnabled ? 'ON' : 'OFF'}
        </button>
        <RevealPartyButton />
        <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-stone-800 border border-stone-600 text-stone-400 hover:text-stone-200 cursor-pointer text-sm shadow-lg">
          <Image size={14} /> Map BG
          <input type="file" accept="image/*" className="hidden" onChange={background.upload} />
        </label>
        {background.hasImage && !background.scaleMode && (
          <button
            onClick={() => background.setScaleMode(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-stone-800 border border-stone-600 text-stone-400 hover:text-gold hover:border-gold/50 text-sm shadow-lg"
          >
            <Image size={14} /> Scale BG
          </button>
        )}
      </div>

      {/* Background scaling controls */}
      {background.scaleMode && <ScaleBackgroundBar scaleBg={background.scale} onDone={() => background.setScaleMode(false)} />}

      {/* Character token tray — drag a token onto a location to place; drop back here to remove */}
      <PartyTray />

      {/* Node panel sidebar */}
      {selectedArea && !selectedStructureId && (
        <div className="absolute top-0 right-0 h-full w-72 z-10 shadow-2xl">
          <NodePanel
            area={selectedArea}
            onClose={() => setSelectedAreaId(null)}
            onOpenSubMap={() => setSubMapAreaId(selectedArea.id)}
            onSelectStructure={selectStructure}
            onPlanBuild={() => planBuild(selectedArea.id)}
            onMine={() => setMiningAreaId(selectedArea.id)}
          />
        </div>
      )}

      {/* Build sidebar */}
      {selectedStructureId && structures.some(st => st.id === selectedStructureId) && (
        <div className="absolute top-0 right-0 h-full w-80 z-10 shadow-2xl">
          <StructurePanel structureId={selectedStructureId} onClose={() => setSelectedStructureId(null)} />
        </div>
      )}

      {miningAreaId !== undefined && (
        <MiningModal initialAreaId={miningAreaId ?? undefined} onClose={() => setMiningAreaId(undefined)} />
      )}

      {showAddModal && (
        <AddNodeModal onClose={() => setShowAddModal(false)} onAdd={(area) => {
          addArea({ ...area, position: { x: 300, y: 200 } })
          setShowAddModal(false)
        }} />
      )}

      {ctxMenu && (() => {
        const area = ctxMenu.areaId ? areas.find(a => a.id === ctxMenu.areaId) : null
        const getPresentIds = (areaId: string) =>
          characters.filter(c => c.locationId === areaId && !c.subLocationId).map(c => c.id)
        const applyPlacement = (areaId: string, ids: string[]) => {
          const selectedSet = new Set(ids)
          for (const c of characters) {
            const wasHere = c.locationId === areaId && !c.subLocationId
            if (selectedSet.has(c.id)) { setLocation(c.id, areaId); setSubLocation(c.id, null) }
            else if (wasHere) { setLocation(c.id, null); setSubLocation(c.id, null) }
          }
        }
        const items = area ? [
          { label: 'Open Sub-map',  icon: '🗺️', onClick: () => setSubMapAreaId(area.id) },
          { label: 'Select / Edit', icon: '✏️', onClick: () => setSelectedAreaId(area.id) },
          { type: 'char-picker' as const, label: 'Place Characters Here', icon: '🧑', presentIds: getPresentIds(area.id), onApply: (ids: string[]) => applyPlacement(area.id, ids) },
          { label: 'Go Mining Here', icon: '⛏️', onClick: () => setMiningAreaId(area.id) },
          { label: 'Plan a Build Here', icon: '🏗️', onClick: () => planBuild(area.id) },
          { label: '---' as const },
          ...(fogEnabled ? [{ label: area.revealed ? 'Hide (Fog)' : 'Reveal', icon: area.revealed ? '🌫️' : '👁️', onClick: () => revealArea(area.id) }] : []),
          {
            label: playerVisibleAreaIds.includes(area.id) ? 'Hide from Players' : 'Show to Players',
            icon: playerVisibleAreaIds.includes(area.id) ? '🙈' : '👥',
            onClick: () => playerVisibleAreaIds.includes(area.id) ? removePlayerVisibleArea(area.id) : addPlayerVisibleArea(area.id),
          },
          { label: '---' as const },
          { label: 'Delete Area', icon: '🗑️', danger: true as const, onClick: () => { deleteArea(area.id); setSelectedAreaId(null) } },
        ] : [
          { label: 'Add Area', icon: '➕', onClick: () => setShowAddModal(true) },
          {
            label: 'Plan a Build Here', icon: '🏗️',
            onClick: () => planBuild(null, rfRef.current?.screenToFlowPosition({ x: ctxMenu.x, y: ctxMenu.y })),
          },
          { label: 'Go Mining', icon: '⛏️', onClick: () => setMiningAreaId(null) },
          { label: '---' as const },
          { label: fogEnabled ? 'Fog: ON — Turn Off' : 'Fog: OFF — Turn On', icon: '🌫️', onClick: toggleFog },
        ]
        return <ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={items} onClose={() => setCtxMenu(null)} />
      })()}
    </div>
  )
}
