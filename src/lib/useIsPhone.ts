import { useState, useEffect } from 'react'

/** True on phone-sized viewports (iPhone / Android). iPad (768px+) and desktop
 *  return false, so they keep the two-column Player View. Reactive to rotation
 *  and window resizing. */
export function useIsPhone(): boolean {
  const query = '(max-width: 767px)'
  const [isPhone, setIsPhone] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  )

  useEffect(() => {
    const mq = window.matchMedia(query)
    const handler = (e: MediaQueryListEvent) => setIsPhone(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return isPhone
}
