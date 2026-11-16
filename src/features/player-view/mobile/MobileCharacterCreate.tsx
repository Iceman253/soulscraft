import { useState, type ReactNode } from 'react'
import { UserPlus } from 'lucide-react'
import { useCharacterStore } from '../../characters/store'
import { buildNewCharacter, CLASS_SKILL_BONUS, DEFAULT_GEAR_SELECTIONS, type GearSelections } from '../../../lib/rules/newCharacter'
import { StartingGearPicker } from '../../characters/StartingGearPicker'
import { SPECIES, CLASSES, CLASS_DATA, CLASS_DAMAGE_DICE, CLASS_DISCIPLINES, DISCIPLINE_INFO, SPECIES_DATA, DISCIPLINE_EDGES, calcMaxHp, calcMaxSd } from '../../../lib/rules/constants'

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
  const [gearSel, setGearSel] = useState<GearSelections>(DEFAULT_GEAR_SELECTIONS)

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
    const base = buildNewCharacter(trimmed, species, variant, cls, discipline, gearSel)
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
          className="w-full bg-stone-900 border border-stone-700 rounded-xl px-4 py-3.5 text-lg text-stone-100 outline-hidden focus:border-gold/60 placeholder:text-stone-600"
        />
      </Field>

      {/* Class */}
      <Field label="Class">
        <Chips options={[...CLASSES]} value={cls} onPick={pickClass} />
        {CLASS_DATA[cls] && (
          <div className="mt-2 rounded-xl bg-stone-900 border border-stone-700 p-3.5 text-base leading-relaxed space-y-1.5">
            <div className="text-gold font-semibold">{CLASS_DATA[cls].summary}</div>
            <div className="text-stone-400">{CLASS_DATA[cls].description}</div>
            <div className="text-sm text-stone-500">
              HP {calcMaxHp(cls, 1)} · SD {calcMaxSd(1)} · damage {CLASS_DAMAGE_DICE[cls]} · skill bonus +{CLASS_SKILL_BONUS[cls] ?? 1}
            </div>
          </div>
        )}
      </Field>

      {/* Discipline */}
      {disciplines.length > 0 && (
        <Field label="Discipline (subclass)">
          <Chips options={disciplines} value={discipline} onPick={setDiscipline} />
          {(DISCIPLINE_INFO[discipline] || disciplineEdge) && (
            <div className="mt-2 rounded-xl bg-stone-900 border border-stone-700 p-3.5 text-base leading-relaxed space-y-2">
              {DISCIPLINE_INFO[discipline] && (
                <div>
                  <span className="text-stone-300 font-semibold">Bonus skill — {DISCIPLINE_INFO[discipline].skill.name}: </span>
                  <span className="text-stone-400">{DISCIPLINE_INFO[discipline].skill.description}</span>
                </div>
              )}
              {disciplineEdge && (
                <div className={DISCIPLINE_INFO[discipline] ? 'border-t border-stone-700 pt-2' : ''}>
                  <span className="text-gold font-semibold">{disciplineEdge.name}: </span>
                  <span className="text-stone-400">{disciplineEdge.description}</span>
                </div>
              )}
            </div>
          )}
        </Field>
      )}

      {/* Species */}
      <Field label="Species">
        <Chips options={[...SPECIES]} value={species} onPick={pickSpecies} />
        {SPECIES_DATA[species] && (
          <div className="mt-2 rounded-xl bg-stone-900 border border-stone-700 p-3.5 text-base leading-relaxed space-y-1.5">
            <div className="text-stone-400">{SPECIES_DATA[species].description}</div>
            <div className="text-sm text-stone-500 italic">{SPECIES_DATA[species].tags}</div>
          </div>
        )}
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

      {/* Starting gear */}
      <Field label="Starting gear">
        <div className="rounded-xl bg-stone-900 border border-stone-700 p-3.5">
          <StartingGearPicker characterClass={cls} selections={gearSel} onChange={setGearSel} size="lg" />
        </div>
      </Field>

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
