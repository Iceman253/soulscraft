import { describe, it, expect } from 'vitest'
import type { PlayerRequest } from '../../../types'
import { levelUpInitialFrom, skillApprovalStatus } from '../skillApproval'

const req = (over: Partial<PlayerRequest>): PlayerRequest => ({
  id: 'r', characterId: 'c1', characterName: 'Steve', type: 'skill-approval', payload: {},
  label: '', status: 'pending', createdAt: 0, ...over,
})

describe('skillApprovalStatus', () => {
  it('finds the pending proposal and the newest denied one for this character', () => {
    const requests = [
      req({ id: 'old-denied', status: 'denied', createdAt: 1 }),
      req({ id: 'new-denied', status: 'denied', createdAt: 5 }),
      req({ id: 'pending' }),
      req({ id: 'someone-else', characterId: 'c2' }),
      req({ id: 'not-a-proposal', type: 'xp', status: 'denied', createdAt: 9 }),
    ]
    const { pending, denied } = skillApprovalStatus(requests, 'c1')
    expect(pending?.id).toBe('pending')
    expect(denied?.id).toBe('new-denied')
  })

  it('has nothing without a character', () => {
    expect(skillApprovalStatus([req({})], undefined)).toEqual({ pending: undefined, denied: undefined })
  })
})

describe('levelUpInitialFrom', () => {
  it('restores the proposal the player sent', () => {
    expect(levelUpInitialFrom({
      abilityName: 'Cleave', skillName: 'Axes', skillDescription: 'Big swings',
      skillCombatRoles: ['attack'], skillAppliedEffects: [{ effectName: 'Bleeding', target: 'target' }],
    })).toEqual({
      abilityName: 'Cleave', skillName: 'Axes', skillDescription: 'Big swings',
      skillRoles: ['attack'], skillEffects: [{ effectName: 'Bleeding', target: 'target' }],
    })
  })

  it('falls back to blanks for missing or malformed fields', () => {
    expect(levelUpInitialFrom({ abilityName: 3, skillCombatRoles: 'attack' })).toEqual({
      abilityName: null, skillName: '', skillDescription: '', skillRoles: ['general'], skillEffects: [],
    })
  })
})
