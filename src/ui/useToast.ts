import { useCallback, useEffect, useRef, useState } from 'react'

/** A message that clears itself after `ms`. Showing a new one restarts the timer. */
export function useToast(ms = 3500): [string | null, (message: string) => void] {
  const [message, setMessage] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const show = useCallback((next: string) => {
    clearTimeout(timer.current)
    setMessage(next)
    timer.current = setTimeout(() => setMessage(null), ms)
  }, [ms])
  return [message, show]
}
