import { Trash2 } from 'lucide-react'
import type { Character, CharacterItem } from '../../../types'
import { useCharacterStore } from '../../characters/store'
import { useWorldStore } from '../../map/store'
import { carryLimitOf, countBlocks } from '../../../lib/world/building'
import { ENDER, UNPLACED, storeLabel } from '../../../lib/world/stashes'
import type { StorageReach } from '../../characters/useStorageReach'
import { ItemNameEditor } from './ItemNameEditor'
import { ShareToggle } from './InventoryPrivacy'
import { WeaponSpecLine } from '../../../ui/WeaponSpecLine'

interface Props {
  character: Character
  /** The owner can rename, drink, store and drop items; others only look. */
  editable: boolean
  /** Show the share switch (a player's own sheet, not the GM's view). */
  showShareToggle: boolean
  reach: StorageReach
  isPotion: (item: CharacterItem) => boolean
  onDrink: (item: CharacterItem) => void
}

const smallButton = 'px-1.5 py-0.5 rounded-sm text-xs transition-colors shrink-0'

/** Desktop On Hand list, with the block count against the carry limit. */
export function OnHandList({ character: c, editable, showShareToggle, reach, isPotion, onDrink }: Props) {
  const { updateOnHandItem, removeOnHandItem, moveItem } = useCharacterStore()
  const areas = useWorldStore(s => s.areas)
  const blocks = countBlocks(c.onHand.items)
  const limit = carryLimitOf(c)

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="text-xs font-medium text-stone-400 font-heading tracking-wide">On Hand</div>
          {showShareToggle && <ShareToggle character={c} />}
        </div>
        {c.onHand.items.some(i => i.isBlock) && (
          <div className={`text-xs ${blocks > limit ? 'text-red-400' : 'text-stone-500'}`}>
            {blocks}/{limit} blocks{blocks > limit ? ' — over limit' : ''}
          </div>
        )}
      </div>
      {c.onHand.items.length === 0 ? (
        <div className="text-xs text-stone-500 italic">Nothing on hand.</div>
      ) : (
        <div className="space-y-1">
          {c.onHand.items.map(item => (
            <div key={item.id} className="flex items-center gap-2 px-2 py-1.5 rounded-sm bg-stone-800 text-xs group">
              <div className="flex-1 min-w-0">
                {editable
                  ? <ItemNameEditor item={item} onSave={customName => updateOnHandItem(c.id, item.id, { customName })} />
                  : <span className="text-stone-200 truncate">{item.customName ?? item.name}</span>}
                {item.weapon && <WeaponSpecLine spec={item.weapon} />}
              </div>
              <span className="text-stone-400 font-mono shrink-0">×{item.quantity}</span>
              {editable && isPotion(item) && (
                <button onClick={() => onDrink(item)} title="Use potion"
                  className={`${smallButton} bg-emerald/20 border border-emerald/40 text-emerald hover:bg-emerald/30`}>Use</button>
              )}
              {editable && reach.drop !== UNPLACED && (
                <button onClick={() => moveItem(c.id, item.id, 'onHand', reach.drop)} title={`Store at ${storeLabel(reach.drop, areas)}`}
                  className={`${smallButton} bg-stone-700 border border-stone-600 text-stone-400 hover:text-stone-200 hover:bg-stone-600`}>Store</button>
              )}
              {editable && reach.ender && (
                <button onClick={() => moveItem(c.id, item.id, 'onHand', ENDER)} title="Put in your Ender Chest"
                  className={`${smallButton} bg-purple-950/60 border border-purple-800/60 text-purple-300 hover:bg-purple-900/60`}>Ender</button>
              )}
              {editable && (
                <button onClick={() => removeOnHandItem(c.id, item.id)} title="Drop item"
                  className="p-0.5 text-stone-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                  <Trash2 size={11} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
