import { useState } from 'react'
import { Plus, UserPlus } from 'lucide-react'
import { useCharacterStore, defaultClassFeatureState } from './store'
import { CharacterCard } from './CharacterCard'
import { CharacterSheet } from './CharacterSheet'
import { Modal } from '../../ui/Modal'
import { SPECIES, CLASSES, CLASS_DAMAGE_DICE, CLASS_DISCIPLINES, DISCIPLINE_EDGES, DEFAULT_CLASS_SKILLS, SPECIES_DATA } from '../../lib/constants'
import { emptyLoadout } from '../../lib/armor'
import { newId } from '../../lib/id'
import type { Character, Skill } from '../../types'

function buildNewCharacter(name: string, species: string, variantName: string, characterClass: string, discipline: string): Omit<Character, 'id'> {
  const defaultSkills: Skill[] = (DEFAULT_CLASS_SKILLS[characterClass] ?? []).map(s => ({
    id: newId(), name: s, bonus: 1 as const, description: '',
  }))
  const speciesInfo = SPECIES_DATA[species]
  const speciesVariants = speciesInfo?.variants ?? []
  const variant = speciesVariants.find(v => v.name === variantName) ?? speciesVariants[0]
  const defaultTraits = [
    ...(speciesInfo ? [{ id: newId(), name: speciesInfo.speciesTrait.name, description: speciesInfo.speciesTrait.description }] : []),
    ...(variant ? [{ id: newId(), name: variant.trait.name, description: variant.trait.description }] : []),
  ]
  const damageDie = CLASS_DAMAGE_DICE[characterClass] ?? 'd6'

  return {
    name,
    species,
    variant: variantName,
    class: characterClass,
    level: 1,
    xp: 0,
    maxHp: 10,
    currentHp: 10,
    maxSd: 6,
    currentSd: 6,
    damageDie,
    discipline,
    skills: defaultSkills,
    traits: defaultTraits,
    abilities: [],
    disciplineEdge: DISCIPLINE_EDGES[discipline]
      ? { name: DISCIPLINE_EDGES[discipline].name, description: DISCIPLINE_EDGES[discipline].description, used: false }
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
    const id = addCharacter(buildNewCharacter(name.trim(), species, variant, characterClass, discipline))
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
        <h2 className="font-semibold text-stone-100">Characters</h2>
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
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto">
          {characters.map(c => (
            <CharacterCard
              key={c.id}
              character={c}
              onOpen={() => setSelectedId(c.id)}
            />
          ))}
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

            <div className="text-xs text-stone-500">
              {CLASS_DAMAGE_DICE[characterClass] && <>Damage die: <span className="text-gold">{CLASS_DAMAGE_DICE[characterClass]}</span></>}
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
