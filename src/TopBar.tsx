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
    <div className="shrink-0 h-12 bg-stone-800 border-b border-stone-600 flex items-stretch px-3 gap-0">

      {/* Campaign name — Press Start 2P gives it identity */}
      <div className="flex items-center pr-3 shrink-0 max-w-[200px]">
        <span className="font-display text-gold truncate" style={{ fontSize: '9px', letterSpacing: '0.02em' }}>
          {activeCampaign?.name}
        </span>
      </div>

      {/* Vertical rule */}
      <div className="self-center w-px h-5 bg-stone-600 mr-1 shrink-0" />

      {/* Tab nav — underline treatment, not pill/background */}
      <nav className="flex flex-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            className={[
              'h-full px-3.5 text-sm whitespace-nowrap transition-colors border-b-2 tracking-wide',
              activeTab === t.id
                ? 'border-gold text-stone-100 font-heading'
                : 'border-transparent text-stone-400 hover:text-stone-200 hover:border-stone-500 font-heading',
            ].join(' ')}
            style={{ fontSize: '12px', letterSpacing: '0.06em' }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Right actions */}
      <div className="self-center flex items-center gap-1 shrink-0 pl-2">

        {/* Time advancement — subtle, text-only style */}
        <button
          onClick={() => setConfirm('scene')}
          className="px-2.5 py-1 text-xs text-stone-400 hover:text-stone-200 border border-transparent hover:border-stone-600 rounded transition-all"
          title="End Scene — decrements all scene-duration effects/enchantments"
        >
          End Scene
        </button>
        <button
          onClick={() => setConfirm('day')}
          className="px-2.5 py-1 text-xs text-stone-400 hover:text-stone-200 border border-transparent hover:border-stone-600 rounded transition-all"
          title="End Day — decrements all day-duration effects/enchantments"
        >
          End Day
        </button>

        <div className="w-px h-5 bg-stone-600 mx-1 shrink-0" />

        {/* Action buttons — slightly more contrast than plain stone, each with a distinct accent when active */}
        <button
          onClick={onTogglePlayerView}
          title="Toggle Player View"
          className={[
            'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border transition-all',
            playerViewActive
              ? 'bg-teal-600/20 border-teal-500/50 text-teal-300'
              : 'bg-transparent border-stone-600 text-stone-400 hover:border-stone-500 hover:text-stone-200',
          ].join(' ')}
        >
          <Eye size={12} /> Players
        </button>

        <button
          onClick={onToggleCombat}
          className={[
            'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border transition-all',
            combatActive
              ? 'bg-redstone/20 border-redstone/60 text-red-300'
              : 'bg-transparent border-stone-600 text-stone-400 hover:border-stone-500 hover:text-stone-200',
          ].join(' ')}
        >
          <Sword size={12} /> Combat
        </button>

        <button
          onClick={onToggleDice}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border border-stone-600 text-stone-400 hover:border-stone-500 hover:text-stone-200 bg-transparent transition-all"
        >
          <Dice6 size={12} /> Dice
        </button>

        <div className="w-px h-5 bg-stone-600 mx-1 shrink-0" />

        <button
          onClick={() => setConfirm('exit')}
          className="p-1.5 rounded text-stone-500 hover:text-stone-200 hover:bg-stone-700 transition-colors"
          title="Exit to campaign list"
        >
          <LogOut size={14} />
        </button>
      </div>

      {/* Confirm dialogs */}
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
