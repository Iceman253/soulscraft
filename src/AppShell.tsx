import { useState, useEffect } from 'react'
import { TopBar } from './TopBar'
import { SessionLog } from './features/log/SessionLog'
import { PinnedNotes } from './features/notes/PinnedNotes'
import { WorldMap } from './features/map/WorldMap'
import { CharacterPanel } from './features/characters/CharacterPanel'
import { QuestPanel } from './features/quests/QuestPanel'
import { BestiaryPanel } from './features/bestiary/BestiaryPanel'
import { RestPanel } from './features/rest/RestPanel'
import { ItemPanel } from './features/items/ItemPanel'
import { EconomyPanel } from './features/economy/EconomyPanel'
import { ReferencePanel } from './features/reference/ReferencePanel'
import { CombatTracker } from './features/combat/CombatTracker'
import { DiceRoller } from './features/dice/DiceRoller'
import { PlayerView } from './features/player-view/PlayerView'
import { useCombatStore } from './features/combat/store'

type Tab = 'map' | 'characters' | 'quests' | 'bestiary' | 'rest' | 'items' | 'economy' | 'reference'

interface Props {
  /** null = GM mode; string (possibly empty) = player mode with optional characterId */
  playerCharacterId: string | null
  /** Bind this device to a character (mobile "create/adopt character" flow). */
  onAdoptCharacter?: (characterId: string) => void
}

export function AppShell({ playerCharacterId, onAdoptCharacter }: Props) {
  const isPlayerMode = playerCharacterId !== null
  const [tab, setTab] = useState<Tab>('map')
  const [showCombat, setShowCombat] = useState(false)
  const [showDice, setShowDice] = useState(false)

  // GM: if a battle is (or becomes) active — including on rejoin, once the synced
  // session hydrates — open the Combat Tracker so they can continue or end it.
  // Fires only on the false→true transition, so a manual close stays closed.
  const battleActive = useCombatStore(s => s.session !== null && !s.session.ended)
  useEffect(() => {
    if (battleActive && !isPlayerMode) setShowCombat(true)
  }, [battleActive, isPlayerMode])
  const [showPlayerView, setShowPlayerView] = useState(isPlayerMode)

  return (
    <div className="h-screen flex flex-col bg-stone-900 overflow-hidden">
      <TopBar
        activeTab={tab}
        onTabChange={setTab}
        onToggleCombat={() => setShowCombat(v => !v)}
        onToggleDice={() => setShowDice(v => !v)}
        onTogglePlayerView={() => setShowPlayerView(v => !v)}
        combatActive={showCombat}
        playerViewActive={showPlayerView}
      />

      <div className="flex flex-1 min-h-0">
        {/* Main content */}
        <div className="flex-1 min-w-0 overflow-hidden">
          {tab === 'map'        && <WorldMap />}
          {tab === 'characters' && <CharacterPanel />}
          {tab === 'quests'     && <QuestPanel />}
          {tab === 'bestiary'   && <BestiaryPanel />}
          {tab === 'rest'       && <RestPanel />}
          {tab === 'items'      && <ItemPanel />}
          {tab === 'economy'    && <EconomyPanel />}
          {tab === 'reference'  && <ReferencePanel />}
        </div>

        {/* Right rail */}
        <div className="w-72 shrink-0 flex flex-col border-l border-stone-700 bg-stone-900">
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <SessionLog />
          </div>
          <div className="h-48 border-t border-stone-700 overflow-hidden flex flex-col">
            <PinnedNotes />
          </div>
        </div>
      </div>

      {/* Player View overlay — sits below combat (z-40) and dice (z-30) */}
      {showPlayerView && (
        <div className="fixed inset-0 z-20 bg-stone-950">
          <PlayerView
            onClose={() => setShowPlayerView(false)}
            isPlayerMode={isPlayerMode}
            focusedCharacterId={playerCharacterId || undefined}
            onAdoptCharacter={onAdoptCharacter}
          />
        </div>
      )}

      {/* Combat overlay */}
      {showCombat && (
        <div className="fixed inset-0 z-40 bg-stone-950">
          <CombatTracker onClose={() => setShowCombat(false)} />
        </div>
      )}

      {/* Dice roller floating */}
      {showDice && (
        <div className="fixed bottom-4 right-80 z-30">
          <DiceRoller onClose={() => setShowDice(false)} />
        </div>
      )}
    </div>
  )
}
