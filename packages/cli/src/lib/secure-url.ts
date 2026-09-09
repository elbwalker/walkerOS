/**
 * Whether a host is the local machine.
 *
 * Loopback traffic never reaches a network segment, so there is nobody in the
 * path to read a token off it. RFC 8252 section 8.3 and OAuth 2.1 both carve
 * out exactly this case, and `http://localhost:3000` is the documented
 * walkerOS development flow.
 */
function isLoopback(hostname: string): boolean {
  // `URL` lowercases the hostname and keeps the brackets on an IPv6 literal.
  return (
    hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
  );
}

/**
 * Refuse a URL that would carry a walkerOS credential in the clear.
 *
 * Every bearer the CLI holds (session, refresh, deploy) is sent to whatever
 * host the app URL names, and that string is user-settable: `WALKEROS_APP_URL`,
 * the config file, and `--url` all feed it. Over plain http to a remote host,
 * anything on the path reads the token.
 *
 * Applied where a credential is ATTACHED, never inside `resolveAppUrl`. That
 * resolver is the tempting single funnel, but it also feeds the paths that
 * merely REPORT the target: telemetry resolves it under a top-level await
 * with no `try`, and diagnostics and the health probe exist to NAME a bad
 * app URL. A resolver that throws poisons the error reporting.
 *
 * Returns the URL, so a caller can pass its value straight through. A string
 * that is not a URL at all is returned untouched: it fails at the request
 * itself, and inferring a scheme for it would only hide that.
 */
export function requireSecureUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  if (parsed.protocol !== 'http:' || isLoopback(parsed.hostname)) return url;

  throw new Error(
    `Refusing to send walkerOS credentials over plain http to ${url}. ` +
      'Use https, or localhost / 127.0.0.1 / [::1] for local development.',
  );
}
