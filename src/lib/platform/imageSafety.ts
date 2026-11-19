// Checks applied to images that arrive from the server before they are cached
// or rendered. They mirror the server's rules (server/limits.js), so a bad entry
// is ignored even if it somehow got stored.

const IMAGE_KEY = /^(img_|soulscraft_mapbg_)[^\u0000-\u001f\u007f]+$/u   // eslint-disable-line no-control-regex
const IMAGE_DATA = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/

/** Only raster base64 data URLs: nothing remote, no SVG, nothing that can break out of CSS url(...). */
export const isSafeImageData = (data: unknown): data is string =>
  typeof data === 'string' && IMAGE_DATA.test(data)

/** Image keys must stay in the image namespaces so they can't overwrite app settings. */
export const isSafeImageKey = (key: string) => key.length <= 200 && IMAGE_KEY.test(key)

export const isSafeImageEntry = (key: string, data: unknown): data is string =>
  isSafeImageKey(key) && isSafeImageData(data)

/** A CSS background-image value for a cached image, or undefined if it isn't a safe image. */
export const cssImageUrl = (data: string | null | undefined) =>
  isSafeImageData(data) ? `url("${data}")` : undefined
