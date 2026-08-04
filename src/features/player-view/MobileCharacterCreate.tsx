import { useState, type ReactNode } from 'react'
import { UserPlus } from 'lucide-react'
import { useCharacterStore } from '../characters/store'
import { buildNewCharacter } from '../characters/CharacterPanel'
import { SPECIES, CLASSES, CLASS_DISCIPLINES, SPECIES_DATA, DISCIPLINE_EDGES } from '../../lib/constants'

interface Props {
  title?: string
  /** Called with the new character's id after it's created. */
  onCreated: (characterId: string) => void
}

/** Phone-optimized, large-type character creation form. */
export function MobileCharacterCreate({ title = 'Create your character', onCreated }: Props) {
  const addCharacter = useCharacterStore(s => s.addCharacter)

  const [name, setName] = useState('')
  const [species, setSpecies] = useState<string>(SPECIES[0])
  const [variant, setVariant] = useState<string>(SPECIES_DATA[SPECIES[0]]?.variants[0]?.name ?? '')
  const [cls, setCls] = useState<string>(CLASSES[0])
  const [discipline, setDiscipline] = useState<string>(CLASS_DISCIPLINES[CLASSES[0]]?.[0] ?? '')

  const variants = SPECIES_DATA[species]?.variants ?? []
  const disciplines = CLASS_DISCIPLINES[cls] ?? []
  const speciesTrait = SPECIES_DATA[species]?.speciesTrait
  const variantTrait = variants.find(v => v.name === variant)?.trait
  const disciplineEdge = DISCIPLINE_EDGES[discipline]

  const pickSpecies = (s: string) => {
    setSpecies(s)
    setVariant(SPECIES_DATA[s]?.variants[0]?.name ?? '')
  }
  const pickClass = (c: string) => {
    setCls(c)
    setDiscipline(CLASS_DISCIPLINES[c]?.[0] ?? '')
  }

  const create = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    const base = buildNewCharacter(trimmed, species, variant, cls, discipline)
    const id = addCharacter(base)
    onCreated(id)
  }

  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center gap-2.5">
        <span className="w-11 h-11 rounded-full bg-gold/15 border border-gold/40 flex items-center justify-center text-gold shrink-0">
          <UserPlus size={22} />
        </span>
        <h2 className="text-xl font-bold font-heading tracking-wide text-stone-100">{title}</h2>
      </div>

      {/* Name */}
      <Field label="Name">
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your hero's name…"
          className="w-full bg-stone-900 border border-stone-700 rounded-xl px-4 py-3.5 text-lg text-stone-100 outline-none focus:border-gold/60 placeholder:text-stone-600"
        />
      </Field>

      {/* Class */}
      <Field label="Class">
        <Chips options={[...CLASSES]} value={cls} onPick={pickClass} />
      </Field>

      {/* Discipline */}
      {disciplines.length > 0 && (
        <Field label="Discipline (subclass)">
          <Chips options={disciplines} value={discipline} onPick={setDiscipline} />
          {disciplineEdge && (
            <div className="mt-2 rounded-xl bg-stone-900 border border-stone-700 p-3.5 text-base leading-relaxed">
              <span className="text-gold font-semibold">{disciplineEdge.name}: </span>
              <span className="text-stone-400">{disciplineEdge.description}</span>
            </div>
          )}
        </Field>
      )}

      {/* Species */}
      <Field label="Species">
        <Chips options={[...SPECIES]} value={species} onPick={pickSpecies} />
      </Field>

      {/* Variant */}
      {variants.length > 0 && (
        <Field label="Variant">
          <Chips options={variants.map(v => v.name)} value={variant} onPick={setVariant} />
        </Field>
      )}

      {/* Trait preview */}
      {(speciesTrait || variantTrait) && (
        <div className="rounded-xl bg-stone-900 border border-stone-700 p-4 space-y-2 text-base">
          {speciesTrait && (
            <div><span className="text-stone-300 font-semibold">{speciesTrait.name}: </span><span className="text-stone-500">{speciesTrait.description}</span></div>
          )}
          {variantTrait && (
            <div><span className="text-gold font-semibold">{variantTrait.name}: </span><span className="text-stone-500">{variantTrait.description}</span></div>
          )}
        </div>
      )}

      {/* Create */}
      <button
        onClick={create}
        disabled={!name.trim()}
        className="w-full py-4 rounded-2xl bg-gold text-stone-900 text-lg font-bold active:bg-yellow-400 disabled:opacity-40 disabled:active:bg-gold"
      >
        Create Character
      </button>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-2 font-heading">{label}</div>
      {children}
    </div>
  )
}

function Chips({ options, value, onPick }: { options: string[]; value: string; onPick: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onPick(opt)}
          className={`px-4 py-2.5 rounded-xl text-base transition-colors ${
            value === opt
              ? 'bg-gold/20 border border-gold/60 text-gold'
              : 'bg-stone-800 border border-stone-700 text-stone-300 active:border-stone-500'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}
