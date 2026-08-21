/**
 * Parser for the three low-entropy User-Agent client hints, covering the
 * RFC 8941 structured-field subset these headers actually use: an sf-list of
 * sf-strings with a `v` parameter, an sf-boolean, and a bare sf-string.
 *
 * Chromium injects deliberately fake GREASE brands in any position, with any
 * name and rotating punctuation, so filtering is mandatory before any brand or
 * version comparison.
 */

export interface ChUaBrand {
  /** Brand as sent, e.g. 'Chromium', 'Google Chrome'. */
  brand: string;
  /** Significant (major) version as sent, e.g. '124'. */
  version: string;
}

const ITEM = /^\s*"([^"]*)"\s*(?:;\s*v\s*=\s*"?([^";]*)"?)?\s*$/;

/** GREASE brands normalize to `notabrand` once punctuation and case are dropped. */
const isGrease = (brand: string): boolean =>
  brand.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === 'notabrand';

/** Splits an sf-list on commas that sit outside quoted strings. */
function splitItems(header: string): string[] | undefined {
  const items: string[] = [];
  let current = '';
  let inQuotes = false;

  for (const char of header) {
    if (char === '"') inQuotes = !inQuotes;
    if (char === ',' && !inQuotes) {
      items.push(current);
      current = '';
      continue;
    }
    current += char;
  }

  if (inQuotes) return undefined;
  items.push(current);
  return items;
}

/** Parses a Sec-CH-UA header value into GREASE-filtered brands. Malformed input yields []. */
export function parseSecChUa(header: string): ChUaBrand[] {
  if (!header) return [];

  const items = splitItems(header);
  if (!items) return [];

  const brands: ChUaBrand[] = [];
  for (const item of items) {
    const match = ITEM.exec(item);
    if (!match) return [];
    const brand = match[1];
    if (isGrease(brand)) continue;
    brands.push({ brand, version: match[2] ?? '' });
  }

  return brands;
}

/** '?1' -> true, '?0' -> false, anything else -> undefined. */
export function parseSecChUaMobile(header: string): boolean | undefined {
  const value = header.trim();
  if (value === '?1') return true;
  if (value === '?0') return false;
  return undefined;
}

/** Unquotes an sf-string, e.g. '"macOS"' -> 'macOS'. Malformed input yields undefined. */
export function parseSecChUaPlatform(header: string): string | undefined {
  const match = /^\s*"([^"]*)"\s*$/.exec(header);
  return match ? match[1] : undefined;
}
