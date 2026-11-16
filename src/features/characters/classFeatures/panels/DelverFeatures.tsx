import { Badge } from '../../../../ui/Badge'
import type { FS } from './controls'

export function DelverFeatures({ fs, onUse }: { fs: FS<'Delver'>; onUse: (id: string) => void }) {
  return (
    <div className="space-y-2">
      <div className="text-xs text-stone-500">Evasion Charges (reset on rest)</div>
      {fs.state.evasions.map(e => (
        <button key={e.id} onClick={() => !e.used && onUse(e.id)}
          className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-all ${e.used ? 'bg-stone-900 border-stone-700 text-stone-600 line-through' : 'bg-stone-800 border-stone-600 text-stone-200 hover:border-gold/50'}`}>
          {e.name} <Badge variant={e.used ? 'muted' : 'green'} className="ml-2">{e.used ? 'Used' : 'Ready'}</Badge>
        </button>
      ))}
      <div className="text-xs text-stone-500">Relic Activations: {fs.state.relicActivations}/2</div>
    </div>
  )
}
