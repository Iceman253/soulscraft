import { useState } from 'react'
import { X, ArrowRight, Swords, Dices } from 'lucide-react'
import { useCombatStore } from './store'
import { Badge } from '../../ui/Badge'
import { AttackModal } from './AttackModal'
import { InitiativeModal } from './InitiativeModal'
import { CombatantRow } from './CombatantRow'
import { AddCombatantsPanel } from './AddCombatantsPanel'
import { useAttackFlow } from './useAttackFlow'
import { useInitiativeRolls } from './useInitiativeRolls'

interface CombatTrackerProps { onClose: () => void }

export function CombatTracker({ onClose }: CombatTrackerProps) {
  const { session, startCombat, sortByInitiative, nextTurn, endCombat } = useCombatStore()
  const initiative = useInitiativeRolls()
  const flow = useAttackFlow()
  const attack = flow.attack
  const [effectPickerFor, setEffectPickerFor] = useState<string | null>(null)

  // ── Empty / ended state ────────────────────────────────────────────────
  if (!session || session.ended) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-stone-950 text-stone-200">
        <Swords size={48} className="text-redstone mb-4 opacity-60" />
        <h2 className="text-xl font-bold mb-2 font-heading tracking-wide">Combat Tracker</h2>
        <p className="text-stone-500 mb-6 text-sm">Start a new combat encounter</p>
        <button onClick={startCombat} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-redstone hover:bg-red-700 text-white font-bold text-lg">
          <Swords size={20} /> Begin Combat
        </button>
        {session?.ended && (
          <p className="text-stone-500 text-sm mt-4">Previous combat ended. Press Begin to start a new one.</p>
        )}
        <button onClick={onClose} className="mt-4 text-sm text-stone-500 hover:text-stone-300">← Back</button>
      </div>
    )
  }

  const activeCombatant = session.combatants[session.activeIndex]

  return (
    <div className="h-full flex flex-col bg-stone-900 relative">
      {/* Header */}
      <div className="shrink-0 bg-stone-800 border-b border-stone-700 px-4 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Swords size={16} className="text-redstone" />
          <span className="font-bold text-stone-100 font-heading tracking-wide">Combat — Round <span className="font-mono tabular-nums">{session.round}</span></span>
        </div>
        {activeCombatant && <Badge variant="red">Active: {activeCombatant.name}</Badge>}
        <div className="ml-auto flex gap-2">
          {session.combatants.length > 0 && (
            <button onClick={initiative.start}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-stone-700 text-stone-300 hover:bg-stone-600 text-xs">
              <Dices size={12} /> Roll Initiative
            </button>
          )}
          <button onClick={sortByInitiative} className="px-3 py-1.5 rounded-sm bg-stone-700 text-stone-300 hover:bg-stone-600 text-xs">Sort</button>
          <button onClick={nextTurn} className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-gold text-stone-900 font-semibold hover:bg-yellow-400 text-xs">
            Next Turn <ArrowRight size={12} />
          </button>
          <button onClick={endCombat} className="px-3 py-1.5 rounded-sm bg-redstone/80 hover:bg-redstone text-white text-xs">End Combat</button>
          <button onClick={onClose} className="p-1.5 rounded-sm text-stone-400 hover:text-stone-100 hover:bg-stone-700"><X size={16} /></button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Combatants list */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {session.combatants.map((c, i) => (
              <CombatantRow
                key={c.id}
                c={c}
                active={i === session.activeIndex}
                canAttack={session.combatants.length >= 2}
                onAttack={() => flow.open(c)}
                pickerOpen={effectPickerFor === c.id}
                onTogglePicker={() => setEffectPickerFor(effectPickerFor === c.id ? null : c.id)}
              />
            ))}

            {session.combatants.length === 0 && (
              <div className="text-center text-stone-500 py-8 text-sm">No combatants yet. Add characters or creatures on the right.</div>
            )}
          </div>
        </div>

        <AddCombatantsPanel />
      </div>

      {initiative.rolls !== null && (
        <InitiativeModal
          rolls={initiative.rolls}
          revealedCount={initiative.revealedCount}
          rolling={initiative.rolling}
          onApply={initiative.apply}
          onDiscard={initiative.discard}
        />
      )}

      {attack !== null && (
        <AttackModal
          attack={attack}
          session={session}
          onSetTarget={flow.setTarget}
          onSetBonus={skillBonus => flow.patch({ skillBonus })}
          onSetApplied={applied => flow.patch({ applied })}
          onSetDefenderApplied={defenderApplied => flow.patch({ defenderApplied })}
          onRollAttack={flow.rollAttack}
          onRollDefense={flow.rollDefense}
          onSkipDefense={() => flow.patch({ phase: 'damage' })}
          onRollDamage={flow.rollDamage}
          onApplyDamage={flow.applyDamage}
          onClose={flow.close}
        />
      )}
    </div>
  )
}
