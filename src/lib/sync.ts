// WebSocket client for live campaign sync. Same-origin — nginx upgrades /ws to
// the Node service, so this is wss:// automatically when the app is on HTTPS.
import { getClientId } from './api'
import type { CampaignData } from '../types'

export type SyncMessage =
  | { type: 'update'; campaignId: string; data: CampaignData | null; updatedAt: number }
  | { type: 'image'; campaignId: string; key: string; deleted?: boolean }

let ws: WebSocket | null = null
let currentCampaignId: string | null = null
let handler: ((msg: SyncMessage) => void) | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null

function wsUrl(): string {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${location.host}/ws`
}

function open() {
  if (!currentCampaignId) return
  try {
    ws = new WebSocket(wsUrl())
  } catch { scheduleReconnect(); return }

  ws.onopen = () => {
    ws?.send(JSON.stringify({ type: 'subscribe', campaignId: currentCampaignId, clientId: getClientId() }))
  }
  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data) as SyncMessage
      if (msg.campaignId === currentCampaignId) handler?.(msg)
    } catch { /* ignore malformed */ }
  }
  ws.onclose = () => { scheduleReconnect() }
  ws.onerror = () => { try { ws?.close() } catch { /* ignore */ } }
}

function scheduleReconnect() {
  if (!currentCampaignId || reconnectTimer) return
  reconnectTimer = setTimeout(() => { reconnectTimer = null; open() }, 2000)
}

/** Subscribe to a campaign's live updates. Replaces any existing subscription. */
export function connectSync(campaignId: string, onMessage: (msg: SyncMessage) => void) {
  disconnectSync()
  currentCampaignId = campaignId
  handler = onMessage
  open()
}

export function disconnectSync() {
  currentCampaignId = null
  handler = null
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
  if (ws) {
    ws.onclose = null   // prevent reconnect on intentional close
    try { ws.close() } catch { /* ignore */ }
    ws = null
  }
}
