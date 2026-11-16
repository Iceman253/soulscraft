/** Shown while the GM resizes the map background. */
export function ScaleBackgroundBar({ scaleBg, onDone }: { scaleBg: (factor: number) => void; onDone: () => void }) {
  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-stone-900/95 border border-gold/40 rounded-lg shadow-2xl px-3 py-2">
      <span className="text-xs text-stone-300 font-medium">Scale background</span>
      <button onClick={() => scaleBg(1 / 1.1)} title="Smaller" className="w-7 h-7 rounded-sm bg-stone-800 border border-stone-600 text-stone-200 hover:border-gold/50 text-base leading-none">−</button>
      <button onClick={() => scaleBg(1.1)} title="Larger" className="w-7 h-7 rounded-sm bg-stone-800 border border-stone-600 text-stone-200 hover:border-gold/50 text-base leading-none">+</button>
      <span className="text-[10px] text-stone-500 mx-1">drag the image to position it</span>
      <button
        onClick={onDone}
        className="px-2.5 py-1 rounded-sm bg-gold text-stone-900 text-xs font-semibold hover:bg-yellow-400"
      >
        Finished Scaling ⏎
      </button>
    </div>
  )
}
