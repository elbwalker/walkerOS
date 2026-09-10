/**
 * One spelling of a walkerOS app base URL, so every consumer concatenates a
 * path onto the same shape.
 *
 * The two doors resolve their base from different worlds and neither
 * guarantees the shape on its own: the local door hands back whatever
 * `WALKEROS_APP_URL` or the CLI config file holds, and a valid URL may carry a
 * trailing slash, a query string or a fragment. Normalizing at the seam is what
 * keeps a link built from one door from reading
 * `https://app.example.com//projects/...` while the same link from the other
 * door reads cleanly.
 *
 * A query or a fragment is worse than a stray slash, because a path appended to
 * one lands INSIDE it: `https://app.example.com?a=b` plus `/projects/p1` reads
 * `https://app.example.com?a=b/projects/p1`, which is a broken link that a tool
 * then puts in somebody's chat transcript. Neither belongs on a base URL, so
 * both are dropped. The path is kept: an app mounted under a subpath is a real
 * deployment, and dropping it would break every link instead of fixing one.
 *
 * This never throws, deliberately. Its callers include `diagnostics`, whose job
 * is to NAME a misconfigured app URL; a normalizer that threw would take out
 * the tool that exists to report the problem. A string that does not parse as a
 * URL is handed back with only its trailing slashes trimmed, and fails later at
 * the request, where the error names the URL.
 */
export function normalizeBaseUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return stripTrailingSlashes(url);
  }

  parsed.search = '';
  parsed.hash = '';
  return stripTrailingSlashes(parsed.toString());
}

function stripTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '');
}
