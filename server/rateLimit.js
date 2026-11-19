// Sliding-window counter: allows `max` events per key within `windowMs`.
// Used for wrong-code attempts (per client IP and per campaign) and for
// campaign creation.
export class RateLimiter {
  constructor({ max, windowMs, now = () => Date.now() }) {
    this.max = max
    this.windowMs = windowMs
    this.now = now
    this.events = new Map()   // key -> timestamps, oldest first, at most `max`
  }

  #recent(key) {
    const cutoff = this.now() - this.windowMs
    const list = (this.events.get(key) ?? []).filter(t => t > cutoff)
    if (list.length) this.events.set(key, list)
    else this.events.delete(key)
    return list
  }

  /** Seconds until `key` may act again, or 0 if it may act now. */
  retryAfter(key) {
    const list = this.#recent(key)
    if (list.length < this.max) return 0
    return Math.max(1, Math.ceil((list[0] + this.windowMs - this.now()) / 1000))
  }

  record(key) {
    const list = this.#recent(key)
    list.push(this.now())
    if (list.length > this.max) list.shift()
    this.events.set(key, list)
    if (this.events.size > 10_000) this.#sweep()
  }

  #sweep() {
    for (const key of [...this.events.keys()]) this.#recent(key)
  }
}
