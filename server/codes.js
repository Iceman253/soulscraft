// Campaign codes are stored as salted scrypt hashes, never as plain text, and
// compared in constant time.
import { scryptSync, randomBytes, createHash, timingSafeEqual } from 'node:crypto'
import { LIMITS } from './limits.js'

const PREFIX = 'scrypt1'
const PARAMS = { N: 16384, r: 8, p: 1 }
const KEY_LEN = 32

export function hashCode(code) {
  const salt = randomBytes(16)
  const hash = scryptSync(code, salt, KEY_LEN, PARAMS)
  return `${PREFIX}$${salt.toString('base64')}$${hash.toString('base64')}`
}

export const isHashed = (stored) => typeof stored === 'string' && stored.startsWith(`${PREFIX}$`)

// scrypt is deliberately slow, and every save sends the code. Once a code has been
// verified against a stored hash, remember a SHA-256 of it so later checks are cheap.
// Keyed by the stored hash, so changing a code invalidates the shortcut.
const verified = new Map()
const sha256 = (s) => createHash('sha256').update(s, 'utf8').digest()

export function verifyCode(stored, code) {
  if (!isHashed(stored)) return false
  if (typeof code !== 'string' || code.length === 0 || code.length > LIMITS.codeMax) return false
  const known = verified.get(stored)
  if (known) return timingSafeEqual(known, sha256(code))
  const [, saltB64, hashB64] = stored.split('$')
  const expected = Buffer.from(hashB64, 'base64')
  const actual = scryptSync(code, Buffer.from(saltB64, 'base64'), expected.length, PARAMS)
  const ok = actual.length === expected.length && timingSafeEqual(actual, expected)
  if (ok) {
    if (verified.size >= 1000) verified.clear()
    verified.set(stored, sha256(code))
  }
  return ok
}
