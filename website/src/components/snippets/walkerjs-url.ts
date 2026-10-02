/**
 * Where the ready-made walker.js file is served. One constant, so a move to
 * another host is a one-line change.
 */
export const WALKERJS_HOST = 'https://static.walkeros.io';

/**
 * The release-line URL for a package version: `4.7.3` and `4.8.0-next-123`
 * map to `v4.7` and `v4.8`. Patch releases replace the file at this URL.
 */
export function walkerjsUrl(version: string): string {
  const [major, minor] = version.split('.');
  return `${WALKERJS_HOST}/v${major}.${minor}/walker.js`;
}

/** The URL of one exact release, which never changes once published. */
export function walkerjsPinnedUrl(version: string): string {
  return `${WALKERJS_HOST}/v${version}/walker.js`;
}
