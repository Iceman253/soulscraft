import { Badge } from '../../../../ui/Badge'
import { HUNTER_PREY_TYPES } from '../../../../lib/rules/constants'
import type { FS } from './controls'

export function HunterFeatures({ fs, onUpdate }: { fs: FS<'Hunter'>; onUpdate: (p: Record<string, unknown>) => void }) {
  return (
    <div>
      <div className="text-xs text-stone-500 mb-1">Current Prey (reset on rest)</div>
      <select
        value={fs.state.preyType ?? ''}
        onChange={e => onUpdate({ preyType: e.target.value || null })}
        className="w-full bg-stone-800 border border-stone-600 rounded-sm px-2 py-1.5 text-stone-200 text-sm outline-hidden"
      >
        <option value="">— No Prey Selected —</option>
        {HUNTER_PREY_TYPES.map(pt => <option key={pt} value={pt}>{pt}</option>)}
      </select>
      {fs.state.preyType && (
        <div className="mt-1.5 space-y-1">
          <Badge variant="red">🎯 Hunting: {fs.state.preyType}</Badge>
          <div className="text-xs text-stone-500 bg-stone-800 rounded-sm p-2 leading-snug">
            No roll needed to find signs of, track, or sense <strong className="text-stone-300">{fs.state.preyType}</strong> creatures if they are (or were recently) in your area.
          </div>
        </div>
      )}
    </div>
  )
}
