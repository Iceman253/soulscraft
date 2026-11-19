// Refuse writes when the disk is nearly full, so nobody can fill the container
// (which would also break the database, logs and the OS).
import { statfsSync } from 'node:fs'

export function freeBytes(dir) {
  const s = statfsSync(dir)
  return Number(s.bavail) * Number(s.bsize)
}

/** Returns a function that says whether there is room to write. */
export function makeDiskGuard(dir, minFreeBytes, free = freeBytes) {
  return () => {
    try { return free(dir) >= minFreeBytes } catch { return true }   // can't tell: don't block
  }
}
