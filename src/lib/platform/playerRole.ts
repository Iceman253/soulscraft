/** Which UI this device gets: null = GM; a string = player, bound to that
 *  character ('' = a player without a character yet). Phones are always players. */
export function resolvePlayerRole(isPhone: boolean, playerCharacterId: string | null): string | null {
  return isPhone ? (playerCharacterId ?? '') : playerCharacterId
}

/** A player with no living character of their own must create or adopt one. */
export function playerNeedsCharacter(boundCharacter: { isDead?: boolean } | undefined): boolean {
  return !boundCharacter || !!boundCharacter.isDead
}

/** Whether this viewer may see a character's inventory and wealth.
 *  The GM (no focusedCharacterId) and the owner always can; other players
 *  only when the owner has shared it (character.inventoryShared). */
export function canSeeInventory(
  character: { inventoryShared?: boolean },
  isOwnChar: boolean,
  focusedCharacterId: string | undefined,
): boolean {
  if (isOwnChar || !focusedCharacterId) return true
  return !!character.inventoryShared
}
