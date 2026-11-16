// Hazard damage presets for the dice roller (lava, falling, explosions...).
import { Flame, Droplets, ArrowDown, Bomb, Wind } from 'lucide-react'

export interface HazardPreset {
  name: string
  formula: string             // e.g. "3d6"
  description: string
  icon: React.ReactNode
  ignoresDef?: boolean
}

export const HAZARDS: HazardPreset[] = [
  { name: 'Lava — full submerge',  formula: '5d6', description: 'Per round of full submersion. DEF reduced by half (round down).', icon: <Flame size={12} /> },
  { name: 'Lava — splash',         formula: '2d6', description: 'A splash or brief contact. DEF applies normally.',                  icon: <Flame size={12} /> },
  { name: 'Fire — engulfed',       formula: '3d6', description: 'Per round on fire. Wet/Resistance halves.',                          icon: <Flame size={12} /> },
  { name: 'Drowning',              formula: '1d10',description: 'Per round without air. Ignores DEF.',                                icon: <Droplets size={12} />, ignoresDef: true },
  { name: 'Falling — short',       formula: '2d6', description: '3–5 blocks. DEF applies. Feather Falling halves.',                   icon: <ArrowDown size={12} /> },
  { name: 'Falling — long',        formula: '4d6', description: '6+ blocks. DEF applies. Feather Falling halves.',                    icon: <ArrowDown size={12} /> },
  { name: 'Explosion — small',     formula: '3d6', description: 'TNT, creeper at range. DEF applies.',                                icon: <Bomb    size={12} /> },
  { name: 'Explosion — large',     formula: '6d6', description: 'Direct creeper hit, charged TNT. DEF applies.',                      icon: <Bomb    size={12} /> },
  { name: 'Suffocation',           formula: '1d6', description: 'Per round trapped in solid block. Ignores DEF.',                     icon: <Wind    size={12} />, ignoresDef: true },
]
