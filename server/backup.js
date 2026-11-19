// Daily database snapshots, so a mistaken or malicious delete can be undone.
import { mkdirSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const NAME = /^soulscraft-\d{4}-\d{2}-\d{2}\.db$/
const DAY = 24 * 60 * 60 * 1000

/** Delete all but the newest `keep` snapshots. */
export function pruneBackups(dir, keep) {
  const files = readdirSync(dir).filter(f => NAME.test(f)).sort().reverse()
  for (const f of files.slice(keep)) rmSync(join(dir, f))
}

export async function backupNow(db, dir, keep, diskOk, now = new Date()) {
  if (!diskOk()) throw new Error('not enough free disk space')
  mkdirSync(dir, { recursive: true, mode: 0o700 })
  await db.backup(join(dir, `soulscraft-${now.toISOString().slice(0, 10)}.db`))
  pruneBackups(dir, keep)
}

export function scheduleBackups({ db, dir, keep, diskOk, log = console.warn }) {
  const run = () => backupNow(db, dir, keep, diskOk).catch(e => log('[backup] failed:', e.message))
  setTimeout(run, 60_000).unref()
  setInterval(run, DAY).unref()
}
