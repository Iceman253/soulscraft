// The GM's map of one area's sub-locations, nested up to MAX_SUBMAP_DEPTH deep.
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ReactFlow, Background, Controls, ConnectionMode, applyNodeChanges,
  type Node, type Edge, type NodeChange, type Connection, type EdgeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useWorldStore } from './store'
import { useCharacterStore } from '../characters/store'
import { useBuildStore } from '../building/store'
import { StructurePanel } from '../building/StructurePanel'
import { PlaceCharactersModal } from '../../ui/PlaceCharactersModal'
import { ContextMenu, type ContextMenuItem } from '../../ui/ContextMenu'
import { MAX_SUBMAP_DEPTH as MAX_DEPTH, structuresOnLevel } from '../../lib/world/places'
import type { Area, SubNode } from '../../types'
import { findSubNodePath, getAtPath, getSubtreeCharacters, type NavEntry } from './submap/navigation'
import { SubMapHeader } from './submap/Breadcrumbs'
import { SubNodeComponent, SubEdgeComponent, type SubNodeData } from './submap/SubMapNodes'
import { StructureNode } from '../building/StructureNode'
import { SubNodePanel } from './submap/SubNodePanel'
import { TokenTray } from './submap/TokenTray'
import { AddSubNodeModal } from './submap/AddSubNodeModal'

const subNodeTypes = { subnode: SubNodeComponent as never, structure: StructureNode }
const subEdgeTypes = { subedge: SubEdgeComponent as never }

// ── SubMap ───────────────────────────────────────────────────────────────

interface SubMapProps {
  area: Area
  onBack: () => void
  initialSubNodeId?: string | null
}

export function SubMap({ area, onBack, initialSubNodeId }: SubMapProps) {
  const { addSubNode, moveSubNode, deleteSubNode, addSubEdge, updateSubEdge, deleteSubEdge } = useWorldStore()
  const characters = useCharacterStore(s => s.characters)
  const { setLocation, setSubLocation } = useCharacterStore()
  const areas = useWorldStore(s => s.areas)
  const allStructures = useBuildStore(s => s.structures)
  const moveStructure = useBuildStore(s => s.moveStructure)
  const [selectedStructureId, setSelectedStructureId] = useState<string | null>(null)

  const [navStack, setNavStack] = useState<NavEntry[]>(() => {
    if (!initialSubNodeId) return []
    return findSubNodePath(area.subNodes, initialSubNodeId) ?? []
  })
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(initialSubNodeId ?? null)
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<Set<string>>(new Set())
  const [showAddModal, setShowAddModal] = useState(false)
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; nodeId: string | null } | null>(null)
  const [placeModal, setPlaceModal] = useState<{ subNodeId: string | null } | null>(null)

  const currentPath = useMemo(() => navStack.map(e => e.nodeId), [navStack])
  const { subNodes: currentNodes, subEdges: currentEdges } = useMemo(
    () => getAtPath(area, currentPath),
    [area, currentPath]
  )
  const selectedNode = currentNodes.find(n => n.id === selectedNodeId) ?? null

  const navigateToChar = useCallback((subLocationId: string) => {
    const path = findSubNodePath(area.subNodes, subLocationId)
    if (path === null) return
    setNavStack(path)
    setSelectedNodeId(subLocationId)
    setCtxMenu(null)
  }, [area.subNodes])

  const openSubMap = useCallback((node: SubNode) => {
    setNavStack(prev => [...prev, { nodeId: node.id, nodeName: node.name }])
    setSelectedNodeId(null)
  }, [])

  const onNodeContextMenu = useCallback((e: React.MouseEvent, node: Node) => {
    e.preventDefault()
    if (node.id.startsWith('st:')) { setSelectedStructureId(node.id.slice(3)); return }
    setCtxMenu({ x: e.clientX, y: e.clientY, nodeId: node.id })
  }, [])

  const onPaneContextMenu = useCallback((e: MouseEvent | React.MouseEvent) => {
    e.preventDefault()
    setCtxMenu({ x: e.clientX, y: e.clientY, nodeId: null })
  }, [])

  /** Apply character placement for a given subNodeId (null = area root). */
  const applyCharPlacement = useCallback((subNodeId: string | null, selectedIds: string[]) => {
    const selectedSet = new Set(selectedIds)
    for (const c of characters) {
      const wasHere = subNodeId
        ? c.locationId === area.id && c.subLocationId === subNodeId
        : c.locationId === area.id && !c.subLocationId
      if (selectedSet.has(c.id)) {
        setLocation(c.id, area.id)
        setSubLocation(c.id, subNodeId)
      } else if (wasHere) {
        setLocation(c.id, null)
        setSubLocation(c.id, null)
      }
    }
  }, [characters, area.id, setLocation, setSubLocation])

  const getPresentIds = useCallback((subNodeId: string | null) =>
    characters.filter(c =>
      subNodeId
        ? c.locationId === area.id && c.subLocationId === subNodeId
        : c.locationId === area.id && !c.subLocationId
    ).map(c => c.id),
  [characters, area.id])

  // Builds standing on this level, drawn over the sub-locations like on the world map.
  const structureNodes: Node[] = useMemo(() => structuresOnLevel(allStructures, { areaId: area.id, path: currentPath }, areas).map(st => ({
    id: 'st:' + st.id,
    type: 'structure',
    position: st.position,
    data: { structure: st, selected: st.id === selectedStructureId },
    draggable: true,
    zIndex: 5,
  })), [allStructures, area.id, currentPath, areas, selectedStructureId])

  const placeNodes: Node[] = useMemo(() => currentNodes.map(node => {
    const directChars = characters.filter(c => c.subLocationId === node.id)
    const subtreeChars = getSubtreeCharacters(node, characters)
    return {
      id: node.id,
      type: 'subnode',
      position: node.position,
      data: {
        node,
        selected: selectedNodeId === node.id,
        onSelect: () => setSelectedNodeId(node.id),
        directChars,
        subtreeChars,
        hasChildren: (node.subNodes?.length ?? 0) > 0 || allStructures.some(st => st.subNodeId === node.id),
        canGoDeeper: navStack.length < MAX_DEPTH,
        onOpenSubMap: () => openSubMap(node),
        onCharNavigate: navigateToChar,
        // Drag-to-place into this sub-location.
        onDropCharacter: (charId: string) => { setLocation(charId, area.id); setSubLocation(charId, node.id) },
      } satisfies SubNodeData,
      draggable: true,
    }
  }), [currentNodes, selectedNodeId, characters, allStructures, navStack.length, navigateToChar, openSubMap, area.id, setLocation, setSubLocation])

  const baseNodes = useMemo(() => [...placeNodes, ...structureNodes], [placeNodes, structureNodes])

  // Local state so ReactFlow can apply mid-drag position changes without round-tripping the store.
  const [rfNodes, setRfNodes] = useState<Node[]>(baseNodes)
  useEffect(() => { setRfNodes(baseNodes) }, [baseNodes])

  const rfEdges: Edge[] = useMemo(() => currentEdges.map(e => ({
    id: e.id,
    source: e.sourceId,
    target: e.targetId,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
    type: 'subedge',
    selected: selectedEdgeIds.has(e.id),
    data: { onDelete: () => deleteSubEdge(area.id, e.id, currentPath) },
  })), [currentEdges, selectedEdgeIds, deleteSubEdge, area.id, currentPath])

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    // Local state → smooth drag following the cursor.
    setRfNodes(nds => applyNodeChanges(changes, nds))
    // Store update only on drag end.
    for (const change of changes) {
      if (change.type === 'position' && change.position && change.dragging === false) {
        if (change.id.startsWith('st:')) moveStructure(change.id.slice(3), change.position)
        else moveSubNode(area.id, change.id, change.position, currentPath)
      }
    }
  }, [area.id, moveSubNode, moveStructure, currentPath])

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

  const onConnect = useCallback((conn: Connection) => {
    if (conn.source && conn.target) addSubEdge(area.id, {
      sourceId: conn.source,
      targetId: conn.target,
      sourceHandle: conn.sourceHandle ?? undefined,
      targetHandle: conn.targetHandle ?? undefined,
    }, currentPath)
  }, [area.id, addSubEdge, currentPath])

  const onReconnect = useCallback((oldEdge: Edge, newConn: Connection) => {
    if (newConn.source && newConn.target) {
      updateSubEdge(area.id, oldEdge.id, {
        sourceId: newConn.source,
        targetId: newConn.target,
        sourceHandle: newConn.sourceHandle ?? undefined,
        targetHandle: newConn.targetHandle ?? undefined,
      }, currentPath)
    }
  }, [area.id, updateSubEdge, currentPath])

  // Build context menu items given a target nodeId (null = pane)
  const buildMenuItems = (nodeId: string | null): ContextMenuItem[] => {
    const node = nodeId ? currentNodes.find(n => n.id === nodeId) : null
    if (node) {
      return [
        { label: 'Select / Edit', icon: '✏️', onClick: () => setSelectedNodeId(node.id) },
        ...(navStack.length < MAX_DEPTH ? [{ label: 'Open Sub-map', icon: '🗺️', onClick: () => openSubMap(node) } as ContextMenuItem] : []),
        {
          type: 'char-picker' as const,
          label: 'Place Characters Here',
          icon: '🧑',
          presentIds: getPresentIds(node.id),
          onApply: (ids) => applyCharPlacement(node.id, ids),
        },
        { label: '---' as const },
        { label: 'Delete Location', icon: '🗑️', danger: true, onClick: () => { deleteSubNode(area.id, node.id, currentPath); setSelectedNodeId(null) } },
      ]
    }
    return [
      { label: 'Add Location', icon: '➕', onClick: () => setShowAddModal(true) },
      {
        type: 'char-picker' as const,
        label: 'Place Characters Here',
        icon: '🧑',
        presentIds: getPresentIds(null),
        onApply: (ids) => applyCharPlacement(null, ids),
      },
    ]
  }

  return (
    <div className="w-full h-full flex flex-col">
      <SubMapHeader
        area={area}
        navStack={navStack}
        onGoToMap={onBack}
        onJump={(stack, selectId) => { setNavStack(stack); setSelectedNodeId(selectId) }}
        onAdd={() => setShowAddModal(true)}
      />

      <div className="flex flex-1 min-h-0">
        {/* Canvas */}
        <div className="flex-1 min-w-0 relative">
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={subNodeTypes}
            edgeTypes={subEdgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onReconnect={onReconnect}
            edgesReconnectable
            onPaneClick={() => { setSelectedNodeId(null); setSelectedStructureId(null); setCtxMenu(null); setSelectedEdgeIds(new Set()) }}
            onNodeClick={(_, node) => { if (node.id.startsWith('st:')) { setSelectedStructureId(node.id.slice(3)); setSelectedNodeId(null) } }}
            onNodeContextMenu={onNodeContextMenu}
            onPaneContextMenu={onPaneContextMenu}
            connectionMode={ConnectionMode.Loose}
            fitView
            minZoom={0.02}
            proOptions={{ hideAttribution: true }}
            style={{ background: '#1a1a1a' }}
          >
            <Background color="#666666" gap={24} size={2} />
            <Controls />
          </ReactFlow>

          <TokenTray area={area} />
        </div>

        {/* Selected build */}
        {selectedStructureId && allStructures.some(st => st.id === selectedStructureId) && (
          <div className="w-80 shrink-0">
            <StructurePanel structureId={selectedStructureId} onClose={() => setSelectedStructureId(null)} />
          </div>
        )}

        {/* Selected node side panel */}
        {selectedNode && !selectedStructureId && (
          <SubNodePanel
            node={selectedNode}
            areaId={area.id}
            path={currentPath}
            canGoDeeper={navStack.length < MAX_DEPTH}
            onDeleted={() => setSelectedNodeId(null)}
            onOpenSubMap={() => openSubMap(selectedNode)}
            onPlaceCharacters={() => setPlaceModal({ subNodeId: selectedNode.id })}
            onCharNavigate={navigateToChar}
          />
        )}
      </div>

      {/* Context menu */}
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={buildMenuItems(ctxMenu.nodeId)}
          onClose={() => setCtxMenu(null)}
        />
      )}

      {/* Add modal */}
      {showAddModal && (
        <AddSubNodeModal
          onAdd={n => { addSubNode(area.id, { ...n, position: { x: 200, y: 150 } }, currentPath); setShowAddModal(false) }}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {placeModal && (
        <PlaceCharactersModal
          areaId={area.id}
          subNodeId={placeModal.subNodeId}
          onClose={() => setPlaceModal(null)}
        />
      )}
    </div>
  )
}
