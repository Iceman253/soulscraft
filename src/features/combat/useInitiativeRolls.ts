// Rolls 2d6 initiative for every combatant and reveals the results one by one.
import { useEffect, useState } from 'react'
import { useCombatStore } from './store'
import { rollD6 } from './combatUtils'
import type { InitRoll } from './InitiativeModal'

export function useInitiativeRolls() {
  const [rolls, setRolls] = useState<InitRoll[] | null>(null)
  const [revealedCount, setRevealedCount] = useState(0)
  const [rolling, setRolling] = useState(false)

  useEffect(() => {
    if (!rolling || rolls === null) return
    if (revealedCount >= rolls.length) { setRolling(false); return }
    const t = setTimeout(() => setRevealedCount(n => n + 1), 550)
    return () => clearTimeout(t)
  }, [rolling, revealedCount, rolls])

  const start = () => {
    const combatants = useCombatStore.getState().session?.combatants ?? []
    if (combatants.length === 0) return
    setRolls(combatants.map(c => {
      const d1 = rollD6(), d2 = rollD6()
      return { id: c.id, name: c.name, d1, d2, total: d1 + d2 }
    }))
    setRevealedCount(0)
    setRolling(true)
  }

  const discard = () => { setRolls(null); setRevealedCount(0) }

  const apply = () => {
    if (!rolls) return
    const { setInitiative, sortByInitiative } = useCombatStore.getState()
    rolls.forEach(r => setInitiative(r.id, r.total))
    sortByInitiative()
    discard()
  }

  return { rolls, revealedCount, rolling, start, apply, discard }
}
