import { Dices, X, Check } from 'lucide-react'

export interface InitRoll {
  id: string
  name: string
  d1: number
  d2: number
  total: number
}

interface InitiativeModalProps {
  rolls: InitRoll[]
  revealedCount: number
  rolling: boolean
  onApply: () => void
  onDiscard: () => void
}

export function InitiativeModal({ rolls, revealedCount, rolling, onApply, onDiscard }: InitiativeModalProps) {
  const allRevealed = revealedCount >= rolls.length

  return (
    <div className="absolute inset-0 z-10 bg-stone-950/90 flex items-center justify-center p-6">
      <div className="bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-700">
          <div className="flex items-center gap-2">
            <Dices size={16} className="text-gold" />
            <span className="font-bold text-stone-100 font-heading tracking-wide">Initiative Rolls</span>
          </div>
          {!rolling && (
            <button onClick={onDiscard}
              className="p-1 rounded text-stone-500 hover:text-stone-300 hover:bg-stone-700">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
          {rolls.map((r, idx) => {
            const revealed = idx < revealedCount
            const isRolling = idx === revealedCount && rolling
            return (
              <div key={r.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-300 ${
                revealed ? 'bg-stone-800 border-stone-600' : 'bg-stone-900 border-stone-800 opacity-40'
              }`}>
                <span className="flex-1 text-sm font-medium text-stone-200 truncate">{r.name}</span>
                {isRolling ? (
                  <span className="text-xl animate-[dice-tumble_0.4s_ease-in-out_infinite]">🎲</span>
                ) : revealed ? (
                  <div className="flex items-center gap-1.5">
                    <span className="w-8 h-8 rounded-lg bg-stone-700 border border-stone-600 flex items-center justify-center text-sm font-bold text-gold font-mono tabular-nums">{r.d1}</span>
                    <span className="text-stone-600 text-xs">+</span>
                    <span className="w-8 h-8 rounded-lg bg-stone-700 border border-stone-600 flex items-center justify-center text-sm font-bold text-gold font-mono tabular-nums">{r.d2}</span>
                    <span className="text-stone-500 text-xs">=</span>
                    <span className="w-9 h-8 rounded-lg bg-stone-600 border border-stone-500 flex items-center justify-center text-base font-bold text-stone-100 font-mono tabular-nums">{r.total}</span>
                  </div>
                ) : (
                  <span className="text-stone-700">—</span>
                )}
              </div>
            )
          })}
        </div>

        <div className="px-4 py-3 border-t border-stone-700 flex gap-2 justify-end">
          <button onClick={onDiscard}
            className="px-3 py-1.5 rounded bg-stone-700 text-stone-300 hover:bg-stone-600 text-sm">
            Discard
          </button>
          <button onClick={onApply} disabled={!allRevealed}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-gold text-stone-900 font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed">
            <Check size={14} /> Apply & Sort
          </button>
        </div>
      </div>
    </div>
  )
}
