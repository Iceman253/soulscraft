// Shared bits for the class panels: the per-class state type and small controls.
import type { ClassFeatureState } from '../../../../types'

export type FS<T extends ClassFeatureState['class']> = Extract<ClassFeatureState, { class: T }>

export function ToggleBtn({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className={`px-2.5 py-1 rounded-sm text-xs border transition-all ${active ? 'bg-gold/20 border-gold/50 text-gold' : 'bg-stone-800 border-stone-600 text-stone-400 hover:text-stone-200'}`}>
      {label}: {active ? 'Used' : 'Ready'}
    </button>
  )
}

export function CountControl({ value, max, onDecrement, onIncrement }: { value: number; max: number; onDecrement: () => void; onIncrement: () => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <button onClick={onDecrement} className="w-6 h-6 rounded-sm bg-stone-700 text-stone-300 hover:bg-stone-600 text-sm">-</button>
      <span className="text-stone-100 font-bold text-sm w-8 text-center">{value}/{max}</span>
      <button onClick={onIncrement} className="w-6 h-6 rounded-sm bg-stone-700 text-stone-300 hover:bg-stone-600 text-sm">+</button>
    </div>
  )
}
