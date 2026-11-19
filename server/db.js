// SQLite schema, migrations and prepared statements.
import Database from 'better-sqlite3'
import { hashCode, isHashed } from './codes.js'
import { LIMITS } from './limits.js'

const SCHEMA = `
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
`

export function openDb(file) {
  const db = new Database(file)
  db.pragma('journal_mode = WAL')
  db.exec(SCHEMA)
  migrate(db)
  return db
}

/** Upgrades older databases: plain-text codes become hashes, and codes shorter
 *  than the current minimum are flagged so the GM can be told to change them. */
export function migrate(db) {
  const cols = db.prepare('PRAGMA table_info(campaigns)').all().map(c => c.name)
  if (!cols.includes('weakCode')) db.exec('ALTER TABLE campaigns ADD COLUMN weakCode INTEGER NOT NULL DEFAULT 0')
  const rows = db.prepare('SELECT id, code FROM campaigns').all().filter(r => !isHashed(r.code))
  const update = db.prepare('UPDATE campaigns SET code = ?, weakCode = ? WHERE id = ?')
  db.transaction(() => {
    for (const r of rows) update.run(hashCode(r.code), r.code.length < LIMITS.codeMin ? 1 : 0, r.id)
  })()
}

export function makeStatements(db) {
  return {
    list:        db.prepare('SELECT id, name, updatedAt FROM campaigns ORDER BY updatedAt DESC'),
    count:       db.prepare('SELECT COUNT(*) AS n FROM campaigns'),
    weak:        db.prepare('SELECT id, name FROM campaigns WHERE weakCode = 1'),
    get:         db.prepare('SELECT * FROM campaigns WHERE id = ?'),
    code:        db.prepare('SELECT code, weakCode FROM campaigns WHERE id = ?'),
    insert:      db.prepare('INSERT INTO campaigns (id, name, code, data, updatedAt, weakCode) VALUES (?,?,?,?,?,0)'),
    update:      db.prepare('UPDATE campaigns SET name = ?, data = ?, updatedAt = ? WHERE id = ?'),
    setCode:     db.prepare('UPDATE campaigns SET code = ?, weakCode = 0 WHERE id = ?'),
    remove:      db.prepare('DELETE FROM campaigns WHERE id = ?'),
    images:      db.prepare('SELECT key, data FROM images WHERE campaignId = ?'),
    imageCount:  db.prepare('SELECT COUNT(*) AS n FROM images WHERE campaignId = ?'),
    imageExists: db.prepare('SELECT 1 FROM images WHERE campaignId = ? AND key = ?'),
    imagePut:    db.prepare('INSERT OR REPLACE INTO images (campaignId, key, data, updatedAt) VALUES (?,?,?,?)'),
    imageDel:    db.prepare('DELETE FROM images WHERE campaignId = ? AND key = ?'),
    imageDelAll: db.prepare('DELETE FROM images WHERE campaignId = ?'),
  }
}
