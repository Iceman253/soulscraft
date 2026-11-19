// Size limits and input validation for everything the server accepts.
// The server is reachable from the internet, so every field is checked here
// before it reaches the database or another player's browser.

const MB = 1024 * 1024

export const LIMITS = {
  bodyBytes: 5 * MB,           // largest request body (a 3 MB image plus JSON overhead)
  campaignBytes: 4 * MB,       // a campaign's JSON (real ones are tens of KB)
  imageBytes: 3 * MB,          // one image data URL (a 1600px map background is ~0.5 MB)
  imagesPerCampaign: 1000,
  nameChars: 100,
  codeMin: 6,                  // new and changed codes; older shorter ones still work until changed
  codeMax: 128,
  imageKeyChars: 200,
  clientIdChars: 64,
  wsPayloadBytes: 64 * 1024,   // clients only ever send a small subscribe message
  wsClients: 200,
  wsClientsPerIp: 20,
  wsAuthTimeoutMs: 10_000,     // a socket must subscribe with a valid code within this time
}

/** Campaign ids are UUIDs from the browser; allow the URL-safe set, nothing else. */
export const isValidId = (v) => typeof v === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(v)

export const isValidName = (v) =>
  typeof v === 'string' && v.trim().length > 0 && v.length <= LIMITS.nameChars

/** Rules for a code being set (create, import, set-code). */
export const isValidNewCode = (v) =>
  typeof v === 'string' && v.length >= LIMITS.codeMin && v.length <= LIMITS.codeMax

export const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

// Image keys become localStorage keys in every player's browser, so they must stay
// inside the image namespaces and can never overwrite the app's own keys
// (remembered codes, client id, ...).
const IMAGE_KEY = /^(img_|soulscraft_mapbg_)[^\u0000-\u001f\u007f]+$/u
export const isValidImageKey = (v) =>
  typeof v === 'string' && v.length <= LIMITS.imageKeyChars && IMAGE_KEY.test(v)

// Only raster base64 data URLs: no SVG (scriptable), no remote URLs (tracking),
// and no characters that could break out of a CSS url(...).
const IMAGE_DATA = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/
export const isValidImageData = (v) =>
  typeof v === 'string' && v.length <= LIMITS.imageBytes && IMAGE_DATA.test(v)

/** Byte size of a value once stored as JSON. */
export const jsonBytes = (v) => Buffer.byteLength(JSON.stringify(v) ?? '', 'utf8')
