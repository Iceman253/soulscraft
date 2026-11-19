// Soulscraft shared-campaign backend: REST + WebSocket + SQLite.
// Configuration (environment):
//   PORT=8787  HOST=127.0.0.1  DATA_DIR=./data
//   MAX_CAMPAIGNS=50  MIN_FREE_MB=150  BACKUP_KEEP=7
// HOST stays on loopback: nginx in front of it is the only way in.
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildServer } from './soulscraft.js'
import { makeDiskGuard } from './diskGuard.js'
import { scheduleBackups } from './backup.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const num = (v, fallback) => (v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : fallback)

const PORT = num(process.env.PORT, 8787)
const HOST = process.env.HOST || '127.0.0.1'
const DATA_DIR = process.env.DATA_DIR || join(__dirname, 'data')
const MAX_CAMPAIGNS = num(process.env.MAX_CAMPAIGNS, 50)
const MIN_FREE_MB = num(process.env.MIN_FREE_MB, 150)
const BACKUP_KEEP = num(process.env.BACKUP_KEEP, 7)

mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 })
const diskOk = makeDiskGuard(DATA_DIR, MIN_FREE_MB * 1024 * 1024)
const { server, db, stmts } = buildServer({ dbFile: join(DATA_DIR, 'soulscraft.db'), diskOk, maxCampaigns: MAX_CAMPAIGNS })

for (const c of stmts.weak.all()) {
  console.warn(`[auth] campaign "${c.name}" (${c.id}) has a code shorter than 6 characters; change it with set-code.js`)
}
scheduleBackups({ db, dir: join(DATA_DIR, 'backups'), keep: BACKUP_KEEP, diskOk })

server.listen(PORT, HOST, () => console.log(`Soulscraft server listening on ${HOST}:${PORT} (data: ${DATA_DIR})`))
