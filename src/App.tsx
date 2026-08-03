import { useEffect, useState } from 'react'
import { useCampaignStore } from './features/campaigns/store'
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

const PLAYER_ROLE_KEY = 'soulscraft_player_role'

function savePlayerRole(characterId: string | null) {
  if (characterId !== null) {
    sessionStorage.setItem(PLAYER_ROLE_KEY, characterId)
  } else {
    sessionStorage.removeItem(PLAYER_ROLE_KEY)
  }
}

function loadPlayerRole(): string | null {
  const val = sessionStorage.getItem(PLAYER_ROLE_KEY)
  // Item present (even empty string) means player mode
  return val !== null ? val : null
}

export default function App() {
  const { activeId, activeCampaign, init, flushCurrent, switchCampaign } = useCampaignStore()
  // null = GM, non-empty string = player's characterId, '' = player but no character selected
  const [playerCharacterId, setPlayerCharacterId] = useState<string | null>(loadPlayerRole)
  // Phones are always players — never the GM interface.
  const isPhone = useIsPhone()

  // Bind this device to a character (used by the mobile "create character" flow).
  const adoptCharacter = (characterId: string) => {
    setPlayerCharacterId(characterId)
    savePlayerRole(characterId)
  }

  useEffect(() => {
    init()
  }, [init])

  // Hydrate all feature stores when campaign loads
  useEffect(() => {
    if (!activeCampaign) return
    const d = activeCampaign
    // Migration guard: add playerView default for campaigns created before this feature
    const playerView = d.playerView
      ? { ...d.playerView, sessionNote: d.playerView.sessionNote ?? '' }   // fill missing sessionNote on old saves
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
  }, [activeId]) // re-hydrate on campaign switch

  const isPlayerMode = playerCharacterId !== null || isPhone

  // Save before tab close — skip on player tab (player never writes, and flushing stale data would overwrite the GM's changes)
  useEffect(() => {
    if (isPlayerMode) return
    const onUnload = () => flushCurrent()
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [flushCurrent, isPlayerMode])

  // Sync player tab: re-hydrate when the GM writes to localStorage from another tab
  useEffect(() => {
    if (!activeId) return
    const campaignKey = `soulscraft_campaign_${activeId}`
    const hydrate = (raw: string) => {
      try {
        const d = JSON.parse(raw)
        const playerView = d.playerView
          ? { sessionNote: '', ...d.playerView }
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
        // Keep campaign store in sync so flushCurrent (GM only) never saves stale data
        useCampaignStore.getState().updateCampaignData(d)
      } catch { /* malformed data — ignore */ }
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key !== campaignKey || !e.newValue) return
      hydrate(e.newValue)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [activeId])

  if (!activeId || !activeCampaign) {
    return (
      <CampaignSwitcher
        playerOnly={isPhone}
        onPlay={(campaignId, characterId) => {
          setPlayerCharacterId(characterId)
          savePlayerRole(characterId)
          switchCampaign(campaignId)
        }}
      />
    )
  }

  // Phones are forced into player mode ('' = player without a character yet).
  const effectivePlayerId = isPhone ? (playerCharacterId ?? '') : playerCharacterId

  return <AppShell playerCharacterId={effectivePlayerId} onAdoptCharacter={adoptCharacter} />
}
