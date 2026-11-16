import { describe, it, expect } from 'vitest'
import { potionRecipeFor, ongoingPotionEffect } from './potions'

describe('potionRecipeFor', () => {
  it('matches the GM-given name, ignoring case', () => {
    expect(potionRecipeFor({ name: 'potion of healing' })?.name).toBe('Potion of Healing')
  })

  it('ignores a custom name, so renaming never makes something a potion', () => {
    expect(potionRecipeFor({ name: 'Rock', customName: 'Potion of Healing' } as { name: string })).toBeUndefined()
  })
})

describe('ongoingPotionEffect', () => {
  it('lasts the chosen scenes and drops "Potion of" from the name', () => {
    const effect = ongoingPotionEffect(potionRecipeFor({ name: 'Potion of Swiftness' })!, 2)
    expect(effect).toMatchObject({ name: 'Swiftness', durationType: 'scenes', remaining: 2, damagePerRound: undefined })
  })

  it('makes Poison deal 1d6 a tick', () => {
    expect(ongoingPotionEffect(potionRecipeFor({ name: 'Potion of Poison' })!, 1).damagePerRound).toBe('1d6')
  })
})
