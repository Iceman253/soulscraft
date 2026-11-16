import type { Character } from '../../../types'
import { useCharacterStore } from '../../characters/store'

type Size = 'sm' | 'lg'

/** The owner's switch for letting the party see their items and wealth. */
export function ShareToggle({ character: c, size = 'sm' }: { character: Character; size?: Size }) {
  const updateCharacter = useCharacterStore(s => s.updateCharacter)
  const shared = !!c.inventoryShared
  const lg = size === 'lg'
  const label = lg
    ? (shared ? '🤝 Shared — the party can see your items and wealth' : '🔒 Private — tap to share with the party')
    : (shared ? '🤝 Shared' : '🔒 Private')
  return (
    <button
      onClick={() => updateCharacter(c.id, { inventoryShared: !shared })}
      title={shared ? 'The party can see your items and wealth — click to make them private' : 'Your items and wealth are private — click to share them with the party'}
      className={`flex items-center border transition-colors ${lg ? 'mb-2.5 gap-1.5 px-3 py-1.5 rounded-xl text-sm' : 'gap-1 px-1.5 py-0.5 rounded-sm text-xs'} ${
        shared
          ? `border-emerald/40 text-emerald bg-emerald/10 ${lg ? '' : 'hover:bg-emerald/20'}`
          : `border-stone-600 ${lg ? 'text-stone-400' : 'text-stone-500 hover:text-stone-300 hover:border-stone-500'}`
      }`}
    >
      {label}
    </button>
  )
}

/** What another player sees when this character's inventory is private. */
export function PrivateInventoryNotice({ character: c, size = 'sm' }: { character: Character; size?: Size }) {
  if (size === 'lg') {
    return (
      <div className="mx-4 mt-4 rounded-2xl bg-stone-900/60 border border-stone-700 px-5 py-6 text-center">
        <div className="text-3xl mb-2">🔒</div>
        <div className="text-base text-stone-400">{c.name}'s inventory and notes are private.</div>
        <div className="text-sm text-stone-600 mt-1">They can share their pack from their own sheet.</div>
      </div>
    )
  }
  return (
    <div className="bg-stone-800/60 border border-stone-700 rounded-xl px-4 py-5 text-center space-y-1.5">
      <div className="text-xl">🔒</div>
      <div className="text-sm font-medium text-stone-400">{c.name}'s inventory is private.</div>
      <div className="text-xs text-stone-500">Only {c.name} can see their own items, currency, and notes — unless they choose to share.</div>
    </div>
  )
}
