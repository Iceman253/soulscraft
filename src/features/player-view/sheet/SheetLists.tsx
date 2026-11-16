// Read-only lists on a player sheet: skills, abilities, active effects.
// 'sm' is the desktop/iPad panel, 'lg' the phone layout.
import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { Ability, ActiveEffect, Skill } from '../../../types'

type Size = 'sm' | 'lg'

export function SkillChips({ skills, size = 'sm' }: { skills: Skill[]; size?: Size }) {
  const lg = size === 'lg'
  return (
    <div className={`flex flex-wrap ${lg ? 'gap-2' : 'gap-1.5'}`}>
      {skills.map(s => (
        <div key={s.id} title={s.description || undefined}
          className={lg ? 'flex items-center gap-1.5 bg-stone-900 border border-stone-700 rounded-xl px-3 py-2' : 'flex items-center gap-1 bg-stone-800 border border-stone-700 rounded-sm px-2 py-0.5'}>
          <span className={`${lg ? 'text-base' : 'text-xs'} text-stone-200`}>{s.name}</span>
          <span className={`${lg ? 'text-base' : 'text-xs'} font-bold text-gold font-mono`}>+{s.bonus}</span>
        </div>
      ))}
    </div>
  )
}

/** Abilities; tap one to read its description and materials. */
export function AbilityList({ abilities, size = 'sm' }: { abilities: Ability[]; size?: Size }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const lg = size === 'lg'
  return (
    <div className={lg ? 'space-y-2' : 'space-y-1'}>
      {abilities.map(a => {
        const open = expanded === a.id
        const Chevron = open ? ChevronDown : ChevronRight
        return (
          <button
            key={a.id}
            onClick={() => setExpanded(open ? null : a.id)}
            className={`w-full text-left border transition-colors ${lg ? 'rounded-xl p-3.5' : 'rounded-lg px-2.5 py-1.5'} ${
              open
                ? `${lg ? 'bg-stone-900' : 'bg-stone-800'} border-amber-700/50`
                : `${lg ? 'bg-stone-900/60' : 'bg-stone-800/60 hover:border-stone-600'} border-stone-700`
            }`}
          >
            <div className={`flex items-center ${lg ? 'gap-2.5' : 'gap-2'}`}>
              <Chevron size={lg ? 18 : 11} className="shrink-0 text-stone-500" />
              <span className={lg ? 'text-base font-semibold text-stone-100 flex-1' : 'text-xs text-stone-100 font-medium flex-1 truncate'}>{a.name}</span>
              <span className={`${lg ? 'text-base' : 'text-xs'} font-mono shrink-0 ${a.sdCost > 0 ? 'text-amber-400' : 'text-stone-500'}`}>
                {a.sdCost > 0 ? `${a.sdCost} SD` : 'Free'}
              </span>
              {!lg && a.recharge !== 'none' && (
                <span className="text-[10px] text-stone-500 uppercase tracking-wider shrink-0">{a.recharge}</span>
              )}
            </div>
            {open && (
              <div className={lg ? 'mt-2.5 pl-6 text-base text-stone-400 leading-relaxed whitespace-pre-wrap' : 'mt-1.5 pl-4 text-xs text-stone-400 leading-relaxed whitespace-pre-wrap'}>
                {a.description || <span className="italic text-stone-600">No description.</span>}
                {a.materials && (
                  <div className={lg ? 'mt-1.5 text-sm text-stone-500' : 'mt-1 text-stone-500'}>
                    <span className="text-stone-600">Materials:</span> {a.materials}
                  </div>
                )}
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

/** Active status effects; damaging ones are red. */
export function EffectList({ effects, size = 'sm' }: { effects: ActiveEffect[]; size?: Size }) {
  const lg = size === 'lg'
  return (
    <div className={lg ? 'space-y-2' : 'space-y-1'}>
      {effects.map(e => (
        <div key={e.id} className={`flex border ${lg ? 'items-center gap-2.5 px-3.5 py-3 rounded-xl text-base' : 'items-start gap-2 px-2.5 py-1.5 rounded-lg text-xs'} ${
          e.damagePerRound ? 'bg-red-900/20 border-red-800/40 text-red-300' : 'bg-emerald/10 border-emerald/30 text-emerald'
        }`}>
          <span className={lg ? 'font-semibold' : 'font-medium shrink-0'}>{e.name}</span>
          {!lg && e.description && <span className="text-stone-400 truncate">{e.description}</span>}
          {e.damagePerRound && <span className={`text-red-400 font-mono shrink-0 ${lg ? 'text-sm' : ''}`}>🩸{e.damagePerRound}/turn</span>}
          {e.remaining != null && <span className={`ml-auto shrink-0 text-stone-500 font-mono ${lg ? 'text-sm' : ''}`}>{e.remaining}{lg ? ' ' : ''}sc</span>}
        </div>
      ))}
    </div>
  )
}
