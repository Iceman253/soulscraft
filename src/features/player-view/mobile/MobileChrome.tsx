import type { ReactNode } from 'react'

/** A titled block on the phone sheet. */
export function Section({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="px-4 mt-5">
      <div className="flex items-center gap-1.5 mb-2.5 text-sm font-semibold text-stone-500 uppercase tracking-wider font-heading">
        {icon}{title}
      </div>
      {children}
    </div>
  )
}

/** One button in the phone's bottom navigation. `alert` pulses red (combat). */
export function NavButton({ active, onClick, icon, label, alert }: {
  active: boolean; onClick: () => void; icon: ReactNode; label: string; alert?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 relative transition-colors ${
        active ? 'text-gold' : alert ? 'text-red-400' : 'text-stone-400'
      }`}
    >
      {alert && !active && <span className="absolute top-2 right-1/3 w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  )
}
