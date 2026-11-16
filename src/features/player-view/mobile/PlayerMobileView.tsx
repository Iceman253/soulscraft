import { useState, useEffect, useRef } from 'react'
import { User, Map as MapIcon, Swords, ChevronRight, LogOut, Hammer, ScrollText } from 'lucide-react'
import { useCharacterStore } from '../../characters/store'
import { useWorldStore } from '../../map/store'
import { useCombatStore } from '../../combat/store'
import { useCampaignStore } from '../../campaigns/store'
import { BuildHub } from '../../building/BuildHub'
import { LevelUpModal } from '../../characters/LevelUpModal'
import { playerNeedsCharacter } from '../../../lib/platform/playerRole'
import { useToast } from '../../../ui/useToast'
import { PlayerRequestModal } from '../PlayerRequestModal'
import { PlayerMarketModal } from '../PlayerMarketModal'
import { useEconomyStore } from '../../economy/store'
import { useRequestStore } from '../../requests/store'
import { countersFor, marketAt } from '../../../lib/economy/haggle'
import { PlayerMap } from '../PlayerMap'
import { PlayerCombatView } from '../PlayerCombatView'
import { PlayerSessionLog } from '../PlayerSessionLog'
import { usePotionUse } from '../hooks/usePotionUse'
import { useLevelUpFlow } from '../hooks/useLevelUpFlow'
import { PotionDurationPicker } from '../sheet/PotionDurationPicker'
import { NavButton } from './MobileChrome'
import { MobileSheet } from './MobileSheet'
import { NewCharacterPane } from './NewCharacterPane'

interface Props {
  onClose: () => void
  isPlayerMode?: boolean
  focusedCharacterId?: string
  onAdoptCharacter?: (characterId: string) => void
}

type Pane = 'character' | 'world' | 'build' | 'log'

/** The phone layout: one pane at a time (sheet, map or combat, builds, log)
 *  with bottom navigation. */
export function PlayerMobileView({ onClose, isPlayerMode, focusedCharacterId, onAdoptCharacter }: Props) {
  const characters = useCharacterStore(s => s.characters)
  const sessionNote = useWorldStore(s => s.sessionNote)
  const combatActive = useCombatStore(s => s.session !== null && !s.session.ended)
  const combatSession = useCombatStore(s => s.session)
  const exitToSwitcher = useCampaignStore(s => s.exitToSwitcher)
  const markets = useEconomyStore(s => s.economy.markets)
  const requests = useRequestStore(s => s.requests)

  // Am I actually a combatant in this fight? (vs. a battle happening to others.)
  const myInCombat = combatActive && !!focusedCharacterId &&
    !!combatSession?.combatants.some(c => c.kind === 'character' && c.sourceId === focusedCharacterId && c.currentHp > 0)

  const [pane, setPane] = useState<Pane>('character')
  // Auto-open combat only when called into the fight; others can tap Combat to watch.
  useEffect(() => { if (myInCombat) setPane('world') }, [myInCombat])
  // When the battle ends, go back to the sheet.
  const prevCombatActive = useRef(combatActive)
  useEffect(() => {
    if (prevCombatActive.current && !combatActive) setPane('character')
    prevCombatActive.current = combatActive
  }, [combatActive])

  const [activeTab, setActiveTab] = useState<string>(
    focusedCharacterId && characters.some(c => c.id === focusedCharacterId) ? focusedCharacterId : (characters[0]?.id ?? ''),
  )
  const [showRequest, setShowRequest] = useState(false)
  const [toast, notify] = useToast(3000)
  const potions = usePotionUse(notify)

  // Phone players are bound to one character. With none, or a dead one, they
  // get the create/adopt flow instead of a sheet.
  const boundChar = focusedCharacterId ? characters.find(c => c.id === focusedCharacterId) : undefined
  const needsCharacter = !!isPlayerMode && playerNeedsCharacter(boundChar)
  const activeChar = boundChar ?? characters.find(c => c.id === activeTab) ?? characters[0]
  const isOwnChar = !focusedCharacterId || focusedCharacterId === activeChar?.id
  const levelUp = useLevelUpFlow(activeChar)
  const [showShop, setShowShop] = useState(false)
  const localMarket = isOwnChar ? marketAt(markets, activeChar?.locationId) : null
  const counterOffers = activeChar ? countersFor(requests, activeChar.id).length : 0

  return (
    <div className="h-full flex flex-col bg-stone-950 text-stone-100 pt-[env(safe-area-inset-top)]">
      {sessionNote && (
        <div className="shrink-0 bg-teal-950/60 border-b border-teal-800/40 px-4 py-2.5 text-base text-teal-200 text-center">📜 {sessionNote}</div>
      )}
      {toast && (
        <div className="shrink-0 mx-4 mt-3 px-4 py-2.5 rounded-xl bg-emerald/15 border border-emerald/40 text-base text-emerald text-center">{toast}</div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto">
        {pane === 'world' ? (
          <div className="h-full">
            {combatActive ? <PlayerCombatView focusedCharacterId={focusedCharacterId} /> : <PlayerMap focusedCharacterId={focusedCharacterId} />}
          </div>
        ) : pane === 'build' && activeChar && !needsCharacter ? (
          <div className="px-4 py-4"><BuildHub character={activeChar} /></div>
        ) : pane === 'log' ? (
          <div className="pb-6">
            <div className="px-4 pt-4 pb-1 flex items-center gap-1.5 text-sm font-semibold text-stone-500 uppercase tracking-wider font-heading">
              <ScrollText size={14} /> Session Log
            </div>
            <PlayerSessionLog size="lg" />
          </div>
        ) : needsCharacter ? (
          <NewCharacterPane
            boundChar={boundChar}
            livingOthers={characters.filter(c => !c.isDead && c.id !== boundChar?.id)}
            onAdopt={onAdoptCharacter}
            onChosen={setActiveTab}
          />
        ) : activeChar ? (
          <MobileSheet
            character={activeChar}
            isOwn={isOwnChar}
            viewingOther={!isOwnChar && !!focusedCharacterId}
            levelUp={levelUp}
            notify={notify}
            onAskGm={() => setShowRequest(true)}
            shop={localMarket ? { name: localMarket.name, counterOffers, onOpen: () => setShowShop(true) } : undefined}
            isPotion={potions.isPotion}
            onDrink={item => potions.use(activeChar.id, item)}
          />
        ) : null}
      </div>

      {potions.pending && <PotionDurationPicker onPick={potions.applyPending} onCancel={potions.cancel} size="lg" />}

      <div className="shrink-0 flex border-t border-stone-700 bg-stone-900 pb-[env(safe-area-inset-bottom)]">
        <NavButton active={pane === 'character'} onClick={() => setPane('character')} icon={<User size={22} />} label="Character" />
        <NavButton
          active={pane === 'world'}
          onClick={() => setPane('world')}
          icon={combatActive ? <Swords size={22} /> : <MapIcon size={22} />}
          label={combatActive ? 'Combat' : 'Map'}
          alert={combatActive}
        />
        <NavButton active={pane === 'build'} onClick={() => setPane('build')} icon={<Hammer size={22} />} label="Build" />
        <NavButton active={pane === 'log'} onClick={() => setPane('log')} icon={<ScrollText size={22} />} label="Log" />
        <NavButton active={false} onClick={exitToSwitcher} icon={<LogOut size={22} />} label="Campaigns" />
        {!isPlayerMode && <NavButton active={false} onClick={onClose} icon={<ChevronRight size={22} />} label="GM View" />}
      </div>

      {showRequest && activeChar && <PlayerRequestModal character={activeChar} onClose={() => setShowRequest(false)} />}
      {showShop && activeChar && localMarket && <PlayerMarketModal character={activeChar} market={localMarket} onClose={() => setShowShop(false)} />}
      {levelUp.open && activeChar && isOwnChar && (
        <LevelUpModal character={activeChar} onClose={levelUp.close} initialState={levelUp.initial} />
      )}
    </div>
  )
}
