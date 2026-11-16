import { ESSENCE_TYPES } from '../../../../lib/rules/constants'
import type { FS } from './controls'

export function AlchemistFeatures({ fs, onUpdate }: { fs: FS<'Alchemist'>; onUpdate: (p: Record<string, unknown>) => void }) {
  const essences = fs.state.essences
  return (
    <div>
      <div className="text-xs text-stone-500 mb-2">Essence Stocks</div>
      <div className="grid grid-cols-2 gap-2">
        {ESSENCE_TYPES.map(et => (
          <div key={et} className="flex items-center gap-2">
            <span className="text-xs text-stone-300 capitalize w-24">{et}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => onUpdate({ essences: { ...essences, [et]: Math.max(0, essences[et] - 1) } })} className="w-5 h-5 rounded-sm bg-stone-700 text-stone-300 hover:bg-stone-600 text-xs">-</button>
              <span className="text-stone-100 w-4 text-center text-xs">{essences[et]}</span>
              <button onClick={() => onUpdate({ essences: { ...essences, [et]: essences[et] + 1 } })} className="w-5 h-5 rounded-sm bg-stone-700 text-stone-300 hover:bg-stone-600 text-xs">+</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
