import { useState } from 'react'
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import type { Character } from '../../../types'
import { useCharacterStore } from '../../characters/store'
import { useWorldStore } from '../../map/store'
import { ENDER, stashOf, storeLabel } from '../../../lib/world/stashes'
import type { StorageReach } from '../../characters/useStorageReach'
import { ItemNameEditor } from './ItemNameEditor'

/** Storage stays where it was left (p.7): what's here (and the Ender Chest while
 *  someone with them carries one) can be used; the rest is only listed. */
export function StoragePanel({ character: c, reach }: { character: Character; reach: StorageReach }) {
  const { moveItem, updateStoredItem, removeStoredItem } = useCharacterStore()
  const areas = useWorldStore(s => s.areas)
  const [open, setOpen] = useState(false)
  const openStores = [...reach.local, ...(reach.ender ? [ENDER] : [])]
  const hereCount = openStores.reduce((n, k) => n + stashOf(c, k).items.length, 0)
  const enderItems = stashOf(c, ENDER).items.length

  return (
    <div>
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-xs font-medium text-stone-400 hover:text-stone-200 transition-colors w-full">
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        Storage ({hereCount} here)
        {reach.ender && <span className="ml-1 text-purple-300">· Ender Chest open</span>}
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {openStores.length === 0 && <div className="text-xs text-stone-500 italic pl-4">You're not at a place with storage.</div>}
          {openStores.map(key => (
            <div key={key} className="space-y-1">
              <div className="pl-1 text-[11px] text-stone-500">{key === ENDER ? '🟪 Ender Chest' : `📦 ${storeLabel(key, areas)}`}</div>
              {stashOf(c, key).items.length === 0 ? (
                <div className="text-xs text-stone-500 italic pl-4">Empty.</div>
              ) : stashOf(c, key).items.map(item => (
                <div key={item.id} className="flex items-center gap-2 px-2 py-1.5 rounded-sm bg-stone-800/60 text-xs group">
                  <div className="flex-1 min-w-0">
                    <ItemNameEditor item={item} onSave={customName => updateStoredItem(c.id, key, item.id, { customName })} />
                  </div>
                  <span className="text-stone-500 font-mono shrink-0">×{item.quantity}</span>
                  <button onClick={() => moveItem(c.id, item.id, key, 'onHand')} title="Take"
                    className="px-1.5 py-0.5 rounded-sm bg-stone-700 border border-stone-600 text-stone-400 hover:text-stone-200 hover:bg-stone-600 text-xs transition-colors shrink-0">
                    Take
                  </button>
                  <button onClick={() => removeStoredItem(c.id, key, item.id)} title="Throw away"
                    className="p-0.5 text-stone-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          ))}
          {!reach.ender && enderItems > 0 && (
            <div className="text-xs text-stone-500 pl-1">🟪 Ender Chest: {enderItems} items. Someone with you needs to carry an Ender Chest to open it.</div>
          )}
          {[...reach.elsewhere, ...reach.orphaned].map(key => {
            const n = stashOf(c, key).items.length
            return (
              <div key={key} className="text-xs text-stone-500 pl-1">
                📦 {storeLabel(key, areas)}: {n} item{n === 1 ? '' : 's'}
                {reach.orphaned.includes(key) && ' (ask your GM where these are)'}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
