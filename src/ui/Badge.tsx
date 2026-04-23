import type { ReactNode } from 'react'

type BadgeVariant = 'default' | 'gold' | 'green' | 'red' | 'blue' | 'orange' | 'purple' | 'muted'

const VARIANTS: Record<BadgeVariant, string> = {
  default: 'bg-stone-700 text-stone-300',
  gold:    'bg-gold/20 text-gold border border-gold/30',
  green:   'bg-emerald/20 text-emerald border border-emerald/30',
  red:     'bg-redstone/20 text-red-400 border border-redstone/30',
  blue:    'bg-blue-900/40 text-blue-300 border border-blue-700/30',
  orange:  'bg-orange-900/40 text-orange-300 border border-orange-700/30',
  purple:  'bg-purple-900/40 text-purple-300 border border-purple-700/30',
  muted:   'bg-stone-700/50 text-stone-400',
}

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${VARIANTS[variant]} ${className}`}>
      {children}
    </span>
  )
}
