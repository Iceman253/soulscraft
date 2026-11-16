import type { Character } from '../../../types'
import { CURRENCY_OPTIONS } from '../../../lib/economy/currency'

/** A character's coins, rations, and any missed-rest penalty. */
export function Wealth({ character: c, size = 'sm' }: { character: Character; size?: 'sm' | 'lg' }) {
  const lg = size === 'lg'
  const text = lg ? 'text-base' : 'text-xs'
  return (
    <div className={lg ? '' : 'space-y-4'}>
      <div className={lg ? 'flex flex-wrap gap-x-4 gap-y-2.5' : 'flex items-center gap-3 flex-wrap'}>
        {CURRENCY_OPTIONS.map(opt => {
          const amount = c.currency[opt.key] ?? 0
          return (
            <div key={opt.key} className={`flex items-center ${lg ? 'gap-1.5' : 'gap-1'}`}>
              <img src={opt.img} alt={opt.label} className={lg ? 'w-5 h-5' : 'w-4 h-4'} />
              <span className={`${text} font-semibold font-mono tabular-nums ${amount > 0 ? 'text-white' : 'text-stone-600'}`}>{amount}</span>
              <span className={`${text} ${amount > 0 ? 'text-stone-400' : 'text-stone-600'}`}>{opt.label}</span>
            </div>
          )
        })}
      </div>
      <div className={`flex items-center gap-2 ${text} ${lg ? 'mt-3 text-stone-300' : ''}`}>
        🍖 <span className="text-stone-400">Rations</span>
        <span className={`font-semibold font-mono tabular-nums ${c.rations > 0 ? 'text-white' : 'text-stone-600'}`}>{c.rations}</span>
      </div>
      {c.missedRests > 0 && (
        <div className={`bg-orange-900/20 border border-orange-700/40 text-orange-300 ${lg ? 'mt-3 rounded-xl px-3.5 py-2.5 text-base' : 'rounded-lg px-3 py-2 text-xs'}`}>
          ⚠️ {c.missedRests} missed rest{c.missedRests !== 1 ? 's' : ''} — −{c.missedRests}d4 on rolls
        </div>
      )}
    </div>
  )
}
