import { useEffect, useState } from 'react'
import { useCampaignStore, runWithoutSave } from './features/campaigns/store'
import { useCharacterStore } from './features/characters/store'
import { useWorldStore } from './features/map/store'
import { useQuestStore } from './features/quests/store'
import { useBestiaryStore } from './features/bestiary/store'
import { useRestStore } from './features/rest/store'
import { useItemStore } from './features/items/store'
import { useLogStore } from './features/log/store'
import { useNotesStore } from './features/notes/store'
import { useEconomyStore } from './features/economy/store'
import { CampaignSwitcher } from './features/campaigns/CampaignSwitcher'
import { AppShell } from './AppShell'
import { useIsPhone } from './lib/useIsPhone'
import { connectSync, disconnectSync } from './lib/sync'
import { hydrateImages } from './lib/imageCache'
import type { CampaignData } from './types'

const PLAYER_ROLE_KEY = 'soulscraft_player_role'

function savePlayerRole(characterId: string | null) {
  if (characterId !== null) sessionStorage.setItem(PLAYER_ROLE_KEY, characterId)
  else sessionStorage.removeItem(PLAYER_ROLE_KEY)
}
function loadPlayerRole(): string | null {
  const val = sessionStorage.getItem(PLAYER_ROLE_KEY)
  return val !== null ? val : null
}

/** Push a full campaign blob into every feature store. Wrapped so store-internal
 *  saves during hydration don't echo back to the server (prevents sync loops). */
function hydrateAll(d: CampaignData) {
  runWithoutSave(() => {
    const playerView = d.playerView
      ? { ...d.playerView, sessionNote: d.playerView.sessionNote ?? '' }
      : { visibleAreaIds: [], travelingMarkers: [], sessionNote: '' }
    useWorldStore.getState().hydrate(d.areas, d.edges, playerView, d.towerTrials)
    useCharacterStore.getState().hydrate(d.characters, d.xpLog)
    useQuestStore.getState().hydrate(d.quests)
    useBestiaryStore.getState().hydrate(d.bestiary)
    useRestStore.getState().hydrate(d.restEvents)
    useItemStore.getState().hydrate(d.items)
    useLogStore.getState().hydrate(d.logEntries)
    useNotesStore.getState().hydrate(d.pinnedNotes)
    useEconomyStore.getState().hydrate(d.economy)
  })
}

export default function App() {
  const { activeId, activeCampaign, loading, init, flushCurrent, commitStaged, applyRemote, exitToSwitcher } = useCampaignStore()
  const [playerCharacterId, setPlayerCharacterId] = useState<string | null>(loadPlayerRole)
  const isPhone = useIsPhone()

  const adoptCharacter = (characterId: string) => {
    setPlayerCharacterId(characterId)
    savePlayerRole(characterId)
  }

  // Boot: load the campaign list (and re-enter a saved session if there is one).
  useEffect(() => { void init() }, [init])

  // Hydrate feature stores when a campaign becomes active (on enter).
  useEffect(() => {
    if (activeCampaign) hydrateAll(activeCampaign)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId])

  // Live sync: subscribe to this campaign; adopt changes from other devices.
  useEffect(() => {
    if (!activeId) return
    connectSync(activeId, async (msg) => {
      if (msg.type === 'update') {
        if (!msg.data) { exitToSwitcher(); return }   // campaign was deleted elsewhere
        applyRemote(msg.data)
        hydrateAll(msg.data)
      } else if (msg.type === 'image') {
        await hydrateImages(activeId)
        const d = useCampaignStore.getState().activeCampaign
        if (d) hydrateAll(d)   // nudge a re-render so the new image shows
      }
    })
    return () => disconnectSync()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId])

  // Flush any pending save on tab close.
  useEffect(() => {
    const onUnload = () => flushCurrent()
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [flushCurrent])

  if (loading && !activeCampaign) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center text-stone-500 text-sm">
        Loading campaigns…
      </div>
    )
  }

  if (!activeId || !activeCampaign) {
    return (
      <CampaignSwitcher
        playerOnly={isPhone}
        onPlay={async (_campaignId, characterId) => {
          await commitStaged()
          setPlayerCharacterId(characterId)
          savePlayerRole(characterId)
        }}
      />
    )
  }

  // Phones are forced into player mode ('' = player without a character yet).
  const effectivePlayerId = isPhone ? (playerCharacterId ?? '') : playerCharacterId

  return <AppShell playerCharacterId={effectivePlayerId} onAdoptCharacter={adoptCharacter} />
}
