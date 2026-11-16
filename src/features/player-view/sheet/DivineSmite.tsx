import type { ReactNode } from 'react'
import { Skull } from 'lucide-react'
import { useCharacterStore } from '../../characters/store'
import { useCombatStore } from '../../combat/store'
import { HpBar } from '../../../ui/HpBar'
import { TokenAvatar } from '../../../ui/TokenAvatar'

/** The "Infinite" character's instant-kill panel: any living character, or any
 *  living creature in a running fight. */
export function DivineSmite({ notify }: { notify: (message: string) => void }) {
  const characters = useCharacterStore(s => s.characters)
  const adjustHp = useCharacterStore(s => s.adjustHp)
  const session = useCombatStore(s => s.session)
  const adjustCombatantHp = useCombatStore(s => s.adjustCombatantHp)

  const livingCharacters = characters.filter(c => c.currentHp > 0)
  const livingCreatures = session && !session.ended
    ? session.combatants.filter(c => c.currentHp > 0 && c.kind === 'creature')
    : []
  const smite = (kill: () => void, name: string) => { kill(); notify(`💀 ${name} was instantly slain.`) }

  const row = (key: string, icon: ReactNode, name: string, hp: number, maxHp: number, kill: () => void) => (
    <div key={key} className="flex items-center gap-2">
      {icon}
      <span className="flex-1 text-xs text-stone-300 truncate">{name}</span>
      <HpBar current={hp} max={maxHp} className="w-16" />
      <button onClick={() => smite(kill, name)} title={`Kill ${name}`}
        className="p-1 rounded-sm text-red-400 hover:text-red-200 hover:bg-red-900/40 transition-colors shrink-0">
        <Skull size={12} />
      </button>
    </div>
  )

  return (
    <div className="border border-red-900/60 rounded-lg bg-red-950/20 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-red-950/30 border-b border-red-900/40">
        <Skull size={13} className="text-red-400 shrink-0" />
        <span className="text-xs font-bold text-red-300 tracking-wide font-heading">Divine Smite</span>
        <span className="text-xs text-red-400 ml-auto">instant kill</span>
      </div>
      {livingCharacters.length > 0 && (
        <div className="px-3 py-2 space-y-1">
          <div className="text-xs text-red-300 mb-1.5 font-medium uppercase tracking-wider font-heading">Characters</div>
          {livingCharacters.map(c => row(c.id, <TokenAvatar name={c.name} characterId={c.id} size={18} />, c.name, c.currentHp, c.maxHp,
            () => adjustHp(c.id, -999999)))}
        </div>
      )}
      {livingCreatures.length > 0 && (
        <div className="px-3 py-2 border-t border-red-900/30 space-y-1">
          <div className="text-xs text-red-300 mb-1.5 font-medium uppercase tracking-wider font-heading">Combatants</div>
          {livingCreatures.map(c => row(c.id, <span className="text-xs text-stone-400 shrink-0">👾</span>, c.name, c.currentHp, c.maxHp,
            () => adjustCombatantHp(c.id, -999999)))}
        </div>
      )}
      {livingCharacters.length === 0 && livingCreatures.length === 0 && (
        <div className="px-3 py-3 text-xs text-red-400/70 italic">No targets available.</div>
      )}
    </div>
  )
}
