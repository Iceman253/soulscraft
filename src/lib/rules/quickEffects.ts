// Common status effects the GM can apply in one click.
export const QUICK_EFFECTS: Array<{
  name: string
  durationType: 'scenes' | 'days' | 'until-rest' | 'permanent' | 'manual'
  defaultDuration?: number
  /** HP lost, rolled and applied each interval (scene/day/combat round). */
  damagePerRound?: string
  /** HP restored, rolled and applied each interval. */
  healPerRound?: string
  /** HP lost to damagePerRound can't be healed while active (Withering, Disintegration). */
  unhealable?: boolean
}> = [
  { name: 'Poison',          durationType: 'scenes',     defaultDuration: 3, damagePerRound: '1d6' },
  { name: 'Weakness',        durationType: 'scenes',     defaultDuration: 3 },
  { name: 'Withering',       durationType: 'manual'                                                },
  { name: 'Freezing',        durationType: 'scenes',     defaultDuration: 2, damagePerRound: '1d6' },
  { name: 'Disintegration',  durationType: 'scenes',     defaultDuration: 3, damagePerRound: '1d6', unhealable: true },
  { name: 'Slowness',        durationType: 'scenes',     defaultDuration: 2 },
  { name: 'Blindness',       durationType: 'scenes',     defaultDuration: 1 },
  { name: 'Fire Resistance', durationType: 'until-rest'                     },
  { name: 'Invisibility',    durationType: 'scenes',     defaultDuration: 3 },
  { name: 'Swiftness',       durationType: 'until-rest'                     },
  { name: 'Regeneration',    durationType: 'scenes',     defaultDuration: 3, healPerRound: '1d6' },
  { name: 'Strength',        durationType: 'scenes',     defaultDuration: 3 },
]
