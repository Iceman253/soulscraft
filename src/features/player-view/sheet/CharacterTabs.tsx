import { Send } from 'lucide-react'
import type { Character } from '../../../types'
import { TokenAvatar } from '../../../ui/TokenAvatar'

interface Props {
  characters: Character[]
  activeId: string
  onSelect: (id: string) => void
  /** Shown only on the player's own character. */
  actions?: { marketName?: string; onMarket: () => void; onRequest: () => void; counterOffers?: number }
}

function tabClass(active: boolean, c: Character): string {
  if (active) {
    if (c.isDead) return 'bg-stone-900 text-stone-500 border-t border-l border-r border-stone-700 -mb-px pb-2'
    if (c.isGhost) return 'bg-stone-800 text-purple-400 border-t border-l border-r border-purple-800/50 -mb-px pb-2'
    return 'bg-stone-800 text-gold border-t border-l border-r border-stone-600 -mb-px pb-2'
  }
  if (c.isDead) return 'text-stone-500 hover:text-stone-300 hover:bg-stone-800/30 line-through'
  if (c.isGhost) return 'text-purple-400 hover:text-purple-200 hover:bg-stone-800/50'
  return 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
}

/** One tab per character, plus the market and request buttons for your own. */
export function CharacterTabs({ characters, activeId, onSelect, actions }: Props) {
  return (
    <div className="shrink-0 flex items-stretch px-2 pt-2 border-b border-stone-700">
      <div className="flex gap-0.5 overflow-x-auto flex-1 min-w-0 pb-px">
        {characters.map(c => (
          <button key={c.id} onClick={() => onSelect(c.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-sm text-xs whitespace-nowrap transition-colors ${tabClass(activeId === c.id, c)}`}>
            {c.isDead && <span className="text-xs">💀</span>}
            {c.isGhost && !c.isDead && <span className="text-xs">👻</span>}
            {!c.isDead && !c.isGhost && <TokenAvatar name={c.name} characterId={c.id} size={16} />}
            <span className={`${c.isDead ? 'line-through opacity-60' : ''} ${c.name.toLowerCase() === 'infinite' ? 'rainbow-name' : ''}`}>{c.name}</span>
          </button>
        ))}
      </div>
      {/* Outside the scroll region so they never trigger a scrollbar */}
      {actions && (
        <>
          {actions.marketName && (
            <button onClick={actions.onMarket} title={`Shop at ${actions.marketName}`}
              className="ml-2 flex items-center gap-1.5 px-3 py-1.5 text-xs text-stone-400 hover:text-amber-300 hover:bg-stone-800/50 rounded-t-sm whitespace-nowrap transition-colors shrink-0">
              🏪 Shop
              {!!actions.counterOffers && (
                <span title="The GM countered your offer" className="px-1.5 rounded-full bg-teal-600 text-teal-50 text-[10px] font-bold">{actions.counterOffers}</span>
              )}
            </button>
          )}
          <button onClick={actions.onRequest} title="Send a request to the GM"
            className="ml-1 flex items-center gap-1.5 px-3 py-1.5 text-xs text-stone-400 hover:text-teal-300 hover:bg-stone-800/50 rounded-t-sm whitespace-nowrap transition-colors shrink-0">
            <Send size={11} /> Request
          </button>
        </>
      )}
    </div>
  )
}
