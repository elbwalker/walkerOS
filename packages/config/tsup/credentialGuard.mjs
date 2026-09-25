// Guard for published step metadata: dist/walkerOS.json ships to npm and the
// hub, so a real credential pasted into an example or a hint must fail the
// build. Placeholders pass: a PEM with under 64 characters of key material,
// `sk_test_...`, `AKIDEXAMPLE`.

// Base64 characters of key material a PEM body needs to count as real.
const MIN_PEM_KEY_CHARS = 64;

// The marker, then the body: base64 characters, whitespace or an escaped
// `\n`. The alternatives start on different characters, so the scan is linear.
const RE_PEM_BODY =
  /-----BEGIN [A-Z ]*PRIVATE KEY-----((?:[A-Za-z0-9+/=]|\s|\\n)*)/g;

const RE_LIVE_TOKEN =
  /(?:^|[^A-Za-z0-9_])(sk_live_|ghp_|gho_|xoxb-|xoxp-|AKIA[A-Z0-9]{16})/;

function countKeyChars(body) {
  return body.replace(/\\n|\s/g, '').length;
}

/** The rule a string breaks, or undefined when it looks like a placeholder. */
function credentialRule(value) {
  RE_PEM_BODY.lastIndex = 0;
  let match;
  while ((match = RE_PEM_BODY.exec(value)) !== null) {
    if (countKeyChars(match[1]) >= MIN_PEM_KEY_CHARS) return 'PEM private key';
  }
  const token = RE_LIVE_TOKEN.exec(value);
  if (token) {
    const prefix = token[1].startsWith('AKIA') ? 'AKIA' : token[1];
    return `live key token ${prefix}`;
  }
  return undefined;
}

function findInValue(value, path) {
  if (typeof value === 'string') {
    const rule = credentialRule(value);
    return rule ? { path, rule } : undefined;
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const hit = findInValue(value[i], `${path}.${i}`);
      if (hit) return hit;
    }
    return undefined;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      const hit = findInValue(child, `${path}.${key}`);
      if (hit) return hit;
    }
  }
  return undefined;
}

/**
 * The first serialized string in `sections` (e.g. `{ examples, hints }`) that
 * looks like a real credential, as `{ path, rule }`; undefined when none does.
 * The value itself is never returned.
 */
function findPublishedCredential(sections) {
  for (const [name, value] of Object.entries(sections)) {
    if (value === undefined) continue;
    const hit = findInValue(value, name);
    if (hit) return hit;
  }
  return undefined;
}

/** Throw when a published section carries a real-looking credential. */
function assertNoPublishedCredentials(packageName, sections) {
  const hit = findPublishedCredential(sections);
  if (!hit) return;
  throw new Error(
    `${packageName}: ${hit.path} looks like a real credential (${hit.rule}). Replace it with a placeholder, e.g. sk_test_..., or a PEM with fewer than 64 characters of key material.`,
  );
}

export { findPublishedCredential, assertNoPublishedCredentials };
