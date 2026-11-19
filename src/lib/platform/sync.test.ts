import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// A stand-in for the browser WebSocket, recording what the client sends.
class FakeSocket {
  static last: FakeSocket | null = null
  sent: string[] = []
  onopen: (() => void) | null = null
  onmessage: ((e: { data: string }) => void) | null = null
  onclose: ((e: { code: number }) => void) | null = null
  onerror: (() => void) | null = null
  constructor(public url: string) { FakeSocket.last = this }
  send(s: string) { this.sent.push(s) }
  close() {}
}

vi.mock('./api', () => ({ getClientId: () => 'client-1' }))

import { connectSync, disconnectSync, reconnectDelay } from './sync'

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('WebSocket', FakeSocket)
  vi.stubGlobal('location', { protocol: 'https:', host: 'example.test' })
  FakeSocket.last = null
})
afterEach(() => { disconnectSync(); vi.unstubAllGlobals(); vi.useRealTimers() })

describe('live sync client', () => {
  it('subscribes over wss with the campaign code', () => {
    connectSync('camp', 'secret-code', () => {})
    const ws = FakeSocket.last!
    expect(ws.url).toBe('wss://example.test/ws')
    ws.onopen!()
    expect(JSON.parse(ws.sent[0])).toEqual({ type: 'subscribe', campaignId: 'camp', clientId: 'client-1', code: 'secret-code' })
  })

  it('stops and reports when the server rejects the code', () => {
    const onMsg = vi.fn()
    connectSync('camp', 'old-code', onMsg)
    const first = FakeSocket.last!
    first.onclose!({ code: 4003 })
    expect(onMsg).toHaveBeenCalledWith({ type: 'denied', campaignId: 'camp' })
    vi.advanceTimersByTime(120_000)
    expect(FakeSocket.last).toBe(first)   // no reconnect
  })

  it('reconnects after an ordinary drop', () => {
    connectSync('camp', 'code-123', () => {})
    const first = FakeSocket.last!
    first.onclose!({ code: 1006 })
    vi.advanceTimersByTime(2000)
    expect(FakeSocket.last).not.toBe(first)
  })

  it('ignores the subscribed acknowledgement', () => {
    const onMsg = vi.fn()
    connectSync('camp', 'code-123', onMsg)
    FakeSocket.last!.onmessage!({ data: JSON.stringify({ type: 'subscribed', campaignId: 'camp' }) })
    expect(onMsg).not.toHaveBeenCalled()
  })

  it('backs off longer when rate-limited or busy', () => {
    expect(reconnectDelay(4029)).toBe(60_000)
    expect(reconnectDelay(1013)).toBe(30_000)
    expect(reconnectDelay(4003)).toBeNull()
  })
})
