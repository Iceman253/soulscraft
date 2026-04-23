import { useState } from 'react'
import { ArrowLeft, Camera } from 'lucide-react'
import { useCharacterStore } from './store'
import { TokenAvatar } from '../../ui/TokenAvatar'
import { HpBar } from '../../ui/HpBar'
import { SdDots } from '../../ui/SdDots'
import { computeDef } from '../../lib/armor'
import { savePortrait, fileToDataUrl } from '../../lib/imageCache'
import { TabStats } from './tabs/TabStats'
import { TabGear } from './tabs/TabGear'
import { TabInventory } from './tabs/TabInventory'
import { TabAbilities } from './tabs/TabAbilities'
import { TabEffects } from './tabs/TabEffects'
import { TabNotes } from './tabs/TabNotes'
import type { Character } from '../../types'

type SheetTab = 'stats' | 'gear' | 'inventory' | 'abilities' | 'effects' | 'notes'

const TABS: { id: SheetTab; label: string }[] = [
  { id: 'stats',     label: 'Stats' },
  { id: 'gear',      label: 'Gear' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'abilities', label: 'Abilities' },
  { id: 'effects',   label: 'Effects' },
  { id: 'notes',     label: 'Notes' },
]

interface CharacterSheetProps {
  character: Character
  onBack: () => void
}

export function CharacterSheet({ character: c, onBack }: CharacterSheetProps) {
  const [tab, setTab] = useState<SheetTab>('stats')
  const { adjustHp, adjustSd, updateCharacter } = useCharacterStore()
  const def = computeDef(c.armorLoadout)

  const handlePortraitUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await fileToDataUrl(file, 400)
    savePortrait(c.id, url)
    updateCharacter(c.id, {})
  }

  return (
    <div className="h-full flex flex-col bg-stone-900">
      {/* Header */}
      <div className="shrink-0 bg-stone-800 border-b border-stone-700 px-4 py-3">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-100">
            <ArrowLeft size={14} /> Characters
          </button>
        </div>

        <div className="flex items-start gap-4">
          {/* Portrait */}
          <label className="relative cursor-pointer group shrink-0">
            <TokenAvatar name={c.name} characterId={c.id} size={60} />
            <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Camera size={16} className="text-white" />
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handlePortraitUpload} />
          </label>

          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-stone-100">{c.name}</h2>
              <span className="text-sm text-stone-400">{c.species} {c.class}</span>
              {c.discipline && <span className="text-xs text-stone-500">· {c.discipline}</span>}
              <span className="text-xs text-stone-500">Lv.{c.level}</span>
            </div>

            <div className="flex items-center gap-4 mt-2 flex-wrap">
              {/* HP */}
              <div className="flex items-center gap-2 min-w-32">
                <span className="text-xs text-stone-500 shrink-0">HP</span>
                <HpBar current={c.currentHp} max={c.maxHp} className="flex-1 min-w-24" />
                <div className="flex gap-0.5">
                  <button onClick={() => adjustHp(c.id, -1)} className="w-5 h-5 rounded bg-stone-700 text-stone-300 hover:bg-redstone/70 text-xs">-</button>
                  <button onClick={() => adjustHp(c.id, 1)} className="w-5 h-5 rounded bg-stone-700 text-stone-300 hover:bg-emerald/50 text-xs">+</button>
                </div>
              </div>

              {/* SD */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-500">SD</span>
                <SdDots current={c.currentSd} max={c.maxSd} onToggle={i => {
                  const newVal = i < c.currentSd ? i : i + 1
                  adjustSd(c.id, newVal - c.currentSd)
                }} />
                <div className="flex gap-0.5">
                  <button onClick={() => adjustSd(c.id, -1)} className="w-5 h-5 rounded bg-stone-700 text-stone-300 hover:bg-redstone/70 text-xs">-</button>
                  <button onClick={() => adjustSd(c.id, 1)} className="w-5 h-5 rounded bg-stone-700 text-stone-300 hover:bg-emerald/50 text-xs">+</button>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-xs text-stone-500">DEF</span>
                <span className="text-sm font-bold text-blue-300">{def}</span>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-xs text-stone-500">DMG</span>
                <span className="text-sm font-bold text-orange-300">{c.damageDie}</span>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-xs text-stone-500">XP</span>
                <span className="text-sm font-bold text-gold">{c.xp}/5</span>
              </div>
            </div>

            {c.missedRests > 0 && (
              <div className="text-xs text-orange-400 mt-1">⚠️ Missed {c.missedRests} rest{c.missedRests !== 1 ? 's' : ''} — -{c.missedRests}d4 to all rolls</div>
            )}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="shrink-0 flex border-b border-stone-700 bg-stone-800 px-2">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm transition-colors border-b-2 ${
              tab === t.id
                ? 'border-gold text-gold font-medium'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {tab === 'stats'     && <TabStats character={c} />}
        {tab === 'gear'      && <TabGear character={c} />}
        {tab === 'inventory' && <TabInventory character={c} />}
        {tab === 'abilities' && <TabAbilities character={c} />}
        {tab === 'effects'   && <TabEffects character={c} />}
        {tab === 'notes'     && <TabNotes character={c} />}
      </div>
    </div>
  )
}
