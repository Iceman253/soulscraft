import { useCombatStore } from '../combat/store'
import { HpBar } from '../../ui/HpBar'
import { Badge } from '../../ui/Badge'
import { Swords } from 'lucide-react'

export function PlayerCombatView() {
  const session = useCombatStore(s => s.session)

  if (!session || session.ended) {
    return (
      <div className="flex items-center justify-center h-full text-stone-500 text-base md:text-sm">
        <div className="text-center">
          <Swords size={32} className="mx-auto mb-3 opacity-30" />
          No active combat.
        </div>
      </div>
    )
  }

  const total = session.combatants.length
  const activeCombatant = session.combatants[session.activeIndex]

  // Find the next alive combatant (mirrors store.nextTurn logic)
  const nextIndex = (() => {
    let idx = (session.activeIndex + 1) % total
    let steps = 0
    while (session.combatants[idx].currentHp <= 0 && steps < total) {
      idx = (idx + 1) % total
      steps++
    }
    return idx !== session.activeIndex ? idx : null
  })()
  const nextCombatant = nextIndex !== null ? session.combatants[nextIndex] : null

  return (
    <div className="h-full flex flex-col bg-stone-900">
      {/* Combat header */}
      <div className="shrink-0 px-4 py-3 bg-stone-800 border-b border-stone-700">
        <div className="flex items-center gap-3">
          <Swords size={18} className="text-redstone md:w-4 md:h-4" />
          <span className="font-bold text-stone-100 font-heading tracking-wide text-lg md:text-base">Round <span className="font-mono tabular-nums">{session.round}</span></span>
          {activeCombatant && (
            <span className="ml-auto text-base md:text-sm text-gold font-semibold font-heading tracking-wide">
              ⚡ {activeCombatant.name}
            </span>
          )}
        </div>
        {nextCombatant && (
          <div className="text-sm md:text-xs text-stone-500 mt-0.5 text-right">
            Next up: <span className="text-stone-400">{nextCombatant.name}</span>
          </div>
        )}
      </div>

      {/* Initiative list */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2.5 md:space-y-2">
          {session.combatants.map((c, i) => {
            const isActive = i === session.activeIndex
            const isNext = i === nextIndex
            const isDefeated = c.currentHp <= 0
            return (
              <div key={c.id} className={`rounded-xl border p-3.5 md:p-3 transition-all ${
                isDefeated
                  ? 'border-stone-800 opacity-40 bg-stone-900'
                  : isActive
                    ? 'border-gold bg-stone-800 shadow-lg shadow-gold/10'
                    : isNext
                      ? 'border-stone-500 bg-stone-800/60'
                      : 'border-stone-700 bg-stone-800'
              }`}>
                <div className="flex items-center gap-3 mb-2">
                  {/* Turn indicator dot */}
                  <div className={`w-3 h-3 md:w-2 md:h-2 rounded-full shrink-0 ${
                    isDefeated ? 'bg-stone-700'
                    : isActive ? 'bg-gold animate-pulse'
                    : isNext ? 'bg-stone-400'
                    : 'bg-stone-600'
                  }`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-medium text-base md:text-sm ${isDefeated ? 'text-stone-500' : 'text-stone-100'}`}>
                        {c.name}
                      </span>
                      {isActive && !isDefeated && (
                        <span className="text-sm md:text-xs bg-gold/20 border border-gold/40 text-gold px-2 py-0.5 md:px-1.5 rounded font-medium">
                          ⚡ Active
                        </span>
                      )}
                      {isNext && !isDefeated && !isActive && (
                        <span className="text-sm md:text-xs bg-stone-700 border border-stone-600 text-stone-400 px-2 py-0.5 md:px-1.5 rounded">
                          Up next
                        </span>
                      )}
                      <Badge variant={c.kind === 'character' ? 'blue' : 'red'}>{c.kind}</Badge>
                      {isDefeated && <span className="text-sm md:text-xs text-stone-500">💀 Defeated</span>}
                    </div>
                  </div>

                  {/* HP fraction */}
                  {!isDefeated && (
                    <span className="text-sm md:text-xs text-stone-400 font-mono shrink-0">
                      {c.currentHp}/{c.maxHp} HP
                    </span>
                  )}
                </div>

                {/* HP bar */}
                {!isDefeated && (
                  <HpBar current={c.currentHp} max={c.maxHp} className="mb-2" />
                )}

                {/* Active effects */}
                {c.activeEffects.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 md:gap-1">
                    {c.activeEffects.map(e => (
                      <span key={e.id} className={`inline-flex items-center gap-1 px-2 py-1 md:px-1.5 md:py-0.5 rounded text-sm md:text-xs border ${
                        e.damagePerRound
                          ? 'bg-red-900/30 border-red-800/50 text-red-300'
                          : 'bg-purple-900/30 border-purple-700/40 text-purple-300'
                      }`}>
                        {e.damagePerRound && '🩸'}
                        {e.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
