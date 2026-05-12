import { useState } from 'react'
import { Trophy, Check } from 'lucide-react'
import { useCharacterStore } from './store'
import { Modal } from '../../ui/Modal'
import { log } from '../log/store'

// Rulebook p.8 — three session-end questions, each worth 1 XP per player
const MILESTONE_QUESTIONS = [
  { id: 'world',     label: 'Did we learn something important about the world?' },
  { id: 'challenge', label: 'Did we overcome a significant challenge?' },
  { id: 'reward',    label: 'Did we acquire something valuable or impactful?' },
] as const

type QuestionId = typeof MILESTONE_QUESTIONS[number]['id']

interface Props { onClose: () => void }

export function SessionMilestoneModal({ onClose }: Props) {
  const { characters, awardXp } = useCharacterStore()
  const pcs = characters.filter(c => c.type === 'pc')

  const [answered, setAnswered] = useState<Record<QuestionId, boolean>>({
    world: false, challenge: false, reward: false,
  })
  const [selectedChars, setSelectedChars] = useState<Set<string>>(new Set(pcs.map(c => c.id)))

  const xpEarned = Object.values(answered).filter(Boolean).length

  const toggle = (q: QuestionId) => setAnswered(prev => ({ ...prev, [q]: !prev[q] }))
  const toggleChar = (id: string) => setSelectedChars(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const handleAward = () => {
    if (xpEarned === 0 || selectedChars.size === 0) { onClose(); return }
    const yesQs = MILESTONE_QUESTIONS.filter(q => answered[q.id]).map(q => q.label)
    for (const charId of selectedChars) {
      awardXp(charId, xpEarned, 'session-milestone', `Session milestone: ${yesQs.join(' | ')}`)
    }
    const charNames = pcs.filter(c => selectedChars.has(c.id)).map(c => c.name).join(', ')
    log('xp-awarded', `🏆 Session milestone: ${xpEarned} XP awarded to ${charNames}. (${yesQs.join('; ')})`)
    onClose()
  }

  return (
    <Modal title="End of Session — Milestone XP" onClose={onClose}>
      <div className="space-y-5">
        <div className="text-xs text-stone-400 bg-stone-800 rounded-lg px-3 py-2.5 leading-snug">
          Answer these questions as a group. Each <strong className="text-stone-200">"Yes"</strong> earns every player <strong className="text-gold">1 XP</strong>.
        </div>

        {/* Questions */}
        <div className="space-y-2">
          {MILESTONE_QUESTIONS.map(q => (
            <button
              key={q.id}
              onClick={() => toggle(q.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl border text-left transition-all ${
                answered[q.id]
                  ? 'bg-gold/10 border-gold/40 text-stone-100'
                  : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-500'
              }`}
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                answered[q.id] ? 'bg-gold border-gold' : 'border-stone-500'
              }`}>
                {answered[q.id] && <Check size={12} className="text-stone-900" />}
              </div>
              <span className="text-sm">{q.label}</span>
            </button>
          ))}
        </div>

        {/* XP summary */}
        <div className={`px-3 py-2.5 rounded-xl border text-center text-sm font-semibold transition-colors ${
          xpEarned > 0 ? 'bg-gold/10 border-gold/40 text-gold' : 'bg-stone-800 border-stone-700 text-stone-500'
        }`}>
          {xpEarned > 0 ? `+${xpEarned} XP earned this session` : 'No XP earned yet'}
        </div>

        {/* Character picker */}
        {pcs.length > 0 && xpEarned > 0 && (
          <div>
            <div className="text-xs text-stone-500 mb-2">Award to:</div>
            <div className="flex flex-wrap gap-1.5">
              {pcs.map(c => (
                <button key={c.id} onClick={() => toggleChar(c.id)}
                  className={`px-2.5 py-1 rounded border text-xs transition-all ${
                    selectedChars.has(c.id)
                      ? 'bg-gold/20 border-gold/50 text-gold'
                      : 'bg-stone-800 border-stone-600 text-stone-400 hover:border-stone-400'
                  }`}>
                  {c.name} ({c.xp}/5 XP)
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Also award for character goals (manual) */}
        <div className="text-xs text-stone-500 border-t border-stone-700 pt-3">
          <Trophy size={11} className="inline mr-1 text-stone-500" />
          Character Goals (1 XP each) are awarded separately — use the XP field on each character sheet.
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 rounded bg-stone-700 text-stone-300 hover:bg-stone-600 text-sm">
            Cancel
          </button>
          <button onClick={handleAward} disabled={xpEarned === 0 || selectedChars.size === 0}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-gold text-stone-900 font-semibold text-sm disabled:opacity-40 hover:bg-yellow-400 transition-colors">
            <Trophy size={13} /> Award {xpEarned > 0 ? `${xpEarned} XP` : 'XP'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
