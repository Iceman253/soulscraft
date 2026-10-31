import { describe, it, expect } from 'vitest'
import { playerNeedsCharacter, resolvePlayerRole } from './playerRole'

describe('resolvePlayerRole', () => {
  it('forces phones into player mode, even with no role chosen', () => {
    expect(resolvePlayerRole(true, null)).toBe('')
  })
  it('keeps the character a phone is bound to', () => {
    expect(resolvePlayerRole(true, 'char-1')).toBe('char-1')
    expect(resolvePlayerRole(true, '')).toBe('')
  })
  it('leaves a desktop GM as GM', () => {
    expect(resolvePlayerRole(false, null)).toBeNull()
  })
  it('keeps a player role on a desktop or iPad', () => {
    expect(resolvePlayerRole(false, 'char-1')).toBe('char-1')
    expect(resolvePlayerRole(false, '')).toBe('')
  })
})

describe('playerNeedsCharacter', () => {
  it('is true with no bound character', () => {
    expect(playerNeedsCharacter(undefined)).toBe(true)
  })
  it('is true when the bound character has died', () => {
    expect(playerNeedsCharacter({ isDead: true })).toBe(true)
  })
  it('is false for a living bound character', () => {
    expect(playerNeedsCharacter({ isDead: false })).toBe(false)
    expect(playerNeedsCharacter({})).toBe(false)
  })
})
