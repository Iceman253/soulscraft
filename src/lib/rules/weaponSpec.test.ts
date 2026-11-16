import { describe, it, expect } from 'vitest'
import {
  defaultWeaponSpec, withWeaponType, withWeaponMaterial, weaponFromSpec, specFromWeapon,
  enchantmentLabel, describeWeaponSpec, itemFromGood,
} from './weaponSpec'
import type { WeaponSpec } from '../../types'

const fire = { id: 'e1', name: 'Fire Aspect', durationType: 'scenes' as const, remaining: 3 }
const counter = () => { let n = 0; return () => `id${++n}` }

describe('defaultWeaponSpec', () => {
  it('starts at the rulebook damage bonus with no abilities', () => {
    expect(defaultWeaponSpec('axe', 'iron')).toEqual({ type: 'axe', material: 'iron', damageBonus: 2, enchantments: [] })
    expect(defaultWeaponSpec()).toEqual({ type: 'sword', material: 'iron', damageBonus: 1, enchantments: [] })
  })
})

describe('changing type and material', () => {
  it('keeps the material when the new type comes in it', () => {
    expect(withWeaponType(defaultWeaponSpec('sword', 'diamond'), 'axe')).toMatchObject({ type: 'axe', material: 'diamond' })
  })

  it('picks the first valid material when it does not', () => {
    expect(withWeaponType(defaultWeaponSpec('sword', 'iron'), 'bow')).toMatchObject({ type: 'bow', material: 'none' })
    expect(withWeaponType(defaultWeaponSpec('sword', 'iron'), 'mace')).toMatchObject({ material: 'netherite' })
  })

  it('moves a rulebook damage bonus along with the change', () => {
    expect(withWeaponType(defaultWeaponSpec('sword', 'iron'), 'axe').damageBonus).toBe(2)
    expect(withWeaponMaterial(defaultWeaponSpec('sword', 'iron'), 'netherite').damageBonus).toBe(3)
  })

  it('keeps a damage bonus the GM set by hand', () => {
    const tuned: WeaponSpec = { ...defaultWeaponSpec('sword', 'iron'), damageBonus: 5 }
    expect(withWeaponType(tuned, 'axe').damageBonus).toBe(5)
    expect(withWeaponMaterial(tuned, 'wood').damageBonus).toBe(5)
  })

  it('keeps the abilities', () => {
    const spec = { ...defaultWeaponSpec(), enchantments: [fire] }
    expect(withWeaponType(spec, 'bow').enchantments).toEqual([fire])
  })
})

describe('weaponFromSpec and specFromWeapon', () => {
  const spec: WeaponSpec = { type: 'sword', material: 'diamond', damageBonus: 4, enchantments: [fire], notes: 'Hums near Endermen' }

  it('builds an equippable weapon with the spec as its base and current bonus', () => {
    expect(weaponFromSpec(spec, 'Frostbrand', counter())).toEqual({
      name: 'Frostbrand', type: 'sword', material: 'diamond', baseDamageBonus: 4, currentDamageBonus: 4,
      enchantments: [{ ...fire, id: 'id1' }], notes: 'Hums near Endermen',
    })
  })

  it('gives each copy fresh enchantment ids', () => {
    const make = counter()
    const a = weaponFromSpec(spec, 'A', make)
    const b = weaponFromSpec(spec, 'B', make)
    expect(a.enchantments[0].id).not.toBe(b.enchantments[0].id)
  })

  it('stows the base bonus, drops a temporary override, and keeps time left', () => {
    const held = { ...weaponFromSpec(spec, 'Frostbrand', counter()), id: 'w', currentDamageBonus: 9 }
    held.enchantments = [{ ...held.enchantments[0], remaining: 1 }]
    expect(specFromWeapon(held)).toEqual({ ...spec, enchantments: [{ ...fire, id: 'id1', remaining: 1 }] })
  })

  it('leaves out notes when there are none', () => {
    const plain = weaponFromSpec(defaultWeaponSpec(), 'Sword', counter())
    expect('notes' in plain).toBe(false)
    expect('notes' in specFromWeapon({ ...plain, id: 'w' })).toBe(false)
  })
})

describe('labels', () => {
  it('names each kind of duration', () => {
    expect(enchantmentLabel(fire)).toBe('Fire Aspect (3 scenes)')
    expect(enchantmentLabel({ name: 'Luck', durationType: 'days', remaining: 2 })).toBe('Luck (2 days)')
    expect(enchantmentLabel({ name: 'Sharpness', durationType: 'permanent' })).toBe('Sharpness')
    expect(enchantmentLabel({ name: 'Curse', durationType: 'manual' })).toBe('Curse (until removed)')
  })

  it('describes a spec on one line', () => {
    expect(describeWeaponSpec({ type: 'sword', material: 'diamond', damageBonus: 3, enchantments: [fire] }))
      .toBe('Diamond Sword · +3 damage · Fire Aspect (3 scenes)')
    expect(describeWeaponSpec({ type: 'bow', material: 'none', damageBonus: -1, enchantments: [] })).toBe('Bow · −1 damage')
  })
})

describe('itemFromGood', () => {
  it('delivers a weapon good with its stats and description', () => {
    const weapon = defaultWeaponSpec('axe', 'diamond')
    expect(itemFromGood({ name: 'Cleaver', description: 'Old', weapon }, 1, 0))
      .toEqual({ name: 'Cleaver', quantity: 1, isBlock: false, description: 'Old', weapon })
  })

  it('counts blocks per unit and adds nothing extra to a plain good', () => {
    expect(itemFromGood({ name: 'Stone Blocks' }, 2, 10)).toEqual({ name: 'Stone Blocks', quantity: 20, isBlock: true })
  })
})
