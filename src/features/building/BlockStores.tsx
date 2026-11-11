import { useCharacterStore } from '../characters/store'
import { useWorldStore } from '../map/store'
import { useStorageReach } from '../characters/useStorageReach'
import { carryRoom, countBlocks } from '../../lib/building'
import { findMine } from '../../lib/places'
import { ENDER, stashOf, storeLabel, type StoreKey } from '../../lib/stashes'
import type { Character } from '../../types'

const stepBtn = 'flex-1 rounded-xl border border-stone-600 bg-stone-950 py-2.5 text-base font-semibold text-stone-100 active:border-gold/60 hover:border-gold/60 disabled:opacity-35'

/** Blocks in storage, as the Build tab sees it: put blocks down or pick them up where
 *  you are (and in your Ender Chest, if someone here carries one), and see what's
 *  waiting elsewhere. Storage stays where it was left (p.7). */
export function BlockStores({ character }: { character: Character }) {
  const areas = useWorldStore(s => s.areas)
  const pickUp = useCharacterStore(s => s.pickUpBlocks)
  const reach = useStorageReach(character)
  const blocksIn = (key: StoreKey) => countBlocks(stashOf(character, key).items)

  // Where they are always shows (it's where blocks get put down); places around it
  // only when something's there.
  const local = reach.local.filter(k => k === reach.drop || blocksIn(k) > 0)
  const enderItems = stashOf(character, ENDER).items.length
  const room = carryRoom(character)

  return (
    <div className="space-y-2.5">
      {local.map(key => (
        <StoreCard key={key} character={character} storeKey={key} canLeave={key === reach.drop}
          title={`${findMine(key, areas) ? '⛏️' : '📦'} ${storeLabel(key, areas)}`} />
      ))}
      {reach.ender
        ? <StoreCard character={character} storeKey={ENDER} canLeave title="🟪 Ender Chest" />
        : enderItems > 0 && (
          <div className="rounded-xl border border-stone-700 bg-stone-900 px-3.5 py-2.5 text-sm text-stone-400">
            🟪 Your Ender Chest has {enderItems} item{enderItems === 1 ? '' : 's'}. Someone with you needs to be carrying an Ender Chest to open it.
          </div>
        )}
      {reach.elsewhere.filter(k => blocksIn(k) > 0).map(key => (
        <div key={key} className="flex items-baseline justify-between gap-2 rounded-xl border border-stone-700 bg-stone-900 px-3.5 py-2.5 text-base">
          <span className="min-w-0 truncate text-stone-300">{findMine(key, areas) ? '⛏️' : '📦'} {storeLabel(key, areas)}</span>
          <span className="shrink-0 font-mono text-stone-400">{blocksIn(key)} stored there</span>
        </div>
      ))}
      {reach.orphaned.filter(k => blocksIn(k) > 0).map(key => (
        <div key={key} className="flex items-center justify-between gap-2 rounded-xl border border-amber-700/50 bg-stone-900 px-3.5 py-2.5 text-base">
          <span className="min-w-0 text-stone-300">{blocksIn(key)} blocks: {storeLabel(key, areas).toLowerCase()}</span>
          <button onClick={() => pickUp(character.id, key, blocksIn(key))} disabled={room === 0} className="shrink-0 rounded-lg border border-stone-600 px-3 py-1.5 text-stone-100 disabled:opacity-35">Collect</button>
        </div>
      ))}
    </div>
  )
}

function StoreCard({ character, storeKey, title, canLeave }: { character: Character; storeKey: StoreKey; title: string; canLeave: boolean }) {
  const leave = useCharacterStore(s => s.leaveBlocks)
  const pickUp = useCharacterStore(s => s.pickUpBlocks)
  const carried = countBlocks(character.onHand.items)
  const room = carryRoom(character)
  const stored = countBlocks(stashOf(character, storeKey).items)
  const canTake = Math.min(room, stored)
  return (
    <div className="space-y-2.5 rounded-xl border border-stone-700 bg-stone-900 p-3.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="min-w-0 truncate text-base font-semibold text-stone-100">{title}</span>
        <span className="shrink-0 font-mono text-base text-stone-300">{stored} stored</span>
      </div>
      {canLeave && (
        <div>
          <div className="mb-1.5 text-sm text-stone-400">Put blocks in <span className="text-stone-500">({carried} on hand)</span></div>
          <div className="flex gap-2">
            <button onClick={() => leave(character.id, storeKey, 5)} disabled={carried === 0} className={stepBtn}>5</button>
            <button onClick={() => leave(character.id, storeKey, carried)} disabled={carried === 0} className={stepBtn}>All</button>
          </div>
        </div>
      )}
      <div>
        <div className="mb-1.5 text-sm text-stone-400">Take blocks out <span className="text-stone-500">({room} more fit)</span></div>
        <div className="flex gap-2">
          <button onClick={() => pickUp(character.id, storeKey, 5)} disabled={canTake === 0} className={stepBtn}>5</button>
          <button onClick={() => pickUp(character.id, storeKey, canTake)} disabled={canTake === 0} className={stepBtn}>All I can carry</button>
        </div>
      </div>
    </div>
  )
}
