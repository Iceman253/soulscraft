import { PRIMAL_FORCES, TETHER_BONUSES } from '../../../../lib/rules/constants'
import type { TetherSlot } from '../../../../types'
import { type FS, ToggleBtn } from './controls'

export function WildspeakerFeatures({ fs, onUpdate }: { fs: FS<'Wildspeaker'>; onUpdate: (p: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <div className="text-xs text-stone-500 mb-1.5">Primal Tethers (2 max)</div>
        {fs.state.tethers.map((tether, i) => (
          <div key={i} className="flex gap-2 mb-1.5">
            <select value={tether.force ?? ''} onChange={e => {
              const t: [TetherSlot, TetherSlot] = [fs.state.tethers[0], fs.state.tethers[1]]
              t[i] = { ...t[i], force: (e.target.value || null) as TetherSlot['force'] }
              onUpdate({ tethers: t })
            }} className="flex-1 bg-stone-800 border border-stone-600 rounded-sm px-2 py-1 text-stone-200 text-xs outline-hidden">
              <option value="">— None —</option>
              {PRIMAL_FORCES.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <select value={tether.bonus ?? ''} onChange={e => {
              const t: [TetherSlot, TetherSlot] = [fs.state.tethers[0], fs.state.tethers[1]]
              t[i] = { ...t[i], bonus: (e.target.value || null) as TetherSlot['bonus'] }
              onUpdate({ tethers: t })
            }} className="flex-1 bg-stone-800 border border-stone-600 rounded-sm px-2 py-1 text-stone-200 text-xs outline-hidden">
              <option value="">— Bonus —</option>
              {TETHER_BONUSES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        ))}
      </div>
      <div className="flex gap-4">
        <ToggleBtn label="Beastshaper" active={fs.state.beastshaperUsed} onToggle={() => onUpdate({ beastshaperUsed: !fs.state.beastshaperUsed })} />
        <ToggleBtn label="Shaman" active={fs.state.shamanUsed} onToggle={() => onUpdate({ shamanUsed: !fs.state.shamanUsed })} />
      </div>
    </div>
  )
}
