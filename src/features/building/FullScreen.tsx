import type { ReactNode } from 'react'
import { ArrowLeft, X } from 'lucide-react'

/** A full-screen step for player flows: thumb-sized, with room for the content
 *  and the main action always in reach at the bottom. */
export function FullScreen({ title, onClose, onBack, footer, children }: {
  title: string
  onClose: () => void
  onBack?: () => void
  footer?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-950 text-stone-100 pt-[env(safe-area-inset-top)]">
      <div className="shrink-0 flex items-center gap-2 border-b border-stone-700 bg-stone-900 px-2 py-2">
        {onBack && (
          <button onClick={onBack} aria-label="Back" className="p-2.5 text-stone-300 active:text-gold"><ArrowLeft size={22} /></button>
        )}
        <h2 className={`flex-1 min-w-0 truncate font-heading text-lg font-semibold tracking-wide ${onBack ? '' : 'pl-2'}`}>{title}</h2>
        <button onClick={onClose} aria-label="Close" className="p-2.5 text-stone-400 active:text-stone-100"><X size={22} /></button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto h-full w-full max-w-xl">{children}</div>
      </div>
      {footer && (
        <div className="shrink-0 border-t border-stone-700 bg-stone-900 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto w-full max-w-xl">{footer}</div>
        </div>
      )}
    </div>
  )
}

export const primaryBtn = 'w-full py-3.5 rounded-xl bg-gold text-stone-900 text-base font-bold active:bg-yellow-400 hover:bg-yellow-400 disabled:opacity-40'
export const fieldCls = 'w-full bg-stone-900 border border-stone-600 rounded-xl px-3.5 py-3 text-base text-stone-100 outline-hidden focus:border-gold/50'
export const fieldLabelCls = 'block text-sm text-stone-400 mb-1.5'
