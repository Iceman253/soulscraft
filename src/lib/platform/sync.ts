// WebSocket client for live campaign sync. Same-origin — nginx upgrades /ws to
// the Node service, so this is wss:// automatically when the app is on HTTPS.
// The server only sends a campaign's updates to sockets that subscribed with its code.
import { getClientId } from './api'
import type { CampaignData } from '../../types'

export type SyncMessage =
  | { type: 'update'; campaignId: string; data: CampaignData | null; updatedAt: number }
  | { type: 'image'; campaignId: string; key: string; deleted?: boolean }
  | { type: 'reconnected'; campaignId: string }   // updates may have been missed while offline
  | { type: 'denied'; campaignId: string }        // the code was changed or the campaign is gone

// Close codes sent by the server (see server/sync.js).
const CLOSE_BAD_CODE = 4003
const CLOSE_RATE_LIMITED = 4029
const CLOSE_BUSY = 1013

let ws: WebSocket | null = null
let currentCampaignId: string | null = null
let currentCode: string | null = null
let handler: ((msg: SyncMessage) => void) | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let connectedBefore = false

function wsUrl(): string {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${location.host}/ws`
}

/** How long to wait before reconnecting after a close, or null to stop. */
export function reconnectDelay(closeCode: number): number | null {
  if (closeCode === CLOSE_BAD_CODE) return null
  if (closeCode === CLOSE_RATE_LIMITED) return 60_000
  if (closeCode === CLOSE_BUSY) return 30_000
  return 2000
}

function open() {
  if (!currentCampaignId) return
  try {
    ws = new WebSocket(wsUrl())
  } catch { scheduleReconnect(2000); return }

  ws.onopen = () => {
    ws?.send(JSON.stringify({ type: 'subscribe', campaignId: currentCampaignId, clientId: getClientId(), code: currentCode }))
    if (connectedBefore && currentCampaignId) handler?.({ type: 'reconnected', campaignId: currentCampaignId })
    connectedBefore = true
  }
  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data) as SyncMessage | { type: 'subscribed' }
      if (msg.type === 'subscribed') return
      if (msg.campaignId === currentCampaignId) handler?.(msg)
    } catch { /* ignore malformed */ }
  }
  ws.onclose = (e) => {
    const delay = reconnectDelay(e.code)
    if (delay === null) {
      if (currentCampaignId) handler?.({ type: 'denied', campaignId: currentCampaignId })
      return
    }
    scheduleReconnect(delay)
  }
  ws.onerror = () => { try { ws?.close() } catch { /* ignore */ } }
}

function scheduleReconnect(delay: number) {
  if (!currentCampaignId || reconnectTimer) return
  reconnectTimer = setTimeout(() => { reconnectTimer = null; open() }, delay)
}

/** Subscribe to a campaign's live updates. Replaces any existing subscription. */
export function connectSync(campaignId: string, code: string, onMessage: (msg: SyncMessage) => void) {
  disconnectSync()
  currentCampaignId = campaignId
  currentCode = code
  handler = onMessage
  connectedBefore = false
  open()
}

export function disconnectSync() {
  currentCampaignId = null
  currentCode = null
  handler = null
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
  if (ws) {
    ws.onclose = null   // prevent reconnect on intentional close
    try { ws.close() } catch { /* ignore */ }
    ws = null
  }
}
