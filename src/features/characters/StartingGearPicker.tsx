import { STARTING_GEAR_CHOICES, CLASS_STARTING_ITEMS } from '../../lib/rules/newCharacter'
import type { GearSelections } from '../../lib/rules/newCharacter'

interface Props {
  characterClass: string
  selections: GearSelections
  onChange: (s: GearSelections) => void
  /** 'sm' for the desktop modal, 'lg' for the phone wizard. */
  size?: 'sm' | 'lg'
}

/** The class's fixed starting kit plus the manual's three gear choices
 *  (class pages: "Starting gear … Choose:"). Shared by both creation forms
 *  and the retroactive grant on the inventory tab. */
export function StartingGearPicker({ characterClass, selections, onChange, size = 'sm' }: Props) {
  const fixed = [
    ...(CLASS_STARTING_ITEMS[characterClass] ?? []).map(i => i.quantity > 1 ? `${i.quantity}× ${i.name}` : i.name),
    'Crafting Table',
    '30 Iron',
    '5 Rations',
    ...(characterClass === 'Enchanter' ? ['5 Lapis Lazuli (on the class panel)'] : []),
  ]

  const chip = size === 'lg' ? 'px-3.5 py-2 rounded-xl text-base' : 'px-2.5 py-1 rounded-sm text-xs'
  const label = size === 'lg' ? 'text-sm' : 'text-xs'

  return (
    <div className="space-y-2.5">
      <div className={`${label} text-stone-400`}>
        <span className="text-stone-500">Every {characterClass} starts with: </span>
        {fixed.join(' · ')}
      </div>
      {STARTING_GEAR_CHOICES.map(choice => (
        <div key={choice.id}>
          <div className={`${label} text-stone-500 mb-1`}>{choice.label}</div>
          <div className="flex flex-wrap gap-1.5">
            {choice.options.map((opt, i) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => onChange({ ...selections, [choice.id]: i })}
                className={`${chip} border transition-all ${
                  (selections[choice.id] ?? 0) === i
                    ? 'bg-gold/20 border-gold/60 text-gold'
                    : 'bg-stone-700 border-stone-600 text-stone-300 hover:border-stone-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
