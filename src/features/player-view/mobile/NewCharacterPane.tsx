import type { Character } from '../../../types'
import { TokenAvatar } from '../../../ui/TokenAvatar'
import { MobileCharacterCreate } from './MobileCharacterCreate'

interface Props {
  /** The character this phone was bound to, if any (it may have died). */
  boundChar: Character | undefined
  /** Living characters nobody on this phone plays, which they could take over. */
  livingOthers: Character[]
  onAdopt?: (characterId: string) => void
  onChosen: (characterId: string) => void
}

/** A phone player without a living character: take over an existing hero or make one. */
export function NewCharacterPane({ boundChar, livingOthers, onAdopt, onChosen }: Props) {
  return (
    <div className="pb-6">
      {boundChar?.isDead && (
        <div className="mx-4 mt-4 rounded-2xl bg-stone-900 border border-stone-700 p-5 text-center">
          <div className="text-4xl">💀</div>
          <div className="text-xl font-bold text-stone-200 mt-1">{boundChar.name} has fallen.</div>
          <div className="text-base text-stone-500 mt-1">Create a new hero to keep playing.</div>
        </div>
      )}

      {onAdopt && livingOthers.length > 0 && (
        <div className="px-4 mt-4">
          <div className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-2 font-heading">Or take over an existing hero</div>
          <div className="space-y-2">
            {livingOthers.map(c => (
              <button key={c.id} onClick={() => { onAdopt(c.id); onChosen(c.id) }}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-stone-900 border border-stone-700 active:border-gold/50 text-left">
                <TokenAvatar name={c.name} characterId={c.id} size={40} />
                <div>
                  <div className="text-base font-semibold text-stone-100">{c.name}</div>
                  <div className="text-sm text-stone-500">{c.class} · Level {c.level}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <MobileCharacterCreate
        title={boundChar?.isDead ? 'Create a new character' : 'Create your character'}
        onCreated={id => { onAdopt?.(id); onChosen(id) }}
      />
    </div>
  )
}
