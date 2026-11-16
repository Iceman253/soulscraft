import { Badge } from '../../../../ui/Badge'
import type { FS } from './controls'

export function WarriorFeatures({ fs, onUse }: { fs: FS<'Warrior'>; onUse: (id: string) => void }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs text-stone-500">Battle Maneuvers (reset on rest)</div>
      {fs.state.maneuvers.map(m => (
        <button
          key={m.id}
          onClick={() => !m.used && onUse(m.id)}
          className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-all ${
            m.used
              ? 'bg-stone-900 border-stone-700 text-stone-600 line-through'
              : 'bg-stone-800 border-stone-600 text-stone-200 hover:border-gold/50'
          }`}
        >
          <span className="font-medium">{m.name}</span>
          {m.description && <span className="text-xs text-stone-500 ml-2">{m.description}</span>}
          <Badge variant={m.used ? 'muted' : 'gold'} className="ml-2">{m.used ? 'Used' : 'Ready'}</Badge>
        </button>
      ))}
    </div>
  )
}
