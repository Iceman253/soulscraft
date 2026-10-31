import { useCharacterStore } from '../characters/store'
import { useWorldStore } from '../map/store'
import { carryRoom, countBlocks } from '../../lib/building'
import { findMine, mineAt } from '../../lib/places'
import type { Character } from '../../types'

const stepBtn = 'flex-1 rounded-xl border border-stone-600 bg-stone-950 py-2.5 text-base font-semibold text-stone-100 active:border-gold/60 hover:border-gold/60 disabled:opacity-35'

/** Blocks a character has left at mines. They can only be reached by going back,
 *  unless the mine itself is gone, so nobody loses blocks to a map edit. */
export function MineStash({ character }: { character: Character }) {
  const areas = useWorldStore(s => s.areas)
  const leave = useCharacterStore(s => s.leaveBlocksAtMine)
  const take = useCharacterStore(s => s.takeBlocksFromMine)

  const here = mineAt(character, areas)
  const stashes = Object.entries(character.mineStashes ?? {}).map(([placeId, section]) => ({
    placeId, blocks: countBlocks(section.items), mine: findMine(placeId, areas),
  }))
  const lost = stashes.filter(s => !s.mine)
  const elsewhere = stashes.filter(s => s.mine && s.placeId !== here?.id)
  if (!here && stashes.length === 0) return null

  const carried = countBlocks(character.onHand.items)
  const room = carryRoom(character)
  const hereCount = stashes.find(s => s.placeId === here?.id)?.blocks ?? 0
  const canTake = Math.min(room, hereCount)

  return (
    <div className="space-y-2.5">
      {here && (
        <div className="space-y-2.5 rounded-xl border border-stone-700 bg-stone-900 p-3.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="min-w-0 truncate text-base font-semibold text-stone-100">⛏️ {here.name}</span>
            <span className="shrink-0 font-mono text-base text-stone-300">{hereCount} left here</span>
          </div>
          <div>
            <div className="mb-1.5 text-sm text-stone-400">Leave blocks here <span className="text-stone-500">({carried} on hand)</span></div>
            <div className="flex gap-2">
              <button onClick={() => leave(character.id, here.id, 5)} disabled={carried === 0} className={stepBtn}>5</button>
              <button onClick={() => leave(character.id, here.id, carried)} disabled={carried === 0} className={stepBtn}>All</button>
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-sm text-stone-400">Pick blocks up <span className="text-stone-500">({room} more fit)</span></div>
            <div className="flex gap-2">
              <button onClick={() => take(character.id, here.id, 5)} disabled={canTake === 0} className={stepBtn}>5</button>
              <button onClick={() => take(character.id, here.id, canTake)} disabled={canTake === 0} className={stepBtn}>All I can carry</button>
            </div>
          </div>
        </div>
      )}
      {elsewhere.map(s => (
        <div key={s.placeId} className="flex items-baseline justify-between gap-2 rounded-xl border border-stone-700 bg-stone-900 px-3.5 py-2.5 text-base">
          <span className="min-w-0 truncate text-stone-300">⛏️ {s.mine!.label}</span>
          <span className="shrink-0 font-mono text-stone-400">{s.blocks} left there</span>
        </div>
      ))}
      {lost.map(s => (
        <div key={s.placeId} className="flex items-center justify-between gap-2 rounded-xl border border-amber-700/50 bg-stone-900 px-3.5 py-2.5 text-base">
          <span className="min-w-0 text-stone-300">{s.blocks} blocks from a mine that's gone</span>
          <button onClick={() => take(character.id, s.placeId, s.blocks)} disabled={room === 0} className="shrink-0 rounded-lg border border-stone-600 px-3 py-1.5 text-stone-100 disabled:opacity-35">Collect</button>
        </div>
      ))}
    </div>
  )
}
