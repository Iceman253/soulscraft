// A titled list of selectable wares in the GM merchant modal.
import { WeaponSpecLine } from '../../ui/WeaponSpecLine'
import type { Ware } from './wares'

export function WareList({ title, wares, selectedKey, onSelect }: {
  title: string; wares: Ware[]; selectedKey: string | undefined; onSelect: (w: Ware) => void
}) {
  if (wares.length === 0) return null
  return (
    <div>
      <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 font-heading">{title}</div>
      <div className="space-y-1">
        {wares.map(w => (
          <button key={w.key} onClick={() => onSelect(w)}
            className={`w-full text-left flex items-center justify-between gap-2 px-3 py-2 rounded-lg transition-colors ${
              selectedKey === w.key
                ? 'bg-amber-900/40 border border-amber-700/60'
                : 'bg-stone-800 border border-stone-700/50 hover:bg-stone-700/60 hover:border-stone-600'
            }`}>
            <span className="min-w-0">
              <span className="text-stone-200 text-sm">{w.name}</span>
              {w.weapon && <WeaponSpecLine spec={w.weapon} />}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-sm bg-stone-700 text-stone-300 shrink-0">Select</span>
          </button>
        ))}
      </div>
    </div>
  )
}
