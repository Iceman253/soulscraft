import { loadPortrait } from '../lib/imageCache'

interface TokenAvatarProps {
  name: string
  characterId: string
  size?: number
  className?: string
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function colorForName(name: string): string {
  const colors = ['#2d6a2d', '#8b2500', '#3d1a6e', '#1a5c7a', '#7a4a1a', '#4a1a7a', '#1a7a5c']
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0
  return colors[Math.abs(h) % colors.length]
}

export function TokenAvatar({ name, characterId, size = 32, className = '' }: TokenAvatarProps) {
  const portrait = loadPortrait(characterId)
  const abbr = initials(name)
  const bg = colorForName(name)

  if (portrait) {
    return (
      <img
        src={portrait}
        alt={name}
        width={size}
        height={size}
        className={`rounded-full object-cover border-2 border-stone-600 shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center border-2 border-stone-600 shrink-0 font-bold text-white ${className}`}
      style={{ width: size, height: size, background: bg, fontSize: size * 0.35 }}
    >
      {abbr}
    </div>
  )
}
