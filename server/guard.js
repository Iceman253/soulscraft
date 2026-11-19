// Code checks with brute-force protection, shared by the REST API and live sync.
import { verifyCode } from './codes.js'
import { isValidId } from './limits.js'
import { RateLimiter } from './rateLimit.js'

const FIFTEEN_MIN = 15 * 60 * 1000

export function makeCodeGuard({ stmts, log = console.warn, now }) {
  // Wrong codes: a few per client, and a ceiling per campaign so that many
  // clients together still can't try more than ~10,000 codes a day.
  const perIp = new RateLimiter({ max: 10, windowMs: FIFTEEN_MIN, now })
  const perCampaign = new RateLimiter({ max: 100, windowMs: FIFTEEN_MIN, now })

  /**
   * Checks `code` for campaign `id`. Campaigns whose code is too short to survive
   * guessing from the internet only open from the home network (`remote` false)
   * until the GM changes the code.
   * @returns {{ ok: true, stored: string } | { ok: false, status: 404|403|429, retryAfter?: number, weak?: boolean }}
   */
  function check(id, code, ip, remote = false) {
    const wait = Math.max(perIp.retryAfter(ip), isValidId(id) ? perCampaign.retryAfter(id) : 0)
    if (wait) return { ok: false, status: 429, retryAfter: wait }
    const row = isValidId(id) ? stmts.code.get(id) : undefined
    if (!row) { perIp.record(ip); return { ok: false, status: 404 } }
    if (remote && row.weakCode) {
      log(`[auth] campaign ${id} refused from ${ip}: its code is too weak to use from outside the home network`)
      return { ok: false, status: 403, weak: true }
    }
    if (!verifyCode(row.code, code)) {
      perIp.record(ip)
      perCampaign.record(id)
      log(`[auth] wrong code for campaign ${id} from ${ip}`)
      return { ok: false, status: 403 }
    }
    return { ok: true, stored: row.code }
  }

  return { check }
}
