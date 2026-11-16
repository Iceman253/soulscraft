import type { Character } from '../../../types'

interface Props {
  character: Character
  /** Called with how many SD the player spends; each one restores 1 HP. */
  onSpend: (sd: number) => void
  size?: 'sm' | 'lg'
}

/** Death's Door: at 0 HP a player may spend Soul Dice to stay up (1 SD → 1 HP). */
export function AvoidDeathCard({ character: c, onSpend, size = 'sm' }: Props) {
  const lg = size === 'lg'
  const options = Array.from({ length: Math.min(c.currentSd, 5) }, (_, i) => i + 1)
  return (
    <div className={lg ? 'mx-4 mt-4 rounded-2xl bg-red-950 border border-red-800 p-4 space-y-3' : 'rounded-xl bg-red-950 border border-red-800 p-3 space-y-2'}>
      <div className="text-center">
        {lg && <div className="text-3xl">💀</div>}
        <div className={lg ? 'text-xl font-bold text-red-200 mt-1' : 'text-sm font-bold text-red-200'}>
          {lg ? "You're at 0 HP!" : `💀 ${c.name} is at 0 HP!`}
        </div>
        <div className={lg ? 'text-base text-red-400 mt-0.5' : 'text-xs text-red-400 mt-0.5'}>
          {c.inTower
            ? 'The Tower protects you — spend SD to fight on, or be ejected with 1 HP.'
            : 'Spend Soul Dice to survive — each SD restores 1 HP.'}
        </div>
      </div>
      {c.currentSd > 0 ? (
        <div className={`flex flex-wrap justify-center ${lg ? 'gap-2' : 'gap-1.5'}`}>
          {options.map(n => (
            <button key={n} onClick={() => onSpend(n)}
              className={lg
                ? 'px-4 py-2.5 rounded-xl bg-red-800 active:bg-red-700 text-red-100 text-base font-bold border border-red-600'
                : 'px-2 py-1 rounded-sm bg-red-800 hover:bg-red-700 text-red-100 text-xs font-bold border border-red-600 transition-colors'}>
              −{n} SD → +{n} HP
            </button>
          ))}
          {c.currentSd >= 2 && (
            <button onClick={() => onSpend(c.currentSd)}
              className={lg
                ? 'px-4 py-2.5 rounded-xl bg-red-700 active:bg-red-600 text-white text-base font-bold border-2 border-red-400'
                : 'px-2 py-1 rounded-sm bg-red-700 hover:bg-red-600 text-white text-xs font-bold border border-red-400 transition-colors'}>
              Sacrifice all ({c.currentSd})
            </button>
          )}
        </div>
      ) : (
        <div className={`text-center text-red-300 font-medium ${lg ? 'text-base' : 'text-xs'}`}>No Soul Dice left.</div>
      )}
    </div>
  )
}
