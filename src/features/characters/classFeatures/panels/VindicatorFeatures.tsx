import { Badge } from '../../../../ui/Badge'
import type { FS } from './controls'

const VINDICATOR_CAUSES = [
  'Protect the helpless',
  'Serve the master',
  'Conquer the enemy',
  'Crush the unworthy',
  'Uphold the order',
] as const

export function VindicatorFeatures({ fs, onUse, onUpdate }: { fs: FS<'Vindicator'>; onUse: (id: string) => void; onUpdate: (p: Record<string, unknown>) => void }) {
  const isCustom = fs.state.activeCause && !VINDICATOR_CAUSES.includes(fs.state.activeCause as typeof VINDICATOR_CAUSES[number])
  return (
    <div className="space-y-3">
      <div>
        <div className="text-xs text-stone-500 mb-1">Active Cause — grants +1 to aligned rolls</div>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {VINDICATOR_CAUSES.map(cause => (
            <button key={cause} type="button"
              onClick={() => onUpdate({ activeCause: cause })}
              className={`px-2.5 py-1 rounded-sm border text-xs transition-all ${fs.state.activeCause === cause ? 'bg-gold/20 border-gold/60 text-gold' : 'bg-stone-800 border-stone-600 text-stone-400 hover:border-stone-400'}`}>
              {cause}
            </button>
          ))}
        </div>
        <input
          value={isCustom ? fs.state.activeCause : ''}
          onChange={e => onUpdate({ activeCause: e.target.value })}
          placeholder="Or write a custom Cause…"
          className="w-full bg-stone-800 border border-stone-600 rounded-sm px-2 py-1.5 text-stone-200 text-sm outline-hidden focus:border-gold/50"
        />
        {fs.state.activeCause && (
          <div className="mt-1.5 text-xs text-stone-500 bg-stone-800 rounded-sm p-2">
            When acting in clear alignment with <strong className="text-stone-300">"{fs.state.activeCause}"</strong>, gain <strong className="text-gold">+1</strong> to the roll.
          </div>
        )}
      </div>
      <div>
        <div className="text-xs text-stone-500 mb-1.5">Voices of Truth (reset on rest)</div>
        {fs.state.voices.map(v => (
          <button key={v.id} onClick={() => !v.used && onUse(v.id)}
            className={`w-full text-left px-3 py-2 rounded-lg border text-sm mb-1 transition-all ${v.used ? 'bg-stone-900 border-stone-700 text-stone-600 line-through' : 'bg-stone-800 border-stone-600 text-stone-200 hover:border-gold/50'}`}>
            {v.name} <Badge variant={v.used ? 'muted' : 'gold'} className="ml-1">{v.used ? 'Used' : 'Ready'}</Badge>
          </button>
        ))}
      </div>
    </div>
  )
}
