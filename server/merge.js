/** Apply a partial save: only the top-level fields a device changed are replaced,
 *  so saves from two devices can't wipe out each other's unrelated work. */
export function mergeCampaign(existing, patch) {
  return { ...existing, ...patch }
}
