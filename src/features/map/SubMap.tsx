import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow, Background, Controls, ConnectionMode,
  BaseEdge, EdgeLabelRenderer, getSmoothStepPath,
  Handle, Position, applyNodeChanges,
  type Node, type Edge, type NodeChange, type Connection, type EdgeChange, type EdgeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { ArrowLeft, ChevronRight, ChevronDown, Plus, X } from 'lucide-react'
import { useWorldStore } from './store'
import { useCharacterStore } from '../characters/store'
import { TokenAvatar } from '../../ui/TokenAvatar'
import { PlaceCharactersModal } from '../../ui/PlaceCharactersModal'
import type { Area, SubNode, SubEdge, Character } from '../../types'
import { SUB_NODE_TYPES } from '../../lib/constants'
import { Modal } from '../../ui/Modal'
import { ContextMenu, type ContextMenuItem } from '../../ui/ContextMenu'

const MAX_DEPTH = 3

const TYPE_ICONS: Record<string, string> = {
  'rest-spot': '🛏️', dungeon: '⚔️', merchant: '🛒',
  shrine: '✨', hazard: '💀', secret: '🔮', other: '📍',
}

// ── Helpers ─────────────────────────────────────────────────────────────

interface NavEntry { nodeId: string; nodeName: string }

function findSubNodePath(nodes: SubNode[], targetId: string): NavEntry[] | null {
  for (const n of nodes) {
    if (n.id === targetId) return []
    const found = findSubNodePath(n.subNodes ?? [], targetId)
    if (found !== null) return [{ nodeId: n.id, nodeName: n.name }, ...found]
  }
  return null
}

function getSubtreeCharacters(node: SubNode, all: Character[]): Character[] {
  const ids = new Set<string>()
  const collect = (n: SubNode) => { ids.add(n.id); (n.subNodes ?? []).forEach(collect) }
  collect(node)
  return all.filter(c => c.subLocationId != null && ids.has(c.subLocationId))
}

function getAtPath(area: Area, path: string[]): { subNodes: SubNode[]; subEdges: SubEdge[] } {
  if (path.length === 0) return { subNodes: area.subNodes, subEdges: area.subEdges }
  let subNodes = area.subNodes
  let subEdges: SubEdge[] = []
  for (const id of path) {
    const node = subNodes.find(n => n.id === id)
    if (!node) return { subNodes: [], subEdges: [] }
    subNodes = node.subNodes ?? []
    subEdges = node.subEdges ?? []
  }
  return { subNodes, subEdges }
}

/** Get the sibling nodes at a given depth in the navStack (depth 0 = top level of area.subNodes). */
function getSiblingsAtDepth(area: Area, navStack: NavEntry[], depth: number): SubNode[] {
  return getAtPath(area, navStack.slice(0, depth).map(e => e.nodeId)).subNodes
}

// ── BreadcrumbDropdown ──────────────────────────────────────────────────

/** A breadcrumb segment with a dropdown ▾ that shows siblings at that level. */
function BreadcrumbSegment({ label, siblings, onNavigate, onClickSelf }: {
  label: string
  siblings: SubNode[]
  onNavigate: (nodeId: string, nodeName: string) => void
  onClickSelf: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useMemo(() => {}, []) // just a memo to satisfy hook order — see useEffect below
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const closeOnOutside = useCallback((e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as HTMLElement)) setOpen(false)
  }, [])

  // manual subscription (no useEffect in non-hook context — this is a component so it's fine)
  if (typeof window !== 'undefined') {
    // register lazily — it's idempotent
  }

  return (
    <div ref={ref} className="relative flex items-center shrink-0">
      <button onClick={onClickSelf} className="text-sm text-stone-300 hover:text-gold">
        {label}
      </button>
      {siblings.length > 1 && (
        <button
          onClick={e => {
            e.stopPropagation()
            const next = !open
            setOpen(next)
            if (next) document.addEventListener('mousedown', closeOnOutside as EventListener, { once: true })
          }}
          className="ml-0.5 text-stone-600 hover:text-stone-300 transition-colors"
        >
          <ChevronDown size={11} />
        </button>
      )}
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-44 bg-stone-800 border border-stone-600 rounded-lg shadow-xl py-1 overflow-hidden">
          {siblings.map(s => (
            <button
              key={s.id}
              onClick={() => { onNavigate(s.id, s.name); setOpen(false) }}
              className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs text-stone-200 hover:bg-stone-700 truncate"
            >
              <span>{TYPE_ICONS[s.type] ?? '📍'}</span>
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── AreaBreadcrumb ──────────────────────────────────────────────────────

/** First crumb: shows all areas as a dropdown. */
function AreaBreadcrumb({ areaName, onGoToMap }: { areaName: string; onGoToMap: () => void }) {
  return (
    <button onClick={onGoToMap} className="text-sm text-stone-400 hover:text-gold shrink-0" title="Back to world map">
      {areaName}
    </button>
  )
}

// ── SubNodeComponent ─────────────────────────────────────────────────────

interface SubNodeData {
  node: SubNode
  selected: boolean
  onSelect: () => void
  directChars: Character[]
  subtreeChars: Character[]
  hasChildren: boolean
  canGoDeeper: boolean
  onOpenSubMap: () => void
  onCharNavigate: (subLocationId: string) => void
}

function SubNodeComponent({ data }: { data: unknown }) {
  const d = data as SubNodeData
  const { node, selected, onSelect, directChars, subtreeChars, hasChildren, canGoDeeper, onOpenSubMap, onCharNavigate } = d
  const hc = '!bg-stone-500 !w-2 !h-2 !border-stone-400'
  return (
    <div
      onClick={onSelect}
      className={`relative min-w-28 bg-stone-800 border-2 rounded-lg p-2.5 cursor-pointer transition-all shadow-md ${
        selected ? 'border-gold ring-1 ring-gold/50' : 'border-stone-600 hover:border-stone-400'
      }`}
    >
      <Handle id="top"    type="source" position={Position.Top}    className={hc} />
      <Handle id="bottom" type="source" position={Position.Bottom} className={hc} />
      <Handle id="left"   type="source" position={Position.Left}   className={hc} />
      <Handle id="right"  type="source" position={Position.Right}  className={hc} />
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="text-sm">{TYPE_ICONS[node.type] ?? '📍'}</span>
        <span className="text-xs font-semibold text-stone-100 truncate max-w-20">{node.name}</span>
      </div>
      <div className="text-xs text-stone-500 capitalize">{node.type}</div>
      {subtreeChars.length > 0 && (
        <div className="flex flex-wrap gap-0.5 mt-1">
          {subtreeChars.slice(0, 4).map(c => {
            const isDirect = directChars.some(dc => dc.id === c.id)
            return (
              <button
                key={c.id}
                onClick={e => { e.stopPropagation(); onCharNavigate(c.subLocationId!) }}
                title={`${c.name}${isDirect ? '' : ' (in sub-location)'}`}
                className={`rounded-full hover:ring-1 ring-gold transition-all ${isDirect ? 'opacity-100' : 'opacity-50'}`}
              >
                <TokenAvatar name={c.name} characterId={c.id} size={18} />
              </button>
            )
          })}
          {subtreeChars.length > 4 && <span className="text-xs text-stone-500 self-center">+{subtreeChars.length - 4}</span>}
        </div>
      )}
      {hasChildren && canGoDeeper && (
        <button
          onClick={e => { e.stopPropagation(); onOpenSubMap() }}
          className="flex items-center gap-0.5 text-xs text-stone-500 hover:text-gold mt-1"
        >
          Sub-map <ChevronRight size={9} />
        </button>
      )}
    </div>
  )
}

const subNodeTypes = { subnode: SubNodeComponent as never }

// ── Sub-edge with delete button ───────────────────────────────────────────
function SubEdgeComponent({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected }: EdgeProps) {
  const [hovered, setHovered] = useState(false)
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition,
    borderRadius: 10,
    offset: 20,
  })
  const onDelete = (data as { onDelete?: () => void })?.onDelete
  const showDelete = selected || hovered

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={{ stroke: selected ? '#a78bfa' : '#4a4a4a', strokeWidth: selected ? 2 : 1.5 }} />
      <EdgeLabelRenderer>
        <div
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            zIndex: 1000,
            padding: '8px',
          }}
          className="absolute pointer-events-auto nodrag nopan"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <button
            onClick={e => {
              e.stopPropagation()
              e.preventDefault()
              if (typeof onDelete === 'function') onDelete()
            }}
            onPointerDown={e => e.stopPropagation()}
            style={{
              opacity: showDelete ? 1 : 0,
              pointerEvents: showDelete ? 'auto' : 'none',
              transition: 'opacity 120ms',
            }}
            className="w-5 h-5 rounded-full bg-stone-700 hover:bg-red-600 border border-stone-500 hover:border-red-400 flex items-center justify-center shadow"
            title="Delete connection"
          >
            <X size={10} className="text-stone-300" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

const subEdgeTypes = { subedge: SubEdgeComponent as never }

// ── SubMap ───────────────────────────────────────────────────────────────

interface SubMapProps {
  area: Area
  onBack: () => void
  initialSubNodeId?: string | null
}

export function SubMap({ area, onBack, initialSubNodeId }: SubMapProps) {
  const { addSubNode, moveSubNode, deleteSubNode, addSubEdge, updateSubEdge, deleteSubEdge, updateSubNode } = useWorldStore()
  const characters = useCharacterStore(s => s.characters)
  const { setLocation, setSubLocation } = useCharacterStore()

  const [navStack, setNavStack] = useState<NavEntry[]>(() => {
    if (!initialSubNodeId) return []
    return findSubNodePath(area.subNodes, initialSubNodeId) ?? []
  })
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(initialSubNodeId ?? null)
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<Set<string>>(new Set())
  const [showAddModal, setShowAddModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<SubNode['type']>('other')
  const [newDesc, setNewDesc] = useState('')
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

  const onNodeContextMenu = useCallback((e: React.MouseEvent, node: Node) => {
    e.preventDefault()
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

  const baseNodes: Node[] = useMemo(() => currentNodes.map(node => {
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
        hasChildren: (node.subNodes?.length ?? 0) > 0,
        canGoDeeper: navStack.length < MAX_DEPTH,
        onOpenSubMap: () => { setNavStack(prev => [...prev, { nodeId: node.id, nodeName: node.name }]); setSelectedNodeId(null) },
        onCharNavigate: navigateToChar,
      } satisfies SubNodeData,
      draggable: true,
    }
  }), [currentNodes, selectedNodeId, characters, navStack.length, navigateToChar])

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
        moveSubNode(area.id, change.id, change.position, currentPath)
      }
    }
  }, [area.id, moveSubNode, currentPath])

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

  const handleAdd = () => {
    if (!newName.trim()) return
    addSubNode(area.id, { name: newName.trim(), type: newType, description: newDesc, position: { x: 200, y: 150 } }, currentPath)
    setNewName(''); setNewDesc(''); setShowAddModal(false)
  }

  const handleBack = () => {
    setNavStack(prev => prev.slice(0, -1))
    setSelectedNodeId(null)
  }

  // Build context menu items given a target nodeId (null = pane)
  const buildMenuItems = (nodeId: string | null): ContextMenuItem[] => {
    const node = nodeId ? currentNodes.find(n => n.id === nodeId) : null
    if (node) {
      return [
        { label: 'Select / Edit', icon: '✏️', onClick: () => setSelectedNodeId(node.id) },
        ...(navStack.length < MAX_DEPTH ? [{ label: 'Open Sub-map', icon: '🗺️', onClick: () => { setNavStack(prev => [...prev, { nodeId: node.id, nodeName: node.name }]); setSelectedNodeId(null) } } as ContextMenuItem] : []),
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
      {/* Breadcrumb / directory header */}
      <div className="shrink-0 h-10 bg-stone-800 border-b border-stone-700 flex items-center gap-0 px-3 overflow-x-auto">
        {/* Back arrow — only shown when inside a nested level */}
        {navStack.length > 0 && (
          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-sm text-stone-400 hover:text-stone-100 shrink-0 mr-2"
            title="Go back one level"
          >
            <ArrowLeft size={14} />
          </button>
        )}

        {/* Area name — always goes straight to world map */}
        <AreaBreadcrumb areaName={area.name} onGoToMap={onBack} />

        {/* navStack segments — each has sibling dropdown */}
        {navStack.map((entry, i) => {
          const siblings = getSiblingsAtDepth(area, navStack, i)
          return (
            <span key={entry.nodeId} className="flex items-center shrink-0">
              <ChevronRight size={12} className="text-stone-600 mx-1" />
              <BreadcrumbSegment
                label={entry.nodeName}
                siblings={siblings}
                onClickSelf={() => { setNavStack(prev => prev.slice(0, i)); setSelectedNodeId(entry.nodeId) }}
                onNavigate={(nodeId, nodeName) => {
                  const newStack = [...navStack.slice(0, i), { nodeId, nodeName }]
                  setNavStack(newStack)
                  setSelectedNodeId(null)
                }}
              />
            </span>
          )
        })}

        {/* Current level indicator (no segment for the root level) */}
        {navStack.length === 0 && (
          <span className="flex items-center text-stone-400 shrink-0">
            <ChevronRight size={12} className="text-stone-600 mx-1" />
            <span className="text-sm text-stone-400">Sub-locations</span>
          </span>
        )}

        {/* Current-level sibling dropdown (what's at this depth) */}
        {navStack.length > 0 && (() => {
          const siblings = getSiblingsAtDepth(area, navStack, navStack.length)
          if (siblings.length === 0) return null
          return (
            <span className="flex items-center shrink-0">
              <ChevronRight size={12} className="text-stone-600 mx-1" />
              <span className="text-sm text-stone-400 italic">{siblings.length} location{siblings.length !== 1 ? 's' : ''}</span>
            </span>
          )
        })()}

        <div className="ml-auto flex gap-2 shrink-0">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-stone-700 border border-stone-600 text-stone-200 hover:border-gold/50 text-xs"
          >
            <Plus size={12} /> Add
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Canvas */}
        <div className="flex-1 min-w-0">
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
            onPaneClick={() => { setSelectedNodeId(null); setCtxMenu(null); setSelectedEdgeIds(new Set()) }}
            onNodeContextMenu={onNodeContextMenu}
            onPaneContextMenu={onPaneContextMenu}
            connectionMode={ConnectionMode.Loose}
            fitView
            proOptions={{ hideAttribution: true }}
            style={{ background: '#1a1a1a' }}
          >
            <Background color="#666666" gap={24} size={2} />
            <Controls />
          </ReactFlow>
        </div>

        {/* Selected node side panel */}
        {selectedNode && (
          <div className="w-64 shrink-0 border-l border-stone-700 bg-stone-800 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-stone-100 text-sm">{selectedNode.name}</span>
              <button
                onClick={() => { deleteSubNode(area.id, selectedNode.id, currentPath); setSelectedNodeId(null) }}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Delete
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-stone-500 mb-1">Name</label>
                <input
                  value={selectedNode.name}
                  onChange={e => updateSubNode(area.id, selectedNode.id, { name: e.target.value }, currentPath)}
                  className="w-full bg-stone-900 border border-stone-600 rounded px-2 py-1.5 text-stone-100 text-xs outline-none focus:border-gold/50"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">Type</label>
                <select
                  value={selectedNode.type}
                  onChange={e => updateSubNode(area.id, selectedNode.id, { type: e.target.value as SubNode['type'] }, currentPath)}
                  className="w-full bg-stone-900 border border-stone-600 rounded px-2 py-1.5 text-stone-200 text-xs outline-none"
                >
                  {SUB_NODE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">Notes</label>
                <textarea
                  value={selectedNode.description ?? ''}
                  onChange={e => updateSubNode(area.id, selectedNode.id, { description: e.target.value }, currentPath)}
                  rows={4}
                  className="w-full bg-stone-900 border border-stone-600 rounded px-2 py-1.5 text-stone-200 text-xs outline-none resize-none"
                />
              </div>
              <div className="flex gap-2">
                {navStack.length < MAX_DEPTH && (
                  <button
                    onClick={() => { setNavStack(prev => [...prev, { nodeId: selectedNode.id, nodeName: selectedNode.name }]); setSelectedNodeId(null) }}
                    className="flex-1 px-2 py-1.5 rounded bg-stone-700 text-stone-300 hover:bg-stone-600 text-xs"
                  >
                    Open Sub-map
                  </button>
                )}
                <button
                  onClick={() => setPlaceModal({ subNodeId: selectedNode.id })}
                  className="flex-1 px-2 py-1.5 rounded bg-stone-700 text-stone-300 hover:bg-stone-600 text-xs"
                >
                  Place Characters
                </button>
              </div>
              {characters.filter(c => c.subLocationId === selectedNode.id).length > 0 && (
                <div>
                  <div className="text-xs text-stone-500 mb-1">At this location</div>
                  {characters.filter(c => c.subLocationId === selectedNode.id).map(c => (
                    <div key={c.id} className="flex items-center gap-1.5 text-xs text-stone-300 mb-1">
                      <TokenAvatar name={c.name} characterId={c.id} size={16} />
                      {c.name}
                    </div>
                  ))}
                </div>
              )}
              {(() => {
                const descendantChars = getSubtreeCharacters(selectedNode, characters).filter(c => c.subLocationId !== selectedNode.id)
                if (descendantChars.length === 0) return null
                return (
                  <div>
                    <div className="text-xs text-stone-500 mb-1">In sub-locations</div>
                    {descendantChars.map(c => (
                      <button key={c.id} onClick={() => navigateToChar(c.subLocationId!)}
                        className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-100 mb-1 w-full text-left">
                        <TokenAvatar name={c.name} characterId={c.id} size={16} />
                        {c.name} <ChevronRight size={10} className="ml-auto opacity-50" />
                      </button>
                    ))}
                  </div>
                )
              })()}
            </div>
          </div>
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
        <Modal title="Add Sub-location" onClose={() => setShowAddModal(false)}>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-stone-400 mb-1">Name *</label>
              <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-stone-100 text-sm outline-none focus:border-gold/50"
                placeholder="Iron Throne Room..." />
            </div>
            <div>
              <label className="block text-sm text-stone-400 mb-1">Type</label>
              <select value={newType} onChange={e => setNewType(e.target.value as SubNode['type'])} className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-stone-200 text-sm outline-none">
                {SUB_NODE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-stone-400 mb-1">Notes</label>
              <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2}
                className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-stone-200 text-sm outline-none resize-none" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setShowAddModal(false)} className="px-3 py-1.5 rounded bg-stone-700 text-stone-300 hover:bg-stone-600 text-sm">Cancel</button>
              <button onClick={handleAdd} disabled={!newName.trim()} className="px-3 py-1.5 rounded bg-gold text-stone-900 font-semibold hover:bg-yellow-400 text-sm disabled:opacity-50">Add</button>
            </div>
          </div>
        </Modal>
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
