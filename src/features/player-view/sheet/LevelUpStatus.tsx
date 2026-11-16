import { Hourglass, RotateCcw, Sparkles } from 'lucide-react'
import type { Character, PlayerRequest } from '../../../types'
import type { useLevelUpFlow } from '../hooks/useLevelUpFlow'

type Flow = ReturnType<typeof useLevelUpFlow>

/** The GM turned down a level-up proposal: say which, and offer to pick again. */
export function DeniedProposalBanner({ request, onRetry, onDismiss, size = 'sm' }: {
  request: PlayerRequest; onRetry: () => void; onDismiss: () => void; size?: 'sm' | 'lg'
}) {
  const skill = String(request.payload.skillName ?? '')
  if (size === 'lg') {
    return (
      <div className="mx-4 mt-3 rounded-xl border border-red-800/50 bg-red-950/30 px-4 py-3 space-y-2">
        <div className="text-base text-red-300 leading-snug">❌ The GM denied your skill "{skill}". Adjust and resend.</div>
        <div className="flex gap-2">
          <button onClick={onRetry} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-700/40 border border-amber-600/50 text-amber-200 text-base font-medium">
            <RotateCcw size={16} /> Pick again
          </button>
          <button onClick={onDismiss} className="px-4 py-2 rounded-lg text-stone-500 text-base">Dismiss</button>
        </div>
      </div>
    )
  }
  return (
    <div className="mt-2 rounded-md border border-red-800/50 bg-red-950/30 px-2.5 py-2 text-xs space-y-1.5">
      <div className="text-red-300 leading-snug">
        ❌ The GM denied your proposed skill <span className="font-semibold">"{skill}"</span>. Adjust it and resubmit.
      </div>
      <div className="flex gap-1.5">
        <button onClick={onRetry} className="flex items-center gap-1 px-2 py-1 rounded-sm bg-amber-700/40 border border-amber-600/50 text-amber-200 hover:bg-amber-700/60 transition-colors text-xs font-medium">
          <RotateCcw size={11} /> Pick again
        </button>
        <button onClick={onDismiss} className="px-2 py-1 rounded-sm text-stone-500 hover:text-stone-300 text-xs">Dismiss</button>
      </div>
    </div>
  )
}

/** Desktop XP card: progress to the next level, the Level Up button, and the
 *  state of a proposal sent to the GM. */
export function XpCard({ character: c, flow }: { character: Character; flow: Flow }) {
  return (
    <div className="bg-stone-800 border border-stone-700 rounded-lg px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-stone-400 font-heading tracking-wide">XP</span>
        <span className="text-gold font-bold font-mono tabular-nums text-sm">{c.xp} / 5</span>
        {flow.pending ? (
          <span className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-sm bg-stone-700 border border-amber-500/40 text-amber-300 text-xs font-semibold"
            title="Your level-up proposal is awaiting GM approval.">
            <Hourglass size={11} /> Pending GM review
          </span>
        ) : c.xp >= 5 ? (
          <button onClick={flow.openFresh}
            className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-sm bg-amber-500 text-stone-900 text-xs font-bold hover:bg-amber-400 transition-colors animate-pulse">
            <Sparkles size={11} /> Level Up
          </button>
        ) : (
          <span className="ml-auto text-xs text-stone-500">{5 - c.xp} to next level</span>
        )}
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-stone-900 overflow-hidden">
        <div className="h-full bg-linear-to-r/srgb from-amber-600 to-amber-400 transition-all" style={{ width: `${Math.min(100, (c.xp / 5) * 100)}%` }} />
      </div>

      {flow.pending && (
        <div className="mt-2 text-[11px] text-amber-200/80 leading-snug">
          Proposal sent: <span className="text-amber-200 font-medium">{String(flow.pending.payload.skillName ?? '')}</span>
          {flow.pending.payload.abilityName ? <> + ability "{String(flow.pending.payload.abilityName)}"</> : null}
        </div>
      )}
      {!flow.pending && flow.denied && (
        <DeniedProposalBanner request={flow.denied} onRetry={flow.retryDenied} onDismiss={flow.dismissDenied} />
      )}
    </div>
  )
}
