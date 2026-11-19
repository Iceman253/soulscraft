// React Flow node and edge types for the world map.
import type { NodeProps } from '@xyflow/react'
import { TokenAvatar } from '../../../ui/TokenAvatar'
import type { Character } from '../../../types'
import { cssImageUrl } from '../../../lib/platform/imageSafety'

/** A free-floating character token on the world map (dropped on empty canvas). */
export function TokenNode({ data }: NodeProps) {
  const c = (data as { char: Character }).char
  return (
    <div className="flex flex-col items-center gap-0.5" title={c.name}>
      <div className="rounded-full ring-2 ring-gold/70 shadow-lg">
        <TokenAvatar name={c.name} characterId={c.id} size={34} />
      </div>
      <span className="text-[10px] text-stone-100 bg-stone-900/85 px-1 rounded-sm whitespace-nowrap max-w-24 truncate">{c.name}</span>
    </div>
  )
}

/** Map background rendered in flow space, so it pans/zooms with the nodes. */
export function MapBackgroundNode({ data }: NodeProps) {
  const { url, w, h } = data as unknown as { url: string; w: number; h: number }
  return (
    <div style={{ width: w, height: h, backgroundImage: cssImageUrl(url), backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', opacity: 0.5, borderRadius: 4 }} />
  )
}

