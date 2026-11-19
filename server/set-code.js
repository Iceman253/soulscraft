// Change a campaign's code (the app has no screen for this).
// Run as the service user so the database keeps the right owner:
//
//   cd /opt/soulscraft/server
//   runuser -u soulscraft -- env DATA_DIR=/var/lib/soulscraft node set-code.js            # list campaigns
//   runuser -u soulscraft -- env DATA_DIR=/var/lib/soulscraft node set-code.js "Everworld"
//
// The new code is read from standard input (typed, or piped), never from the
// command line, so it doesn't end up in shell history or the process list.
// Devices still using the old code are signed out the next time anything syncs.
import { createInterface } from 'node:readline'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { openDb, makeStatements } from './db.js'
import { hashCode } from './codes.js'
import { LIMITS, isValidNewCode } from './limits.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = process.env.DATA_DIR || join(__dirname, 'data')
const db = openDb(join(DATA_DIR, 'soulscraft.db'))
const stmts = makeStatements(db)
const target = process.argv[2]

if (!target) {
  const weak = new Set(stmts.weak.all().map(c => c.id))
  for (const c of stmts.list.all()) console.log(`${c.id}  ${c.name}${weak.has(c.id) ? '   (weak code: change it)' : ''}`)
  process.exit(0)
}

const matches = stmts.list.all().filter(c => c.id === target || c.name === target)
if (matches.length !== 1) {
  console.error(matches.length ? 'Several campaigns have that name; use the id instead.' : 'No campaign with that name or id.')
  process.exit(1)
}

const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: process.stdin.isTTY })
rl.question(`New code for "${matches[0].name}" (${LIMITS.codeMin}+ characters): `, (code) => {
  rl.close()
  code = code.trim()
  if (!isValidNewCode(code)) {
    console.error(`The code must be ${LIMITS.codeMin}-${LIMITS.codeMax} characters. Nothing changed.`)
    process.exit(1)
  }
  stmts.setCode.run(hashCode(code), matches[0].id)
  console.log('Code changed. Share the new code with your players.')
  db.close()
})
