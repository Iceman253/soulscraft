import type { RollMode, SubRoll } from './rolling'

interface SubRollDisplayProps {
  sub: SubRoll
  mode: RollMode
  index?: number
  hazardLabel?: string
}
export function SubRollDisplay({ sub, mode, index, hazardLabel }: SubRollDisplayProps) {
  const isHazard = mode === 'hazard'
  return (
    <div className={`rounded-lg p-2.5 border text-center ${
      isHazard ? 'bg-orange-950/20 border-orange-700/40' :
      sub.outcome === 'success' ? 'bg-emerald/10 border-emerald/30' :
      sub.outcome === 'partial' ? 'bg-amber-900/20 border-amber-600/30' :
      'bg-redstone/10 border-redstone/30'
    }`}>
      {index !== undefined && <div className="text-xs text-stone-500 mb-1 font-heading uppercase tracking-wider">Roll {index}</div>}
      <div className="flex justify-center flex-wrap gap-1.5 mb-1">
        {sub.base.map((d, i) => (
          <span key={`b${i}`} className="w-8 h-8 rounded-lg bg-stone-800 border border-stone-600 text-gold flex items-center justify-center text-lg font-heading font-bold">{d}</span>
        ))}
        {sub.sdDice.map((d, i) => (
          <span key={`s${i}`} title="Soul Dice (1d4)" className="w-7 h-7 rounded-lg bg-blue-900/40 border border-blue-600/50 text-blue-200 flex items-center justify-center text-base font-heading font-bold">+{d}</span>
        ))}
        {sub.penaltyDice.map((d, i) => (
          <span key={`p${i}`} title="Missed-rest penalty (1d4)" className="w-7 h-7 rounded-lg bg-orange-900/40 border border-orange-600/50 text-orange-200 flex items-center justify-center text-base font-heading font-bold">−{d}</span>
        ))}
        {sub.bonus !== 0 && (
          <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-base font-heading font-bold ${sub.bonus > 0 ? 'bg-gold/20 border border-gold/50 text-gold' : 'bg-red-900/40 border border-red-600/50 text-red-200'}`}>
            {sub.bonus > 0 ? `+${sub.bonus}` : sub.bonus}
          </span>
        )}
      </div>
      <div className="text-3xl font-heading font-bold text-stone-100 tracking-wide">{sub.total}</div>
      {!isHazard && (
        <div className="text-xs">
          {sub.outcome === 'success' && <span className="text-emerald font-semibold">✅ Full Success</span>}
          {sub.outcome === 'partial' && <span className="text-amber-400 font-semibold">⚡ Partial — succeed with cost</span>}
          {sub.outcome === 'failure' && <span className="text-red-400 font-semibold">❌ Failure</span>}
        </div>
      )}
      {hazardLabel && <div className="text-xs text-orange-300/70 mt-1 font-mono tracking-wide">{hazardLabel}</div>}
    </div>
  )
}
