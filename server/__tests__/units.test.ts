import { describe, it, expect } from 'vitest'
import { mkdtempSync, writeFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { isValidId, isValidNewCode, isValidImageKey, isValidImageData, isPlainObject, LIMITS } from '../limits.js'
import { hashCode, verifyCode, isHashed } from '../codes.js'
import { RateLimiter } from '../rateLimit.js'
import { clientIp, isRemote } from '../clientIp.js'
import { makeDiskGuard } from '../diskGuard.js'
import { pruneBackups } from '../backup.js'
import { migrate, makeStatements, openDb } from '../db.js'

describe('validation', () => {
  it('accepts UUID campaign ids and rejects anything path- or SQL-like', () => {
    expect(isValidId('358eed1a-b42e-4e6c-8370-d05024176ead')).toBe(true)
    for (const bad of ['', '../x', 'a b', "x'--", 'a'.repeat(65), 5, null]) expect(isValidId(bad)).toBe(false)
  })

  it('requires new codes to be 6-128 characters', () => {
    expect(isValidNewCode('abcdef')).toBe(true)
    expect(isValidNewCode('abcde')).toBe(false)
    expect(isValidNewCode('x'.repeat(LIMITS.codeMax + 1))).toBe(false)
    expect(isValidNewCode(123456)).toBe(false)
  })

  it('keeps image keys inside the image namespaces', () => {
    expect(isValidImageKey("img_item_bob's sword")).toBe(true)
    expect(isValidImageKey('soulscraft_mapbg_358eed1a')).toBe(true)
    for (const bad of ['soulscraft_codes', 'soulscraft_client_id', 'img_', 'img_\nx', 'img_' + 'x'.repeat(300)]) {
      expect(isValidImageKey(bad)).toBe(false)
    }
  })

  it('accepts only raster base64 data URLs', () => {
    expect(isValidImageData('data:image/webp;base64,UklGRsx+/A==')).toBe(true)
    for (const bad of [
      'data:image/svg+xml;base64,PHN2Zz4=',
      'https://evil.example/x.png',
      'data:image/png;base64,AAAA) , url(https://evil.example/',
      'javascript:alert(1)',
    ]) expect(isValidImageData(bad)).toBe(false)
  })

  it('treats only non-array objects as plain objects', () => {
    expect(isPlainObject({})).toBe(true)
    expect(isPlainObject([])).toBe(false)
    expect(isPlainObject(null)).toBe(false)
  })
})

describe('codes', () => {
  it('stores a salted hash, never the code, and verifies it', () => {
    const stored = hashCode('dragon-77')
    expect(isHashed(stored)).toBe(true)
    expect(stored).not.toContain('dragon-77')
    expect(hashCode('dragon-77')).not.toBe(stored)
    expect(verifyCode(stored, 'dragon-77')).toBe(true)
    expect(verifyCode(stored, 'dragon-77')).toBe(true)    // cached path
    expect(verifyCode(stored, 'dragon-78')).toBe(false)
    expect(verifyCode(stored, '')).toBe(false)
    expect(verifyCode(stored, undefined)).toBe(false)
  })

  it('never matches an unhashed stored value', () => {
    expect(verifyCode('1234', '1234')).toBe(false)
  })
})

describe('RateLimiter', () => {
  it('blocks after max events and frees up when the window passes', () => {
    let t = 0
    const rl = new RateLimiter({ max: 3, windowMs: 1000, now: () => t })
    for (let i = 0; i < 3; i++) { expect(rl.retryAfter('a')).toBe(0); rl.record('a') }
    expect(rl.retryAfter('a')).toBe(1)
    expect(rl.retryAfter('b')).toBe(0)
    t = 1001
    expect(rl.retryAfter('a')).toBe(0)
  })
})

describe('clientIp', () => {
  it('uses the address nginx saw for LAN clients and ignores forged headers', () => {
    expect(clientIp({ 'x-real-ip': '10.0.10.5', 'x-forwarded-for': '1.2.3.4' }, '127.0.0.1')).toBe('10.0.10.5')
  })
  it('uses the last forwarded hop when the request came through a local proxy', () => {
    expect(clientIp({ 'x-real-ip': '127.0.0.1', 'x-forwarded-for': '6.6.6.6, 203.0.113.9' }, '127.0.0.1')).toBe('203.0.113.9')
  })
  it('tells home-network requests from ones through a local proxy', () => {
    expect(isRemote({ 'x-real-ip': '10.0.10.5' }, '127.0.0.1')).toBe(false)
    expect(isRemote({ 'x-real-ip': '127.0.0.1' }, '127.0.0.1')).toBe(true)
    expect(isRemote({ 'x-real-ip': '::1' }, '127.0.0.1')).toBe(true)
  })
  it('falls back to the socket address', () => {
    expect(clientIp({}, '::1')).toBe('::1')
  })
})

describe('disk guard', () => {
  it('blocks writes below the minimum and allows them when it cannot tell', () => {
    expect(makeDiskGuard('/x', 100, () => 50)()).toBe(false)
    expect(makeDiskGuard('/x', 100, () => 500)()).toBe(true)
    expect(makeDiskGuard('/x', 100, () => { throw new Error('nope') })()).toBe(true)
  })
})

describe('backups', () => {
  it('keeps only the newest snapshots and leaves other files alone', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ss-bak-'))
    for (const d of ['2026-01-01', '2026-01-02', '2026-01-03']) writeFileSync(join(dir, `soulscraft-${d}.db`), '')
    writeFileSync(join(dir, 'notes.txt'), '')
    pruneBackups(dir, 2)
    expect(readdirSync(dir).sort()).toEqual(['notes.txt', 'soulscraft-2026-01-02.db', 'soulscraft-2026-01-03.db'])
  })
})

describe('database migration', () => {
  it('hashes plain-text codes and flags short ones', () => {
    const db = new Database(':memory:')
    db.exec(`CREATE TABLE campaigns (id TEXT PRIMARY KEY, name TEXT NOT NULL, code TEXT NOT NULL, data TEXT NOT NULL, updatedAt INTEGER NOT NULL);
             CREATE TABLE images (campaignId TEXT NOT NULL, key TEXT NOT NULL, data TEXT NOT NULL, updatedAt INTEGER NOT NULL, PRIMARY KEY (campaignId, key));`)
    db.prepare('INSERT INTO campaigns VALUES (?,?,?,?,?)').run('a', 'Short', 'x', '{}', 1)
    db.prepare('INSERT INTO campaigns VALUES (?,?,?,?,?)').run('b', 'Long', 'longenough', '{}', 1)
    migrate(db)
    const stmts = makeStatements(db)
    expect(verifyCode(stmts.code.get('a').code, 'x')).toBe(true)
    expect(verifyCode(stmts.code.get('b').code, 'longenough')).toBe(true)
    expect(stmts.weak.all().map((r: { id: string }) => r.id)).toEqual(['a'])
    migrate(db)   // running again changes nothing
    expect(verifyCode(stmts.code.get('a').code, 'x')).toBe(true)
  })

  it('creates a fresh database', () => {
    const db = openDb(':memory:')
    expect(makeStatements(db).count.get().n).toBe(0)
  })
})
