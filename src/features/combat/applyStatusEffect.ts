// Puts a status effect on a combatant, with the effects that fire on application.
import { useCombatStore } from './store'
import { useCharacterStore } from '../characters/store'
import { log } from '../log/store'
import { rollD6 } from './combatUtils'
import type { StatusTemplate } from './statusEffects'

export function applyStatusEffect(combatantId: string, template: StatusTemplate) {
  const { session, addCombatantEffect, adjustCombatantHp } = useCombatStore.getState()
  addCombatantEffect(combatantId, {
    name: template.name,
    description: template.description,
    durationType: 'manual',
    damagePerRound: template.damagePerRound,
    healPerRound: template.healPerRound,
  })
  const target = session?.combatants.find(c => c.id === combatantId)
  let note = template.damagePerRound ? ` (${template.damagePerRound}/turn)` : ''
  if (template.healPerRound) note += ` (heals ${template.healPerRound}/turn)`

  // Withering drains a character's SD to 0 while it lasts.
  if (template.name === 'Withering' && target?.kind === 'character') {
    const chars = useCharacterStore.getState()
    const char = chars.characters.find(c => c.id === target.sourceId)
    if (char) { chars.adjustSd(char.id, -char.currentSd); note += ' — SD drained to 0' }
  }
  // Health Boost rolls 1d6 temporary HP.
  if (template.name === 'Health Boost' && target) {
    const tempHp = rollD6()
    adjustCombatantHp(combatantId, tempHp)
    note += ` — +${tempHp} temp HP rolled`
  }

  log('combat-end', `${template.harmful ? '🩸' : '✨'} ${template.name} applied to ${target?.name ?? ''}.${note}`)
}
