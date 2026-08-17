import { useState } from 'react'
import { Check, X, Trash2 } from 'lucide-react'
import { useRequestStore, type PlayerRequest } from './store'
import { useCharacterStore } from '../characters/store'
import { useQuestStore } from '../quests/store'
import { useWorldStore } from '../map/store'
import { useEconomyStore } from '../economy/store'
import { log } from '../log/store'
import { CURRENCY_OPTIONS, formatCopper } from '../../lib/currency'
import { CLASS_ABILITIES } from '../../lib/classAbilities'
import type { CombatRole, AppliedStatusEffectSpec, EffectDuration } from '../../types'

// ── Execute an approved request against the appropriate stores ─────────────────
// Returns false when execution failed (e.g. buyer can't afford it) so the
// caller can leave the request pending instead of falsely marking it approved.
function useExecute() {
  const { adjustHp, adjustSd, awardXp, levelUp, removeEffect, addEffect, addOnHandItem, setCurrency, addAbility, addSkill } = useCharacterStore()
  const { setStatus } = useQuestStore()
  const { addPlayerVisibleArea } = useWorldStore()
  const characters = useCharacterStore(s => s.characters)
  const quests = useQuestStore(s => s.quests)

  return function execute(req: PlayerRequest): boolean {
    const p = req.payload
    const charId = req.characterId
    const char = characters.find(c => c.id === charId)

    switch (req.type) {
      case 'buy-item': {
        const result = useEconomyStore.getState().buy(
          String(p.marketId), String(p.goodId), Number(p.quantity) || 1,
          charId, Number(p.unitPriceCopper) || 0,
        )
        if (!result.ok) {
          log('manual', `🛒 Purchase request from ${req.characterName} not completed: ${result.reason}`)
          return false
        }
        break
      }
      case 'sell-item': {
        const result = useEconomyStore.getState().sell(
          String(p.marketId), charId, String(p.itemId),
          Number(p.quantity) || 1, Number(p.unitPriceCopper) || 0,
        )
        if (!result.ok) {
          log('manual', `💰 Sale request from ${req.characterName} not completed: ${result.reason}`)
          return false
        }
        break
      }
      case 'item': {
        addOnHandItem(charId, { name: String(p.itemName), quantity: Number(p.quantity) || 1 })
        log('character-move', `🎒 ${req.characterName} received ${p.quantity}× ${p.itemName}.`)
        break
      }
      case 'heal-full': {
        if (char) { adjustHp(charId, char.maxHp); log('character-move', `❤️ ${req.characterName} fully healed.`) }
        break
      }
      case 'heal-amount': {
        adjustHp(charId, Number(p.amount))
        log('character-move', `❤️ ${req.characterName} healed ${p.amount} HP.`)
        break
      }
      case 'sd-restore': {
        if (char) { adjustSd(charId, char.maxSd); log('character-move', `✨ ${req.characterName}'s SD fully restored.`) }
        break
      }
      case 'xp': {
        awardXp(charId, Number(p.amount), 'manual', 'Player request')
        log('xp-awarded', `⭐ ${req.characterName} awarded ${p.amount} XP by request.`)
        break
      }
      case 'level-up': {
        levelUp(charId)
        log('level-up', `🆙 ${req.characterName} leveled up!`)
        break
      }
      case 'effect-add': {
        addEffect(charId, {
          name: String(p.name),
          durationType: (typeof p.durationType === 'string' ? p.durationType : 'manual') as EffectDuration,
          remaining: typeof p.remaining === 'number' ? p.remaining : undefined,
          damagePerRound: typeof p.damagePerRound === 'string' ? p.damagePerRound : undefined,
          healPerRound: typeof p.healPerRound === 'string' ? p.healPerRound : undefined,
        })
        log('effect-applied', `🧪 ${req.characterName}: effect "${p.name}" applied by GM.`)
        break
      }
      case 'effect-remove': {
        removeEffect(charId, String(p.effectId))
        log('effect-expired', `🧹 ${req.characterName}: effect "${p.effectName}" removed by GM.`)
        break
      }
      case 'quest-complete': {
        const quest = quests.find(q => q.id === String(p.questId))
        if (quest) setStatus(quest.id, 'completed')
        break
      }
      case 'quest-fail': {
        const quest = quests.find(q => q.id === String(p.questId))
        if (quest) setStatus(quest.id, 'failed')
        break
      }
      case 'quest-activate': {
        const quest = quests.find(q => q.id === String(p.questId))
        if (quest) setStatus(quest.id, 'active')
        break
      }
      case 'currency': {
        if (char) {
          const key = String(p.currencyType) as keyof typeof char.currency
          const current = char.currency[key] ?? 0
          setCurrency(charId, { [key]: current + Number(p.amount) })
          const opt = CURRENCY_OPTIONS.find(o => o.key === key)
          log('character-move', `💰 ${req.characterName} received ${p.amount} ${opt?.label ?? key}.`)
        }
        break
      }
      case 'reveal-area': {
        // Player sent a name; find matching area (case-insensitive)
        const areas = useWorldStore.getState().areas
        const area = areas.find(a => a.name.toLowerCase() === String(p.areaName).toLowerCase())
        if (area) {
          addPlayerVisibleArea(area.id)
          log('character-move', `🗺️ Area "${area.name}" revealed to players.`)
        } else {
          log('manual', `🗺️ Reveal request for "${p.areaName}" — no matching area found on map.`)
        }
        break
      }
      case 'custom': {
        log('manual', `💬 GM approved request from ${req.characterName}: "${p.text}"`)
        break
      }
      case 'skill-approval': {
        // Atomic level-up bundle: stat gains + chosen ability + new custom skill.
        // Held until this moment because the skill required GM approval.
        if (!char) break
        levelUp(charId)

        const abilityName = p.abilityName ? String(p.abilityName) : null
        if (abilityName) {
          const master = (CLASS_ABILITIES[char.class] ?? []).find(a => a.name === abilityName)
          if (master) {
            addAbility(charId, {
              name: master.name,
              sdCost: master.sdCost,
              description: master.description,
              recharge: 'rest',
              combatRole: master.combatRole,
              combatRoles: master.combatRoles ?? (master.combatRole ? [master.combatRole] : undefined),
              appliedEffects: master.appliedEffects,
            })
          }
        }

        const skillName = p.skillName ? String(p.skillName) : ''
        if (skillName) {
          const rawRoles = Array.isArray(p.skillCombatRoles) ? p.skillCombatRoles as CombatRole[] : []
          const rawEffects = Array.isArray(p.skillAppliedEffects) ? p.skillAppliedEffects as AppliedStatusEffectSpec[] : []
          addSkill(charId, {
            name: skillName,
            bonus: (Number(p.skillBonus) || 1) as 1 | 2 | 3,
            description: String(p.skillDescription ?? ''),
            combatRoles: rawRoles.length > 0 ? rawRoles : ['general'],
            appliedEffects: rawEffects.length > 0 ? rawEffects : undefined,
          })
        }

        log('level-up', `🆙 ${req.characterName} leveled up${abilityName ? ` and learned "${abilityName}"` : ''}${skillName ? ` and gained new Skill "${skillName}"` : ''}.`)
        break
      }
    }
    return true
  }
}

// ── Single request row ────────────────────────────────────────────────────────
function RequestRow({ req }: { req: PlayerRequest }) {
  const { approveRequest, denyRequest, clearRequest, updateRequestPayload } = useRequestStore()
  const execute = useExecute()
  const [failure, setFailure] = useState<string | null>(null)

  const TYPE_ICONS: Record<string, string> = {
    item: '🎒', 'heal-full': '❤️', 'heal-amount': '💊', 'sd-restore': '✨',
    xp: '⭐', 'level-up': '🆙', 'effect-add': '🧪', 'effect-remove': '🧹',
    'quest-complete': '✅', 'quest-fail': '❌', 'quest-activate': '🔄',
    currency: '💰', 'buy-item': '🛒', 'sell-item': '🪙',
    'reveal-area': '🗺️', 'skill-approval': '🎓', custom: '💬',
  }

  const isPending = req.status === 'pending'
  const isTrade = req.type === 'buy-item' || req.type === 'sell-item'

  const approve = () => {
    setFailure(null)
    if (execute(req)) approveRequest(req.id)
    else setFailure('Could not complete — see the session log. Adjust the price or deny.')
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
            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
              req.status === 'approved' ? 'bg-emerald/20 text-emerald' : 'bg-red-900/40 text-red-400'
            }`}>
              {req.status}
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
        <div className="bg-stone-900/60 border border-stone-700 rounded p-2 space-y-1.5">
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
                    <span key={role} className="px-1.5 py-0.5 rounded border border-amber-500/40 bg-amber-900/30 text-amber-200 text-[10px] font-medium">
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

      {/* Trade detail — the GM sets the FINAL unit price before approving */}
      {isTrade && isPending && (
        <div className="bg-stone-900/60 border border-stone-700 rounded p-2 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-stone-500">Unit price (copper)</span>
            <input
              type="number" min={0}
              value={Number(req.payload.unitPriceCopper) || 0}
              onChange={e => updateRequestPayload(req.id, { unitPriceCopper: Math.max(0, parseInt(e.target.value) || 0) })}
              className="w-20 bg-stone-800 border border-amber-700/40 rounded px-1.5 py-0.5 text-amber-100 text-xs text-right outline-none focus:border-amber-600 font-mono tabular-nums"
            />
          </div>
          <div className="flex justify-between text-stone-500">
            <span>Total ({Number(req.payload.quantity) || 1}×)</span>
            <span className="font-mono tabular-nums text-stone-300">
              {formatCopper((Number(req.payload.unitPriceCopper) || 0) * (Number(req.payload.quantity) || 1))}
            </span>
          </div>
        </div>
      )}

      {failure && (
        <div className="text-amber-300 bg-amber-900/20 border border-amber-800/40 rounded px-2 py-1.5 leading-snug">{failure}</div>
      )}

      {/* Optional note */}
      {req.payload.note ? (
        <div className="text-stone-500 italic">"{String(req.payload.note)}"</div>
      ) : null}

      {/* Approve / Deny — only on pending */}
      {isPending && (
        <div className="flex gap-2 pt-0.5">
          <button
            onClick={approve}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald/20 border border-emerald/40 text-emerald hover:bg-emerald/30 transition-colors font-medium"
          >
            <Check size={11} /> Approve
          </button>
          <button
            onClick={() => denyRequest(req.id)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-red-900/20 border border-red-800/40 text-red-400 hover:bg-red-900/30 transition-colors"
          >
            <X size={11} /> Deny
          </button>
        </div>
      )}
    </div>
  )
}

// ── Panel (rendered as a floating dropdown from the TopBar bell) ──────────────
interface Props {
  onClose: () => void
}

export function GMRequestsPanel({ onClose }: Props) {
  const { requests, clearAll } = useRequestStore()
  const pending = requests.filter(r => r.status === 'pending')
  const resolved = requests.filter(r => r.status !== 'pending')

  return (
    <div className="absolute right-0 top-full mt-1 w-80 bg-stone-900 border border-stone-600 rounded-xl shadow-2xl z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-stone-800 border-b border-stone-700">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-stone-100">Player Requests</span>
          {pending.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-gold text-stone-900">{pending.length}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {requests.length > 0 && (
            <button onClick={clearAll} className="text-xs text-stone-500 hover:text-stone-300 transition-colors px-1.5 py-0.5 rounded hover:bg-stone-700">
              Clear all
            </button>
          )}
          <button onClick={onClose} className="p-1 rounded text-stone-500 hover:text-stone-300 hover:bg-stone-700 transition-colors">
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="max-h-96 overflow-y-auto p-2.5 space-y-2">
        {requests.length === 0 ? (
          <div className="py-8 text-center text-stone-500 text-xs">
            <div className="text-2xl mb-2">📭</div>
            No requests yet.
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <div>
                <div className="text-xs text-stone-500 font-medium mb-1.5 px-1">Pending</div>
                <div className="space-y-2">
                  {pending.map(r => <RequestRow key={r.id} req={r} />)}
                </div>
              </div>
            )}
            {resolved.length > 0 && (
              <div>
                <div className="text-xs text-stone-500 font-medium mb-1.5 mt-2 px-1">Resolved</div>
                <div className="space-y-2">
                  {resolved.map(r => <RequestRow key={r.id} req={r} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
