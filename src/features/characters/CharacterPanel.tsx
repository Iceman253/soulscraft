import { useState } from 'react'
import { Plus, UserPlus } from 'lucide-react'
import { useCharacterStore, defaultClassFeatureState } from './store'
import { log } from '../log/store'
import { CharacterCard } from './CharacterCard'
import { CharacterSheet } from './CharacterSheet'
import { Modal } from '../../ui/Modal'
import { SPECIES, CLASSES, CLASS_DAMAGE_DICE, CLASS_DISCIPLINES, DISCIPLINE_EDGES, DEFAULT_CLASS_SKILLS, SPECIES_DATA, calcMaxHp, calcMaxSd } from '../../lib/constants'
import { CLASS_ABILITIES } from '../../lib/classAbilities'
import { emptyLoadout } from '../../lib/armor'
import { newId } from '../../lib/id'
import type { Character, Skill, Ability } from '../../types'

// Skill bonus per class
const CLASS_SKILL_BONUS: Record<string, 1|2|3> = {
  Warrior: 1, Vindicator: 1, Hunter: 2, Evoker: 2,
  Delver: 3, Wildspeaker: 3, Enchanter: 3, Tecton: 3, Alchemist: 3,
}

function buildNewCharacter(name: string, species: string, variantName: string, characterClass: string, discipline: string): Omit<Character, 'id'> {
  const skillBonus = CLASS_SKILL_BONUS[characterClass] ?? 1
  const defaultSkills: Skill[] = (DEFAULT_CLASS_SKILLS[characterClass] ?? []).map(s => ({
    id: newId(),
    name: s.name,
    bonus: skillBonus as 1|2|3,
    description: s.description,
    combatRoles: s.combatRoles,
  }))
  const speciesInfo = SPECIES_DATA[species]
  const speciesVariants = speciesInfo?.variants ?? []
  const variant = speciesVariants.find(v => v.name === variantName) ?? speciesVariants[0]
  const defaultTraits = [
    ...(speciesInfo ? [{ id: newId(), name: speciesInfo.speciesTrait.name, description: speciesInfo.speciesTrait.description, combatRoles: speciesInfo.speciesTrait.combatRoles }] : []),
    ...(variant ? [{ id: newId(), name: variant.trait.name, description: variant.trait.description, combatRoles: variant.trait.combatRoles }] : []),
  ]
  const damageDie = CLASS_DAMAGE_DICE[characterClass] ?? 'd6'

  // Rulebook p.7: "You start with three available Special Abilities at Level 1"
  const startingAbilities: Ability[] = (CLASS_ABILITIES[characterClass] ?? [])
    .filter(a => a.tier === 'level1')
    .map(a => ({
      id: newId(),
      name: a.name,
      sdCost: a.sdCost,
      description: a.description,
      recharge: 'rest' as const,
      combatRole: a.combatRole,            // legacy single tag (compat)
      combatRoles: a.combatRoles ?? (a.combatRole ? [a.combatRole] : undefined),
      appliedEffects: a.appliedEffects,
    }))

  const maxHp = calcMaxHp(characterClass, 1)
  const maxSd = calcMaxSd(1)

  return {
    name,
    species,
    variant: variantName,
    class: characterClass,
    level: 1,
    xp: 0,
    maxHp,
    currentHp: maxHp,
    maxSd,
    currentSd: maxSd,
    damageDie,
    discipline,
    skills: defaultSkills,
    traits: defaultTraits,
    abilities: startingAbilities,
    disciplineEdge: DISCIPLINE_EDGES[discipline]
      ? {
          name: DISCIPLINE_EDGES[discipline].name,
          description: DISCIPLINE_EDGES[discipline].description,
          combatRoles: DISCIPLINE_EDGES[discipline].combatRoles,
          appliedEffects: DISCIPLINE_EDGES[discipline].appliedEffects,
          used: false,
        }
      : { name: '', description: '', used: false },
    classFeatureState: defaultClassFeatureState(characterClass),
    armorLoadout: emptyLoadout(),
    weaponLoadout: { mainHand: null, offHand: null },
    activeEffects: [],
    onHand: { items: [] },
    storage: { items: [] },
    currency: { copper: 0, iron: 0, gold: 0, emeralds: 0, diamonds: 0 },
    rations: 0,
    missedRests: 0,
    locationId: null,
    subLocationId: null,
    notes: '',
  }
}

export function CharacterPanel() {
  const { characters, addCharacter } = useCharacterStore()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [species, setSpecies] = useState<string>(SPECIES[0])
  const [variant, setVariant] = useState<string>(SPECIES_DATA[SPECIES[0]].variants[0].name)
  const [characterClass, setCharacterClass] = useState<string>(CLASSES[0])
  const [discipline, setDiscipline] = useState<string>(CLASS_DISCIPLINES[CLASSES[0]]?.[0] ?? '')

  const speciesVariants = SPECIES_DATA[species]?.variants ?? []
  const selectedVariant = speciesVariants.find(v => v.name === variant) ?? speciesVariants[0]

  const handleSpeciesChange = (s: string) => {
    setSpecies(s)
    setVariant(SPECIES_DATA[s]?.variants[0]?.name ?? '')
  }

  const handleClassChange = (c: string) => {
    setCharacterClass(c)
    setDiscipline(CLASS_DISCIPLINES[c]?.[0] ?? '')
  }

  const classDisciplines = CLASS_DISCIPLINES[characterClass] ?? []
  const selectedEdge = DISCIPLINE_EDGES[discipline]

  const selectedChar = characters.find(c => c.id === selectedId)

  const handleCreate = () => {
    if (!name.trim()) return
    const base = buildNewCharacter(name.trim(), species, variant, characterClass, discipline)
    // Easter egg: Infinite gets... infinite HP
    const isInfinite = name.trim().toLowerCase() === 'infinite'
    if (isInfinite) { base.maxHp = 999999; base.currentHp = 999999 }
    const id = addCharacter(base)
    if (isInfinite) log('character-move', '∞ Infinite has arrived...')
    setSelectedId(id)
    setShowAdd(false)
    setName('')
  }

  if (selectedChar) {
    return (
      <CharacterSheet
        character={selectedChar}
        onBack={() => setSelectedId(null)}
      />
    )
  }

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-stone-100 font-heading tracking-wide">Characters</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded bg-gold text-stone-900 font-semibold hover:bg-yellow-400 text-sm"
        >
          <UserPlus size={14} /> New Character
        </button>
      </div>

      {characters.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-stone-500 flex-col gap-3">
          <UserPlus size={40} className="opacity-30" />
          <p>No characters yet</p>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 rounded bg-stone-700 hover:bg-stone-600 text-stone-200 text-sm">
            <Plus size={14} /> Add Character
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Living characters */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {characters.filter(c => !c.isDead).map(c => (
              <CharacterCard key={c.id} character={c} onOpen={() => setSelectedId(c.id)} />
            ))}
          </div>

          {/* Deceased characters */}
          {characters.some(c => c.isDead) && (
            <div>
              <div className="text-xs text-stone-500 font-medium uppercase tracking-wider mb-2 flex items-center gap-1.5 font-heading">
                <span>💀</span> Fallen
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 opacity-70">
                {characters.filter(c => c.isDead).map(c => (
                  <CharacterCard key={c.id} character={c} onOpen={() => setSelectedId(c.id)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showAdd && (
        <Modal title="New Character" onClose={() => setShowAdd(false)}>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-stone-400 mb-1">Name *</label>
              <input autoFocus value={name} onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-stone-100 text-sm outline-none focus:border-gold/50"
                placeholder="Thorin Ironhand..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-stone-400 mb-1">Species</label>
                <select value={species} onChange={e => handleSpeciesChange(e.target.value)} className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-stone-200 text-sm outline-none">
                  {SPECIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-stone-400 mb-1">Class</label>
                <select value={characterClass} onChange={e => handleClassChange(e.target.value)} className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-stone-200 text-sm outline-none">
                  {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Variant picker */}
            <div>
              <label className="block text-sm text-stone-400 mb-1">Variant</label>
              <div className="flex flex-wrap gap-1.5">
                {speciesVariants.map(v => (
                  <button
                    key={v.name}
                    type="button"
                    onClick={() => setVariant(v.name)}
                    className={`px-2.5 py-1 rounded border text-xs transition-all ${variant === v.name ? 'bg-gold/20 border-gold/60 text-gold' : 'bg-stone-700 border-stone-600 text-stone-300 hover:border-stone-400'}`}
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Species info + trait preview */}
            {SPECIES_DATA[species] && (
              <div className="bg-stone-900 border border-stone-600 rounded-lg px-3 py-2.5 space-y-2">
                <div className="text-xs text-stone-500 italic">{SPECIES_DATA[species].tags}</div>
                <div>
                  <span className="text-xs text-stone-400 font-semibold">Species trait — </span>
                  <span className="text-xs font-semibold text-stone-200">{SPECIES_DATA[species].speciesTrait.name}: </span>
                  <span className="text-xs text-stone-400">{SPECIES_DATA[species].speciesTrait.description}</span>
                </div>
                {selectedVariant && (
                  <div className="border-t border-stone-700 pt-2">
                    <span className="text-xs text-stone-400 font-semibold">Variant trait — </span>
                    <span className="text-xs font-semibold text-gold">{selectedVariant.trait.name}: </span>
                    <span className="text-xs text-stone-400">{selectedVariant.trait.description}</span>
                  </div>
                )}
              </div>
            )}

            {/* Discipline picker */}
            <div>
              <label className="block text-sm text-stone-400 mb-1">Discipline</label>
              <div className="flex flex-wrap gap-1.5">
                {classDisciplines.map(d => (
                  <button key={d} type="button" onClick={() => setDiscipline(d)}
                    className={`px-2.5 py-1 rounded border text-xs transition-all ${discipline === d ? 'bg-gold/20 border-gold/60 text-gold' : 'bg-stone-700 border-stone-600 text-stone-300 hover:border-stone-400'}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Edge preview */}
            {selectedEdge && (
              <div className="bg-stone-900 border border-stone-600 rounded-lg px-3 py-2.5 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-stone-200">{selectedEdge.name}</span>
                  <span className="text-xs text-stone-600">resets on {selectedEdge.resetsOn}</span>
                </div>
                <div className="text-xs text-stone-400">{selectedEdge.description}</div>
              </div>
            )}

            {/* Class stats + starting abilities preview */}
            <div className="bg-stone-900 border border-stone-600 rounded-lg px-3 py-2.5 space-y-2">
              <div className="flex gap-4 text-xs">
                <span>HP: <span className="text-gold font-bold font-mono tabular-nums">{calcMaxHp(characterClass, 1)}</span></span>
                <span>SD: <span className="text-gold font-bold font-mono tabular-nums">{calcMaxSd(1)}</span></span>
                <span>Damage: <span className="text-gold font-bold font-mono">{CLASS_DAMAGE_DICE[characterClass]}</span></span>
                <span>Skill bonus: <span className="text-gold font-bold font-mono">+{CLASS_SKILL_BONUS[characterClass] ?? 1}</span></span>
              </div>
              <div>
                <div className="text-xs text-stone-500 font-medium mb-1 font-heading tracking-wide">Starting Special Abilities</div>
                <div className="space-y-1">
                  {(CLASS_ABILITIES[characterClass] ?? []).filter(a => a.tier === 'level1').map(a => (
                    <div key={a.name} className="flex items-start gap-2">
                      <span className="text-xs font-semibold text-stone-200 shrink-0">{a.name}</span>
                      <span className="text-xs text-stone-500 truncate">{a.description.substring(0, 60)}…</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 rounded bg-stone-700 text-stone-300 hover:bg-stone-600 text-sm">Cancel</button>
              <button onClick={handleCreate} disabled={!name.trim()} className="px-3 py-1.5 rounded bg-gold text-stone-900 font-semibold hover:bg-yellow-400 text-sm disabled:opacity-50">Create</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
