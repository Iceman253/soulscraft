import { useState } from 'react'
import type { Character } from '../../../types'
import type { LevelUpInitialState } from '../../characters/LevelUpModal'
import { useRequestStore } from '../../requests/store'
import { levelUpInitialFrom, skillApprovalStatus } from '../../requests/skillApproval'

/** The level-up button's state: a proposal pending with the GM, a denied one to
 *  retry, and whether the level-up modal is open (and what it starts with). */
export function useLevelUpFlow(character: Character | undefined) {
  const requests = useRequestStore(s => s.requests)
  const clearRequest = useRequestStore(s => s.clearRequest)
  const [open, setOpen] = useState(false)
  const [initial, setInitial] = useState<LevelUpInitialState | undefined>()
  const { pending, denied } = skillApprovalStatus(requests, character?.id)

  return {
    pending,
    denied,
    open,
    initial,
    openFresh() { setInitial(undefined); setOpen(true) },
    /** Reopen the modal with the denied proposal filled in. */
    retryDenied() {
      if (!denied) return
      setInitial(levelUpInitialFrom(denied.payload))
      clearRequest(denied.id)
      setOpen(true)
    },
    dismissDenied() { if (denied) clearRequest(denied.id) },
    close() { setOpen(false); setInitial(undefined) },
  }
}
