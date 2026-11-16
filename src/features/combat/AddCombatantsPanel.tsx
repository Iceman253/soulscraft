import { useState } from 'react'
import { Plus, Shield } from 'lucide-react'
import { Badge } from '../../ui/Badge'
import { TokenAvatar } from '../../ui/TokenAvatar'
import { useCombatStore, HP_TIER } from './store'
import { useCharacterStore } from '../characters/store'
import { useBestiaryStore } from '../bestiary/store'
import { loadCreatureImage } from '../../lib/platform/imageCache'

/** Side panel: add characters, quick NPCs (rulebook p.103) or bestiary creatures. */
export function AddCombatantsPanel() {
  const { addCharacterCombatant, addCreatureCombatant } = useCombatStore()
  const characters = useCharacterStore(s => s.characters)
  const creatures = useBestiaryStore(s => s.entries)
  const [hpOverride, setHpOverride] = useState<Record<string, string>>({})
  const [defOverride, setDefOverride] = useState<Record<string, string>>({})
  return (
    <div className="w-80 shrink-0 border-l border-stone-700 p-4 overflow-y-auto">
      <div className="text-sm font-medium text-stone-300 mb-3 font-heading tracking-wide">Add Combatants</div>

      {/* Characters */}
      <div className="space-y-1 mb-4">
        {characters.map(c => (
          <button key={c.id} onClick={() => addCharacterCombatant(c)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-sm bg-stone-700 hover:bg-stone-600 text-stone-200 text-xs text-left">
            <TokenAvatar name={c.name} characterId={c.id} size={20} />
            <span className="flex-1 truncate">{c.name}</span>
            <span className="text-stone-500 font-mono">{c.damageDie}</span>
            <Plus size={12} />
          </button>
        ))}
      </div>

      {/* NPC Quick-Add — rulebook p.103 */}
      <div className="mb-4">
        <div className="text-xs text-stone-500 mb-1.5">Quick NPCs</div>
        <div className="grid grid-cols-2 gap-1">
          {([
            { name: 'Common Folk', hp: 4,  die: 'd4',  def: 0 },
            { name: 'Guard',       hp: 10, die: 'd8',  def: 1 },
            { name: 'Noble',       hp: 4,  die: 'd4',  def: 0 },
            { name: 'Soldier',     hp: 12, die: 'd10', def: 2 },
            { name: 'Brigand',     hp: 10, die: 'd8',  def: 1 },
            { name: 'Thief',       hp: 6,  die: 'd6',  def: 0 },
          ] as const).map(npc => (
            <button key={npc.name}
              onClick={() => {
                const fakeBestiaryEntry = { id: npc.name, name: npc.name, hpTier: 'average' as const, size: 'medium' as const, creatureType: ['natural'], isCustom: false }
                addCreatureCombatant(fakeBestiaryEntry, npc.name, npc.hp, npc.def, npc.die)
              }}
              className="flex flex-col items-start px-2 py-1.5 rounded-sm bg-stone-800 border border-stone-700 hover:border-stone-500 text-left text-xs transition-colors">
              <span className="font-medium text-stone-200">{npc.name}</span>
              <span className="text-stone-500 font-mono">{npc.hp}HP · {npc.die}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Creatures */}
      <div className="text-xs text-stone-500 mb-2">Bestiary Creatures</div>
      <div className="space-y-1.5">
        {creatures.map(c => {
          const img = loadCreatureImage(c.id)
          const defaultHp = c.maxHp ?? HP_TIER[c.hpTier]
          const hpVal = hpOverride[c.id] ?? String(defaultHp)
          const defVal = defOverride[c.id] ?? '0'
          const hp = parseInt(hpVal) || defaultHp
          const def = parseInt(defVal) || 0
          return (
            <div key={c.id} className="bg-stone-800 border border-stone-700 rounded-lg p-2">
              <div className="flex items-center gap-1.5 mb-2">
                {img && <img src={img} className="w-5 h-5 rounded-sm object-cover shrink-0" />}
                <span className="flex-1 truncate text-stone-200 text-xs font-medium">{c.name}</span>
                <Badge variant={c.hpTier === 'mighty' ? 'red' : c.hpTier === 'strong' ? 'orange' : 'muted'}>{c.hpTier}</Badge>
              </div>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="flex items-center gap-1 flex-1">
                  <span className="text-xs text-stone-500 w-6">HP</span>
                  <input type="number" min={1} value={hpVal}
                    onChange={e => setHpOverride(prev => ({ ...prev, [c.id]: e.target.value }))}
                    className="flex-1 bg-stone-900 border border-stone-600 rounded-sm px-1.5 py-0.5 text-stone-200 text-xs outline-hidden font-mono tabular-nums" />
                </div>
                <div className="flex items-center gap-1 flex-1">
                  <Shield size={11} className="text-blue-400 shrink-0" />
                  <span className="text-xs text-stone-500">DEF</span>
                  <input type="number" min={0} value={defVal}
                    onChange={e => setDefOverride(prev => ({ ...prev, [c.id]: e.target.value }))}
                    className="flex-1 bg-stone-900 border border-stone-600 rounded-sm px-1.5 py-0.5 text-blue-300 text-xs outline-hidden font-mono tabular-nums" />
                </div>
              </div>
              <button
                onClick={() => {
                  addCreatureCombatant(c, undefined, hp, def)
                  setHpOverride(prev => ({ ...prev, [c.id]: String(defaultHp) }))
                  setDefOverride(prev => ({ ...prev, [c.id]: '0' }))
                }}
                className="w-full flex items-center justify-center gap-1 py-1 rounded-sm bg-stone-700 hover:bg-stone-600 text-stone-300 text-xs">
                <Plus size={10} /> Add to Combat
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
