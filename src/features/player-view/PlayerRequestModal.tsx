import { useState } from 'react'
import { Send } from 'lucide-react'
import { useRequestStore, type RequestType } from '../requests/store'
import { useQuestStore } from '../quests/store'
import { Modal } from '../../ui/Modal'
import { CURRENCY_OPTIONS } from '../../lib/currency'
import type { Character } from '../../types'

interface Props {
  character: Character
  onClose: () => void
}

const REQUEST_TYPES: { type: RequestType; icon: string; label: string; desc: string }[] = [
  { type: 'item',           icon: '🎒', label: 'Request Item',         desc: 'Ask the GM to give you an item'         },
  { type: 'heal-full',      icon: '❤️', label: 'Full Heal',            desc: 'Request full HP restoration'            },
  { type: 'heal-amount',    icon: '💊', label: 'Heal Amount',          desc: 'Request a specific amount of HP'        },
  { type: 'sd-restore',     icon: '✨', label: 'Restore SD',           desc: 'Request all SD restored'                },
  { type: 'effect-add',     icon: '🧪', label: 'Add Effect',           desc: 'Ask the GM to apply a potion/condition' },
  { type: 'effect-remove',  icon: '🧹', label: 'Remove Effect',        desc: 'Ask to remove an active condition'      },
  { type: 'quest-complete', icon: '✅', label: 'Complete Quest',       desc: 'Request a quest be marked complete'     },
  { type: 'quest-fail',     icon: '❌', label: 'Fail Quest',           desc: 'Request a quest be marked failed'       },
  { type: 'quest-activate', icon: '🔄', label: 'Activate Quest',       desc: 'Request a quest be made active'        },
  { type: 'xp',             icon: '⭐', label: 'Request XP',           desc: 'Ask for XP to be awarded'              },
  { type: 'level-up',       icon: '🆙', label: 'Level Up',             desc: 'Request a level up'                    },
  { type: 'currency',       icon: '💰', label: 'Request Currency',     desc: 'Ask for coin or gems'                  },
  { type: 'reveal-area',    icon: '🗺️', label: 'Reveal Location',      desc: 'Ask the GM to reveal a map area'       },
  { type: 'custom',         icon: '💬', label: 'Custom Request',       desc: 'Send a free-text request to the GM'    },
]

export function PlayerRequestModal({ character: c, onClose }: Props) {
  const addRequest = useRequestStore(s => s.addRequest)
  const quests = useQuestStore(s => s.quests)

  const [step, setStep] = useState<'pick-type' | 'fill'>('pick-type')
  const [type, setType] = useState<RequestType | null>(null)

  // Fields
  const [itemName, setItemName] = useState('')
  const [itemQty, setItemQty] = useState('1')
  const [healAmount, setHealAmount] = useState('')
  const [xpAmount, setXpAmount] = useState('1')
  const [selectedQuestId, setSelectedQuestId] = useState('')
  const [selectedEffectId, setSelectedEffectId] = useState('')
  const [effectName, setEffectName] = useState('')
  const [effectDuration, setEffectDuration] = useState<'scenes' | 'days' | 'until-rest' | 'permanent' | 'manual'>('scenes')
  const [effectCount, setEffectCount] = useState('3')
  const [currencyType, setCurrencyType] = useState('gold')
  const [currencyAmount, setCurrencyAmount] = useState('1')
  const [areaNameText, setAreaNameText] = useState('')
  const [customText, setCustomText] = useState('')
  const [note, setNote] = useState('')

  const chosenMeta = type ? REQUEST_TYPES.find(r => r.type === type)! : null

  function buildPayloadAndLabel(): { payload: Record<string, unknown>; label: string } | null {
    if (!type) return null
    switch (type) {
      case 'item': {
        if (!itemName.trim()) return null
        const qty = Math.max(1, parseInt(itemQty) || 1)
        return { payload: { itemName: itemName.trim(), quantity: qty }, label: `Add ${qty}× ${itemName.trim()} to inventory` }
      }
      case 'heal-full':
        return { payload: {}, label: 'Restore full HP' }
      case 'heal-amount': {
        const amt = parseInt(healAmount)
        if (!amt || amt < 1) return null
        return { payload: { amount: amt }, label: `Heal ${amt} HP` }
      }
      case 'sd-restore':
        return { payload: {}, label: 'Restore all SD' }
      case 'xp': {
        const amt = Math.max(1, parseInt(xpAmount) || 1)
        return { payload: { amount: amt }, label: `Award ${amt} XP` }
      }
      case 'level-up':
        return { payload: {}, label: 'Level up' }
      case 'effect-add': {
        if (!effectName.trim()) return null
        const needsCount = effectDuration === 'scenes' || effectDuration === 'days'
        const remaining = needsCount ? Math.max(1, parseInt(effectCount) || 1) : undefined
        const durLabel = needsCount ? `${remaining} ${effectDuration}` : effectDuration
        return {
          payload: { name: effectName.trim(), durationType: effectDuration, remaining },
          label: `Apply effect: ${effectName.trim()} (${durLabel})`,
        }
      }
      case 'effect-remove': {
        const eff = c.activeEffects.find(e => e.id === selectedEffectId)
        if (!eff) return null
        return { payload: { effectId: eff.id, effectName: eff.name }, label: `Remove effect: ${eff.name}` }
      }
      case 'quest-complete':
      case 'quest-fail':
      case 'quest-activate': {
        const quest = quests.find(q => q.id === selectedQuestId)
        if (!quest) return null
        const verb = type === 'quest-complete' ? 'Complete' : type === 'quest-fail' ? 'Fail' : 'Activate'
        return { payload: { questId: quest.id, questTitle: quest.title }, label: `${verb} quest: "${quest.title}"` }
      }
      case 'currency': {
        const amt = Math.max(1, parseInt(currencyAmount) || 1)
        const opt = CURRENCY_OPTIONS.find(o => o.key === currencyType)
        return { payload: { currencyType, amount: amt }, label: `Grant ${amt} ${opt?.label ?? currencyType}` }
      }
      case 'reveal-area': {
        if (!areaNameText.trim()) return null
        return { payload: { areaName: areaNameText.trim() }, label: `Reveal area: ${areaNameText.trim()}` }
      }
      case 'custom': {
        if (!customText.trim()) return null
        return { payload: { text: customText.trim() }, label: customText.trim() }
      }
      default: return null
    }
  }

  function handleSend() {
    const result = buildPayloadAndLabel()
    if (!result) return
    addRequest({
      characterId: c.id,
      characterName: c.name,
      type: type!,
      payload: { ...result.payload, note: note.trim() || undefined },
      label: result.label,
    })
    onClose()
  }

  const canSend = !!buildPayloadAndLabel()

  // ── Type picker ──────────────────────────────────────────────────────────────
  if (step === 'pick-type') {
    return (
      <Modal title={`Send Request — ${c.name}`} onClose={onClose}>
        <div className="grid grid-cols-2 gap-2">
          {REQUEST_TYPES.map(rt => (
            <button
              key={rt.type}
              onClick={() => { setType(rt.type); setStep('fill') }}
              className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-stone-800 border border-stone-700 hover:border-stone-500 hover:bg-stone-700/60 text-left transition-colors group"
            >
              <span className="text-base shrink-0">{rt.icon}</span>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-stone-200 group-hover:text-stone-100">{rt.label}</div>
                <div className="text-xs text-stone-500 mt-0.5">{rt.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </Modal>
    )
  }

  // ── Fill form ────────────────────────────────────────────────────────────────
  return (
    <Modal title={`${chosenMeta?.icon} ${chosenMeta?.label}`} onClose={onClose}>
      <div className="space-y-4">
        <button
          onClick={() => setStep('pick-type')}
          className="text-xs text-stone-500 hover:text-stone-300 transition-colors"
        >
          ← Back
        </button>

        {/* Type-specific fields */}
        {type === 'item' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-stone-400 block mb-1">Item name *</label>
              <input autoFocus value={itemName} onChange={e => setItemName(e.target.value)}
                placeholder="Potion of Healing..."
                className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-stone-100 text-sm outline-none focus:border-gold/50" />
            </div>
            <div>
              <label className="text-xs text-stone-400 block mb-1">Quantity</label>
              <input type="number" min={1} value={itemQty} onChange={e => setItemQty(e.target.value)}
                className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-stone-100 text-sm outline-none focus:border-gold/50" />
            </div>
          </div>
        )}

        {type === 'heal-amount' && (
          <div>
            <label className="text-xs text-stone-400 block mb-1">HP amount *</label>
            <input autoFocus type="number" min={1} value={healAmount} onChange={e => setHealAmount(e.target.value)}
              placeholder="10"
              className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-stone-100 text-sm outline-none focus:border-gold/50" />
          </div>
        )}

        {type === 'heal-full' && (
          <p className="text-sm text-stone-400">Request your HP be fully restored to {c.maxHp}.</p>
        )}

        {type === 'sd-restore' && (
          <p className="text-sm text-stone-400">Request all {c.maxSd} SD be restored.</p>
        )}

        {type === 'xp' && (
          <div>
            <label className="text-xs text-stone-400 block mb-1">XP amount</label>
            <input autoFocus type="number" min={1} max={10} value={xpAmount} onChange={e => setXpAmount(e.target.value)}
              className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-stone-100 text-sm outline-none focus:border-gold/50" />
          </div>
        )}

        {type === 'level-up' && (
          <p className="text-sm text-stone-400">Request to level up from Level {c.level} → {c.level + 1}.</p>
        )}

        {type === 'effect-add' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-stone-400 block mb-1">Effect name *</label>
              <input autoFocus value={effectName} onChange={e => setEffectName(e.target.value)}
                placeholder="Poison, Strength, Fire Resistance…"
                className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-stone-100 text-sm outline-none focus:border-gold/50" />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-stone-400 block mb-1">Duration</label>
                <select value={effectDuration} onChange={e => setEffectDuration(e.target.value as typeof effectDuration)}
                  className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-stone-100 text-sm outline-none focus:border-gold/50">
                  <option value="scenes">Scenes</option>
                  <option value="days">Days</option>
                  <option value="until-rest">Until rest</option>
                  <option value="permanent">Permanent</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
              {(effectDuration === 'scenes' || effectDuration === 'days') && (
                <div className="w-24">
                  <label className="text-xs text-stone-400 block mb-1">How many</label>
                  <input type="number" min={1} value={effectCount} onChange={e => setEffectCount(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-stone-100 text-sm outline-none focus:border-gold/50" />
                </div>
              )}
            </div>
            <p className="text-xs text-stone-500">The GM approves before it's applied to your character.</p>
          </div>
        )}

        {type === 'effect-remove' && (
          <div>
            <label className="text-xs text-stone-400 block mb-1">Effect to remove *</label>
            {c.activeEffects.length === 0 ? (
              <p className="text-sm text-stone-500 italic">No active effects.</p>
            ) : (
              <select value={selectedEffectId} onChange={e => setSelectedEffectId(e.target.value)}
                className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-stone-100 text-sm outline-none focus:border-gold/50">
                <option value="">Select effect…</option>
                {c.activeEffects.map(e => (
                  <option key={e.id} value={e.id}>{e.name}{e.remaining != null ? ` (${e.remaining} scenes left)` : ''}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {(type === 'quest-complete' || type === 'quest-fail' || type === 'quest-activate') && (
          <div>
            <label className="text-xs text-stone-400 block mb-1">Quest *</label>
            {quests.length === 0 ? (
              <p className="text-sm text-stone-500 italic">No quests in this campaign.</p>
            ) : (
              <select value={selectedQuestId} onChange={e => setSelectedQuestId(e.target.value)}
                className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-stone-100 text-sm outline-none focus:border-gold/50">
                <option value="">Select quest…</option>
                {quests.map(q => (
                  <option key={q.id} value={q.id}>{q.title} ({q.status})</option>
                ))}
              </select>
            )}
          </div>
        )}

        {type === 'currency' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-stone-400 block mb-1">Currency type</label>
              <select value={currencyType} onChange={e => setCurrencyType(e.target.value)}
                className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-stone-100 text-sm outline-none focus:border-gold/50">
                {CURRENCY_OPTIONS.map(o => (
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-stone-400 block mb-1">Amount</label>
              <input type="number" min={1} value={currencyAmount} onChange={e => setCurrencyAmount(e.target.value)}
                className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-stone-100 text-sm outline-none focus:border-gold/50" />
            </div>
          </div>
        )}

        {type === 'reveal-area' && (
          <div>
            <label className="text-xs text-stone-400 block mb-1">Location name *</label>
            <input autoFocus value={areaNameText} onChange={e => setAreaNameText(e.target.value)}
              placeholder="The Ancient Ruins…"
              className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-stone-100 text-sm outline-none focus:border-gold/50" />
            <p className="text-xs text-stone-500 mt-1">Type the name of a place you'd like to see on the map.</p>
            {/* No dropdown — players shouldn't see areas they haven't discovered */}
          </div>
        )}

        {type === 'custom' && (
          <div>
            <label className="text-xs text-stone-400 block mb-1">Your request *</label>
            <textarea autoFocus value={customText} onChange={e => setCustomText(e.target.value)}
              rows={3} placeholder="I'd like to…"
              className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-stone-100 text-sm outline-none resize-none focus:border-gold/50" />
          </div>
        )}

        {/* Optional note for all request types */}
        <div>
          <label className="text-xs text-stone-400 block mb-1">Note to GM <span className="text-stone-500">(optional)</span></label>
          <input value={note} onChange={e => setNote(e.target.value)}
            placeholder="Because…"
            className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-stone-100 text-sm outline-none focus:border-stone-500" />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-3 py-1.5 rounded bg-stone-700 text-stone-300 hover:bg-stone-600 text-sm">
            Cancel
          </button>
          <button onClick={handleSend} disabled={!canSend}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-gold text-stone-900 font-semibold text-sm disabled:opacity-40 hover:bg-yellow-400 transition-colors">
            <Send size={13} /> Send Request
          </button>
        </div>
      </div>
    </Modal>
  )
}
