import { LogOut, Sword, Dice6, Eye } from 'lucide-react'
import { useCampaignStore } from './features/campaigns/store'
import { useCharacterStore } from './features/characters/store'
import { useState } from 'react'
import { ConfirmDialog } from './ui/ConfirmDialog'

type Tab = 'map' | 'characters' | 'quests' | 'bestiary' | 'rest' | 'items' | 'reference'

const TABS: { id: Tab; label: string }[] = [
  { id: 'map',        label: 'Map' },
  { id: 'characters', label: 'Characters' },
  { id: 'quests',     label: 'Quests' },
  { id: 'bestiary',   label: 'Bestiary' },
  { id: 'rest',       label: 'Rest' },
  { id: 'items',      label: 'Items' },
  { id: 'reference',  label: 'Reference' },
]

interface TopBarProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  onToggleCombat: () => void
  onToggleDice: () => void
  onTogglePlayerView: () => void
  combatActive: boolean
  playerViewActive: boolean
}

export function TopBar({ activeTab, onTabChange, onToggleCombat, onToggleDice, onTogglePlayerView, combatActive, playerViewActive }: TopBarProps) {
  const { activeCampaign, exitToSwitcher } = useCampaignStore()
  const { advanceEffectTime, advanceArmorEnchantmentTime, advanceWeaponEnchantmentTime, resetMagicCirclesOnDayEnd } = useCharacterStore()
  const [confirm, setConfirm] = useState<null | 'scene' | 'day' | 'exit'>(null)

  const endScene = () => {
    advanceEffectTime('scenes')
    advanceArmorEnchantmentTime('scenes')
    advanceWeaponEnchantmentTime('scenes')
  }

  const endDay = () => {
    advanceEffectTime('days')
    advanceArmorEnchantmentTime('days')
    advanceWeaponEnchantmentTime('days')
    resetMagicCirclesOnDayEnd()
  }

  return (
    <div className="shrink-0 h-12 bg-stone-800 border-b border-stone-700 flex items-center gap-2 px-3">
      {/* Campaign name */}
      <span className="font-display text-gold text-xs truncate max-w-xs shrink-0">
        {activeCampaign?.name}
      </span>

      <div className="w-px h-6 bg-stone-600 mx-1 shrink-0" />

      {/* Tab nav */}
      <nav className="flex items-center gap-0.5 flex-1 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            className={`px-3 py-1 rounded text-sm whitespace-nowrap transition-colors ${
              activeTab === t.id
                ? 'bg-stone-700 text-gold font-medium'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-700/50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Right actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => setConfirm('scene')}
          className="px-2.5 py-1 rounded text-xs bg-stone-700 text-stone-300 hover:bg-stone-600 hover:text-stone-100"
          title="End Scene — decrements all scene-duration effects/enchantments"
        >
          End Scene
        </button>
        <button
          onClick={() => setConfirm('day')}
          className="px-2.5 py-1 rounded text-xs bg-stone-700 text-stone-300 hover:bg-stone-600 hover:text-stone-100"
          title="End Day — decrements all day-duration effects/enchantments"
        >
          End Day
        </button>

        <div className="w-px h-5 bg-stone-600 mx-0.5" />

        <button
          onClick={onTogglePlayerView}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium ${playerViewActive ? 'bg-teal-600 text-white' : 'bg-stone-700 text-stone-300 hover:bg-stone-600'}`}
          title="Toggle Player View"
        >
          <Eye size={13} /> Players
        </button>
        <button
          onClick={onToggleCombat}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium ${combatActive ? 'bg-redstone text-white' : 'bg-stone-700 text-stone-300 hover:bg-stone-600'}`}
        >
          <Sword size={13} /> Combat
        </button>
        <button
          onClick={onToggleDice}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs bg-stone-700 text-stone-300 hover:bg-stone-600"
        >
          <Dice6 size={13} /> Dice
        </button>

        <div className="w-px h-5 bg-stone-600 mx-0.5" />

        <button
          onClick={() => setConfirm('exit')}
          className="p-1.5 rounded text-stone-400 hover:text-stone-100 hover:bg-stone-700"
          title="Exit to campaign list"
        >
          <LogOut size={15} />
        </button>
      </div>

      {confirm === 'scene' && (
        <ConfirmDialog
          title="End Scene"
          message="This will decrement all scene-duration effects and enchantments across all characters. Anything that hits 0 will expire."
          confirmLabel="End Scene"
          onConfirm={endScene}
          onClose={() => setConfirm(null)}
        />
      )}
      {confirm === 'day' && (
        <ConfirmDialog
          title="End Day"
          message="This will decrement all day-duration effects and enchantments. Remember to deduct rations after confirming."
          confirmLabel="End Day"
          onConfirm={endDay}
          onClose={() => setConfirm(null)}
        />
      )}
      {confirm === 'exit' && (
        <ConfirmDialog
          title="Exit Campaign"
          message="Return to the campaign list? All data is auto-saved."
          confirmLabel="Exit"
          onConfirm={exitToSwitcher}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
