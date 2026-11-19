// Works out which client a request came from, for rate limiting.
//
// The Node server only listens on 127.0.0.1, so every request comes through nginx,
// which sets X-Real-IP to the address that connected to it. When that address is
// loopback, the request came through a local proxy (Tailscale Serve/Funnel), which
// appends the real client to X-Forwarded-For, so the LAST entry is the one to trust.
// Earlier entries are whatever the client claimed and are ignored.
const LOOPBACK = /^(127\.|::1$|::ffff:127\.)/

const first = (v) => (Array.isArray(v) ? v[0] : v)

export function clientIp(headers, socketAddress) {
  const real = String(first(headers['x-real-ip']) || socketAddress || 'unknown').trim()
  if (LOOPBACK.test(real)) {
    const forwarded = String(first(headers['x-forwarded-for']) ?? '')
      .split(',').map(s => s.trim()).filter(Boolean)
    if (forwarded.length) return forwarded[forwarded.length - 1].slice(0, 64)
  }
  return real.slice(0, 64)
}
