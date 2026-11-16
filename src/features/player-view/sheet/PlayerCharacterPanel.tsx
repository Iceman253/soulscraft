import { useState } from 'react'
import { PlayerRequestModal } from '../PlayerRequestModal'
import { PlayerMarketModal } from '../PlayerMarketModal'
import { SharedInventory } from './SharedInventory'
import { canSeeInventory } from '../../../lib/platform/playerRole'
import { LevelUpModal } from '../../characters/LevelUpModal'
import { useStorageReach } from '../../characters/useStorageReach'
import { useCharacterStore } from '../../characters/store'
import { useEconomyStore } from '../../economy/store'
import { useRequestStore } from '../../requests/store'
import { countersFor, marketAt } from '../../../lib/economy/haggle'
import { BuildHub } from '../../building/BuildHub'
import { useToast } from '../../../ui/useToast'
import { usePotionUse } from '../hooks/usePotionUse'
import { useLevelUpFlow } from '../hooks/useLevelUpFlow'
import { CharacterTabs } from './CharacterTabs'
import { DeathPanel, GhostBanner } from './DeathPanel'
import { AvoidDeathCard } from './AvoidDeathCard'
import { SheetHeader, LocationStatus, VitalsSummary } from './SheetHeader'
import { XpCard } from './LevelUpStatus'
import { SkillChips, AbilityList, EffectList } from './SheetLists'
import { OnHandList } from './OnHandList'
import { StoragePanel } from './StoragePanel'
import { Wealth } from './Wealth'
import { NotesEditor } from './NotesEditor'
import { PrivateInventoryNotice } from './InventoryPrivacy'
import { PotionDurationPicker } from './PotionDurationPicker'
import { DivineSmite } from './DivineSmite'

interface Props {
  /** The player's own character; undefined in the GM's view, which sees all. */
  focusedCharacterId?: string
}

const heading = 'text-xs font-medium text-stone-400 mb-2 font-heading tracking-wide'

/** The desktop/iPad player sheet: a tab per character, with the player's own one
 *  editable and other players' ones read-only (inventory only when shared). */
export function PlayerCharacterPanel({ focusedCharacterId }: Props) {
  const { characters, adjustHp, adjustSd } = useCharacterStore()
  const markets = useEconomyStore(s => s.economy.markets)
  const requests = useRequestStore(s => s.requests)

  const [activeTab, setActiveTab] = useState<string>(
    focusedCharacterId && characters.some(c => c.id === focusedCharacterId) ? focusedCharacterId : (characters[0]?.id ?? ''),
  )
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [showMarket, setShowMarket] = useState(false)
  const [toast, notify] = useToast()
  const potions = usePotionUse(notify)

  const activeChar = characters.find(c => c.id === activeTab) ?? characters[0]
  const levelUp = useLevelUpFlow(activeChar)
  const reach = useStorageReach(activeChar ?? undefined)
  const isOwnChar = !focusedCharacterId || focusedCharacterId === activeTab
  const viewingOtherPlayer = !isOwnChar && !!focusedCharacterId

  if (characters.length === 0) {
    return <div className="flex items-center justify-center h-full text-stone-500 text-sm">No characters in this campaign.</div>
  }

  const localMarket = marketAt(markets, activeChar?.locationId)
  const counterOffers = activeChar ? countersFor(requests, activeChar.id).length : 0

  return (
    <div className="h-full flex flex-col bg-stone-900">
      <CharacterTabs
        characters={characters}
        activeId={activeTab}
        onSelect={setActiveTab}
        actions={activeChar && isOwnChar
          ? { marketName: localMarket?.name, onMarket: () => setShowMarket(true), onRequest: () => setShowRequestModal(true), counterOffers }
          : undefined}
      />

      {toast && (
        <div className="shrink-0 mx-3 mt-2 px-3 py-1.5 rounded-lg bg-emerald/10 border border-emerald/30 text-xs text-emerald">{toast}</div>
      )}
      {potions.pending && <PotionDurationPicker onPick={potions.applyPending} onCancel={potions.cancel} />}

      {activeChar?.isDead && <DeathPanel character={activeChar} />}
      {activeChar?.isGhost && !activeChar.isDead && <GhostBanner character={activeChar} />}

      {activeChar && !activeChar.isDead && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isOwnChar && activeChar.currentHp === 0 && (
            <AvoidDeathCard character={activeChar} onSpend={n => { adjustSd(activeChar.id, -n); adjustHp(activeChar.id, n) }} />
          )}

          <SheetHeader character={activeChar} editable={isOwnChar} />
          <LocationStatus character={activeChar} />
          <VitalsSummary character={activeChar} />

          {activeChar.skills.length > 0 && (
            <div><div className={heading}>Skills</div><SkillChips skills={activeChar.skills} /></div>
          )}
          {isOwnChar && <XpCard character={activeChar} flow={levelUp} />}
          {activeChar.abilities.length > 0 && (
            <div><div className={heading}>Abilities</div><AbilityList abilities={activeChar.abilities} /></div>
          )}
          {activeChar.activeEffects.length > 0 && (
            <div><div className={heading}>Active Effects</div><EffectList effects={activeChar.activeEffects} /></div>
          )}

          <div className="border-t border-stone-700" />

          {/* Private section: inventory, wealth, builds, notes. Another player sees a
              read-only copy when the owner shared it, a lock card otherwise. */}
          {viewingOtherPlayer ? (
            canSeeInventory(activeChar, isOwnChar, focusedCharacterId)
              ? <SharedInventory character={activeChar} />
              : <PrivateInventoryNotice character={activeChar} />
          ) : (
            <>
              <OnHandList
                character={activeChar}
                editable={isOwnChar}
                showShareToggle={!!focusedCharacterId}
                reach={reach}
                isPotion={potions.isPotion}
                onDrink={item => potions.use(activeChar.id, item)}
              />
              <StoragePanel character={activeChar} reach={reach} />
              <div><div className={heading}>Currency</div><Wealth character={activeChar} /></div>
              <div className="border-t border-stone-700" />
              <div><div className={heading}>Builds</div><BuildHub character={activeChar} /></div>
              <NotesEditor character={activeChar} editable={isOwnChar} />
            </>
          )}

          {activeChar.name.toLowerCase() === 'infinite' && <DivineSmite notify={notify} />}
        </div>
      )}

      {showRequestModal && activeChar && (
        <PlayerRequestModal character={activeChar} onClose={() => setShowRequestModal(false)} />
      )}
      {showMarket && activeChar && localMarket && (
        <PlayerMarketModal character={activeChar} market={localMarket} onClose={() => setShowMarket(false)} />
      )}
      {/* After a denial, the modal opens pre-filled with the previous proposal. */}
      {levelUp.open && activeChar && isOwnChar && (
        <LevelUpModal character={activeChar} onClose={levelUp.close} initialState={levelUp.initial} />
      )}
    </div>
  )
}
