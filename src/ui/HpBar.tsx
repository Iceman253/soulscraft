interface HpBarProps {
  current: number
  max: number
  className?: string
}

export function HpBar({ current, max, className = '' }: HpBarProps) {
  const pct = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0
  const color = pct > 0.5 ? 'bg-emerald' : pct > 0.25 ? 'bg-yellow-500' : 'bg-redstone'

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div className="flex-1 h-2 bg-stone-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct * 100}%` }} />
      </div>
      <span className="text-sm text-stone-400 tabular-nums shrink-0 font-mono">{current}/{max}</span>
    </div>
  )
}
