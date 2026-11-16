import { CURRENCY_OPTIONS } from '../../../lib/economy/currency'
import type { Character } from '../../../types'

interface Props {
  character: Character
  /** 'lg' for the phone layout's larger type. */
  size?: 'sm' | 'lg'
}

/** Read-only view of a character's inventory & wealth, shown to OTHER players
 *  when the owner has shared it. Deliberately rebuilt from scratch (not the
 *  editable sections) so no edit control can leak to someone else's device.
 *  Notes and builds stay private regardless. */
export function SharedInventory({ character: c, size = 'sm' }: Props) {
  const text = size === 'lg' ? 'text-base' : 'text-xs'
  const heading = size === 'lg'
    ? 'text-sm font-semibold text-stone-500 uppercase tracking-wider font-heading mb-2.5'
    : 'text-xs font-medium text-stone-400 font-heading tracking-wide mb-2'

  return (
    <div className="space-y-4">
      <div className={`${text} text-stone-500 italic`}>
        🤝 {c.name} shares their pack with the party.
      </div>

      {/* On hand */}
      <div>
        <div className={heading}>On Hand</div>
        {c.onHand.items.length === 0 ? (
          <div className={`${text} text-stone-500 italic`}>Nothing on hand.</div>
        ) : (
          <div className="space-y-1">
            {c.onHand.items.map(item => (
              <div key={item.id} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-sm bg-stone-800 ${text}`}>
                <span className="flex-1 min-w-0 truncate text-stone-200">{item.customName ?? item.name}</span>
                <span className="text-stone-400 font-mono tabular-nums">×{item.quantity}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Wealth */}
      <div>
        <div className={heading}>Wealth</div>
        <div className="flex items-center gap-3 flex-wrap">
          {CURRENCY_OPTIONS.map(opt => {
            const amount = c.currency[opt.key] ?? 0
            return (
              <div key={opt.key} className="flex items-center gap-1">
                <img src={opt.img} alt={opt.label} className={size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} />
                <span className={`${text} font-semibold font-mono tabular-nums ${amount > 0 ? 'text-white' : 'text-stone-600'}`}>{amount}</span>
                <span className={`${text} ${amount > 0 ? 'text-stone-400' : 'text-stone-600'}`}>{opt.label}</span>
              </div>
            )
          })}
        </div>
        <div className={`mt-2 flex items-center gap-2 ${text}`}>
          <span className="text-stone-400">🍖 Rations</span>
          <span className={`font-semibold font-mono tabular-nums ${c.rations > 0 ? 'text-white' : 'text-stone-600'}`}>{c.rations}</span>
        </div>
      </div>
    </div>
  )
}
