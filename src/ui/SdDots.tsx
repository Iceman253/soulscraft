interface SdDotsProps {
  current: number
  max: number
  onToggle?: (index: number) => void
  size?: 'sm' | 'md'
}

export function SdDots({ current, max, onToggle, size = 'md' }: SdDotsProps) {
  const dotSize = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'

  return (
    <div className="flex flex-wrap gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <button
          key={i}
          type="button"
          disabled={!onToggle}
          onClick={() => onToggle?.(i)}
          className={`${dotSize} rounded-full border transition-colors ${
            i < current
              ? 'bg-gold border-gold/50'
              : 'bg-stone-700 border-stone-600'
          } ${onToggle ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
        />
      ))}
    </div>
  )
}
