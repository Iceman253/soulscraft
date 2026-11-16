import { WARD_TYPES } from '../../../../lib/rules/constants'
import { type FS, ToggleBtn } from './controls'

export function EvokerFeatures({ fs, onUpdate }: { fs: FS<'Evoker'>; onUpdate: (p: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <div className="text-xs text-stone-500 mb-1">Ward Type</div>
        <select value={fs.state.wardType ?? ''} onChange={e => onUpdate({ wardType: e.target.value || null })} className="w-full bg-stone-800 border border-stone-600 rounded-sm px-2 py-1.5 text-stone-200 text-sm outline-hidden">
          <option value="">— No Ward —</option>
          {WARD_TYPES.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <ToggleBtn label="Soulmender" active={fs.state.soulmenderUsed} onToggle={() => onUpdate({ soulmenderUsed: !fs.state.soulmenderUsed })} />
        <ToggleBtn label="Reaper" active={fs.state.reaperUsed} onToggle={() => onUpdate({ reaperUsed: !fs.state.reaperUsed })} />
        <ToggleBtn label="Soul Anchor" active={fs.state.soulAnchorUsed} onToggle={() => onUpdate({ soulAnchorUsed: !fs.state.soulAnchorUsed })} />
      </div>
      <div className="text-xs text-stone-500">Vex: {fs.state.vex.length} · Fangs: {fs.state.fangs.length}</div>
    </div>
  )
}
