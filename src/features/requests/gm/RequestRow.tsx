import { useState } from 'react'
import { Check, X, Trash2, Handshake } from 'lucide-react'
import { useRequestStore, type PlayerRequest } from '../store'
import { BLOCK_CARRY_LIMIT, actionOutcome } from '../../../lib/world/building'
import { gmDecision, isHaggle } from '../../../lib/economy/haggle'
import { useExecuteRequest } from './useExecuteRequest'
import { BuildRequestCard, CarryLimitPrompt } from './RequestDetails'
import { TradeTerms } from './TradeTerms'

/** What each outcome means for the GM's call (Guidebook p.4). */
const MINING_OUTCOME_HINT = {
  success: 'Full success: they get what they wanted, maybe more.',
  partial: 'Partial: they succeed, with a cost, complication or choice.',
  failure: 'Failure: they fall short, and you add a complication.',
}

// ── Single request row ────────────────────────────────────────────────────────
export function RequestRow({ req }: { req: PlayerRequest }) {
  const { approveRequest, denyRequest, counterRequest, clearRequest, updateRequestPayload } = useRequestStore()
  const execute = useExecuteRequest()
  const [failure, setFailure] = useState<string | null>(null)

  const TYPE_ICONS: Record<string, string> = {
    item: '🎒', 'heal-full': '❤️', 'heal-amount': '💊', 'sd-restore': '✨',
    xp: '⭐', 'level-up': '🆙', 'effect-add': '🧪', 'effect-remove': '🧹',
    'quest-complete': '✅', 'quest-fail': '❌', 'quest-activate': '🔄',
    currency: '💰', 'buy-item': '🛒', 'sell-item': '🪙',
    'reveal-area': '🗺️', 'skill-approval': '🎓', custom: '💬',
    mine: '⛏️', 'build-start': '🏗️', 'build-days': '🔨', 'build-speedup': '⏱️', 'carry-limit': '📦',
  }

  const isPending = req.status === 'pending'
  const isTrade = req.type === 'buy-item' || req.type === 'sell-item'
  const counters = isPending && isHaggle(req) &&
    gmDecision(Number(req.payload.unitPriceCopper) || 0, Number(req.payload.offerUnitCopper) || 0) === 'counter'

  const approve = () => {
    setFailure(null)
    if (execute(req)) approveRequest(req.id)
    else if (req.type === 'carry-limit') setFailure(`Enter a limit above ${BLOCK_CARRY_LIMIT} first, or deny this request.`)
    else setFailure(req.type.startsWith('build-') ? 'That build no longer exists. Deny this request.' : 'Could not complete — see the session log. Adjust the price or deny.')
  }

  return (
    <div className={`rounded-lg border px-3 py-2.5 text-xs space-y-1.5 ${
      isPending    ? 'bg-stone-800 border-stone-600' :
      req.status === 'approved' ? 'bg-emerald/5 border-emerald/20' :
                     'bg-red-950/20 border-red-900/30'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="shrink-0">{TYPE_ICONS[req.type] ?? '📋'}</span>
          <span className="font-semibold text-stone-200 truncate">{req.characterName}</span>
          {!isPending && (
            <span className={`px-1.5 py-0.5 rounded-sm text-xs font-medium ${
              req.status === 'approved' ? 'bg-emerald/20 text-emerald'
                : req.status === 'countered' ? 'bg-teal-900/40 text-teal-300'
                : 'bg-red-900/40 text-red-400'
            }`}>
              {req.status === 'countered' ? 'countered · waiting on player' : req.status}
            </span>
          )}
        </div>
        <button onClick={() => clearRequest(req.id)} className="p-0.5 text-stone-600 hover:text-stone-400 shrink-0 transition-colors">
          <Trash2 size={11} />
        </button>
      </div>

      {/* Request label */}
      <div className="text-stone-300 leading-snug">{req.label}</div>

      {/* Skill-approval detail card — shown to the GM in pending state so they can judge the proposal */}
      {req.type === 'skill-approval' && (
        <div className="bg-stone-900/60 border border-stone-700 rounded-sm p-2 space-y-1.5">
          {req.payload.abilityName ? (
            <div className="text-stone-400">
              <span className="text-stone-500">Ability:</span>{' '}
              <span className="text-stone-200">{String(req.payload.abilityName)}</span>
            </div>
          ) : (
            <div className="text-stone-500 italic">No ability picked.</div>
          )}
          {req.payload.skillName ? (
            <>
              <div className="text-stone-400">
                <span className="text-stone-500">New skill:</span>{' '}
                <span className="text-stone-100 font-semibold">{String(req.payload.skillName)}</span>{' '}
                <span className="text-gold font-mono">+{Number(req.payload.skillBonus) || 1}</span>
              </div>
              {req.payload.skillDescription && (
                <div className="text-stone-400 leading-snug whitespace-pre-wrap">
                  {String(req.payload.skillDescription)}
                </div>
              )}
              {Array.isArray(req.payload.skillCombatRoles) && (req.payload.skillCombatRoles as string[]).length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] text-stone-500 uppercase tracking-wider mr-0.5">Shows in</span>
                  {(req.payload.skillCombatRoles as string[]).map(role => (
                    <span key={role} className="px-1.5 py-0.5 rounded-sm border border-amber-500/40 bg-amber-900/30 text-amber-200 text-[10px] font-medium">
                      {role}
                    </span>
                  ))}
                </div>
              )}
              {Array.isArray(req.payload.skillAppliedEffects) && (req.payload.skillAppliedEffects as Array<{ effectName: string; target: string }>).length > 0 && (
                <div className="text-purple-300 text-[10px]">
                  ✨ Applies: {(req.payload.skillAppliedEffects as Array<{ effectName: string; target: string }>)
                    .map(e => `${e.effectName} → ${e.target}`).join(', ')}
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      {req.type === 'build-start' && <BuildRequestCard req={req} />}

      {/* Mining — the player has already rolled; the GM only awards the blocks */}
      {req.type === 'mine' && isPending && (
        <div className="bg-stone-900/60 border border-stone-700 rounded-sm p-2 space-y-1.5">
          {req.payload.breakdown ? <div className="font-mono text-[11px] text-stone-400 leading-snug">{String(req.payload.breakdown)}</div> : null}
          <div className="text-stone-500 leading-snug">{MINING_OUTCOME_HINT[actionOutcome(Number(req.payload.total) || 0)]}</div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-stone-500">Blocks gained</span>
            <input
              type="number" min={0}
              value={Number(req.payload.gained) || 0}
              onChange={e => updateRequestPayload(req.id, { gained: Math.max(0, parseInt(e.target.value) || 0) })}
              className="w-20 bg-stone-800 border border-stone-600 rounded-sm px-1.5 py-0.5 text-stone-100 text-xs text-right outline-hidden focus:border-gold/50 font-mono tabular-nums"
            />
          </div>
          {Array.isArray(req.payload.offList) && req.payload.offList.length > 0 && (
            <div className="text-amber-400 text-[11px] leading-snug">⚠️ Not listed for this area: {(req.payload.offList as string[]).join(', ')}</div>
          )}
          {req.payload.overLimit === true && <div className="text-stone-500 text-[11px] leading-snug">Past the 10-block carry limit, so the rest goes to storage.</div>}
          {Array.isArray(req.payload.effects) && req.payload.effects.length > 0 && (
            <div className="text-amber-400 text-[11px] leading-snug">⚠️ Check these effects: {(req.payload.effects as string[]).join(', ')}</div>
          )}
          {req.payload.doubleSix === true && <div className="text-gold text-[11px] font-semibold">⭐ Double 6s: approving gives +1 XP</div>}
        </div>
      )}

      {/* Carry limit — the GM decides the number; it isn't prefilled */}
      {req.type === 'carry-limit' && isPending && <CarryLimitPrompt req={req} onChange={limit => updateRequestPayload(req.id, { limit })} />}

      {/* Speed-up — the player's proposal stands unless the GM changes it */}
      {req.type === 'build-speedup' && isPending && (
        <div className="bg-stone-900/60 border border-stone-700 rounded-sm p-2 flex items-center justify-between gap-2">
          <span className="text-stone-500">Days needed</span>
          <input
            type="number" min={0}
            value={Number(req.payload.days) || 0}
            onChange={e => updateRequestPayload(req.id, { days: Math.max(0, parseFloat(e.target.value) || 0) })}
            className="w-20 bg-stone-800 border border-stone-600 rounded-sm px-1.5 py-0.5 text-stone-100 text-xs text-right outline-hidden focus:border-gold/50 font-mono tabular-nums"
          />
        </div>
      )}

      {/* Trade detail — the GM sets the FINAL unit price before approving */}
      {isTrade && isPending && <TradeTerms req={req} onPrice={unitPriceCopper => updateRequestPayload(req.id, { unitPriceCopper })} />}

      {failure && (
        <div className="text-amber-300 bg-amber-900/20 border border-amber-800/40 rounded-sm px-2 py-1.5 leading-snug">{failure}</div>
      )}

      {/* Optional note */}
      {req.payload.note ? (
        <div className="text-stone-500 italic">"{String(req.payload.note)}"</div>
      ) : null}

      {/* Approve / Deny — only on pending */}
      {isPending && (
        <div className="flex gap-2 pt-0.5">
          {counters ? (
            <button
              onClick={() => counterRequest(req.id, Number(req.payload.unitPriceCopper) || 0)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-sm bg-teal-900/30 border border-teal-600/50 text-teal-300 hover:bg-teal-900/50 transition-colors font-medium"
            >
              <Handshake size={11} /> Counter
            </button>
          ) : (
            <button
              onClick={approve}
              className="flex items-center gap-1 px-2.5 py-1 rounded-sm bg-emerald/20 border border-emerald/40 text-emerald hover:bg-emerald/30 transition-colors font-medium"
            >
              <Check size={11} /> Approve
            </button>
          )}
          <button
            onClick={() => denyRequest(req.id)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-sm bg-red-900/20 border border-red-800/40 text-red-400 hover:bg-red-900/30 transition-colors"
          >
            <X size={11} /> Deny
          </button>
        </div>
      )}
    </div>
  )
}
