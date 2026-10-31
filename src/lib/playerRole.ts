/** Which UI this device gets: null = GM; a string = player, bound to that
 *  character ('' = a player without a character yet). Phones are always players. */
export function resolvePlayerRole(isPhone: boolean, playerCharacterId: string | null): string | null {
  return isPhone ? (playerCharacterId ?? '') : playerCharacterId
}

/** A player with no living character of their own must create or adopt one. */
export function playerNeedsCharacter(boundCharacter: { isDead?: boolean } | undefined): boolean {
  return !boundCharacter || !!boundCharacter.isDead
}
