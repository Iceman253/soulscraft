import { useMemo, useState } from 'react'
import { Hammer, Hourglass, Pickaxe } from 'lucide-react'
import { useBuildStore } from './store'
import { useWorldStore } from '../map/store'
import { useRequestStore } from '../requests/store'
import { PixelIcon } from './PixelIcon'
import { BuildSheet } from './BuildSheet'
import { MineFlow } from './MineFlow'
import { StartBuildFlow } from './StartBuildFlow'
import { BLOCK_CARRY_LIMIT, PROJECT_TIERS, countBlocks, structureProgress } from '../../lib/building'
import { placementLabel } from '../../lib/places'
import type { Character, PlayerRequest, RequestType } from '../../types'

const BUILD_REQUESTS: RequestType[] = ['mine', 'build-start', 'build-days', 'build-speedup']

/** A player's whole building life: blocks, mining, new builds and the state of what
 *  they've sent the GM. Shown as a phone tab and in the desktop player panel. */
export function BuildHub({ character }: { character: Character }) {
  const allStructures = useBuildStore(s => s.structures)
  const areas = useWorldStore(s => s.areas)
  const allRequests = useRequestStore(s => s.requests)
  const clearRequest = useRequestStore(s => s.clearRequest)
  const structures = useMemo(() => allStructures.filter(s => s.builderIds.includes(character.id)), [allStructures, character.id])
  const requests = useMemo(
    () => allRequests.filter(r => r.characterId === character.id && BUILD_REQUESTS.includes(r.type) && r.status !== 'approved'),
    [allRequests, character.id],
  )

  const [mining, setMining] = useState(false)
  const [starting, setStarting] = useState<{ resend?: PlayerRequest } | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  const onHand = countBlocks(character.onHand.items)
  const stored = countBlocks(character.storage.items)
  const overLimit = onHand > BLOCK_CARRY_LIMIT

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5">
        <div className={`rounded-xl border px-3.5 py-2.5 ${overLimit ? 'border-amber-700/60 bg-amber-900/20' : 'border-stone-700 bg-stone-900'}`}>
          <div className="text-sm text-stone-500">On hand</div>
          <div className={`font-mono text-xl font-bold ${overLimit ? 'text-amber-300' : 'text-stone-100'}`}>{onHand}<span className="text-base text-stone-500"> / {BLOCK_CARRY_LIMIT}</span></div>
        </div>
        <div className="rounded-xl border border-stone-700 bg-stone-900 px-3.5 py-2.5">
          <div className="text-sm text-stone-500">In storage</div>
          <div className="font-mono text-xl font-bold text-stone-100">{stored}</div>
        </div>
      </div>
      {overLimit && <div className="text-sm text-amber-300">⚠️ You're carrying more than the {BLOCK_CARRY_LIMIT}-block limit.</div>}

      <div className="grid grid-cols-2 gap-2.5">
        <button onClick={() => setMining(true)} className="flex items-center justify-center gap-2 rounded-xl border border-stone-600 bg-stone-800 py-3.5 text-base font-semibold text-stone-100 active:border-gold/60 hover:border-gold/60">
          <Pickaxe size={19} /> Go Mining
        </button>
        <button onClick={() => setStarting({})} className="flex items-center justify-center gap-2 rounded-xl bg-gold py-3.5 text-base font-bold text-stone-900 active:bg-yellow-400 hover:bg-yellow-400">
          <Hammer size={19} /> Start a Build
        </button>
      </div>

      {requests.length > 0 && (
        <div className="space-y-2">
          {requests.map(r => (
            <div key={r.id} className={`rounded-xl border px-3.5 py-3 ${r.status === 'denied' ? 'border-red-800/50 bg-red-950/30' : 'border-amber-500/30 bg-stone-900'}`}>
              <div className="flex items-start gap-2 text-base">
                {r.status === 'pending'
                  ? <Hourglass size={17} className="mt-0.5 shrink-0 text-amber-300" />
                  : <span className="shrink-0">❌</span>}
                <span className={`min-w-0 flex-1 ${r.status === 'denied' ? 'text-red-200' : 'text-stone-200'}`}>{r.label}</span>
              </div>
              {r.status === 'denied' && (
                <div className="mt-2 flex gap-2">
                  {r.type === 'build-start' && (
                    <button onClick={() => setStarting({ resend: r })} className="rounded-lg border border-amber-600/50 bg-amber-700/40 px-4 py-2 text-base font-medium text-amber-200">Fix &amp; resend</button>
                  )}
                  <button onClick={() => clearRequest(r.id)} className="px-4 py-2 text-base text-stone-500">Dismiss</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {structures.length === 0 ? (
        <p className="text-base text-stone-500">No builds yet. Start one, or join a build by tapping it on the map.</p>
      ) : (
        <div className="space-y-2">
          {structures.map(s => {
            const p = structureProgress(s)
            return (
              <button key={s.id} onClick={() => setOpenId(s.id)} className="flex w-full items-center gap-3 rounded-xl border border-stone-700 bg-stone-900 px-3 py-2.5 text-left active:border-gold/50 hover:border-gold/50">
                <span className="shrink-0 rounded-lg border border-stone-600 bg-stone-950 p-1"><PixelIcon icon={s.icon} tier={s.tier} size={40} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-medium text-stone-100">{s.name}</span>
                  <span className="block truncate text-sm text-stone-500">{PROJECT_TIERS[s.tier].label} · {placementLabel(s, areas)}</span>
                  {p.status === 'complete'
                    ? <span className="block text-sm text-emerald">🏰 Complete</span>
                    : <span className="mt-1 block h-1.5 overflow-hidden rounded bg-stone-800"><span className="block h-full bg-amber-500" style={{ width: `${Math.round(p.fraction * 100)}%` }} /></span>}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {mining && <MineFlow character={character} onClose={() => setMining(false)} />}
      {starting && (
        <StartBuildFlow
          character={character}
          resend={starting.resend?.payload}
          onSent={() => { if (starting.resend) clearRequest(starting.resend.id) }}
          onClose={() => setStarting(null)}
        />
      )}
      {openId && <BuildSheet structureId={openId} character={character} onClose={() => setOpenId(null)} />}
    </div>
  )
}
