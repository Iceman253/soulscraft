// Runs the real server (REST + WebSocket) on an in-memory database.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { AddressInfo } from 'node:net'
import WebSocket from 'ws'
import { buildServer } from '../soulscraft.js'

type Built = ReturnType<typeof buildServer>
let built: Built
let base: string
let diskFree = true

const ID = '358eed1a-b42e-4e6c-8370-d05024176ead'
const CODE = 'dragon-77'
const IMG = 'data:image/webp;base64,UklGRsx+/A=='

async function call(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  let json: Record<string, unknown> = {}
  try { json = JSON.parse(text) } catch { /* not JSON */ }
  return { status: res.status, json, text }
}

const create = (over: Record<string, unknown> = {}, headers: Record<string, string> = {}) =>
  call('POST', '/api/campaigns', { id: ID, name: 'Everworld', code: CODE, data: { name: 'Everworld', notes: 'secret' }, ...over }, headers)

function openSocket(): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(base.replace('http', 'ws') + '/ws')
    ws.once('open', () => resolve(ws))
    ws.once('error', reject)
  })
}
const nextClose = (ws: WebSocket) => new Promise<number>(resolve => ws.once('close', (code: number) => resolve(code)))
const nextMessage = (ws: WebSocket) => new Promise<Record<string, unknown>>(resolve =>
  ws.once('message', (raw: Buffer) => resolve(JSON.parse(raw.toString()))))

beforeEach(async () => {
  diskFree = true
  built = buildServer({ dbFile: ':memory:', diskOk: () => diskFree, maxCampaigns: 3, log: () => {} })
  await new Promise<void>(resolve => built.server.listen(0, '127.0.0.1', resolve))
  base = `http://127.0.0.1:${(built.server.address() as AddressInfo).port}`
})
afterEach(async () => { await built.close() })

describe('campaigns', () => {
  it('creates a campaign and lists only its name', async () => {
    expect((await create()).status).toBe(200)
    const list = await call('GET', '/api/campaigns')
    expect(list.json).toEqual([{ id: ID, name: 'Everworld', updatedAt: expect.any(Number) }])
    expect(list.text).not.toContain(CODE)
    expect(list.text).not.toContain('secret')
  })

  it('refuses short codes, bad ids and non-object data', async () => {
    expect((await create({ code: '1234' })).status).toBe(400)
    expect((await create({ id: '../etc' })).status).toBe(400)
    expect((await create({ data: [1, 2] })).status).toBe(400)
  })

  it('stops creating at the campaign limit and when the disk is full', async () => {
    diskFree = false
    expect((await create()).status).toBe(507)
    diskFree = true
    for (let i = 0; i < 3; i++) expect((await create({ id: `c${i}` })).status).toBe(200)
    expect((await create({ id: 'c9' })).status).toBe(507)
  })

  it('rate-limits campaign creation per client', async () => {
    const statuses: number[] = []
    await built.close()
    built = buildServer({ dbFile: ':memory:', maxCampaigns: 100, log: () => {} })
    await new Promise<void>(resolve => built.server.listen(0, '127.0.0.1', resolve))
    base = `http://127.0.0.1:${(built.server.address() as AddressInfo).port}`
    for (let i = 0; i < 6; i++) statuses.push((await create({ id: `c${i}` })).status)
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429])
  })

  it('returns data only for the right code', async () => {
    await create()
    expect((await call('POST', `/api/campaigns/${ID}/enter`, { code: 'wrong-code' })).status).toBe(403)
    expect((await call('POST', `/api/campaigns/${ID}/enter`, {})).status).toBe(403)
    const ok = await call('POST', `/api/campaigns/${ID}/enter`, { code: CODE })
    expect(ok.status).toBe(200)
    expect(ok.json.data).toEqual({ name: 'Everworld', notes: 'secret' })
  })

  it('locks out a client after 10 wrong codes', async () => {
    await create()
    for (let i = 0; i < 10; i++) await call('POST', `/api/campaigns/${ID}/enter`, { code: `guess${i}` })
    const blocked = await call('POST', `/api/campaigns/${ID}/enter`, { code: CODE })
    expect(blocked.status).toBe(429)
    expect(blocked.json.error).toMatch(/too many/)
  })

  it('counts a forwarded client separately only behind a local proxy', async () => {
    await create()
    const viaProxy = { 'x-real-ip': '127.0.0.1', 'x-forwarded-for': '203.0.113.9' }
    for (let i = 0; i < 10; i++) await call('POST', `/api/campaigns/${ID}/enter`, { code: `guess${i}` }, viaProxy)
    expect((await call('POST', `/api/campaigns/${ID}/enter`, { code: CODE }, viaProxy)).status).toBe(429)
    expect((await call('POST', `/api/campaigns/${ID}/enter`, { code: CODE }, { 'x-real-ip': '10.0.10.5' })).status).toBe(200)
  })

  it('merges a patch with the right code and rejects the wrong one', async () => {
    await create()
    expect((await call('PUT', `/api/campaigns/${ID}`, { code: 'nope-nope', patch: { notes: 'x' } })).status).toBe(403)
    expect((await call('PUT', `/api/campaigns/${ID}`, { code: CODE })).status).toBe(400)
    expect((await call('PUT', `/api/campaigns/${ID}`, { code: CODE, patch: { quests: [] } })).status).toBe(200)
    const after = await call('POST', `/api/campaigns/${ID}/enter`, { code: CODE })
    expect(after.json.data).toEqual({ name: 'Everworld', notes: 'secret', quests: [] })
  })

  it('needs the code to delete', async () => {
    await create()
    expect((await call('DELETE', `/api/campaigns/${ID}`, { code: 'nope-nope' })).status).toBe(403)
    expect((await call('DELETE', `/api/campaigns/${ID}`, { code: CODE })).status).toBe(200)
    expect((await call('GET', '/api/campaigns')).json).toEqual([])
  })

  it('answers bad JSON with a plain error, no stack trace', async () => {
    const res = await fetch(base + '/api/campaigns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{oops' })
    const text = await res.text()
    expect(res.status).toBe(400)
    expect(JSON.parse(text)).toEqual({ error: 'bad request' })
    expect(res.headers.get('x-powered-by')).toBeNull()
  })
})

describe('images', () => {
  beforeEach(async () => { await create() })

  it('needs the code to read images', async () => {
    await call('PUT', `/api/campaigns/${ID}/images/img_portrait_a`, { code: CODE, data: IMG })
    expect((await call('GET', `/api/campaigns/${ID}/images`)).status).toBe(403)
    const ok = await call('GET', `/api/campaigns/${ID}/images`, undefined, { 'x-campaign-code': CODE })
    expect(ok.json).toEqual({ img_portrait_a: IMG })
  })

  it('refuses keys outside the image namespaces and non-image data', async () => {
    expect((await call('PUT', `/api/campaigns/${ID}/images/soulscraft_codes`, { code: CODE, data: IMG })).status).toBe(400)
    expect((await call('PUT', `/api/campaigns/${ID}/images/img_x`, { code: CODE, data: 'https://evil.example/a.png' })).status).toBe(400)
    expect((await call('PUT', `/api/campaigns/${ID}/images/img_x`, { code: CODE, data: 'data:image/svg+xml;base64,PHN2Zz4=' })).status).toBe(400)
  })

  it('refuses image writes when the disk is full', async () => {
    diskFree = false
    expect((await call('PUT', `/api/campaigns/${ID}/images/img_x`, { code: CODE, data: IMG })).status).toBe(507)
  })
})

describe('live sync', () => {
  beforeEach(async () => { await create() })

  it('closes a socket that subscribes with the wrong code', async () => {
    const ws = await openSocket()
    const closed = nextClose(ws)
    ws.send(JSON.stringify({ type: 'subscribe', campaignId: ID, clientId: 'x', code: 'wrong-code' }))
    expect(await closed).toBe(4003)
  })

  it('closes a socket that subscribes without a code', async () => {
    const ws = await openSocket()
    const closed = nextClose(ws)
    ws.send(JSON.stringify({ type: 'subscribe', campaignId: ID, clientId: 'x' }))
    expect(await closed).toBe(4003)
  })

  it('sends updates to a socket that subscribed with the code, but not back to the sender', async () => {
    const ws = await openSocket()
    const subscribed = nextMessage(ws)
    ws.send(JSON.stringify({ type: 'subscribe', campaignId: ID, clientId: 'me', code: CODE }))
    expect((await subscribed).type).toBe('subscribed')

    const update = nextMessage(ws)
    await call('PUT', `/api/campaigns/${ID}`, { code: CODE, patch: { quests: [] } }, { 'x-client-id': 'me' })
    await call('PUT', `/api/campaigns/${ID}`, { code: CODE, patch: { quests: [1] } }, { 'x-client-id': 'other' })
    const msg = await update
    expect(msg.type).toBe('update')
    expect((msg.data as Record<string, unknown>).quests).toEqual([1])
    ws.close()
  })

  it('drops subscribers when the code changes', async () => {
    const ws = await openSocket()
    const subscribed = nextMessage(ws)
    ws.send(JSON.stringify({ type: 'subscribe', campaignId: ID, clientId: 'me', code: CODE }))
    await subscribed
    const { hashCode } = await import('../codes.js')
    built.stmts.setCode.run(hashCode('new-code-99'), ID)
    const closed = nextClose(ws)
    await call('PUT', `/api/campaigns/${ID}`, { code: 'new-code-99', patch: { quests: [] } }, { 'x-client-id': 'other' })
    expect(await closed).toBe(4003)
  })
})
