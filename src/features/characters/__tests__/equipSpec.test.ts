import { describe, it, expect, vi } from 'vitest'
import { makeChar } from '../../../test/fixtures'
import type { CharacterItem, Weapon, WeaponSpec } from '../../../types'

vi.mock('../../campaigns/store', () => ({
  useCampaignStore: { getState: () => ({ updateCampaignData: vi.fn(), activeCampaign: null }) },
}))
vi.mock('../../log/store', () => ({ log: vi.fn() }))

import { equipInHand, stowWeapon } from '../store/gear'

const counter = () => { let n = 0; return () => `id${++n}` }
const fire = { id: 'e1', name: 'Fire Aspect', durationType: 'scenes' as const, remaining: 3 }
const spec: WeaponSpec = { type: 'axe', material: 'diamond', damageBonus: 4, enchantments: [fire] }
const picked: Omit<Weapon, 'id'> = { name: 'Cleaver', type: 'sword', material: 'iron', baseDamageBonus: 1, currentDamageBonus: 1, enchantments: [] }
const holding = (...items: CharacterItem[]) => makeChar({ onHand: { items } })

describe('equipInHand', () => {
  it('uses the stats an item carries over the ones picked on the Gear tab', () => {
    const c = equipInHand(holding({ id: 'i', name: 'Cleaver', quantity: 1, weapon: spec }), 'mainHand', picked, 'i', counter())
    expect(c.weaponLoadout.mainHand).toMatchObject({ name: 'Cleaver', type: 'axe', material: 'diamond', baseDamageBonus: 4, currentDamageBonus: 4 })
    expect(c.weaponLoadout.mainHand?.enchantments).toEqual([{ ...fire, id: 'id1' }])
    expect(c.onHand.items[0].gearSlot).toBe('mainHand')
  })

  it('uses the picked stats for a plain item', () => {
    const c = equipInHand(holding({ id: 'i', name: 'Stick', quantity: 1 }), 'offHand', picked, 'i', counter())
    expect(c.weaponLoadout.offHand).toEqual({ ...picked, id: 'id1' })
  })

  it('works with no On Hand item at all', () => {
    const c = equipInHand(holding(), 'mainHand', picked, undefined, counter())
    expect(c.weaponLoadout.mainHand?.name).toBe('Cleaver')
    expect(c.onHand.items).toEqual([])
  })

  it('puts the weapon already in that hand away first', () => {
    const make = counter()
    let c = equipInHand(holding({ id: 'a', name: 'Cleaver', quantity: 1, weapon: spec }, { id: 'b', name: 'Stick', quantity: 1 }), 'mainHand', picked, 'a', make)
    c = equipInHand(c, 'mainHand', { ...picked, name: 'Stick' }, 'b', make)
    expect(c.weaponLoadout.mainHand?.name).toBe('Stick')
    expect(c.onHand.items.find(i => i.id === 'a')?.gearSlot).toBeUndefined()
    expect(c.onHand.items.find(i => i.id === 'b')?.gearSlot).toBe('mainHand')
  })
})

describe('stowWeapon', () => {
  it('writes the time left on abilities back to the item', () => {
    let c = equipInHand(holding({ id: 'i', name: 'Cleaver', quantity: 1, weapon: spec }), 'mainHand', picked, 'i', counter())
    const held = c.weaponLoadout.mainHand!
    c = { ...c, weaponLoadout: { ...c.weaponLoadout, mainHand: { ...held, enchantments: [{ ...held.enchantments[0], remaining: 1 }] } } }
    c = stowWeapon(c, 'mainHand')
    expect(c.weaponLoadout.mainHand).toBeNull()
    expect(c.onHand.items[0]).toEqual({ id: 'i', name: 'Cleaver', quantity: 1, weapon: { ...spec, enchantments: [{ ...fire, id: 'id1', remaining: 1 }] } })
  })

  it('gives a plain item no stats when it is put away', () => {
    const c = stowWeapon(equipInHand(holding({ id: 'i', name: 'Stick', quantity: 1 }), 'mainHand', picked, 'i', counter()), 'mainHand')
    expect(c.onHand.items[0]).toEqual({ id: 'i', name: 'Stick', quantity: 1 })
  })

  it('leaves items worn in the other hand alone', () => {
    const make = counter()
    let c = equipInHand(holding({ id: 'a', name: 'A', quantity: 1 }, { id: 'b', name: 'B', quantity: 1 }), 'mainHand', picked, 'a', make)
    c = equipInHand(c, 'offHand', picked, 'b', make)
    c = stowWeapon(c, 'mainHand')
    expect(c.onHand.items.find(i => i.id === 'b')?.gearSlot).toBe('offHand')
    expect(c.weaponLoadout.offHand).not.toBeNull()
  })
})
