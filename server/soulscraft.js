// Wires the database, code guard, REST API and live sync into one HTTP server.
// server.js starts it for real; tests start it on an in-memory database.
import { createServer } from 'node:http'
import { openDb, makeStatements } from './db.js'
import { makeCodeGuard } from './guard.js'
import { createApp } from './api.js'
import { attachSync } from './sync.js'

export function buildServer({ dbFile, diskOk = () => true, maxCampaigns = 50, log = console.warn, now }) {
  const db = openDb(dbFile)
  const stmts = makeStatements(db)
  const guard = makeCodeGuard({ stmts, log, now })
  let sync = null
  const app = createApp({
    stmts, guard, diskOk, maxCampaigns, log, now,
    sync: { send: (...args) => sync?.send(...args) },
  })
  const server = createServer(app)
  sync = attachSync({ server, stmts, guard, log })
  const close = () => new Promise(resolve => { sync.close(); server.close(() => { db.close(); resolve() }) })
  return { server, db, stmts, close }
}
