import { create } from 'zustand'
import type { CombatSession, Combatant, ActiveEffect, Character, BestiaryEntry } from '../../types'
import { newId } from '../../lib/id'
import { log } from '../log/store'
import { computeDef } from '../../lib/armor'

// Rulebook p.101: Weak 1-4 HP, Average 5-10 HP, Strong 11-12 HP, Mighty 13+ HP.
// Defaults sit at the midpoint / typical value of each tier.
export const HP_TIER: Record<BestiaryEntry['hpTier'], number> = {
  weak: 4,
  average: 8,
  strong: 12,
  mighty: 16,
}

interface CombatStore {
  session: CombatSession | null

  startCombat: () => void
  addCharacterCombatant: (character: Character) => void
  addCreatureCombatant: (creature: BestiaryEntry, label?: string, customHp?: number, customDef?: number, customDamageDie?: string) => void
  removeComabtant: (id: string) => void
  setInitiative: (id: string, initiative: number) => void
  sortByInitiative: () => void
  nextTurn: () => void
  adjustCombatantHp: (id: string, delta: number) => void
  overrideDef: (id: string, def: number) => void
  addCombatantEffect: (id: string, effect: Omit<ActiveEffect, 'id'>) => void
  removeCombatantEffect: (id: string, effectId: string) => void
  updateCombatantNotes: (id: string, notes: string) => void
  toggleTough: (id: string) => void
  /** Replace a defeated slime/magma cube with two smaller ones. */
  splitSlime: (id: string) => void
  endCombat: () => void
}

export const useCombatStore = create<CombatStore>((set, get) => ({
  session: null,

  startCombat() {
    const session: CombatSession = {
      id: newId(),
      startedAt: Date.now(),
      combatants: [],
      round: 1,
      activeIndex: 0,
      ended: false,
    }
    set({ session })
    log('combat-end', '⚔️ Combat started.')
  },

  addCharacterCombatant(character) {
    const session = get().session
    if (!session) return
    const combatant: Combatant = {
      id: newId(),
      name: character.name,
      initiative: 0,
      maxHp: character.maxHp,
      currentHp: character.currentHp,
      def: computeDef(character.armorLoadout),
      damageDie: character.damageDie,
      kind: 'character',
      sourceId: character.id,
      activeEffects: [...character.activeEffects],
      notes: '',
    }
    set({ session: { ...session, combatants: [...session.combatants, combatant] } })
  },

  addCreatureCombatant(creature, label, customHp, customDef, customDamageDie) {
    const session = get().session
    if (!session) return
    const hp = customHp ?? creature.maxHp ?? HP_TIER[creature.hpTier]
    const combatant: Combatant = {
      id: newId(),
      name: label ?? creature.name,
      initiative: 0,
      maxHp: hp,
      currentHp: hp,
      def: customDef ?? 0,
      damageDie: customDamageDie || undefined,
      kind: 'creature',
      sourceId: creature.id,
      activeEffects: [],
      notes: creature.abilities ?? '',
    }
    set({ session: { ...session, combatants: [...session.combatants, combatant] } })
  },

  removeComabtant(id) {
    const session = get().session
    if (!session) return
    set({
      session: {
        ...session,
        combatants: session.combatants.filter(c => c.id !== id),
      },
    })
  },

  setInitiative(id, initiative) {
    const session = get().session
    if (!session) return
    set({
      session: {
        ...session,
        combatants: session.combatants.map(c =>
          c.id === id ? { ...c, initiative } : c
        ),
      },
    })
  },

  sortByInitiative() {
    const session = get().session
    if (!session) return
    const combatants = [...session.combatants].sort((a, b) => b.initiative - a.initiative)
    set({ session: { ...session, combatants, activeIndex: 0 } })
  },

  nextTurn() {
    const session = get().session
    if (!session || session.combatants.length === 0) return

    // Find next alive combatant (skip defeated ones)
    const total = session.combatants.length
    let nextIndex = (session.activeIndex + 1) % total
    let steps = 0
    while (session.combatants[nextIndex].currentHp <= 0 && steps < total) {
      nextIndex = (nextIndex + 1) % total
      steps++
    }
    // If all are defeated, don't advance (shouldn't normally happen)
    if (session.combatants[nextIndex].currentHp <= 0) return

    const newRound = nextIndex <= session.activeIndex ? session.round + 1 : session.round

    // Apply per-round damage effects to the combatant whose turn is starting
    const next = session.combatants[nextIndex]
    let combatants = [...session.combatants]
    for (const effect of next.activeEffects) {
      if (!effect.damagePerRound) continue
      const m = effect.damagePerRound.match(/d(\d+)/i)
      const sides = m ? parseInt(m[1]) : 6
      const buf = new Uint32Array(1)
      crypto.getRandomValues(buf)
      const dmg = (buf[0] % sides) + 1
      combatants = combatants.map(c =>
        c.id === next.id ? { ...c, currentHp: Math.max(0, c.currentHp - dmg) } : c
      )
      log('combat-end', `🩸 ${next.name} takes ${dmg} damage (${effect.damagePerRound}) from ${effect.name}.`)
    }

    set({ session: { ...session, combatants, activeIndex: nextIndex, round: newRound } })
  },

  adjustCombatantHp(id, delta) {
    const session = get().session
    if (!session) return
    set({
      session: {
        ...session,
        combatants: session.combatants.map(c =>
          c.id === id
            ? { ...c, currentHp: Math.max(0, Math.min(c.maxHp, c.currentHp + delta)) }
            : c
        ),
      },
    })
  },

  overrideDef(id, def) {
    const session = get().session
    if (!session) return
    set({
      session: {
        ...session,
        combatants: session.combatants.map(c => c.id === id ? { ...c, def } : c),
      },
    })
  },

  addCombatantEffect(id, effect) {
    const session = get().session
    if (!session) return
    const newEffect: ActiveEffect = { ...effect, id: newId() }
    set({
      session: {
        ...session,
        combatants: session.combatants.map(c =>
          c.id === id
            ? { ...c, activeEffects: [...c.activeEffects, newEffect] }
            : c
        ),
      },
    })
  },

  removeCombatantEffect(id, effectId) {
    const session = get().session
    if (!session) return
    set({
      session: {
        ...session,
        combatants: session.combatants.map(c =>
          c.id === id
            ? { ...c, activeEffects: c.activeEffects.filter(e => e.id !== effectId) }
            : c
        ),
      },
    })
  },

  updateCombatantNotes(id, notes) {
    const session = get().session
    if (!session) return
    set({
      session: {
        ...session,
        combatants: session.combatants.map(c => c.id === id ? { ...c, notes } : c),
      },
    })
  },

  toggleTough(id) {
    const session = get().session
    if (!session) return
    set({
      session: {
        ...session,
        combatants: session.combatants.map(c => c.id === id ? { ...c, isTough: !c.isTough } : c),
      },
    })
  },

  splitSlime(id) {
    const session = get().session
    if (!session) return
    const parent = session.combatants.find(c => c.id === id)
    if (!parent) return

    // Determine current stage from the name and pick child stats.
    // Manual: large slime/magma cube splits into 2 medium (HP 5), medium → 2 small (HP 3).
    const name = parent.name.toLowerCase()
    const isSmall  = name.includes('small')
    const isMedium = name.includes('medium')
    if (isSmall) return // small slimes don't split further

    const baseLabel = parent.name
      .replace(/^(small|medium|large)\s+/i, '')
      .trim() || (name.includes('magma') ? 'Magma Cube' : 'Slime')

    const childStage = isMedium ? 'Small' : 'Medium'
    const childHp    = isMedium ? 3       : 5
    const childDie   = isMedium ? 'd4'    : 'd6'

    const makeChild = (idx: number): Combatant => ({
      id: newId(),
      name: `${childStage} ${baseLabel} ${idx}`,
      initiative: parent.initiative,
      maxHp: childHp,
      currentHp: childHp,
      def: 0,
      damageDie: childDie,
      kind: 'creature',
      sourceId: parent.sourceId,
      activeEffects: [],
      notes: parent.notes,
    })

    const idx = session.combatants.findIndex(c => c.id === id)
    const children = [makeChild(1), makeChild(2)]
    const next = [
      ...session.combatants.slice(0, idx),
      ...children,
      ...session.combatants.slice(idx + 1),
    ]

    // Adjust activeIndex if the removed combatant was before it
    let activeIndex = session.activeIndex
    if (idx < session.activeIndex) activeIndex = session.activeIndex + 1
    else if (idx === session.activeIndex) activeIndex = idx // first child takes the slot

    set({ session: { ...session, combatants: next, activeIndex } })
    log('combat-end', `🟢 ${parent.name} split into 2 × ${childStage} ${baseLabel} (${childHp} HP each).`)
  },

  endCombat() {
    const session = get().session
    if (!session) return
    const alive = session.combatants.filter(c => c.currentHp > 0)
    const dead = session.combatants.filter(c => c.currentHp <= 0)
    set({ session: { ...session, ended: true } })
    log('combat-end', `⚔️ Combat ended. Round ${session.round}. Alive: ${alive.map(c => c.name).join(', ') || 'none'}. Defeated: ${dead.map(c => c.name).join(', ') || 'none'}.`)
  },
}))
