import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useCharacterStore } from '../store'
import { useWorldStore } from '../../map/store'
import { CLASSES, CLASS_DISCIPLINES, DISCIPLINE_EDGES, SPECIES, SPECIES_DATA } from '../../../lib/constants'
import { Badge } from '../../../ui/Badge'
import { ClassFeatures } from '../classFeatures/ClassFeatures'
import type { Character } from '../../../types'

interface TabStatsProps { character: Character }

export function TabStats({ character: c }: TabStatsProps) {
  const { updateCharacter, changeClass, changeDiscipline, changeSpeciesVariant, addSkill, updateSkill, deleteSkill, addTrait, updateTrait, deleteTrait, awardXp, levelUp, setLocation, missRest, resetMissedRests } = useCharacterStore()
  const areas = useWorldStore(s => s.areas)
  const [xpAmt, setXpAmt] = useState('')

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
          <span className="text-sm font-medium text-stone-200">Discipline Edge</span>
          <Badge variant={c.disciplineEdge.used ? 'muted' : 'gold'}>{c.disciplineEdge.used ? 'Used' : 'Ready'}</Badge>
          {selectedEdge && <span className="text-xs text-stone-600">resets on {selectedEdge.resetsOn}</span>}
          <button onClick={() => useCharacterStore.getState().setEdgeUsed(c.id, !c.disciplineEdge.used)} className="ml-auto text-xs text-stone-500 hover:text-stone-300">Toggle</button>
        </div>
        <div className="text-xs font-semibold text-stone-200 mb-0.5">{c.disciplineEdge.name || <span className="text-stone-600 italic">No edge selected</span>}</div>
        <div className="text-xs text-stone-500">{c.disciplineEdge.description}</div>
      </div>

      {/* XP */}
      <div className="bg-stone-800 rounded-lg p-3 border border-stone-700">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-stone-200">XP</span>
          <span className="text-gold font-bold">{c.xp} / 5</span>
          {c.xp >= 5 && (
            <button onClick={() => levelUp(c.id)} className="ml-auto px-2 py-0.5 rounded bg-gold text-stone-900 text-xs font-bold hover:bg-yellow-400">Level Up!</button>
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
            <span className="text-stone-100 font-bold text-sm w-6 text-center">{c.rations}</span>
            <button onClick={() => updateCharacter(c.id, { rations: c.rations + 1 })} className="w-6 h-6 rounded bg-stone-700 text-stone-300 hover:bg-stone-600 text-sm">+</button>
          </div>
        </div>
        <div className="bg-stone-800 rounded-lg p-3 border border-stone-700">
          <div className="text-xs text-stone-500 mb-1">Missed Rests</div>
          <div className="flex items-center gap-2">
            <span className={`font-bold text-sm ${c.missedRests > 0 ? 'text-orange-400' : 'text-stone-300'}`}>{c.missedRests}</span>
            {c.missedRests > 0 && <span className="text-xs text-orange-400">(-{c.missedRests}d4)</span>}
            <div className="ml-auto flex gap-1">
              <button onClick={() => missRest(c.id)} className="text-xs px-1.5 py-0.5 rounded bg-stone-700 hover:bg-stone-600 text-stone-400">+1</button>
              <button onClick={() => resetMissedRests(c.id)} className="text-xs px-1.5 py-0.5 rounded bg-stone-700 hover:bg-emerald/30 text-stone-400">Reset</button>
            </div>
          </div>
        </div>
      </div>

      {/* Skills */}
      <Section title="Skills" onAdd={() => addSkill(c.id, { name: '', bonus: 1, description: '' })}>
        {c.skills.map(sk => (
          <div key={sk.id} className="flex items-center gap-2">
            <input value={sk.name} onChange={e => updateSkill(c.id, sk.id, { name: e.target.value })} placeholder="Skill name" className="flex-1 bg-stone-900 border border-stone-600 rounded px-2 py-1 text-stone-200 text-xs outline-none focus:border-gold/50" />
            <select value={sk.bonus} onChange={e => updateSkill(c.id, sk.id, { bonus: parseInt(e.target.value) as 1|2|3 })} className="w-16 bg-stone-900 border border-stone-600 rounded px-1 py-1 text-stone-200 text-xs outline-none">
              <option value={1}>+1</option>
              <option value={2}>+2</option>
              <option value={3}>+3</option>
            </select>
            <button onClick={() => deleteSkill(c.id, sk.id)} className="p-1 text-stone-500 hover:text-red-400"><Trash2 size={12} /></button>
          </div>
        ))}
      </Section>

      {/* Traits */}
      <Section title="Traits" onAdd={() => addTrait(c.id, { name: '', description: '' })}>
        {c.traits.map(tr => (
          <div key={tr.id} className="space-y-1">
            <div className="flex items-center gap-2">
              <input value={tr.name} onChange={e => updateTrait(c.id, tr.id, { name: e.target.value })} placeholder="Trait name" className="flex-1 bg-stone-900 border border-stone-600 rounded px-2 py-1 text-stone-200 text-xs outline-none focus:border-gold/50 font-medium" />
              <button onClick={() => deleteTrait(c.id, tr.id)} className="p-1 text-stone-500 hover:text-red-400"><Trash2 size={12} /></button>
            </div>
            <textarea value={tr.description} onChange={e => updateTrait(c.id, tr.id, { description: e.target.value })} placeholder="Description..." rows={2} className="w-full bg-stone-900 border border-stone-600 rounded px-2 py-1 text-stone-400 text-xs outline-none resize-none" />
          </div>
        ))}
      </Section>

      {/* Class features */}
      <div>
        <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Class Features</div>
        <ClassFeatures character={c} />
      </div>
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
        <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">{title}</div>
        <button onClick={onAdd} className="p-1 rounded text-stone-500 hover:text-gold hover:bg-stone-700"><Plus size={13} /></button>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}
