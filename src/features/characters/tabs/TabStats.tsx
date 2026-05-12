import { useState } from 'react'
import { Plus, Trash2, Dices } from 'lucide-react'
import { useCharacterStore } from '../store'
import { useWorldStore } from '../../map/store'
import { CLASSES, CLASS_DISCIPLINES, DISCIPLINE_EDGES, SPECIES, SPECIES_DATA } from '../../../lib/constants'
import { Badge } from '../../../ui/Badge'
import { ClassFeatures } from '../classFeatures/ClassFeatures'
import { LevelUpModal } from '../LevelUpModal'
import { rollDie } from '../../combat/combatUtils'
import { log } from '../../log/store'
import type { Character, Skill, Trait } from '../../../types'

// ── Inline roll result ────────────────────────────────────────────────────────
interface RollResult { d1: number; d2: number; sdBonus?: number; total: number }

function outcomeOf(total: number) {
  if (total >= 10) return { label: '✅ Full Success', color: 'text-emerald' }
  if (total >= 7)  return { label: '⚡ Partial',      color: 'text-amber-400' }
  return                  { label: '❌ Failure',       color: 'text-red-400' }
}

function RollResultBadge({ r, penalty }: { r: RollResult; penalty: number }) {
  const { label, color } = outcomeOf(r.total - penalty)
  return (
    <span className={`text-xs font-mono font-bold ml-1 ${color}`}>
      [{r.d1}+{r.d2}{r.sdBonus ? `+${r.sdBonus}(SD)` : ''}{penalty > 0 ? `-${penalty}d4` : ''} = {r.total - penalty}] {label}
    </span>
  )
}

// ── Skill roll row ─────────────────────────────────────────────────────────────
function SkillRow({ sk, char, onUpdate, onDelete }: { sk: Skill; char: Character; onUpdate: (p: Partial<Skill>) => void; onDelete: () => void }) {
  const { adjustSd } = useCharacterStore()
  const [result, setResult] = useState<RollResult | null>(null)

  const roll = (withSd: boolean) => {
    const d1 = rollDie(6), d2 = rollDie(6)
    let sdBonus: number | undefined
    if (withSd && char.currentSd > 0) {
      sdBonus = rollDie(4)
      adjustSd(char.id, -1)
    }
    const total = d1 + d2 + sk.bonus + (sdBonus ?? 0)
    const r: RollResult = { d1, d2, sdBonus, total }
    setResult(r)
    const penalty = char.missedRests
    const outcomeStr = total - penalty >= 10 ? 'Full Success' : total - penalty >= 7 ? 'Partial' : 'Failure'
    log('dice-roll', `🎲 ${char.name} — ${sk.name} (2d6+${sk.bonus}${sdBonus ? `+${sdBonus}SD` : ''}${penalty > 0 ? `-${penalty}d4` : ''} = ${total - penalty}) → ${outcomeStr}`)
    setTimeout(() => setResult(null), 4000)
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <input value={sk.name} onChange={e => onUpdate({ name: e.target.value })} placeholder="Skill name"
          className="flex-1 bg-stone-900 border border-stone-600 rounded px-2 py-1 text-stone-200 text-xs outline-none focus:border-gold/50" />
        <select value={sk.bonus} onChange={e => onUpdate({ bonus: parseInt(e.target.value) as 1|2|3 })}
          className="w-16 bg-stone-900 border border-stone-600 rounded px-1 py-1 text-stone-200 text-xs outline-none">
          <option value={1}>+1</option>
          <option value={2}>+2</option>
          <option value={3}>+3</option>
        </select>
        {/* Roll 2d6 + bonus */}
        <button onClick={() => roll(false)} title={`Roll 2d6+${sk.bonus}`}
          className="flex items-center gap-1 px-2 py-1 rounded bg-stone-700 border border-stone-600 text-stone-300 hover:border-gold/50 hover:text-gold text-xs transition-colors">
          <Dices size={11} /> Roll
        </button>
        {/* Roll with SD boost */}
        {char.currentSd > 0 && (
          <button onClick={() => roll(true)} title={`Roll 2d6+${sk.bonus}+1d4 (spend 1 SD)`}
            className="px-2 py-1 rounded bg-stone-700 border border-gold/30 text-gold/70 hover:border-gold/60 hover:text-gold text-xs transition-colors">
            +SD
          </button>
        )}
        <button onClick={onDelete} className="p-1 text-stone-500 hover:text-red-400"><Trash2 size={12} /></button>
      </div>
      {result && <RollResultBadge r={result} penalty={char.missedRests} />}
    </div>
  )
}

// ── Trait roll row ────────────────────────────────────────────────────────────
function TraitRow({ tr, char, onUpdate, onDelete }: { tr: Trait; char: Character; onUpdate: (p: Partial<Trait>) => void; onDelete: () => void }) {
  const { adjustSd } = useCharacterStore()
  const [result, setResult] = useState<RollResult | null>(null)

  const roll = (withSd: boolean) => {
    const d1 = rollDie(6), d2 = rollDie(6)
    let sdBonus: number | undefined
    if (withSd && char.currentSd > 0) {
      sdBonus = rollDie(4)
      adjustSd(char.id, -1)
    }
    const total = d1 + d2 + 1 + (sdBonus ?? 0)
    const r: RollResult = { d1, d2, sdBonus, total }
    setResult(r)
    const penalty = char.missedRests
    const outcomeStr = total - penalty >= 10 ? 'Full Success' : total - penalty >= 7 ? 'Partial' : 'Failure'
    log('dice-roll', `🎲 ${char.name} — ${tr.name} (2d6+1 trait${sdBonus ? `+${sdBonus}SD` : ''}${penalty > 0 ? `-${penalty}d4` : ''} = ${total - penalty}) → ${outcomeStr}`)
    setTimeout(() => setResult(null), 4000)
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <input value={tr.name} onChange={e => onUpdate({ name: e.target.value })} placeholder="Trait name"
          className="flex-1 bg-stone-900 border border-stone-600 rounded px-2 py-1 text-stone-200 text-xs outline-none focus:border-gold/50 font-medium" />
        <button onClick={() => roll(false)} title="Roll 2d6+1 (trait bonus)"
          className="flex items-center gap-1 px-2 py-1 rounded bg-stone-700 border border-stone-600 text-stone-300 hover:border-gold/50 hover:text-gold text-xs transition-colors">
          <Dices size={11} /> +1
        </button>
        {char.currentSd > 0 && (
          <button onClick={() => roll(true)} title="Roll 2d6+1+1d4 (spend 1 SD)"
            className="px-2 py-1 rounded bg-stone-700 border border-gold/30 text-gold/70 hover:border-gold/60 hover:text-gold text-xs transition-colors">
            +SD
          </button>
        )}
        <button onClick={onDelete} className="p-1 text-stone-500 hover:text-red-400"><Trash2 size={12} /></button>
      </div>
      <textarea value={tr.description} onChange={e => onUpdate({ description: e.target.value })} placeholder="Description..." rows={2}
        className="w-full bg-stone-900 border border-stone-600 rounded px-2 py-1 text-stone-400 text-xs outline-none resize-none" />
      {result && <RollResultBadge r={result} penalty={char.missedRests} />}
    </div>
  )
}

interface TabStatsProps { character: Character }

export function TabStats({ character: c }: TabStatsProps) {
  const { updateCharacter, changeClass, changeDiscipline, changeSpeciesVariant, addSkill, updateSkill, deleteSkill, addTrait, updateTrait, deleteTrait, awardXp, levelUp, setLocation, missRest, resetMissedRests } = useCharacterStore()
  const areas = useWorldStore(s => s.areas)
  const [xpAmt, setXpAmt] = useState('')
  const [showLevelUp, setShowLevelUp] = useState(false)

  const disciplines = CLASS_DISCIPLINES[c.class] ?? []
  const speciesVariants = SPECIES_DATA[c.species]?.variants ?? []
  const selectedEdge = DISCIPLINE_EDGES[c.discipline]

  return (
    <div className="p-4 space-y-6">
      {/* Core stats row */}
      <div className="grid grid-cols-3 gap-3">
        <StatField label="Max HP" value={c.maxHp} onSave={v => updateCharacter(c.id, { maxHp: v, currentHp: Math.min(c.currentHp, v) })} />
        <StatField label="Max SD" value={c.maxSd} onSave={v => updateCharacter(c.id, { maxSd: v, currentSd: Math.min(c.currentSd, v) })} />
        <div>
          <div className="text-xs text-stone-500 mb-1">Damage Die</div>
          <input value={c.damageDie} onChange={e => updateCharacter(c.id, { damageDie: e.target.value })}
            className="w-full bg-stone-800 border border-stone-600 rounded px-2 py-1.5 text-stone-100 text-sm outline-none focus:border-gold/50" />
        </div>
      </div>

      {/* Species / Class */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-stone-500 mb-1">Species</div>
          <select value={c.species} onChange={e => changeSpeciesVariant(c.id, e.target.value, SPECIES_DATA[e.target.value]?.variants[0]?.name ?? '')}
            className="w-full bg-stone-800 border border-stone-600 rounded px-2 py-1.5 text-stone-200 text-sm outline-none">
            {SPECIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <div className="text-xs text-stone-500 mb-1">Class</div>
          <select value={c.class} onChange={e => changeClass(c.id, e.target.value)}
            className="w-full bg-stone-800 border border-stone-600 rounded px-2 py-1.5 text-stone-200 text-sm outline-none">
            {CLASSES.map(cl => <option key={cl} value={cl}>{cl}</option>)}
          </select>
        </div>
      </div>

      {/* Variant picker */}
      {speciesVariants.length > 0 && (
        <div>
          <div className="text-xs text-stone-500 mb-1.5">Variant</div>
          <div className="flex flex-wrap gap-1.5">
            {speciesVariants.map(v => (
              <button key={v.name} onClick={() => changeSpeciesVariant(c.id, c.species, v.name)}
                className={`px-2.5 py-1 rounded border text-xs transition-all ${c.variant === v.name ? 'bg-gold/20 border-gold/60 text-gold' : 'bg-stone-700 border-stone-600 text-stone-300 hover:border-stone-400'}`}>
                {v.name}
              </button>
            ))}
          </div>
          {(() => {
            const vd = speciesVariants.find(v => v.name === c.variant) ?? speciesVariants[0]
            const sd = SPECIES_DATA[c.species]
            return vd && sd ? (
              <div className="mt-2 bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 space-y-1">
                <div className="text-xs text-stone-500 italic">{sd.tags}</div>
                <div className="text-xs"><span className="text-stone-400 font-semibold">{sd.speciesTrait.name}: </span><span className="text-stone-500">{sd.speciesTrait.description}</span></div>
                <div className="text-xs"><span className="text-gold font-semibold">{vd.trait.name}: </span><span className="text-stone-500">{vd.trait.description}</span></div>
              </div>
            ) : null
          })()}
        </div>
      )}

      {/* Discipline */}
      <div>
        <div className="text-xs text-stone-500 mb-1.5">Discipline</div>
        <div className="flex flex-wrap gap-1.5">
          {disciplines.map(d => (
            <button key={d} onClick={() => changeDiscipline(c.id, d)}
              className={`px-2.5 py-1 rounded border text-xs transition-all ${c.discipline === d ? 'bg-gold/20 border-gold/60 text-gold' : 'bg-stone-700 border-stone-600 text-stone-300 hover:border-stone-400'}`}>
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Discipline Edge */}
      <div className="bg-stone-800 rounded-lg p-3 border border-stone-700">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-stone-200 font-heading tracking-wide">Discipline Edge</span>
          <Badge variant={c.disciplineEdge.used ? 'muted' : 'gold'}>{c.disciplineEdge.used ? 'Used' : 'Ready'}</Badge>
          {selectedEdge && <span className="text-xs text-stone-600">resets on {selectedEdge.resetsOn}</span>}
          <button onClick={() => useCharacterStore.getState().setEdgeUsed(c.id, !c.disciplineEdge.used)} className="ml-auto text-xs text-stone-500 hover:text-stone-300">Toggle</button>
        </div>
        <div className="text-xs font-semibold text-stone-200 mb-0.5">{c.disciplineEdge.name || <span className="text-stone-500 italic">No edge selected</span>}</div>
        <div className="text-xs text-stone-500">{c.disciplineEdge.description}</div>
      </div>

      {/* XP */}
      <div className="bg-stone-800 rounded-lg p-3 border border-stone-700">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-stone-200 font-heading tracking-wide">XP</span>
          <span className="text-gold font-bold font-mono tabular-nums">{c.xp} / 5</span>
          {c.xp >= 5 && (
            <button onClick={() => setShowLevelUp(true)} className="ml-auto px-2 py-0.5 rounded bg-gold text-stone-900 text-xs font-bold hover:bg-yellow-400 animate-pulse">⬆ Level Up!</button>
          )}
        </div>
        <div className="flex gap-2">
          <input type="number" value={xpAmt} onChange={e => setXpAmt(e.target.value)} placeholder="Amount" min="1" className="w-20 bg-stone-900 border border-stone-600 rounded px-2 py-1 text-stone-200 text-xs outline-none focus:border-gold/50" />
          <button onClick={() => { const n = parseInt(xpAmt); if (n > 0) { awardXp(c.id, n, 'gm-award'); setXpAmt('') } }} className="px-2 py-1 rounded bg-stone-700 text-stone-300 hover:bg-stone-600 text-xs">Award XP</button>
        </div>
      </div>

      {/* Location */}
      <div>
        <div className="text-xs text-stone-500 mb-1">Current Location</div>
        <select value={c.locationId ?? ''} onChange={e => setLocation(c.id, e.target.value || null)} className="w-full bg-stone-800 border border-stone-600 rounded px-2 py-1.5 text-stone-200 text-sm outline-none">
          <option value="">— Nowhere —</option>
          {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      {/* Rations & Rests */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-stone-800 rounded-lg p-3 border border-stone-700">
          <div className="text-xs text-stone-500 mb-1">Rations</div>
          <div className="flex items-center gap-2">
            <button onClick={() => updateCharacter(c.id, { rations: Math.max(0, c.rations - 1) })} className="w-6 h-6 rounded bg-stone-700 text-stone-300 hover:bg-stone-600 text-sm">-</button>
            <span className="text-stone-100 font-bold text-sm w-6 text-center font-mono tabular-nums">{c.rations}</span>
            <button onClick={() => updateCharacter(c.id, { rations: c.rations + 1 })} className="w-6 h-6 rounded bg-stone-700 text-stone-300 hover:bg-stone-600 text-sm">+</button>
          </div>
        </div>
        <div className="bg-stone-800 rounded-lg p-3 border border-stone-700">
          <div className="text-xs text-stone-500 mb-1">Missed Rests</div>
          <div className="flex items-center gap-2">
            <span className={`font-bold text-sm font-mono tabular-nums ${c.missedRests > 0 ? 'text-orange-400' : 'text-stone-300'}`}>{c.missedRests}</span>
            {c.missedRests > 0 && <span className="text-xs text-orange-400 font-mono">(-{c.missedRests}d4)</span>}
            <div className="ml-auto flex gap-1">
              <button onClick={() => missRest(c.id)} className="text-xs px-1.5 py-0.5 rounded bg-stone-700 hover:bg-stone-600 text-stone-400">+1</button>
              <button onClick={() => resetMissedRests(c.id)} className="text-xs px-1.5 py-0.5 rounded bg-stone-700 hover:bg-emerald/30 text-stone-400">Reset</button>
            </div>
          </div>
        </div>
      </div>

      {/* Skills — each has a Roll button */}
      <Section title="Skills" onAdd={() => addSkill(c.id, { name: '', bonus: 1, description: '' })}>
        {c.skills.length === 0
          ? <div className="text-xs text-stone-500 italic">No skills yet</div>
          : c.skills.map(sk => (
            <SkillRow key={sk.id} sk={sk} char={c}
              onUpdate={p => updateSkill(c.id, sk.id, p)}
              onDelete={() => deleteSkill(c.id, sk.id)}
            />
          ))
        }
      </Section>

      {/* Traits — each has a +1 roll button */}
      <Section title="Traits" onAdd={() => addTrait(c.id, { name: '', description: '' })}>
        {c.traits.length === 0
          ? <div className="text-xs text-stone-500 italic">No traits yet</div>
          : c.traits.map(tr => (
            <TraitRow key={tr.id} tr={tr} char={c}
              onUpdate={p => updateTrait(c.id, tr.id, p)}
              onDelete={() => deleteTrait(c.id, tr.id)}
            />
          ))
        }
      </Section>

      {/* Class features */}
      <div>
        <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 font-heading">Class Features</div>
        <ClassFeatures character={c} />
      </div>

      {/* Level-up modal */}
      {showLevelUp && <LevelUpModal character={c} onClose={() => setShowLevelUp(false)} />}
    </div>
  )
}

function StatField({ label, value, onSave }: { label: string; value: number; onSave: (v: number) => void }) {
  return (
    <div>
      <div className="text-xs text-stone-500 mb-1">{label}</div>
      <input type="number" value={value} onChange={e => onSave(parseInt(e.target.value) || 0)}
        className="w-full bg-stone-800 border border-stone-600 rounded px-2 py-1.5 text-stone-100 text-sm outline-none focus:border-gold/50" />
    </div>
  )
}

function Section({ title, onAdd, children }: { title: string; onAdd: () => void; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider font-heading">{title}</div>
        <button onClick={onAdd} className="p-1 rounded text-stone-500 hover:text-gold hover:bg-stone-700"><Plus size={13} /></button>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}
