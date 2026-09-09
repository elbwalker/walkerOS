/**
 * One spelling of a walkerOS app base URL, so every consumer concatenates a
 * path onto the same shape.
 *
 * The two doors resolve their base from different worlds and neither
 * guarantees the shape on its own: the local door hands back whatever
 * `WALKEROS_APP_URL` or the CLI config file holds, and a valid URL may carry a
 * trailing slash. Normalizing at the seam is what keeps a link built from one
 * door from reading `https://app.example.com//projects/...` while the same
 * link from the other door reads cleanly.
 */
export function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}
