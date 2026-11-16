/**
 * Shared "apply ability/skill" panel used by the Dice Roller and Combat AttackModal.
 * A controlled component: clicking an item stages it for the upcoming roll; parents
 * own the `applied` array and call `commitAppliedModifiers` (./modifiers) when the roll fires.
 */
import type { Character } from '../../types'
import type { ModifierContext, AppliedModifier } from './modifiers/types'
import { getCharacterModifiers } from './modifiers/available'
import { totalBonus, totalSdCost } from './modifiers/commit'

// ── Component ──────────────────────────────────────────────────────────
interface AbilityApplyPanelProps {
  character: Character
  context: ModifierContext
  applied: AppliedModifier[]
  onApplied: (next: AppliedModifier[]) => void
  /** Collapse by default to save space. */
  initiallyOpen?: boolean
  /** Optional override title. */
  title?: string
}

export function AbilityApplyPanel({
  character: c,
  context,
  applied,
  onApplied,
  title,
}: AbilityApplyPanelProps) {
  const available = getCharacterModifiers(c, context)
  if (available.length === 0) return null

  // Group by source for clean section headers
  const groups: Array<{ label: string; items: AppliedModifier[] }> = [
    { label: 'Skills',     items: available.filter(m => m.source === 'skill')   },
    { label: 'Traits',     items: available.filter(m => m.source === 'trait')   },
    { label: 'Maneuvers',  items: available.filter(m => m.source === 'maneuver')},
    { label: 'Voices',     items: available.filter(m => m.source === 'voice')   },
    { label: 'Evasions',   items: available.filter(m => m.source === 'evasion') },
    { label: 'Edge',       items: available.filter(m => m.source === 'edge')    },
    { label: 'Abilities',  items: available.filter(m => m.source === 'ability') },
  ].filter(g => g.items.length > 0)

  const appliedKeys = new Set(applied.map(a => a.key))

  const toggle = (mod: AppliedModifier) => {
    if (appliedKeys.has(mod.key)) {
      onApplied(applied.filter(a => a.key !== mod.key))
      return
    }
    // Manual p.5: only one Skill per roll. Replace existing skill.
    if (mod.source === 'skill') {
      onApplied([...applied.filter(a => a.source !== 'skill'), mod])
      return
    }
    onApplied([...applied, mod])
  }

  // Styling by source
  const colorFor = (src: AppliedModifier['source'], isOn: boolean) => {
    if (!isOn) return 'bg-stone-700/60 border-stone-600 text-stone-300 hover:border-stone-400 hover:text-stone-100'
    switch (src) {
      case 'skill':    return 'bg-blue-900/40 border-blue-500/70 text-blue-200'
      case 'trait':    return 'bg-teal-900/40 border-teal-500/70 text-teal-200'
      case 'maneuver': return 'bg-redstone/30 border-redstone/70 text-red-200'
      case 'voice':    return 'bg-purple-900/40 border-purple-500/70 text-purple-200'
      case 'evasion':  return 'bg-emerald/20 border-emerald/70 text-emerald'
      case 'edge':     return 'bg-gold/20 border-gold/70 text-gold'
      case 'ability':  return 'bg-amber-900/40 border-amber-500/70 text-amber-200'
    }
  }

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900/50">
      <div className="px-3 py-1.5 border-b border-stone-700 text-xs font-heading uppercase tracking-wider text-stone-300">
        {title ?? 'Apply Ability / Skill'}
        {applied.length > 0 && (
          <span className="ml-2 text-gold normal-case tracking-normal">
            ({applied.length} staged · {totalBonus(applied) >= 0 ? `+${totalBonus(applied)}` : totalBonus(applied)}
            {totalSdCost(applied) > 0 ? ` · −${totalSdCost(applied)} SD` : ''})
          </span>
        )}
      </div>

      <div className="p-2 space-y-2">
        {groups.map(g => (
          <div key={g.label}>
            <div className="text-[10px] uppercase tracking-wider text-stone-400 mb-1 font-heading">{g.label}</div>
            <div className="flex flex-wrap gap-1.5">
              {g.items.map(mod => {
                const isOn = appliedKeys.has(mod.key)
                const bonusLabel = mod.bonus !== 0
                  ? ` ${mod.bonus > 0 ? `+${mod.bonus}` : mod.bonus}`
                  : ''
                const sdLabel = mod.sdCost > 0 ? ` · ${mod.sdCost}SD` : ''
                const modLabel = mod.damageMod === 'double'        ? ' · ×2 dmg'
                              : mod.damageMod === 'half-incoming' ? ' · ½ incoming'
                              : mod.damageMod === 'no-damage'     ? ' · no dmg'
                              : ''
                const effects = mod.appliedEffects ?? []
                const effectLabel = effects.length > 0
                  ? ' · ' + effects.map(e =>
                      `${e.onSuccess ? '🎯' : '✨'}${e.effectName}${e.target !== 'self' ? `→${e.target}` : ''}`
                    ).join(', ')
                  : ''
                const effectTitle = effects.length > 0
                  ? `\n\nAuto-applies: ${effects.map(e =>
                      `${e.effectName} → ${e.target}${e.onSuccess ? ' (only on 10+)' : ''}`
                    ).join('; ')}`
                  : ''
                return (
                  <button
                    key={mod.key}
                    type="button"
                    onClick={() => toggle(mod)}
                    title={(mod.detail ?? '') + effectTitle}
                    className={`px-2 py-1 rounded-sm border text-xs font-medium transition-colors ${colorFor(mod.source, isOn)}`}
                  >
                    {isOn ? '✓ ' : ''}{mod.name}
                    <span className="font-mono tabular-nums">{bonusLabel}{sdLabel}</span>
                    <span className="opacity-80">{modLabel}{effectLabel}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        <div className="text-[10px] text-stone-500 italic pt-1">
          Tap to stage · tap again to remove. Marks charges used &amp; spends SD only when the roll fires.
        </div>
      </div>
    </div>
  )
}
