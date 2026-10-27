import { useMemo } from 'react'
import { ICON_SIZE, iconRuns, isBlankIcon } from '../../lib/pixelArt'
import { TIER_EMOJI } from '../../lib/building'
import type { ProjectTier } from '../../types'

/** Renders a 16×16 build icon crisply at any size; falls back to the tier emoji. */
export function PixelIcon({ icon, tier, size = 32, className = '' }: { icon?: string; tier?: ProjectTier; size?: number; className?: string }) {
  const runs = useMemo(() => iconRuns(icon ?? ''), [icon])
  if (isBlankIcon(icon)) {
    return (
      <span className={`inline-flex items-center justify-center leading-none ${className}`} style={{ width: size, height: size, fontSize: size * 0.7 }}>
        {tier ? TIER_EMOJI[tier] : '🏗️'}
      </span>
    )
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${ICON_SIZE} ${ICON_SIZE}`}
      shapeRendering="crispEdges"
      className={className}
      style={{ imageRendering: 'pixelated' }}
      aria-hidden
    >
      {runs.map(r => <rect key={`${r.x},${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.color} />)}
    </svg>
  )
}
