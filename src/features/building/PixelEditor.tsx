import { useRef, useState } from 'react'
import { Pencil, Eraser, PaintBucket, Pipette, Undo2, Trash2 } from 'lucide-react'
import { ICON_SIZE, PALETTE, TRANSPARENT, normalizeIcon, emptyIcon, setPixel, floodFill, getPixel, colorOf, lineCells } from '../../lib/pixelArt'
import { PixelIcon } from './PixelIcon'

type Tool = 'pencil' | 'eraser' | 'fill' | 'picker'

const TOOLS: { id: Tool; label: string; icon: React.ReactNode }[] = [
  { id: 'pencil', label: 'Draw', icon: <Pencil size={15} /> },
  { id: 'eraser', label: 'Erase', icon: <Eraser size={15} /> },
  { id: 'fill', label: 'Fill', icon: <PaintBucket size={15} /> },
  { id: 'picker', label: 'Pick color', icon: <Pipette size={15} /> },
]

// Checkerboard behind transparent pixels.
const CHECKER = 'repeating-conic-gradient(#2a2725 0% 25%, #35312e 0% 50%) 0 0 / 12.5% 12.5%'

/** 16×16 pixel-art editor for a build's map icon. Works with mouse, pen and touch. */
export function PixelEditor({ initial, onSave, onCancel }: { initial?: string; onSave: (icon: string) => void; onCancel: () => void }) {
  const [icon, setIcon] = useState(() => normalizeIcon(initial))
  const [tool, setTool] = useState<Tool>('pencil')
  const [color, setColor] = useState('e')
  const [history, setHistory] = useState<string[]>([])
  const [showGrid, setShowGrid] = useState(true)
  const drawing = useRef(false)
  const lastCell = useRef<{ x: number; y: number } | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  const cellAt = (e: React.PointerEvent): { x: number; y: number } | null => {
    const rect = gridRef.current?.getBoundingClientRect()
    if (!rect) return null
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * ICON_SIZE)
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * ICON_SIZE)
    return x >= 0 && y >= 0 && x < ICON_SIZE && y < ICON_SIZE ? { x, y } : null
  }

  const pushHistory = () => setHistory([...history.slice(-49), icon])

  /** Paint from the previous stroke cell to (x, y), filling any skipped cells. */
  const paint = (x: number, y: number) => {
    const key = tool === 'eraser' ? TRANSPARENT : color
    const from = lastCell.current ?? { x, y }
    lastCell.current = { x, y }
    setIcon(cur => lineCells(from.x, from.y, x, y).reduce((acc, [cx, cy]) => setPixel(acc, cx, cy, key), cur))
  }

  const onPointerDown = (e: React.PointerEvent) => {
    const cell = cellAt(e)
    if (!cell) return
    e.preventDefault()
    if (tool === 'picker') {
      const picked = getPixel(icon, cell.x, cell.y)
      if (picked !== TRANSPARENT) { setColor(picked); setTool('pencil') }
      return
    }
    pushHistory()
    if (tool === 'fill') { setIcon(cur => floodFill(cur, cell.x, cell.y, color)); return }
    drawing.current = true
    lastCell.current = null
    gridRef.current?.setPointerCapture(e.pointerId)
    paint(cell.x, cell.y)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawing.current) return
    const cell = cellAt(e)
    if (cell) paint(cell.x, cell.y)
  }

  const stop = () => { drawing.current = false; lastCell.current = null }

  const undo = () => {
    if (!history.length) return
    setIcon(history[history.length - 1])
    setHistory(history.slice(0, -1))
  }

  const clear = () => { pushHistory(); setIcon(emptyIcon()) }

  return (
    <div className="space-y-3">
      {/* Tools */}
      <div className="flex flex-wrap items-center gap-1.5">
        {TOOLS.map(t => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            title={t.label}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded border text-xs ${tool === t.id ? 'border-gold/70 bg-gold/15 text-gold' : 'border-stone-600 text-stone-300 hover:border-stone-500'}`}
          >
            {t.icon}<span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
        <span className="w-px h-6 bg-stone-700 mx-1" />
        <button onClick={undo} disabled={!history.length} title="Undo" className="p-1.5 rounded border border-stone-600 text-stone-300 disabled:opacity-30 hover:border-stone-500">
          <Undo2 size={15} />
        </button>
        <button onClick={clear} title="Clear" className="p-1.5 rounded border border-stone-600 text-stone-300 hover:border-red-500/60 hover:text-red-300">
          <Trash2 size={15} />
        </button>
        <label className="flex items-center gap-1 text-xs text-stone-400 ml-auto select-none">
          <input type="checkbox" checked={showGrid} onChange={e => setShowGrid(e.target.checked)} /> Grid
        </label>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start">
        {/* Canvas */}
        <div
          ref={gridRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={stop}
          onPointerCancel={stop}
          onLostPointerCapture={stop}
          className="relative w-full max-w-[320px] aspect-square rounded border border-stone-600 overflow-hidden select-none cursor-crosshair"
          style={{ background: CHECKER, touchAction: 'none' }}
        >
          <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${ICON_SIZE}, 1fr)` }}>
            {Array.from(icon).map((key, i) => (
              <div
                key={i}
                style={{ background: colorOf(key) ?? 'transparent' }}
                className={showGrid ? 'outline outline-1 outline-black/20 -outline-offset-1' : ''}
              />
            ))}
          </div>
        </div>

        {/* Palette + preview */}
        <div className="flex sm:flex-col gap-3 w-full sm:w-auto">
          <div className="grid grid-cols-8 sm:grid-cols-4 gap-1 flex-1 sm:flex-none">
            {PALETTE.map(p => (
              <button
                key={p.key}
                onClick={() => { setColor(p.key); if (tool === 'eraser' || tool === 'picker') setTool('pencil') }}
                title={p.name}
                className={`w-7 h-7 rounded border-2 ${color === p.key && tool !== 'eraser' ? 'border-gold scale-110' : 'border-stone-700'}`}
                style={{ background: p.color }}
              />
            ))}
          </div>
          <div className="flex sm:flex-col items-center gap-2 shrink-0">
            <div className="text-[10px] text-stone-500 uppercase tracking-wider">Preview</div>
            <div className="flex items-end gap-2 bg-stone-900 rounded p-2 border border-stone-700">
              <PixelIcon icon={icon} size={48} />
              <PixelIcon icon={icon} size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} className="px-3 py-1.5 rounded text-sm text-stone-400 hover:text-stone-200">Cancel</button>
        <button onClick={() => onSave(icon)} className="px-3 py-1.5 rounded bg-gold text-stone-900 text-sm font-semibold hover:bg-yellow-400">Save icon</button>
      </div>
    </div>
  )
}
