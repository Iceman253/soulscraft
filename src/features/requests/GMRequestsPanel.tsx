import { Check, X, Trash2 } from 'lucide-react'
import { useRequestStore, type PlayerRequest } from './store'
import { useCharacterStore } from '../characters/store'
import { useQuestStore } from '../quests/store'
import { useWorldStore } from '../map/store'
import { log } from '../log/store'
import { CURRENCY_OPTIONS } from '../../lib/currency'

// ── Execute an approved request against the appropriate stores ─────────────────
function useExecute() {
  const { adjustHp, adjustSd, awardXp, levelUp, removeEffect, addOnHandItem, setCurrency } = useCharacterStore()
  const { setStatus } = useQuestStore()
  const { addPlayerVisibleArea } = useWorldStore()
  const characters = useCharacterStore(s => s.characters)
  const quests = useQuestStore(s => s.quests)

  return function execute(req: PlayerRequest) {
    const p = req.payload
    const charId = req.characterId
    const char = characters.find(c => c.id === charId)

    switch (req.type) {
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
    }
  }
}

// ── Single request row ────────────────────────────────────────────────────────
function RequestRow({ req }: { req: PlayerRequest }) {
  const { approveRequest, denyRequest, clearRequest } = useRequestStore()
  const execute = useExecute()

  const TYPE_ICONS: Record<string, string> = {
    item: '🎒', 'heal-full': '❤️', 'heal-amount': '💊', 'sd-restore': '✨',
    xp: '⭐', 'level-up': '🆙', 'effect-remove': '🧹',
    'quest-complete': '✅', 'quest-fail': '❌', 'quest-activate': '🔄',
    currency: '💰', 'reveal-area': '🗺️', custom: '💬',
  }

  const isPending = req.status === 'pending'

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

      {/* Optional note */}
      {req.payload.note && (
        <div className="text-stone-500 italic">"{String(req.payload.note)}"</div>
      )}

      {/* Approve / Deny — only on pending */}
      {isPending && (
        <div className="flex gap-2 pt-0.5">
          <button
            onClick={() => { execute(req); approveRequest(req.id) }}
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
