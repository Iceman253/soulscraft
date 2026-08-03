// Soulscraft shared-campaign backend.
// REST for CRUD + a WebSocket channel for live sync. Campaigns are stored as a
// JSON blob per row in SQLite. Anyone may LIST campaigns (names only); ENTERING,
// UPDATING, or DELETING one requires the GM-set campaign code.
import express from 'express'
import { WebSocketServer } from 'ws'
import Database from 'better-sqlite3'
import { createServer } from 'http'
import { mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT) || 8787
const DATA_DIR = process.env.DATA_DIR || join(__dirname, 'data')

mkdirSync(DATA_DIR, { recursive: true })
const db = new Database(join(DATA_DIR, 'soulscraft.db'))
db.pragma('journal_mode = WAL')
db.exec(`
  CREATE TABLE IF NOT EXISTS campaigns (
    id        TEXT PRIMARY KEY,
    name      TEXT NOT NULL,
    code      TEXT NOT NULL,
    data      TEXT NOT NULL,
    updatedAt INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS images (
    campaignId TEXT NOT NULL,
    key        TEXT NOT NULL,
    data       TEXT NOT NULL,
    updatedAt  INTEGER NOT NULL,
    PRIMARY KEY (campaignId, key)
  );
`)

// ── Prepared statements ───────────────────────────────────────────────────────
const qList   = db.prepare('SELECT id, name, updatedAt FROM campaigns ORDER BY updatedAt DESC')
const qGet    = db.prepare('SELECT * FROM campaigns WHERE id = ?')
const qCode   = db.prepare('SELECT code FROM campaigns WHERE id = ?')
const qInsert = db.prepare('INSERT INTO campaigns (id, name, code, data, updatedAt) VALUES (?,?,?,?,?)')
const qUpdate = db.prepare('UPDATE campaigns SET name = ?, data = ?, updatedAt = ? WHERE id = ?')
const qDelete = db.prepare('DELETE FROM campaigns WHERE id = ?')

const qImages    = db.prepare('SELECT key, data FROM images WHERE campaignId = ?')
const qImgPut    = db.prepare('INSERT OR REPLACE INTO images (campaignId, key, data, updatedAt) VALUES (?,?,?,?)')
const qImgDel    = db.prepare('DELETE FROM images WHERE campaignId = ? AND key = ?')
const qImgDelAll = db.prepare('DELETE FROM images WHERE campaignId = ?')

// ── REST API ──────────────────────────────────────────────────────────────────
const app = express()
app.use(express.json({ limit: '32mb' }))

app.get('/api/health', (_req, res) => res.json({ ok: true }))

// Public list — names + timestamps only. No codes, no campaign data.
app.get('/api/campaigns', (_req, res) => {
  res.json(qList.all())
})

// Create — GM supplies id, name, a code, and the initial CampaignData blob.
app.post('/api/campaigns', (req, res) => {
  const { id, name, code, data } = req.body || {}
  if (!id || !name || !code || !data) return res.status(400).json({ error: 'id, name, code, data required' })
  if (qGet.get(id)) return res.status(409).json({ error: 'exists' })
  qInsert.run(id, name, code, JSON.stringify(data), Date.now())
  res.json({ id })
})

// Enter — validate the code, then return the full campaign data.
app.post('/api/campaigns/:id/enter', (req, res) => {
  const row = qGet.get(req.params.id)
  if (!row) return res.status(404).json({ error: 'not found' })
  if (row.code !== (req.body?.code ?? '')) return res.status(403).json({ error: 'bad code' })
  res.json({ id: row.id, name: row.name, data: JSON.parse(row.data), updatedAt: row.updatedAt })
})

// Update — validate the code, persist, then broadcast to other subscribers.
app.put('/api/campaigns/:id', (req, res) => {
  const { code, data } = req.body || {}
  const row = qCode.get(req.params.id)
  if (!row) return res.status(404).json({ error: 'not found' })
  if (row.code !== (code ?? '')) return res.status(403).json({ error: 'bad code' })
  const updatedAt = Date.now()
  qUpdate.run(data?.name ?? 'Campaign', JSON.stringify(data), updatedAt, req.params.id)
  send(req.params.id, { type: 'update', campaignId: req.params.id, data, updatedAt }, req.get('x-client-id') || '')
  res.json({ updatedAt })
})

// Delete — validate the code. Cascades to the campaign's images.
app.delete('/api/campaigns/:id', (req, res) => {
  const row = qCode.get(req.params.id)
  if (!row) return res.status(404).json({ error: 'not found' })
  if (row.code !== (req.body?.code ?? '')) return res.status(403).json({ error: 'bad code' })
  qDelete.run(req.params.id)
  qImgDelAll.run(req.params.id)
  send(req.params.id, { type: 'update', campaignId: req.params.id, data: null, updatedAt: Date.now() }, '')
  res.json({ ok: true })
})

// ── Images (portraits, gear art, map backgrounds) ─────────────────────────────
// All images for a campaign, as { key: dataUrl }. No code needed to read
// (you already need the code to load the campaign that references these keys).
app.get('/api/campaigns/:id/images', (req, res) => {
  const out = {}
  for (const row of qImages.all(req.params.id)) out[row.key] = row.data
  res.json(out)
})

// Store one image (code-gated). Broadcasts so other devices refetch it.
app.put('/api/campaigns/:id/images/:key', (req, res) => {
  const { code, data } = req.body || {}
  const row = qCode.get(req.params.id)
  if (!row) return res.status(404).json({ error: 'not found' })
  if (row.code !== (code ?? '')) return res.status(403).json({ error: 'bad code' })
  qImgPut.run(req.params.id, req.params.key, String(data ?? ''), Date.now())
  send(req.params.id, { type: 'image', campaignId: req.params.id, key: req.params.key }, req.get('x-client-id') || '')
  res.json({ ok: true })
})

app.delete('/api/campaigns/:id/images/:key', (req, res) => {
  const row = qCode.get(req.params.id)
  if (!row) return res.status(404).json({ error: 'not found' })
  if (row.code !== (req.body?.code ?? '')) return res.status(403).json({ error: 'bad code' })
  qImgDel.run(req.params.id, req.params.key)
  send(req.params.id, { type: 'image', campaignId: req.params.id, key: req.params.key, deleted: true }, req.get('x-client-id') || '')
  res.json({ ok: true })
})

// ── WebSocket live sync ───────────────────────────────────────────────────────
const server = createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })

// ws -> { campaignId, clientId }
const subs = new Map()

wss.on('connection', (ws) => {
  ws.isAlive = true
  ws.on('pong', () => { ws.isAlive = true })
  ws.on('message', (raw) => {
    let msg
    try { msg = JSON.parse(raw.toString()) } catch { return }
    if (msg.type === 'subscribe' && msg.campaignId) {
      subs.set(ws, { campaignId: String(msg.campaignId), clientId: String(msg.clientId || '') })
    }
  })
  ws.on('close', () => subs.delete(ws))
})

// Push a message to every socket watching this campaign except its originator.
function send(campaignId, message, senderClientId) {
  const payload = JSON.stringify(message)
  for (const [ws, sub] of subs) {
    if (sub.campaignId === campaignId && sub.clientId !== senderClientId && ws.readyState === 1) {
      ws.send(payload)
    }
  }
}

// Drop dead connections every 30s.
setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) { ws.terminate(); continue }
    ws.isAlive = false
    ws.ping()
  }
}, 30000)

server.listen(PORT, () => console.log(`Soulscraft server listening on :${PORT} (data: ${DATA_DIR})`))
