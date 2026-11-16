import type { StateCreator } from 'zustand'
import type { Character, XpEvent } from '../../../types'
import type { CoreActions } from './core'
import type { VitalsActions } from './vitals'
import type { LocationActions } from './location'
import type { SheetActions } from './sheet'
import type { EffectActions } from './effects'
import type { GearActions } from './gear'
import type { ClassFeatureActions } from './classFeatures'
import type { InventoryActions } from './inventory'

export interface CharacterState {
  characters: Character[]
  xpLog: XpEvent[]
}

export type CharacterStore = CharacterState
  & CoreActions & VitalsActions & LocationActions & SheetActions
  & EffectActions & GearActions & ClassFeatureActions & InventoryActions

/** One group of store actions; the slices are merged in index.ts. */
export type CharacterSlice<T> = StateCreator<CharacterStore, [], [], T>
