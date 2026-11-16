import { Shield, Sword, X, Zap } from 'lucide-react'
import { Badge } from '../../ui/Badge'
import { TokenAvatar } from '../../ui/TokenAvatar'
import { HpBar } from '../../ui/HpBar'
import { useCombatStore } from './store'
import { useCharacterStore } from '../characters/store'
import { useBestiaryStore } from '../bestiary/store'
import { EffectPicker } from './EffectPicker'
import { STATUS_EFFECTS } from './statusEffects'
import { applyStatusEffect } from './applyStatusEffect'
import { canSplitOnDeath } from './combatMath'
import type { Combatant } from '../../types'

interface Props {
  c: Combatant
  active: boolean
  canAttack: boolean
  onAttack: () => void
  pickerOpen: boolean
  onTogglePicker: () => void
}

/** One combatant in the initiative order, with its HP, effects and actions. */
export function CombatantRow({ c, active, canAttack, onAttack, pickerOpen, onTogglePicker }: Props) {
  const { setInitiative, splitSlime, toggleTough, adjustCombatantHp, removeComabtant, removeCombatantEffect, updateCombatantNotes } = useCombatStore()
  const characters = useCharacterStore(s => s.characters)
  const creatures = useBestiaryStore(s => s.entries)
  return (
    <div key={c.id} className={`bg-stone-800 border rounded-xl p-3 transition-all ${
      c.currentHp <= 0
        ? 'border-stone-800 opacity-50'
        : active
          ? 'border-gold shadow-lg shadow-gold/10'
          : 'border-stone-700'
    }`}>
      <div className="flex items-center gap-3">
        {/* Initiative */}
        <div className="text-center shrink-0">
          <div className="text-xs text-stone-500">Init</div>
          <input type="number" value={c.initiative}
            onChange={e => setInitiative(c.id, parseInt(e.target.value) || 0)}
            className="w-12 bg-stone-900 border border-stone-600 rounded-sm px-1 py-0.5 text-stone-200 text-sm text-center outline-hidden font-mono tabular-nums" />
        </div>

        {/* Avatar */}
        {c.kind === 'character'
          ? <TokenAvatar name={c.name} characterId={c.sourceId} size={32} />
          : <div className="w-8 h-8 rounded-full bg-redstone/20 border border-redstone/40 flex items-center justify-center text-sm shrink-0">⚔️</div>
        }

        {/* Name + HP */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-stone-100 text-sm">{c.name}</span>
            {active && <Badge variant="gold">Active</Badge>}
            <Badge variant={c.kind === 'character' ? 'blue' : 'red'}>{c.kind}</Badge>
            {c.currentHp <= 0 && <span className="text-xs text-stone-500 font-medium">💀 Defeated</span>}
            {c.currentHp <= 0 && c.kind === 'creature' && canSplitOnDeath(c.name) && (
              <button
                onClick={() => splitSlime(c.id)}
                title="Split into 2 smaller versions"
                className="px-1.5 py-0.5 rounded-sm text-xs border bg-emerald/10 border-emerald/40 text-emerald hover:bg-emerald/20 transition-colors"
              >
                🟢 Split!
              </button>
            )}
            {c.damageDie && c.currentHp > 0 && <span className="text-xs text-stone-500 font-mono">{c.damageDie}</span>}
            {/* Missed-rest penalty badge for PC combatants */}
            {c.kind === 'character' && (() => {
              const char = characters.find(ch => ch.id === c.sourceId)
              return char && char.missedRests > 0
                ? <span className="text-xs text-orange-400 font-bold" title={`${char.missedRests} missed rest(s) — apply -${char.missedRests}d4 to their rolls`}>⚠️ -{char.missedRests}d4</span>
                : null
            })()}
            {/* Tough tag toggle — only on creatures */}
            {c.kind === 'creature' && (
              <button
                onClick={() => toggleTough(c.id)}
                title={c.isTough ? 'Tough: immune to instant kill — click to remove' : 'Mark as Tough (immune to instant kill)'}
                className={`px-1.5 py-0.5 rounded-sm text-xs border transition-colors ${c.isTough ? 'bg-orange-900/40 border-orange-600/60 text-orange-300' : 'bg-stone-700 border-stone-600 text-stone-500 hover:text-stone-300'}`}
              >
                {c.isTough ? '🪨 Tough' : '+ Tough'}
              </button>
            )}
          </div>
          <HpBar current={c.currentHp} max={c.maxHp} className="mt-1" />
        </div>

        {/* DEF */}
        <div className="flex items-center gap-1 shrink-0">
          <Shield size={12} className="text-blue-400" />
          <span className="text-sm text-blue-300 font-bold font-mono tabular-nums">{c.def}</span>
        </div>

        {/* Attack button */}
        <button onClick={onAttack} disabled={!canAttack}
          title="Attack"
          className="flex items-center gap-1 px-2 py-1 rounded-sm bg-redstone/20 hover:bg-redstone/40 border border-redstone/30 text-red-400 text-xs shrink-0 disabled:opacity-30 disabled:cursor-not-allowed">
          <Sword size={11} /> Attack
        </button>

        {/* Effect button */}
        <button onClick={onTogglePicker}
          title="Apply status effect"
          className={`flex items-center gap-1 px-2 py-1 rounded-sm border text-xs shrink-0 transition-colors ${
            pickerOpen
              ? 'bg-purple-700/30 border-purple-500/50 text-purple-300'
              : 'bg-stone-700 border-stone-600 text-stone-400 hover:text-stone-200 hover:border-stone-500'
          }`}>
          <Zap size={11} /> Effect
        </button>

        {/* HP +/− */}
        <div className="flex gap-1 shrink-0">
          <button onClick={() => adjustCombatantHp(c.id, -1)} className="w-7 h-7 rounded-sm bg-redstone/20 hover:bg-redstone/40 text-red-400 text-sm">-</button>
          <button onClick={() => adjustCombatantHp(c.id, 1)} className="w-7 h-7 rounded-sm bg-emerald/20 hover:bg-emerald/40 text-emerald text-sm">+</button>
        </div>

        <button onClick={() => removeComabtant(c.id)} className="p-1 text-stone-600 hover:text-red-400 shrink-0">
          <X size={13} />
        </button>
      </div>

      {/* Active effects badges */}
      {c.activeEffects.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {c.activeEffects.map(e => (
            <span key={e.id} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-xs border ${
              e.damagePerRound
                ? 'bg-redstone/20 border-redstone/40 text-red-300'
                : STATUS_EFFECTS.find(s => s.name === e.name)?.harmful === false
                  ? 'bg-emerald/10 border-emerald/30 text-emerald'
                  : 'bg-purple-900/30 border-purple-700/40 text-purple-300'
            }`}>
              {e.damagePerRound && <span className="text-red-400">🩸</span>}
              {e.healPerRound && <span className="text-emerald">💚</span>}
              {e.name}
              {e.damagePerRound && <span className="text-red-400/70 font-mono text-xs">{e.damagePerRound}/turn</span>}
              {e.healPerRound && <span className="text-emerald/70 font-mono text-xs">+{e.healPerRound}/turn</span>}
              <button onClick={() => removeCombatantEffect(c.id, e.id)} className="ml-0.5 text-stone-500 hover:text-red-400">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Effect picker — pass creature type tags for immunity warnings */}
      {pickerOpen && (
        <EffectPicker
          onApply={template => { applyStatusEffect(c.id, template); onTogglePicker() }}
          onClose={onTogglePicker}
          targetTags={c.kind === 'creature'
            ? (creatures.find(cr => cr.id === c.sourceId)?.creatureType ?? [])
            : []}
        />
      )}

      <input value={c.notes} onChange={e => updateCombatantNotes(c.id, e.target.value)}
        placeholder="Notes..." className="mt-2 w-full bg-stone-900 border border-stone-700 rounded-sm px-2 py-1 text-stone-400 text-xs outline-hidden" />
    </div>
  )
}
