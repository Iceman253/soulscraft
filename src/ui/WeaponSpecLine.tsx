import { describeWeaponSpec } from '../lib/rules/weaponSpec'
import type { WeaponSpec } from '../types'

/** A weapon's type, power and abilities on one small line. */
export function WeaponSpecLine({ spec, className = '' }: { spec: WeaponSpec; className?: string }) {
  return <div className={`text-[11px] text-purple-300/90 leading-snug ${className}`}>⚔️ {describeWeaponSpec(spec)}</div>
}
