import { describe, it, expect } from 'vitest'
import {
  CLASSES, SPECIES, CLASS_DATA, CLASS_DAMAGE_DICE, CLASS_BASE_HP,
  CLASS_HP_PER_LEVEL, CLASS_DISCIPLINES, DISCIPLINE_EDGES, DISCIPLINE_INFO,
  SPECIES_DATA, DEFAULT_CLASS_SKILLS, calcMaxHp, calcMaxSd,
} from './constants'
import {
  buildNewCharacter, CLASS_SKILL_BONUS, startingGearFor,
  CLASS_STARTING_ITEMS,
} from './newCharacter'

// ── Creation-screen data completeness ──────────────────────────────────
// Every choice offered during character creation must carry a description,
// so a new player can tell what they're picking without the rulebook.

describe('class choice data', () => {
  it.each([...CLASSES])('%s has a summary, description, and full stat block', cls => {
    expect(CLASS_DATA[cls]?.summary).toBeTruthy()
    expect(CLASS_DATA[cls]?.description).toBeTruthy()
    expect(CLASS_DAMAGE_DICE[cls]).toMatch(/^d\d+$/)
    expect(CLASS_BASE_HP[cls]).toBeGreaterThan(0)
    expect(CLASS_HP_PER_LEVEL[cls]).toBeGreaterThan(0)
    expect(CLASS_SKILL_BONUS[cls]).toBeGreaterThanOrEqual(1)
    expect(DEFAULT_CLASS_SKILLS[cls]?.length).toBeGreaterThan(0)
    expect(CLASS_DISCIPLINES[cls]?.length).toBeGreaterThan(0)
  })

  it('has no CLASS_DATA entry for a class that does not exist', () => {
    const known = new Set<string>(CLASSES)
    for (const cls of Object.keys(CLASS_DATA)) expect(known.has(cls)).toBe(true)
  })
})

describe('discipline choice data', () => {
  const allDisciplines = Object.values(CLASS_DISCIPLINES).flat()

  it.each(allDisciplines)('%s has a bonus skill and an Edge', discipline => {
    const info = DISCIPLINE_INFO[discipline]
    expect(info?.skill.name).toBeTruthy()
    expect(info?.skill.description).toBeTruthy()
    expect(info?.skill.combatRoles.length).toBeGreaterThan(0)
    expect(DISCIPLINE_EDGES[discipline]?.name).toBeTruthy()
    expect(DISCIPLINE_EDGES[discipline]?.description).toBeTruthy()
  })

  it('has no orphaned DISCIPLINE_INFO entries', () => {
    const known = new Set(allDisciplines)
    for (const d of Object.keys(DISCIPLINE_INFO)) expect(known.has(d)).toBe(true)
  })
})

describe('species choice data', () => {
  it.each([...SPECIES])('%s has a description, tags, trait, and described variants', species => {
    const data = SPECIES_DATA[species]
    expect(data?.description).toBeTruthy()
    expect(data?.tags).toBeTruthy()
    expect(data?.speciesTrait.description).toBeTruthy()
    expect(data?.variants.length).toBeGreaterThan(0)
    for (const v of data.variants) {
      expect(v.trait.name).toBeTruthy()
      expect(v.trait.description).toBeTruthy()
    }
  })
})

// ── buildNewCharacter ──────────────────────────────────────────────────

describe('buildNewCharacter', () => {
  it('grants class skills plus the discipline bonus skill, all at the class bonus', () => {
    const c = buildNewCharacter('Steve', 'Hearthborn', 'Steadfolk', 'Warrior', 'Soldier')
    const names = c.skills.map(s => s.name)
    expect(names).toEqual(['Attack', 'Parry', 'Tactics'])
    for (const s of c.skills) expect(s.bonus).toBe(CLASS_SKILL_BONUS.Warrior)
    expect(c.disciplineEdge.name).toBe('Soldier Edge')
  })

  it('does not duplicate a bonus skill the class already grants (Reaper Lifesense)', () => {
    const c = buildNewCharacter('Morrow', 'Grimborn', 'Coalblood', 'Evoker', 'Reaper')
    const lifesense = c.skills.filter(s => s.name.toLowerCase() === 'lifesense')
    expect(lifesense).toHaveLength(1)
    expect(c.skills).toHaveLength(2) // Lifesense + Soul Craft only
  })

  it('derives stats from the class tables', () => {
    const c = buildNewCharacter('Steve', 'Hearthborn', 'Steadfolk', 'Warrior', 'Soldier')
    expect(c.maxHp).toBe(calcMaxHp('Warrior', 1))
    expect(c.currentHp).toBe(c.maxHp)
    expect(c.maxSd).toBe(calcMaxSd(1))
    expect(c.damageDie).toBe('d12')
    expect(c.level).toBe(1)
  })

  it('carries species and variant traits with their descriptions', () => {
    const c = buildNewCharacter('Pip', 'Alfay', 'Azure Court', 'Delver', 'Raider')
    const traitNames = c.traits.map(t => t.name)
    expect(traitNames).toEqual(['Flight', 'Mocking'])
    for (const t of c.traits) expect(t.description).toBeTruthy()
  })

  it('survives an unknown discipline without granting a skill or edge', () => {
    const c = buildNewCharacter('X', 'Golem', 'Iron', 'Warrior', 'Nonsense')
    expect(c.skills.map(s => s.name)).toEqual(['Attack', 'Parry'])
    expect(c.disciplineEdge.name).toBe('')
  })
})

// ── Starting gear (class pages) ────────────────────────────────────────

describe('startingGearFor', () => {
  it.each([...CLASSES])('%s has a defined starting kit', cls => {
    expect(CLASS_STARTING_ITEMS[cls]).toBeDefined()
    const gear = startingGearFor(cls)
    expect(gear.iron).toBe(30)
    expect(gear.rations).toBeGreaterThanOrEqual(5)
    expect(gear.items.some(i => i.name === 'Crafting Table')).toBe(true)
  })

  it('gives every class except the Enchanter a signature item, and the Enchanter lapis', () => {
    for (const cls of CLASSES) {
      const gear = startingGearFor(cls)
      if (cls === 'Enchanter') {
        expect(gear.lapis).toBe(5)
        expect(gear.items).toHaveLength(3) // Crafting Table + armor/weapon choice + sidearm choice
      } else {
        expect(gear.lapis).toBe(0)
        expect(gear.items.length).toBeGreaterThanOrEqual(3) // signature + table + choices
      }
    }
  })

  it('honours the three manual choices', () => {
    const gold = startingGearFor('Warrior', { provisions: 0, protection: 1, sidearm: 1 })
    expect(gold.gold).toBe(10)
    expect(gold.rations).toBe(5)
    expect(gold.items.map(i => i.name)).toContain('Iron Sword')
    expect(gold.items.map(i => i.name)).toContain('Bow')
    expect(gold.items.find(i => i.name === 'Arrows')?.quantity).toBe(20)

    const rations = startingGearFor('Warrior', { provisions: 1, protection: 0, sidearm: 0 })
    expect(rations.gold).toBe(0)
    expect(rations.rations).toBe(10)
    expect(rations.items.map(i => i.name)).toContain('Leather Armor')
    expect(rations.items.map(i => i.name)).toContain('Shield')
  })

  it('falls back to each choice\'s first option for missing selections', () => {
    const gear = startingGearFor('Delver', {})
    expect(gear.gold).toBe(10)                      // provisions option 0
    expect(gear.items.map(i => i.name)).toContain('Leather Armor')
    expect(gear.items.map(i => i.name)).toContain('Shield')
  })
})

describe('buildNewCharacter starting gear', () => {
  it('stocks the new character with kit, coin, and rations', () => {
    const c = buildNewCharacter('Steve', 'Hearthborn', 'Steadfolk', 'Warrior', 'Soldier', { provisions: 1, protection: 1, sidearm: 1 })
    const names = c.onHand.items.map(i => i.name)
    expect(names).toContain('Weapon Repair Kit')
    expect(names).toContain('Crafting Table')
    expect(names).toContain('Iron Sword')
    expect(names).toContain('Bow')
    expect(c.currency.iron).toBe(30)
    expect(c.currency.gold).toBe(0)
    expect(c.rations).toBe(10)
    // Every granted item has its own id
    expect(new Set(c.onHand.items.map(i => i.id)).size).toBe(c.onHand.items.length)
  })

  it('puts the Enchanter\'s 5 starting lapis on the class feature panel', () => {
    const c = buildNewCharacter('Mira', 'Dwymir', 'Deep Trove', 'Enchanter', 'Aegis')
    expect(c.classFeatureState).toEqual(expect.objectContaining({ class: 'Enchanter' }))
    if (c.classFeatureState.class === 'Enchanter') {
      expect(c.classFeatureState.state.lapisCount).toBe(5)
    }
    expect(c.onHand.items.map(i => i.name)).not.toContain('Lapis Lazuli')
  })
})
