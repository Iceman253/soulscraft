// WebSocket live sync. A socket must subscribe to one campaign WITH its code
// before it receives anything; otherwise it is closed.
//
// Close codes the client understands:
//   4001  didn't subscribe in time        4003  wrong code / campaign gone
//   4029  too many wrong codes            1013  server busy (too many sockets)
import { WebSocketServer } from 'ws'
import { clientIp, isRemote } from './clientIp.js'
import { LIMITS } from './limits.js'

export function attachSync({ server, stmts, guard, log = console.warn }) {
  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: LIMITS.wsPayloadBytes })
  const subs = new Map()      // ws -> { campaignId, clientId, stored }
  const perIp = new Map()     // ip -> open sockets

  wss.on('connection', (ws, req) => {
    const ip = clientIp(req.headers, req.socket.remoteAddress)
    const remote = isRemote(req.headers, req.socket.remoteAddress)
    const open = perIp.get(ip) ?? 0
    if (wss.clients.size > LIMITS.wsClients || open >= LIMITS.wsClientsPerIp) {
      ws.close(1013, 'busy')
      return
    }
    perIp.set(ip, open + 1)
    ws.isAlive = true
    const authTimer = setTimeout(() => { if (!subs.has(ws)) ws.close(4001, 'subscribe required') }, LIMITS.wsAuthTimeoutMs)

    ws.on('pong', () => { ws.isAlive = true })
    ws.on('message', (raw, isBinary) => {
      if (isBinary) return
      let msg
      try { msg = JSON.parse(raw.toString()) } catch { return }
      if (msg?.type !== 'subscribe') return
      const campaignId = String(msg.campaignId ?? '')
      const r = guard.check(campaignId, msg.code, ip, remote)
      if (!r.ok) {
        subs.delete(ws)
        ws.close(r.status === 429 ? 4029 : 4003, r.status === 429 ? 'rate limited' : 'bad code')
        return
      }
      subs.set(ws, { campaignId, clientId: String(msg.clientId ?? '').slice(0, LIMITS.clientIdChars), stored: r.stored })
      ws.send(JSON.stringify({ type: 'subscribed', campaignId }))
    })
    ws.on('close', () => {
      clearTimeout(authTimer)
      subs.delete(ws)
      const n = (perIp.get(ip) ?? 1) - 1
      if (n > 0) perIp.set(ip, n); else perIp.delete(ip)
    })
  })

  /** Push a message to every socket watching this campaign except its originator.
   *  Sockets that subscribed with a code that has since been changed are dropped. */
  function send(campaignId, message, senderClientId) {
    const current = stmts.code.get(campaignId)?.code
    const payload = JSON.stringify(message)
    for (const [ws, sub] of subs) {
      if (sub.campaignId !== campaignId) continue
      if (current && sub.stored !== current) { subs.delete(ws); ws.close(4003, 'code changed'); continue }
      if (sub.clientId !== senderClientId && ws.readyState === 1) ws.send(payload)
    }
  }

  // Drop dead connections every 30s.
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (ws.isAlive === false) { ws.terminate(); continue }
      ws.isAlive = false
      ws.ping()
    }
  }, 30_000)
  heartbeat.unref()

  function close() {
    clearInterval(heartbeat)
    for (const ws of wss.clients) ws.terminate()
    wss.close()
  }

  wss.on('error', (e) => log('[ws] error:', e.message))
  return { send, close }
}
