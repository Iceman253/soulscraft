import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap, ConnectionMode,
  applyNodeChanges,
  type Node, type Edge, type NodeChange, type EdgeChange,
  type Connection,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Plus, Image, Eye, EyeOff, Users, ChevronDown } from 'lucide-react'
import { useWorldStore } from './store'
import { useCampaignStore } from '../campaigns/store'
import { useCharacterStore } from '../characters/store'
import { loadMapBg, saveMapBg, fileToDataUrl } from '../../lib/imageCache'
import { AreaNodeComponent } from './AreaNode'
import { AreaEdgeComponent } from './AreaEdgeComponent'
import { NodePanel } from './NodePanel'
import { SubMap } from './SubMap'
import { AddNodeModal } from './AddNodeModal'
import { ContextMenu } from '../../ui/ContextMenu'

const nodeTypes = { area: AreaNodeComponent }
const edgeTypes = { area: AreaEdgeComponent }

export function WorldMap() {
  const { areas, edges, fogEnabled, playerVisibleAreaIds, addArea, deleteArea, moveArea, addEdge: addWorldEdge, updateEdge, deleteEdge, toggleFog, revealArea, addPlayerVisibleArea, removePlayerVisibleArea } = useWorldStore()
  const { activeId } = useCampaignStore()
  const { characters, setLocation, setSubLocation } = useCharacterStore()
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null)
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<Set<string>>(new Set())
  const [subMapAreaId, setSubMapAreaId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [bgUrl, setBgUrl] = useState<string | null>(activeId ? loadMapBg(activeId) : null)
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; areaId: string | null } | null>(null)
  const [subMapInitialSubNodeId, setSubMapInitialSubNodeId] = useState<string | null>(null)
  const [showRevealDropdown, setShowRevealDropdown] = useState(false)

  const onNodeContextMenu = useCallback((e: React.MouseEvent, node: Node) => {
    e.preventDefault()
    setCtxMenu({ x: e.clientX, y: e.clientY, areaId: node.id })
  }, [])

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
      onSelect: () => setSelectedAreaId(area.id),
      selected: selectedAreaId === area.id,
      onCharClick: (subLocationId: string | null) => {
        setSubMapAreaId(area.id)
        setSubMapInitialSubNodeId(subLocationId)
      },
    },
    draggable: true,
  })), [areas, fogEnabled, selectedAreaId, revealArea])

  // Local state for ReactFlow to apply smooth drag updates against without round-tripping the store.
  const [rfNodes, setRfNodes] = useState<Node[]>(baseNodes)

  // Sync local node state when the base (store-derived) nodes change — new areas, selection changes, etc.
  // During a drag, we write to the local state via applyNodeChanges; the store isn't touched until drag end,
  // so baseNodes won't change mid-drag and this won't clobber the in-progress movement.
  useEffect(() => { setRfNodes(baseNodes) }, [baseNodes])

  const rfEdges: Edge[] = useMemo(() => edges.map(e => ({
    id: e.id,
    source: e.sourceId,
    target: e.targetId,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
    type: 'area',
    selected: selectedEdgeIds.has(e.id),
    data: { edge: e, onDelete: () => deleteEdge(e.id) },
    label: e.label,
  })), [edges, deleteEdge, selectedEdgeIds])

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    // Apply every change (drag, select, etc.) to the LOCAL state so the node follows the cursor smoothly.
    setRfNodes(nds => applyNodeChanges(changes, nds))
    // Persist only the final drag position to the store. Updating mid-drag causes re-render loops.
    for (const change of changes) {
      if (change.type === 'position' && change.position && change.dragging === false) {
        moveArea(change.id, change.position)
      }
    }
  }, [moveArea])

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

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeId) return
    const url = await fileToDataUrl(file, 1200)
    saveMapBg(activeId, url)
    setBgUrl(url)
  }

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
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
        edgesReconnectable
        onPaneClick={() => { setSelectedAreaId(null); setCtxMenu(null); setSelectedEdgeIds(new Set()) }}
        onNodeContextMenu={onNodeContextMenu}
        onPaneContextMenu={onPaneContextMenu}
        connectionMode={ConnectionMode.Loose}
        fitView
        proOptions={{ hideAttribution: true }}
        style={{ background: '#1a1a1a' }}
      >
        {bgUrl && (
          <div
            style={{
              position: 'absolute', inset: 0, zIndex: 0,
              backgroundImage: `url(${bgUrl})`,
              backgroundSize: 'cover', backgroundPosition: 'center',
              opacity: 0.3,
            }}
          />
        )}
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
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-stone-800 border border-stone-600 text-stone-200 hover:border-gold/50 text-sm shadow-lg">
          <Plus size={14} /> Add Area
        </button>
        <button
          onClick={toggleFog}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-sm shadow-lg ${fogEnabled ? 'bg-stone-900 border-gold/50 text-gold' : 'bg-stone-800 border-stone-600 text-stone-400 hover:text-stone-200'}`}
        >
          {fogEnabled ? <Eye size={14} /> : <EyeOff size={14} />} Fog {fogEnabled ? 'ON' : 'OFF'}
        </button>
        {(() => {
          const charsWithLocation = characters.filter(c => c.locationId)
          const partyAreaIds = [...new Set(charsWithLocation.map(c => c.locationId) as string[])]
          const hiddenCount = partyAreaIds.filter(id => !playerVisibleAreaIds.includes(id)).length

          const allVisible = hiddenCount === 0 && partyAreaIds.length > 0

          return (
            <div className="relative flex shadow-lg">
              {/* Main button — reveals all if any hidden, hides all if all visible */}
              <button
                onClick={() => {
                  if (allVisible) {
                    partyAreaIds.forEach(id => removePlayerVisibleArea(id))
                  } else {
                    partyAreaIds.forEach(id => addPlayerVisibleArea(id))
                  }
                }}
                className={`flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-l border border-r-0 text-sm transition-colors ${
                  allVisible
                    ? 'bg-stone-800 border-stone-600 text-stone-400 hover:border-stone-500 hover:text-stone-300'
                    : 'bg-stone-800 border-stone-600 text-teal-400 hover:border-teal-500/50 hover:text-teal-300'
                }`}
                title={allVisible ? 'Hide all party locations from players' : 'Reveal all party locations to players'}
              >
                <Users size={14} />
                {allVisible ? 'Hide Party' : 'Reveal Party'}
                {hiddenCount > 0
                  ? <span className="text-xs bg-amber-700/60 text-amber-300 font-bold px-1.5 py-0.5 rounded-full">{hiddenCount}</span>
                  : partyAreaIds.length > 0
                    ? <span className="text-xs text-stone-500 font-mono">✓</span>
                    : null
                }
              </button>

              {/* Dropdown toggle */}
              <button
                onClick={() => setShowRevealDropdown(v => !v)}
                className={`flex items-center px-1.5 py-1.5 rounded-r border border-stone-600 text-sm transition-colors ${
                  showRevealDropdown
                    ? 'bg-stone-700 border-teal-500/50 text-teal-300'
                    : 'bg-stone-800 text-teal-400 hover:bg-stone-700 hover:text-teal-300'
                }`}
                title="Toggle individual character locations"
              >
                <ChevronDown size={13} className={`transition-transform ${showRevealDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Per-character dropdown — each entry toggles that area on/off */}
              {showRevealDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowRevealDropdown(false)} />
                  <div className="absolute top-full left-0 mt-1 w-56 bg-stone-900 border border-stone-600 rounded-lg shadow-2xl z-50 overflow-hidden">
                    <div className="px-3 py-1.5 text-xs text-stone-500 border-b border-stone-700">Toggle individual location</div>
                    {charsWithLocation.length === 0 && (
                      <div className="px-3 py-2 text-xs text-stone-600 italic">No characters have a location set.</div>
                    )}
                    {charsWithLocation.map(c => {
                      const area = areas.find(a => a.id === c.locationId)
                      const isVisible = playerVisibleAreaIds.includes(c.locationId!)
                      return (
                        <button
                          key={c.id}
                          onClick={() => {
                            if (isVisible) removePlayerVisibleArea(c.locationId!)
                            else addPlayerVisibleArea(c.locationId!)
                            // keep dropdown open so GM can toggle multiple at once
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 hover:bg-stone-800 text-left transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="text-sm text-stone-200 truncate">{c.name}</div>
                            <div className="text-xs text-stone-500 truncate">📍 {area?.name ?? '?'}</div>
                          </div>
                          {isVisible
                            ? <span className="text-xs text-teal-500 shrink-0 ml-2">✓ shown</span>
                            : <span className="text-xs text-amber-400 shrink-0 ml-2">hidden</span>
                          }
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )
        })()}
        <label className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-stone-800 border border-stone-600 text-stone-400 hover:text-stone-200 cursor-pointer text-sm shadow-lg">
          <Image size={14} /> Map BG
          <input type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />
        </label>
      </div>

      {/* Node panel sidebar */}
      {selectedArea && (
        <div className="absolute top-0 right-0 h-full w-72 z-10 shadow-2xl">
          <NodePanel
            area={selectedArea}
            onClose={() => setSelectedAreaId(null)}
            onOpenSubMap={() => setSubMapAreaId(selectedArea.id)}
          />
        </div>
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
          { label: '---' as const },
          { label: fogEnabled ? 'Fog: ON — Turn Off' : 'Fog: OFF — Turn On', icon: '🌫️', onClick: toggleFog },
        ]
        return <ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={items} onClose={() => setCtxMenu(null)} />
      })()}
    </div>
  )
}
