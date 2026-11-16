// Class abilities from the class pages, one file per class.
import type { ClassAbility } from './types'
import { WARRIOR_ABILITIES } from './warrior'
import { HUNTER_ABILITIES } from './hunter'
import { VINDICATOR_ABILITIES } from './vindicator'
import { ENCHANTER_ABILITIES } from './enchanter'
import { DELVER_ABILITIES } from './delver'
import { WILDSPEAKER_ABILITIES } from './wildspeaker'
import { EVOKER_ABILITIES } from './evoker'
import { TECTON_ABILITIES } from './tecton'
import { ALCHEMIST_ABILITIES } from './alchemist'

export type { CombatRole, ClassAbility } from './types'

export const CLASS_ABILITIES: Record<string, ClassAbility[]> = {
  Warrior: WARRIOR_ABILITIES,
  Hunter: HUNTER_ABILITIES,
  Vindicator: VINDICATOR_ABILITIES,
  Enchanter: ENCHANTER_ABILITIES,
  Delver: DELVER_ABILITIES,
  Wildspeaker: WILDSPEAKER_ABILITIES,
  Evoker: EVOKER_ABILITIES,
  Tecton: TECTON_ABILITIES,
  Alchemist: ALCHEMIST_ABILITIES,
}
