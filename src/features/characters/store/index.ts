// The character store. Each file in this folder owns one group of actions:
//   core           hydrate, create/delete, class, discipline and species changes
//   vitals         HP, SD, XP and levels, death and the Tower, missed rests
//   location       area, sub-location and free map position
//   sheet          skills, traits, abilities
//   effects        status effects and their scene/day ticks
//   gear           equipped armor and weapons, enchantments
//   classFeatures  rest charges and per-class state
//   inventory      on hand, storage, carry limit, coins, rations
// helpers.ts holds the shared commit/save helpers; migrate.ts the load-time upgrade.
import { create } from 'zustand'
import type { CharacterStore } from './types'
import { createCoreSlice } from './core'
import { createVitalsSlice } from './vitals'
import { createLocationSlice } from './location'
import { createSheetSlice } from './sheet'
import { createEffectSlice } from './effects'
import { createGearSlice } from './gear'
import { createClassFeatureSlice } from './classFeatures'
import { createInventorySlice } from './inventory'

export const useCharacterStore = create<CharacterStore>()((...a) => ({
  characters: [],
  xpLog: [],
  ...createCoreSlice(...a),
  ...createVitalsSlice(...a),
  ...createLocationSlice(...a),
  ...createSheetSlice(...a),
  ...createEffectSlice(...a),
  ...createGearSlice(...a),
  ...createClassFeatureSlice(...a),
  ...createInventorySlice(...a),
}))

export type { CharacterStore } from './types'
export { defaultClassFeatureState } from '../../../lib/rules/newCharacter'
