import { describe, it, expect } from 'vitest'
import { playerNeedsCharacter, resolvePlayerRole, canSeeInventory } from './playerRole'

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

describe('canSeeInventory', () => {
  it('always lets the owner see their own inventory', () => {
    expect(canSeeInventory({}, true, 'char-1')).toBe(true)
    expect(canSeeInventory({ inventoryShared: false }, true, 'char-1')).toBe(true)
  })
  it('always lets the GM see (no focused character id)', () => {
    expect(canSeeInventory({}, false, undefined)).toBe(true)
  })
  it('hides an unshared inventory from other players', () => {
    expect(canSeeInventory({}, false, 'char-2')).toBe(false)
    expect(canSeeInventory({ inventoryShared: false }, false, 'char-2')).toBe(false)
  })
  it('shows a shared inventory to other players', () => {
    expect(canSeeInventory({ inventoryShared: true }, false, 'char-2')).toBe(true)
  })
})
