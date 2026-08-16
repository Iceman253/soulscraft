import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap, ConnectionMode,
  applyNodeChanges,
  type Node, type Edge, type NodeChange, type EdgeChange,
  type Connection, type NodeProps, type ReactFlowInstance,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Plus, Image, Eye, EyeOff, Users, ChevronDown } from 'lucide-react'
import { useWorldStore } from './store'
import { useCampaignStore } from '../campaigns/store'
import { useCharacterStore } from '../characters/store'
import { loadMapBg, saveMapBg, fileToDataUrl } from '../../lib/imageCache'
import { AreaNodeComponent, CHAR_DND } from './AreaNode'
import { AreaEdgeComponent } from './AreaEdgeComponent'
import { NodePanel } from './NodePanel'
import { SubMap } from './SubMap'
import { AddNodeModal } from './AddNodeModal'
import { ContextMenu } from '../../ui/ContextMenu'
import { TokenAvatar } from '../../ui/TokenAvatar'
import type { AreaEdge as AreaEdgeType, Character } from '../../types'

/** A free-floating character token on the world map (dropped on empty canvas). */
function TokenNode({ data }: NodeProps) {
  const c = (data as { char: Character }).char
  return (
    <div className="flex flex-col items-center gap-0.5" title={c.name}>
      <div className="rounded-full ring-2 ring-gold/70 shadow-lg">
        <TokenAvatar name={c.name} characterId={c.id} size={34} />
      </div>
      <span className="text-[10px] text-stone-100 bg-stone-900/85 px-1 rounded whitespace-nowrap max-w-24 truncate">{c.name}</span>
    </div>
  )
}

/** Map background rendered in flow space, so it pans/zooms with the nodes. */
function MapBackgroundNode({ data }: NodeProps) {
  const { url, w, h } = data as unknown as { url: string; w: number; h: number }
  return (
    <div style={{ width: w, height: h, backgroundImage: `url(${url})`, backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', opacity: 0.5, borderRadius: 4 }} />
  )
}

const nodeTypes = { area: AreaNodeComponent, token: TokenNode, mapBackground: MapBackgroundNode }
const edgeTypes = { area: AreaEdgeComponent }

export function WorldMap() {
  const { areas, edges, fogEnabled, playerVisibleAreaIds, mapBackground, setMapBackground, addArea, deleteArea, moveArea, addEdge: addWorldEdge, updateEdge, deleteEdge, toggleFog, revealArea, addPlayerVisibleArea, removePlayerVisibleArea } = useWorldStore()
  const { activeId } = useCampaignStore()
  const { characters, setLocation, setSubLocation, setInTower, setMapPos } = useCharacterStore()
  const rfRef = useRef<ReactFlowInstance | null>(null)
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null)
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<Set<string>>(new Set())
  const [subMapAreaId, setSubMapAreaId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [bgUrl, setBgUrl] = useState<string | null>(activeId ? loadMapBg(activeId) : null)
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; areaId: string | null } | null>(null)
  const [subMapInitialSubNodeId, setSubMapInitialSubNodeId] = useState<string | null>(null)
  const [showRevealDropdown, setShowRevealDropdown] = useState(false)
  const [scaleMode, setScaleMode] = useState(false)

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

  // Background as a flow-space node (pans/zooms with the nodes). Draggable only
  // while scaling; otherwise pointer-events off so panning works over it.
  const bgNode = useMemo<Node | null>(() => (bgUrl && mapBackground) ? {
    id: 'mapbg',
    type: 'mapBackground',
    position: { x: mapBackground.x, y: mapBackground.y },
    data: { url: bgUrl, w: mapBackground.w, h: mapBackground.h },
    draggable: scaleMode,
    selectable: false,
    zIndex: -1,
    style: scaleMode ? { cursor: 'move' } : { pointerEvents: 'none' },
  } : null, [bgUrl, mapBackground, scaleMode])

  const allNodes = useMemo(
    () => [bgNode, ...baseNodes, ...tokenNodes].filter(Boolean) as Node[],
    [bgNode, baseNodes, tokenNodes],
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
        else moveArea(change.id, change.position)
      }
    }
  }, [moveArea, setMapPos, mapBackground, setMapBackground])

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
    const url = await fileToDataUrl(file, 1600)
    saveMapBg(activeId, url)
    setBgUrl(url)
    // Place it centered over the current node spread and open scaling mode.
    // (window.Image — the lucide `Image` icon import shadows the global here.)
    const img = new window.Image()
    img.onload = () => {
      let cx = 0, cy = 0, span = 800
      if (areas.length > 0) {
        const xs = areas.map(a => a.position.x), ys = areas.map(a => a.position.y)
        const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys)
        cx = (minX + maxX) / 2; cy = (minY + maxY) / 2
        span = Math.max(maxX - minX, 300) * 1.6
      }
      const w = span
      const h = w * (img.naturalHeight / Math.max(1, img.naturalWidth))
      setMapBackground({ x: cx - w / 2, y: cy - h / 2, w, h })
      setScaleMode(true)
    }
    img.src = url
  }

  // Resize the background around its center (keeps aspect ratio).
  const scaleBg = (factor: number) => {
    if (!mapBackground) return
    const { x, y, w, h } = mapBackground
    const nw = Math.max(80, w * factor), nh = Math.max(80, h * factor)
    setMapBackground({ x: x - (nw - w) / 2, y: y - (nh - h) / 2, w: nw, h: nh })
  }

  // While scaling, Enter finishes (locks the background to zoom/pan with the nodes).
  useEffect(() => {
    if (!scaleMode) return
    const onKey = (ev: KeyboardEvent) => {
      const el = ev.target as HTMLElement
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return
      if (ev.key === 'Enter') { ev.preventDefault(); setScaleMode(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [scaleMode])

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
        onPaneClick={() => { setSelectedAreaId(null); setCtxMenu(null); setSelectedEdgeIds(new Set()) }}
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
          // Only count characters whose locationId actually exists in the areas array
          const charsWithLocation = characters.filter(c => c.locationId && areas.some(a => a.id === c.locationId))
          const partyAreaIds = [...new Set(charsWithLocation.map(c => c.locationId) as string[])]
          const hiddenCount = partyAreaIds.filter(id => !playerVisibleAreaIds.includes(id)).length
          const allVisible = hiddenCount === 0 && partyAreaIds.length > 0
          const noParty = partyAreaIds.length === 0

          return (
            <div className="relative flex shadow-lg">
              {/* Main button */}
              <button
                onClick={() => {
                  if (noParty) return
                  if (allVisible) {
                    partyAreaIds.forEach(id => removePlayerVisibleArea(id))
                  } else {
                    partyAreaIds.forEach(id => addPlayerVisibleArea(id))
                  }
                }}
                className={`flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-l border border-r-0 text-sm transition-colors ${
                  noParty
                    ? 'bg-stone-800 border-stone-600 text-stone-600 cursor-not-allowed'
                    : allVisible
                      ? 'bg-stone-800 border-stone-600 text-stone-400 hover:border-stone-500 hover:text-stone-300'
                      : 'bg-stone-800 border-stone-600 text-teal-400 hover:border-teal-500/50 hover:text-teal-300'
                }`}
                title={
                  noParty
                    ? 'No characters placed on the map — use right-click → Place Characters Here'
                    : allVisible
                      ? 'Hide all party locations from players'
                      : 'Reveal all party locations to players'
                }
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

              {/* Per-character dropdown */}
              {showRevealDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowRevealDropdown(false)} />
                  <div className="absolute top-full left-0 mt-1 w-56 bg-stone-900 border border-stone-600 rounded-lg shadow-2xl z-50 overflow-hidden">
                    <div className="px-3 py-1.5 text-xs text-stone-500 border-b border-stone-700">Toggle individual location</div>
                    {charsWithLocation.length === 0 && (
                      <div className="px-3 py-2 text-xs text-stone-500 italic">
                        No characters placed on the map.<br />
                        <span className="text-stone-500">Right-click an area → Place Characters Here.</span>
                      </div>
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
        {bgUrl && mapBackground && !scaleMode && (
          <button
            onClick={() => setScaleMode(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-stone-800 border border-stone-600 text-stone-400 hover:text-gold hover:border-gold/50 text-sm shadow-lg"
          >
            <Image size={14} /> Scale BG
          </button>
        )}
      </div>

      {/* Background scaling controls */}
      {scaleMode && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-stone-900/95 border border-gold/40 rounded-lg shadow-2xl px-3 py-2">
          <span className="text-xs text-stone-300 font-medium">Scale background</span>
          <button onClick={() => scaleBg(1 / 1.1)} title="Smaller" className="w-7 h-7 rounded bg-stone-800 border border-stone-600 text-stone-200 hover:border-gold/50 text-base leading-none">−</button>
          <button onClick={() => scaleBg(1.1)} title="Larger" className="w-7 h-7 rounded bg-stone-800 border border-stone-600 text-stone-200 hover:border-gold/50 text-base leading-none">+</button>
          <span className="text-[10px] text-stone-500 mx-1">drag the image to position it</span>
          <button
            onClick={() => setScaleMode(false)}
            className="px-2.5 py-1 rounded bg-gold text-stone-900 text-xs font-semibold hover:bg-yellow-400"
          >
            Finished Scaling ⏎
          </button>
        </div>
      )}

      {/* Character token tray — drag a token onto a location to place; drop back here to remove */}
      {characters.filter(c => !c.isDead).length > 0 && (
        <div
          className="absolute top-16 left-3 z-10 w-56 bg-stone-900/95 border border-stone-700 rounded-lg shadow-2xl p-2"
          onDragOver={e => { if (e.dataTransfer.types.includes(CHAR_DND)) { e.preventDefault(); e.dataTransfer.dropEffect = 'move' } }}
          onDrop={e => {
            const charId = e.dataTransfer.getData(CHAR_DND)
            if (charId) { e.preventDefault(); e.stopPropagation(); setLocation(charId, null); setSubLocation(charId, null); setInTower(charId, false); setMapPos(charId, null) }
          }}
        >
          <div className="text-xs text-stone-500 mb-1.5 px-1 flex items-center gap-1">
            <Users size={11} /> Party — drag onto a location or the map
          </div>
          <div className="flex flex-col gap-1 max-h-56 overflow-y-auto">
            {characters.filter(c => !c.isDead).map(c => {
              const loc = c.locationId ? areas.find(a => a.id === c.locationId) : null
              return (
                <div
                  key={c.id}
                  draggable
                  onDragStart={e => { e.dataTransfer.setData(CHAR_DND, c.id); e.dataTransfer.effectAllowed = 'move' }}
                  className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-stone-800 cursor-grab active:cursor-grabbing"
                  title="Drag onto a location on the map"
                >
                  <TokenAvatar name={c.name} characterId={c.id} size={22} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-stone-200 truncate">{c.name}{c.inTower ? ' 🗼' : ''}</div>
                    <div className="text-xs text-stone-500 truncate">{loc ? `📍 ${loc.name}` : c.mapPos ? '🗺️ On map' : 'Unplaced'}</div>
                  </div>
                  {(loc || c.mapPos) && (
                    <button
                      onClick={() => { setLocation(c.id, null); setSubLocation(c.id, null); setInTower(c.id, false); setMapPos(c.id, null) }}
                      title="Remove from map"
                      className="text-stone-600 hover:text-red-400 shrink-0 px-1"
                    >
                      ×
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

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
