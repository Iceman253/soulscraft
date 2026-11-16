interface Props {
  onPick: (scenes: number) => void
  onCancel: () => void
  size?: 'sm' | 'lg'
}

/** How much Redstone Dust went into an ongoing potion: 1–3 measures, one scene each. */
export function PotionDurationPicker({ onPick, onCancel, size = 'sm' }: Props) {
  const lg = size === 'lg'
  return (
    <div className={lg ? 'shrink-0 border-t border-gold/30 bg-stone-900 px-4 py-3 space-y-2.5' : 'shrink-0 mx-3 mt-2 px-3 py-2.5 rounded-lg bg-stone-800 border border-gold/30 text-xs space-y-2'}>
      <div className={`text-stone-300 font-medium ${lg ? 'text-base' : ''}`}>How much Redstone Dust? (sets duration)</div>
      <div className={`flex ${lg ? 'gap-2.5' : 'gap-2'}`}>
        {[1, 2, 3].map(n => (
          <button key={n} onClick={() => onPick(n)}
            className={lg
              ? 'flex-1 py-3 rounded-xl border border-stone-600 text-stone-200 text-base font-semibold active:border-gold/60'
              : 'flex-1 py-1.5 rounded-sm border border-stone-600 text-stone-300 hover:border-gold/50 hover:text-gold text-xs font-semibold transition-colors'}>
            {lg ? `${n} → ${n} sc` : `${n} measure${n !== 1 ? 's' : ''} → ${n} scene${n !== 1 ? 's' : ''}`}
          </button>
        ))}
      </div>
      <button onClick={onCancel} className={lg ? 'text-stone-500 text-base' : 'text-stone-600 hover:text-stone-400 text-xs'}>Cancel</button>
    </div>
  )
}
