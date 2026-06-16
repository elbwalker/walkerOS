/**
 * Shared secret redactor. Neutral module imported by BOTH the CLI logger
 * handler (`core/cli-logger.ts`, scrubbing console + ring before egress) and
 * the heartbeat path (`runtime/redact.ts`, scrubbing the ring snapshot before
 * the POST). One set of patterns, no duplication.
 *
 * Two entry points:
 * - `scrubSecrets(line)`: mask secrets, keep the message length intact (for
 *   console/stderr legibility).
 * - `redactLine(line)`: `scrubSecrets` plus truncation to the 256-char
 *   heartbeat wire contract.
 *
 * All regex are linear (single unambiguous quantifiers, no nested quantifiers),
 * so there is no catastrophic backtracking even on a BEGIN-marker-with-no-END
 * input or a long no-space line.
 */

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

// JSON service-account field values — catches service-account blobs.
// `private_key` holds the PEM body; `client_email`, `private_key_id`,
// `client_id`, and `client_x509_cert_url` identify and pair with the leaked
// credential and must not ship either (the cert url embeds the URL-encoded
// client email). Naming them explicitly beats relying on the token-run
// heuristics, which can miss an email or a URL. The value may contain escaped
// newlines (\n as literal backslash-n) which do not split the line. [^"] is
// safe: these values contain no embedded quotes. One alternation over the field
// names keeps the scan single-pass and linear.
const RE_JSON_SA_FIELD =
  /("(?:private_key|client_email|private_key_id|client_id|client_x509_cert_url)"\s*:\s*)"[^"]*"/g;

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
// Real base64 padding/special chars. `/` is intentionally EXCLUDED: it is a
// structural path/URL separator (FQNs, gs:// paths, request paths, googleapis
// URLs), not a secret signal. Since redaction now runs on every console line,
// treating `/` as a secret char nuked legitimate BigQuery/GCS diagnostics. Real
// base64 secrets still carry `+`/`=` padding, are all-hex, or are high-entropy.
const RE_BASE64_SPECIAL = /[+=]/;
const RE_HAS_DIGIT = /[0-9]/;
const RE_HAS_LETTER = /[A-Za-z]/;

/**
 * Decide whether a candidate run (a single token, no `/`) is a secret to mask.
 *
 * Mask when ANY of:
 *  - all-hex (digests, SHA, etc.)
 *  - all-digit (numeric tokens/ids)
 *  - contains a base64 special char (+ =)
 *  - contains both a digit and a letter (mixed token)
 *  - Shannon entropy ≥ 4.0 bits/char (random all-letter / mixed-case tokens)
 */
function isSecretSegment(run: string): boolean {
  if (RE_ALL_HEX.test(run)) return true;
  if (RE_ALL_DIGIT.test(run)) return true;
  if (RE_BASE64_SPECIAL.test(run)) return true;
  if (RE_HAS_DIGIT.test(run) && RE_HAS_LETTER.test(run)) return true;
  if (shannonEntropy(run) >= ENTROPY_THRESHOLD) return true;
  return false;
}

/**
 * Decide whether a ≥20-char candidate run is a secret to mask.
 *
 * A run containing `/` is treated as a path/URL structure, not one opaque token.
 * Paths and URLs split into short alphanumeric segments (`v2`, `projects`,
 * `12345`), each of which trips the digit+letter or entropy heuristic on its own
 * even though the whole thing is legible diagnostics. So a `/`-bearing run is
 * masked only when one of its long (≥20-char) segments independently looks like
 * a secret (e.g. a base64 blob embedded in a URL path). A base64 secret with `/`
 * still carries `+`/`=` (handled per-segment) or is hex/high-entropy, so real
 * secrets remain masked while FQNs, gs:// paths, request paths, and googleapis
 * URLs survive.
 *
 * ACCEPTED best-effort limitation: a bare all-letters run with no digit, no
 * special char, no known prefix, and entropy < 4.0 (e.g. `supercalifragilistic`
 * or a long camelCase identifier like `getUserAccountSettings`) may pass through
 * unmasked. Masking every such run would destroy log readability by redacting
 * ordinary identifiers and words, which defeats the purpose of legible
 * diagnostics. This is a deliberate trade-off, not an oversight.
 */
function shouldMaskToken(run: string): boolean {
  if (run.includes('/')) {
    // Per-segment: only mask if a long segment is itself secret-shaped. Short
    // path segments (the bulk of any URL) never qualify, keeping URLs legible.
    return run
      .split('/')
      .filter((segment) => segment.length >= MIN_TOKEN_LEN)
      .some(isSecretSegment);
  }
  return isSecretSegment(run);
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

  // 2. KEY=secret / KEY: secret (anchored, bounded key — ReDoS-safe).
  // Mask the value only when it is secret-shaped. This stops `scheme://host/...`
  // (matched as `gs:` / `https:` key + `//...` value) from masking legitimate
  // URLs/paths, while real `TOKEN=secret` values still mask. The `/`-aware
  // shouldMaskToken keeps path-shaped values legible.
  s = s.replace(
    RE_KV_SECRET,
    (match: string, boundary: string, keyPart: string, value: string) =>
      shouldMaskToken(value) ? `${boundary}${keyPart}***` : match,
  );

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
 * Scrub credential material from a log line (or multi-line entry) WITHOUT
 * truncating. This is the shared secret redactor used by the CLI logger handler
 * (covers console/stderr and the ring before egress).
 *
 * Algorithm:
 * 1. Mask JSON service-account fields (private_key, client_email,
 *    private_key_id, client_id, client_x509_cert_url) BEFORE splitting
 *    (service-account blobs embed PEM blocks as \\n-encoded strings; masking
 *    first prevents the BEGIN marker from appearing on its own line and dropping
 *    surrounding fields).
 * 2. Split on \\n.
 * 3. Remove PEM private-key blocks structurally (BEGIN…END inclusive,
 *    case-insensitive; a no-END block drops to end of entry).
 * 4. For each surviving line: mask URL creds, KEY=secret, prefixed tokens,
 *    high-entropy/shape-based token runs.
 * 5. Rejoin with \\n.
 */
export function scrubSecrets(line: string): string {
  // Step 1: JSON service-account field masking before any line splitting
  const withoutJsonKey = line.replace(RE_JSON_SA_FIELD, '$1"***"');

  // Step 2: split
  const rawLines = withoutJsonKey.split('\n');

  // Step 3: remove PEM blocks (any remaining standalone markers after step 1)
  const cleanLines = removePemBlocks(rawLines);

  // Step 4: mask each surviving line
  const maskedLines = cleanLines.map(maskLine);

  // Step 5: rejoin
  return maskedLines.join('\n');
}

/**
 * Redact a log line and truncate to the heartbeat wire contract (256 chars).
 * This is the heartbeat-egress variant: scrub secrets, then truncate AFTER
 * masking so a token straddling char 256 is masked, not left partially visible.
 *
 * The app's heartbeat schema enforces message .max(256); a 257-char string
 * would fail zod .parse and drop the whole heartbeat. Reserve one char for the
 * ellipsis so the TOTAL length is at most MAX_LENGTH (256).
 */
export function redactLine(line: string): string {
  const scrubbed = scrubSecrets(line);

  if (scrubbed.length > MAX_LENGTH) {
    return scrubbed.slice(0, MAX_LENGTH - 1) + '…';
  }

  return scrubbed;
}
