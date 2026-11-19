// REST API. Anyone may LIST campaigns (names only) and create one (rate-limited);
// everything else, reading included, needs that campaign's code.
import express from 'express'
import { hashCode } from './codes.js'
import { clientIp, isRemote } from './clientIp.js'
import { mergeCampaign } from './merge.js'
import { RateLimiter } from './rateLimit.js'
import {
  LIMITS, isValidId, isValidName, isValidNewCode, isPlainObject,
  isValidImageKey, isValidImageData, jsonBytes,
} from './limits.js'

const ERRORS = { 403: 'bad code', 404: 'not found', 429: 'too many wrong codes, try again later' }
const WEAK = 'this campaign\'s code is too short to use outside the home network; the GM must change it'

export function createApp({ stmts, guard, sync, diskOk, maxCampaigns, log = console.warn, now = () => Date.now() }) {
  const app = express()
  app.disable('x-powered-by')
  app.use(express.json({ limit: LIMITS.bodyBytes }))

  const creations = new RateLimiter({ max: 5, windowMs: 60 * 60 * 1000, now })
  const ipOf = (req) => clientIp(req.headers, req.socket.remoteAddress)
  const remote = (req) => isRemote(req.headers, req.socket.remoteAddress)
  const clientIdOf = (req) => String(req.get('x-client-id') ?? '').slice(0, LIMITS.clientIdChars)

  /** Runs the code check; on failure sends the error and returns null. */
  function authorize(req, res, code) {
    const r = guard.check(req.params.id, code, ipOf(req), remote(req))
    if (r.ok) return r
    if (r.retryAfter) res.set('Retry-After', String(r.retryAfter))
    res.status(r.status).json({ error: r.weak ? WEAK : ERRORS[r.status] })
    return null
  }
  const noRoom = (res) => res.status(507).json({ error: 'server storage is full' })

  app.get('/api/health', (_req, res) => res.json({ ok: true }))

  app.get('/api/campaigns', (_req, res) => res.json(stmts.list.all()))

  app.post('/api/campaigns', (req, res) => {
    // New campaigns (and imports) only from the home network, not through the
    // public Funnel link, so strangers can't fill the campaign list.
    if (remote(req)) return res.status(403).json({ error: 'new campaigns can only be created from the home network' })
    const { id, name, code, data } = req.body ?? {}
    if (!isValidId(id) || !isValidName(name) || !isPlainObject(data)) {
      return res.status(400).json({ error: 'id, name and data are required' })
    }
    if (!isValidNewCode(code)) {
      return res.status(400).json({ error: `the code must be ${LIMITS.codeMin}-${LIMITS.codeMax} characters` })
    }
    if (jsonBytes(data) > LIMITS.campaignBytes) return res.status(413).json({ error: 'campaign too large' })
    const ip = ipOf(req)
    const wait = creations.retryAfter(ip)
    if (wait) {
      res.set('Retry-After', String(wait))
      return res.status(429).json({ error: 'too many new campaigns, try again later' })
    }
    if (stmts.count.get().n >= maxCampaigns) return res.status(507).json({ error: 'campaign limit reached' })
    if (!diskOk()) return noRoom(res)
    if (stmts.get.get(id)) return res.status(409).json({ error: 'exists' })
    creations.record(ip)
    stmts.insert.run(id, name, hashCode(code), JSON.stringify(data), now())
    log(`[api] campaign ${id} created from ${ip}`)
    res.json({ id })
  })

  app.post('/api/campaigns/:id/enter', (req, res) => {
    if (!authorize(req, res, req.body?.code)) return
    const row = stmts.get.get(req.params.id)
    res.json({ id: row.id, name: row.name, data: JSON.parse(row.data), updatedAt: row.updatedAt })
  })

  app.put('/api/campaigns/:id', (req, res) => {
    const { code, data: fullData, patch } = req.body ?? {}
    if (!authorize(req, res, code)) return
    if (!isPlainObject(patch ?? fullData)) return res.status(400).json({ error: 'patch or data required' })
    // Normal saves send only the fields that changed, merged here so two devices
    // saving together can't wipe out each other's work in unrelated fields.
    const data = patch ? mergeCampaign(JSON.parse(stmts.get.get(req.params.id).data), patch) : fullData
    if (jsonBytes(data) > LIMITS.campaignBytes) return res.status(413).json({ error: 'campaign too large' })
    if (!diskOk()) return noRoom(res)
    const name = isValidName(data.name) ? data.name : 'Campaign'
    const updatedAt = now()
    stmts.update.run(name, JSON.stringify(data), updatedAt, req.params.id)
    sync.send(req.params.id, { type: 'update', campaignId: req.params.id, data, updatedAt }, clientIdOf(req))
    res.json({ updatedAt })
  })

  app.delete('/api/campaigns/:id', (req, res) => {
    if (!authorize(req, res, req.body?.code)) return
    stmts.remove.run(req.params.id)
    stmts.imageDelAll.run(req.params.id)
    log(`[api] campaign ${req.params.id} deleted from ${ipOf(req)}`)
    sync.send(req.params.id, { type: 'update', campaignId: req.params.id, data: null, updatedAt: now() }, '')
    res.json({ ok: true })
  })

  // ── Images (portraits, gear art, map backgrounds) ───────────────────────────
  // Reading is a GET, so the code travels in a header instead of a body.
  app.get('/api/campaigns/:id/images', (req, res) => {
    if (!authorize(req, res, req.get('x-campaign-code'))) return
    const out = {}
    for (const row of stmts.images.all(req.params.id)) out[row.key] = row.data
    res.json(out)
  })

  app.put('/api/campaigns/:id/images/:key', (req, res) => {
    const { id, key } = req.params
    if (!authorize(req, res, req.body?.code)) return
    if (!isValidImageKey(key)) return res.status(400).json({ error: 'bad image key' })
    if (!isValidImageData(req.body?.data)) return res.status(400).json({ error: 'not a supported image' })
    if (!stmts.imageExists.get(id, key) && stmts.imageCount.get(id).n >= LIMITS.imagesPerCampaign) {
      return res.status(507).json({ error: 'too many images in this campaign' })
    }
    if (!diskOk()) return noRoom(res)
    stmts.imagePut.run(id, key, req.body.data, now())
    sync.send(id, { type: 'image', campaignId: id, key }, clientIdOf(req))
    res.json({ ok: true })
  })

  app.delete('/api/campaigns/:id/images/:key', (req, res) => {
    const { id, key } = req.params
    if (!authorize(req, res, req.body?.code)) return
    if (!isValidImageKey(key)) return res.status(400).json({ error: 'bad image key' })
    stmts.imageDel.run(id, key)
    sync.send(id, { type: 'image', campaignId: id, key, deleted: true }, clientIdOf(req))
    res.json({ ok: true })
  })

  app.use('/api', (_req, res) => res.status(404).json({ error: 'not found' }))

  // Never send stack traces or internals to the client.
  app.use((err, _req, res, _next) => {   // eslint-disable-line no-unused-vars
    const status = Number(err?.status || err?.statusCode) || 500
    if (status >= 500) log('[api] error:', err)
    const error = status === 413 ? 'request too large' : status < 500 ? 'bad request' : 'server error'
    res.status(status).json({ error })
  })

  return app
}
