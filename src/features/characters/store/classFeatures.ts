import type { ClassFeatureState } from '../../../types'
import { committer } from './helpers'
import type { CharacterSlice } from './types'

/** Class feature panels: rest charges, per-class state and the Discipline Edge. */
export interface ClassFeatureActions {
  useRestCharge: (id: string, chargeId: string) => void
  resetClassFeatures: (id: string) => void
  resetAllClassFeaturesOnRest: (characterIds: string[]) => void
  resetMagicCirclesOnDayEnd: () => void
  updateClassState: (id: string, patch: Record<string, unknown>) => void
  setEdgeUsed: (id: string, used: boolean) => void
}

/** What a rest restores for each class (rulebook class pages). */
export function resetClassState(fs: ClassFeatureState): ClassFeatureState {
  switch (fs.class) {
    case 'Warrior':
      return { ...fs, state: { ...fs.state, maneuvers: fs.state.maneuvers.map(m => ({ ...m, used: false })) } }
    case 'Vindicator':
      return { ...fs, state: { ...fs.state, voices: fs.state.voices.map(v => ({ ...v, used: false })), activeCause: '' } }
    case 'Delver':
      return { ...fs, state: { ...fs.state, evasions: fs.state.evasions.map(e => ({ ...e, used: false })), relicActivations: 2 } }
    case 'Wildspeaker':
      return {
        ...fs,
        state: { ...fs.state, tethers: [{ force: null, bonus: null }, { force: null, bonus: null }], beastshaperUsed: false, shamanUsed: false },
      }
    case 'Evoker':
      return { ...fs, state: { ...fs.state, soulmenderUsed: false, reaperUsed: false, soulAnchorUsed: false } }
    case 'Tecton':
      return { ...fs, state: { instantCraftsRemaining: 3, mechanistCharges: 2 } }
    case 'Hunter':
      return { ...fs, state: { preyType: null } }
    default:
      return fs
  }
}

/** Mark one Warrior maneuver, Vindicator voice or Delver evasion as spent. */
function spendCharge(fs: ClassFeatureState, chargeId: string): ClassFeatureState {
  const spend = <T extends { id: string; used: boolean }>(list: T[]) => list.map(x => x.id === chargeId ? { ...x, used: true } : x)
  switch (fs.class) {
    case 'Warrior': return { ...fs, state: { ...fs.state, maneuvers: spend(fs.state.maneuvers) } }
    case 'Vindicator': return { ...fs, state: { ...fs.state, voices: spend(fs.state.voices) } }
    case 'Delver': return { ...fs, state: { ...fs.state, evasions: spend(fs.state.evasions) } }
    default: return fs
  }
}

/** Merge loose fields into whatever class state the character has. */
function patchClassState(fs: ClassFeatureState, patch: Record<string, unknown>): ClassFeatureState {
  return { ...fs, state: { ...(fs.state as unknown as Record<string, unknown>), ...patch } } as unknown as ClassFeatureState
}

export const createClassFeatureSlice: CharacterSlice<ClassFeatureActions> = (set, get) => {
  const { commit, update } = committer(set, get)
  return {
    useRestCharge(id, chargeId) {
      update(id, c => {
        const next = spendCharge(c.classFeatureState, chargeId)
        return next === c.classFeatureState ? c : { ...c, classFeatureState: next }
      })
    },

    resetClassFeatures(id) {
      update(id, c => ({ ...c, classFeatureState: resetClassState(c.classFeatureState), disciplineEdge: { ...c.disciplineEdge, used: false } }))
    },

    resetAllClassFeaturesOnRest(characterIds) {
      commit(get().characters.map(c => !characterIds.includes(c.id) ? c : {
        ...c,
        classFeatureState: resetClassState(c.classFeatureState),
        disciplineEdge: { ...c.disciplineEdge, used: false },
        activeEffects: c.activeEffects.filter(e => e.durationType !== 'until-rest'),
      }))
    },

    resetMagicCirclesOnDayEnd() {
      commit(get().characters.map(c => c.classFeatureState.class !== 'Enchanter' ? c
        : { ...c, classFeatureState: patchClassState(c.classFeatureState, { magicCircleActive: false }) }))
    },

    updateClassState(id, patch) {
      update(id, c => ({ ...c, classFeatureState: patchClassState(c.classFeatureState, patch) }))
    },

    setEdgeUsed(id, used) {
      update(id, c => ({ ...c, disciplineEdge: { ...c.disciplineEdge, used } }))
    },
  }
}
