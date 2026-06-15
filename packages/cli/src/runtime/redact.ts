import type {
  DedupedError,
  RingEntry,
  RecentError,
  RecentLogEntry,
} from './log-ring.js';

const MAX_LENGTH = 256;

// Minimum length for a standalone run to be considered a candidate token.
const MIN_TOKEN_LEN = 20;

// Shannon entropy threshold (bits/char). Random tokens score high (~4.5-6),
// natural-language words and identifiers score low (~2-3.5).
const ENTROPY_THRESHOLD = 4.0;

// Known secret prefixes that force-mask their run regardless of entropy/shape.
const FORCE_MASK_PREFIXES = [
  'sk-',
  'sk_',
  'pk_',
  'ghp_',
  'gho_',
  'xoxb-',
  'xoxp-',
  'AKIA',
];

// ── Regex constants (all linear — no nested quantifiers) ─────────────────────

// URL credentials: scheme://user:password@host — keep user, mask password.
const RE_URL_CREDS = /(:\/\/[^/:@\s]+:)[^@\s]+(@)/g;

// JSON private_key field value — catches service-account blobs.
// The value may contain escaped newlines (\n as literal backslash-n) which do
// not split the line. [^"] is safe: PEM bodies contain no embedded quotes.
const RE_JSON_PRIVATE_KEY = /("private_key"\s*:\s*)"[^"]*"/g;

// PEM block boundaries (structural removal, not regex masking).
// Case-insensitive, tolerate leading whitespace so a lowercase or indented
// `-----begin private key-----` block does not leak its body.
const RE_PEM_BEGIN = /^\s*-----BEGIN [A-Z ]*PRIVATE KEY-----/i;
const RE_PEM_END = /-----END[A-Z -]*-----/i;

// KEY=value / KEY: value secret pattern.
// ReDoS-safe: the key is anchored to start-of-line or whitespace and bounded to
// 64 chars ({0,63} after the first char), so there is no O(n²) backtracking on
// long no-space lines. The value class includes - and . so hyphenated/dotted
// tokens are captured whole. Two capture groups are preserved in the
// replacement: the leading (^|\s) boundary and the key=.
const TOKEN_VALUE_CLASS = '[A-Za-z0-9+/._-]';
const RE_KV_SECRET = new RegExp(
  `(^|\\s)([A-Za-z_][A-Za-z0-9_.]{0,63}\\s*[=:]\\s*)(${TOKEN_VALUE_CLASS}{12,}={0,2})`,
  'g',
);

// Standalone candidate runs: any run of token chars (incl. - and .) ≥ 20.
// The decision to mask happens in the callback (shouldMaskToken), keeping the
// regex itself trivial and linear.
const RE_TOKEN_RUN = new RegExp(`${TOKEN_VALUE_CLASS}{${MIN_TOKEN_LEN},}`, 'g');

// Force-mask prefix detector for runs that carry a known secret prefix.
// Matches a known prefix followed by token chars (any length), so e.g.
// `ghp_xxxxxxxx` or `xoxb-2384-2384-AbCdEf` is masked even under 20 chars.
// Built from FORCE_MASK_PREFIXES so the list is the single source of truth.
// Prefixes are regex-escaped (only `-`/`_` appear, both literal here, but escape
// defensively) and ordered longest-first so the alternation is unambiguous.
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
const PREFIX_ALTERNATION = [...FORCE_MASK_PREFIXES]
  .sort((a, b) => b.length - a.length)
  .map(escapeRegex)
  .join('|');
const RE_PREFIXED_TOKEN = new RegExp(
  `(?:${PREFIX_ALTERNATION})${TOKEN_VALUE_CLASS}*`,
  'g',
);

// ── Entropy ──────────────────────────────────────────────────────────────────

/** Shannon entropy in bits per character. Linear in input length. */
function shannonEntropy(s: string): number {
  if (s.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const ch of s) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  let entropy = 0;
  for (const count of counts.values()) {
    const p = count / s.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

// ── Token masking decision ─────────────────────────────────────────────────

const RE_ALL_HEX = /^[0-9a-fA-F]+$/;
const RE_ALL_DIGIT = /^[0-9]+$/;
const RE_BASE64_SPECIAL = /[+/=]/;
const RE_HAS_DIGIT = /[0-9]/;
const RE_HAS_LETTER = /[A-Za-z]/;

/**
 * Decide whether a ≥20-char candidate run is a secret to mask.
 *
 * Mask when ANY of:
 *  - all-hex (digests, SHA, etc.)
 *  - all-digit (numeric tokens/ids)
 *  - contains a base64 special char (+ / =)
 *  - contains both a digit and a letter (mixed token)
 *  - Shannon entropy ≥ 4.0 bits/char (random all-letter / mixed-case tokens)
 *
 * ACCEPTED best-effort limitation: a bare all-letters run with no digit, no
 * special char, no known prefix, and entropy < 4.0 (e.g. `supercalifragilistic`
 * or a long camelCase identifier like `getUserAccountSettings`) may pass through
 * unmasked. Masking every such run would destroy log readability by redacting
 * ordinary identifiers and words, which defeats the purpose of legible
 * diagnostics. This is a deliberate trade-off, not an oversight.
 */
function shouldMaskToken(run: string): boolean {
  if (RE_ALL_HEX.test(run)) return true;
  if (RE_ALL_DIGIT.test(run)) return true;
  if (RE_BASE64_SPECIAL.test(run)) return true;
  if (RE_HAS_DIGIT.test(run) && RE_HAS_LETTER.test(run)) return true;
  if (shannonEntropy(run) >= ENTROPY_THRESHOLD) return true;
  return false;
}

// ── PEM block removal ────────────────────────────────────────────────────────

/**
 * Remove all PEM private-key blocks from an array of lines.
 * A block starts at a BEGIN PRIVATE KEY marker and ends at the matching END
 * marker (inclusive). If no END is found, everything to end of entry is dropped.
 */
function removePemBlocks(lines: string[]): string[] {
  const out: string[] = [];
  let inBlock = false;

  for (const line of lines) {
    if (!inBlock) {
      if (RE_PEM_BEGIN.test(line)) {
        inBlock = true;
        continue; // start-of-block line dropped
      }
      out.push(line);
    } else {
      if (RE_PEM_END.test(line)) {
        inBlock = false;
      }
      // drop every in-block line, including the END marker
    }
  }

  return out;
}

// ── Per-line secret masking ──────────────────────────────────────────────────

/**
 * Mask secrets in a single (non-PEM) line.
 * All patterns are applied in order; all regex are linear (no nested quantifiers).
 */
function maskLine(line: string): string {
  let s = line;

  // 1. URL credentials: ://user:secret@host → ://user:***@host
  s = s.replace(RE_URL_CREDS, '$1***$2');

  // 2. KEY=secret / KEY: secret (anchored, bounded key — ReDoS-safe)
  s = s.replace(RE_KV_SECRET, '$1$2***');

  // 3. Known-prefix tokens (force-mask regardless of length/entropy)
  s = s.replace(RE_PREFIXED_TOKEN, '***');

  // 4. Standalone candidate runs ≥ 20 chars — mask by shape/entropy
  s = s.replace(RE_TOKEN_RUN, (match) =>
    shouldMaskToken(match) ? '***' : match,
  );

  return s;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Redact a log line (or multi-line entry) so it is safe to transmit over the
 * heartbeat. This is the sole defense between runner logs and the app.
 *
 * Algorithm:
 * 1. Mask JSON private_key fields BEFORE splitting (service-account blobs embed
 *    PEM blocks as \\n-encoded strings; masking first prevents the BEGIN marker
 *    from appearing on its own line and dropping surrounding fields).
 * 2. Split on \\n.
 * 3. Remove PEM private-key blocks structurally (BEGIN…END inclusive,
 *    case-insensitive; a no-END block drops to end of entry).
 * 4. For each surviving line: mask URL creds, KEY=secret, prefixed tokens,
 *    high-entropy/shape-based token runs.
 * 5. Rejoin with \\n.
 * 6. Truncate to 256 chars + '…' AFTER masking, so a token straddling char 256
 *    is masked, not left partially visible.
 */
export function redactLine(line: string): string {
  // Step 1: JSON private_key masking before any line splitting
  const withoutJsonKey = line.replace(RE_JSON_PRIVATE_KEY, '$1"***"');

  // Step 2: split
  const rawLines = withoutJsonKey.split('\n');

  // Step 3: remove PEM blocks (any remaining standalone markers after step 1)
  const cleanLines = removePemBlocks(rawLines);

  // Step 4: mask each surviving line
  const maskedLines = cleanLines.map(maskLine);

  // Step 5: rejoin
  const joined = maskedLines.join('\n');

  // Step 6: truncate AFTER masking.
  // Reserve one char for the ellipsis so the TOTAL length is at most MAX_LENGTH
  // (256). The app's heartbeat schema enforces message .max(256); a 257-char
  // string would fail zod .parse and drop the whole heartbeat.
  if (joined.length > MAX_LENGTH) {
    return joined.slice(0, MAX_LENGTH - 1) + '…';
  }

  return joined;
}

/**
 * Map an array of DedupedError entries through redactLine,
 * converting numeric timestamps to ISO-8601 strings.
 */
export function redactErrors(errors: DedupedError[]): RecentError[] {
  return errors.map((e) => ({
    message: redactLine(e.message),
    count: e.count,
    firstSeen: new Date(e.firstSeen).toISOString(),
    lastSeen: new Date(e.lastSeen).toISOString(),
  }));
}

/**
 * Map an array of RingEntry log entries through redactLine,
 * converting numeric timestamps to ISO-8601 strings.
 */
export function redactLogs(entries: RingEntry[]): RecentLogEntry[] {
  return entries.map((e) => ({
    time: new Date(e.time).toISOString(),
    level: e.level,
    message: redactLine(e.message),
  }));
}
