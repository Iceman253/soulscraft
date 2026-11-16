import type { Character, XpEvent } from '../../../types'
import { newId } from '../../../lib/platform/id'
import { log } from '../../log/store'
import { calcMaxHp } from '../../../lib/rules/constants'
import { committer, mapChar, resolveDeathAtZero } from './helpers'
import type { CharacterSlice } from './types'

/** HP, Souls Dice, XP and levels, death and the Tower of Trials, missed rests. */
export interface VitalsActions {
  adjustHp: (id: string, delta: number) => void
  adjustSd: (id: string, delta: number) => void
  /** Set HP to an absolute value (used to mirror Combat Tracker damage to the
   *  sheet). Triggers the same death / Tower-eject resolution as adjustHp. */
  syncCombatHp: (id: string, currentHp: number) => void
  awardXp: (characterId: string, amount: number, source: XpEvent['source'], note?: string) => void
  levelUp: (id: string) => void

  // Death / resurrection (rulebook p.74)
  markDead: (id: string) => void
  setGhost: (id: string, isGhost: boolean) => void
  setInTower: (id: string, inTower: boolean) => void
  resurrect: (id: string) => void

  missRest: (id: string) => void
  resetMissedRests: (id: string) => void
}

export const createVitalsSlice: CharacterSlice<VitalsActions> = (set, get) => {
  const { commit, update } = committer(set, get)

  /** Set HP (clamped to 0..max). Dropping to 0 runs Avoid Death / Tower-eject
   *  resolution: a character with SD left is NOT auto-killed — they may still
   *  spend SD to stay up. */
  const setHp = (id: string, nextHp: (c: Character) => number) => {
    const before = get().characters.find(c => c.id === id)
    if (!before) return
    let characters = mapChar(get().characters, id, c => ({ ...c, currentHp: Math.max(0, Math.min(c.maxHp, nextHp(c))) }))
    const after = characters.find(c => c.id === id)!
    let message: string | undefined
    if (before.currentHp > 0 && after.currentHp === 0) {
      if (before.name.toLowerCase() === 'infinite') {
        log('character-move', '∞ Infinite has been defeated... You have done the impossible.')
      }
      const resolved = resolveDeathAtZero(characters, id)
      characters = resolved.characters
      message = resolved.message
    }
    commit(characters)
    if (message) log('character-move', message)
  }

  return {
    adjustHp: (id, delta) => setHp(id, c => c.currentHp + delta),
    syncCombatHp: (id, currentHp) => setHp(id, () => currentHp),

    adjustSd(id, delta) {
      update(id, c => ({ ...c, currentSd: Math.max(0, Math.min(c.maxSd, c.currentSd + delta)) }))
    },

    awardXp(characterId, amount, source, note) {
      const entry: XpEvent = { id: newId(), timestamp: Date.now(), characterId, amount, source, note }
      const characters = mapChar(get().characters, characterId, c => ({ ...c, xp: c.xp + amount }))
      set({ xpLog: [...get().xpLog, entry] })
      commit(characters)   // saves the characters with the new xpLog
      const char = characters.find(c => c.id === characterId)
      if (char) log('xp-awarded', `⭐ ${char.name} gained ${amount} XP (${source}).`)
    },

    levelUp(id) {
      // Leveling raises max HP and SD. Current HP gains the HP increase (capped);
      // current SD only refills on rest, unless it was already full.
      update(id, c => {
        const level = c.level + 1
        const maxHp = calcMaxHp(c.class, level)
        const maxSd = 5 + level
        return {
          ...c,
          level,
          xp: c.xp - 5,
          maxHp,
          currentHp: Math.min(maxHp, c.currentHp + Math.max(0, maxHp - c.maxHp)),
          maxSd,
          currentSd: c.currentSd === c.maxSd ? maxSd : Math.min(maxSd, c.currentSd),
        }
      })
      const char = get().characters.find(c => c.id === id)
      if (char) log('level-up', `🎉 ${char.name} leveled up to Level ${char.level}! Max HP: ${char.maxHp}, Max SD: ${char.maxSd}. (SD refills on rest.)`)
    },

    markDead(id) {
      const char = get().characters.find(c => c.id === id)
      if (!char) return
      // SD is kept: the player may still spend it to avoid death.
      update(id, c => ({ ...c, isDead: true, isGhost: false, currentHp: 0 }))
      log('character-move', `💀 ${char.name} has died.`)
    },

    setGhost(id, isGhost) {
      const char = get().characters.find(c => c.id === id)
      if (!char) return
      update(id, c => ({ ...c, isGhost }))
      log('character-move', isGhost
        ? `👻 ${char.name} is now a Ghost — observing the Tower of Trials.`
        : `👻 ${char.name} is no longer in Ghost form.`)
    },

    setInTower(id, inTower) {
      const char = get().characters.find(c => c.id === id)
      if (!char || !!char.inTower === inTower) return
      update(id, c => ({ ...c, inTower }))
      log('character-move', inTower
        ? `🗼 ${char.name} has entered the Tower of Trials — they cannot die within.`
        : `🗼 ${char.name} has left the Tower of Trials.`)
    },

    resurrect(id) {
      const char = get().characters.find(c => c.id === id)
      if (!char) return
      update(id, c => ({ ...c, isDead: false, isGhost: false, currentHp: c.maxHp, currentSd: c.maxSd }))
      log('character-move', `✨ ${char.name} has been resurrected by the Tower Keepers! Full HP and SD restored.`)
    },

    missRest(id) {
      update(id, c => ({ ...c, missedRests: c.missedRests + 1 }))
      const char = get().characters.find(c => c.id === id)
      if (char) log('missed-rest', `⚠️ ${char.name} skipped a rest. Cumulative ${char.missedRests}d4 penalty now applies to all rolls.`)
    },

    resetMissedRests(id) {
      update(id, c => ({ ...c, missedRests: 0 }))
    },
  }
}
