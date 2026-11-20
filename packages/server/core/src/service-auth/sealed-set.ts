import { webcrypto } from 'node:crypto';
import type { PrivateEcJwk } from '@walkeros/core';
import { ascii, base64url } from './jws';

/**
 * A release's secret values as the app seals them to one credential: a
 * compact JWE (RFC 7516), ECDH-ES key agreement (RFC 7518 section 4.6) with
 * A256GCM, and nothing else taken. Both sides are walkerOS's, so the form is
 * fixed: the encrypted key is empty; the protected header holds exactly
 * `alg`, `enc`, `epk`, `kid`, `deployment` and `sequence`; the plaintext is
 * UTF-8 JSON `{ deployment, sequence, values }`. The header is checked
 * before any key work, and the plaintext again after it, against the key,
 * the deployment and the sequence the caller expects.
 */

const HEADER_MEMBERS = ['alg', 'enc', 'epk', 'kid', 'deployment', 'sequence'];
const EPK_MEMBERS = ['kty', 'crv', 'x', 'y'];
const ECDH_P256 = { name: 'ECDH', namedCurve: 'P-256' };
const BASE64URL = /^[A-Za-z0-9_-]*$/;
/** 32 bytes in base64url without padding: a P-256 coordinate. */
const COORDINATE = /^[A-Za-z0-9_-]{43}$/;
const IV_BYTES = 12;
const TAG_BYTES = 16;

/** A fact about the sealed set; none quotes a part of it, a value or a key. */
const FACT = {
  compact: 'The sealed set is not a compact JWE of five parts',
  encoding: 'The sealed set has a part that is not base64url',
  encryptedKey: 'The sealed set carries an encrypted key',
  header: "The sealed set's header is not a JSON object",
  members:
    "The sealed set's header does not hold exactly alg, enc, epk, kid, deployment and sequence",
  alg: "The sealed set's alg is not ECDH-ES",
  enc: "The sealed set's enc is not A256GCM",
  epk: "The sealed set's epk is not a P-256 public key",
  kid: 'The sealed set is sealed to another key',
  headerDeployment: "The sealed set's header names another deployment",
  headerSequence: "The sealed set's header names another sequence",
  iv: "The sealed set's IV is not 12 bytes",
  tag: "The sealed set's tag is not 16 bytes",
  open: 'The sealed set does not open with this key',
  content: "The sealed set's content is not a JSON object",
  contentDeployment: "The sealed set's content names another deployment",
  contentSequence: "The sealed set's content names another sequence",
  values: "The sealed set's values are not an object of strings",
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Exactly `members`, each own, `__proto__` included. */
function holdsExactly(
  value: Record<string, unknown>,
  members: readonly string[],
): boolean {
  const names = Object.keys(value);
  return (
    names.length === members.length &&
    names.every((name) => members.includes(name))
  );
}

/** A part's bytes, only when it is base64url as RFC 7515 writes it: no padding, no other character, no stray bits. */
function decodePart(part: string): Uint8Array<ArrayBuffer> | undefined {
  if (!BASE64URL.test(part)) return undefined;
  const bytes = Buffer.from(part, 'base64url');
  return base64url(bytes) === part ? new Uint8Array(bytes) : undefined;
}

/** UTF-8 JSON, or undefined for bytes that are not. */
function jsonOf(bytes: Uint8Array): unknown {
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    return undefined;
  }
}

function uint32(value: number): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value);
  return bytes;
}

function joined(parts: readonly Uint8Array[]): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(
    parts.reduce((total, part) => total + part.byteLength, 0),
  );
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.byteLength;
  }
  return bytes;
}

/** A datum of the KDF's OtherInfo: its length as 32 bits, then its bytes. */
const datum = (bytes: Uint8Array) => joined([uint32(bytes.byteLength), bytes]);

/**
 * The Concat KDF (NIST SP 800-56A section 5.8.1) as RFC 7518 section 4.6.2
 * uses it, for keys of at most 256 bits, so one SHA-256 round: the counter
 * 1, Z, then the OtherInfo of AlgorithmID, PartyUInfo and PartyVInfo, each
 * as a datum, and SuppPubInfo, the key length in bits.
 */
export async function concatKdf(
  z: Uint8Array,
  info: {
    algorithm: string;
    partyUInfo: Uint8Array;
    partyVInfo: Uint8Array;
    keyBits: 128 | 256;
  },
): Promise<Uint8Array<ArrayBuffer>> {
  const round = await webcrypto.subtle.digest(
    'SHA-256',
    joined([
      uint32(1),
      z,
      datum(ascii(info.algorithm)),
      datum(info.partyUInfo),
      datum(info.partyVInfo),
      uint32(info.keyBits),
    ]),
  );
  return new Uint8Array(round).slice(0, info.keyBits / 8);
}

const agreementKeys = new WeakMap<PrivateEcJwk, Promise<webcrypto.CryptoKey>>();

/** The private key as a non-extractable ECDH key, imported once per JWK. */
function agreementKey(jwk: PrivateEcJwk): Promise<webcrypto.CryptoKey> {
  let key = agreementKeys.get(jwk);
  if (!key) {
    const { kty, crv, x, y, d } = jwk;
    key = webcrypto.subtle.importKey(
      'jwk',
      { kty, crv, x, y, d },
      ECDH_P256,
      false,
      ['deriveBits'],
    );
    agreementKeys.set(jwk, key);
  }
  return key;
}

/** The sender's ephemeral key; WebCrypto refuses a point off the curve. */
async function ephemeralKey(epk: unknown): Promise<webcrypto.CryptoKey> {
  if (
    !isRecord(epk) ||
    !holdsExactly(epk, EPK_MEMBERS) ||
    epk.kty !== 'EC' ||
    epk.crv !== 'P-256' ||
    typeof epk.x !== 'string' ||
    !COORDINATE.test(epk.x) ||
    typeof epk.y !== 'string' ||
    !COORDINATE.test(epk.y)
  )
    throw new Error(FACT.epk);
  try {
    return await webcrypto.subtle.importKey(
      'jwk',
      { kty: 'EC', crv: 'P-256', x: epk.x, y: epk.y },
      ECDH_P256,
      false,
      [],
    );
  } catch {
    throw new Error(FACT.epk);
  }
}

/**
 * A release's secret values sealed to this credential's encryption key: a
 * compact JWE, ECDH-ES with A256GCM, whose protected header names the key,
 * the deployment and the sequence, opened in memory. Throws an Error naming
 * the fact, never a value.
 */
export async function openSealedSecretSet(
  sealed: Uint8Array,
  expect: { key: PrivateEcJwk; deployment: string; sequence: number },
): Promise<Record<string, string>> {
  const parts = Buffer.from(sealed).toString('latin1').split('.');
  const decoded = parts.map(decodePart);
  if (decoded.length !== 5) throw new Error(FACT.compact);
  const [header, encryptedKey, iv, ciphertext, tag] = decoded;
  if (!header || !encryptedKey || !iv || !ciphertext || !tag)
    throw new Error(FACT.encoding);
  if (encryptedKey.byteLength !== 0) throw new Error(FACT.encryptedKey);

  const protectedHeader = jsonOf(header);
  if (!isRecord(protectedHeader)) throw new Error(FACT.header);
  if (!holdsExactly(protectedHeader, HEADER_MEMBERS))
    throw new Error(FACT.members);
  if (protectedHeader.alg !== 'ECDH-ES') throw new Error(FACT.alg);
  if (protectedHeader.enc !== 'A256GCM') throw new Error(FACT.enc);
  const epk = await ephemeralKey(protectedHeader.epk);
  if (protectedHeader.kid !== expect.key.kid) throw new Error(FACT.kid);
  if (protectedHeader.deployment !== expect.deployment)
    throw new Error(FACT.headerDeployment);
  if (protectedHeader.sequence !== expect.sequence)
    throw new Error(FACT.headerSequence);
  if (iv.byteLength !== IV_BYTES) throw new Error(FACT.iv);
  if (tag.byteLength !== TAG_BYTES) throw new Error(FACT.tag);

  let plaintext: Uint8Array;
  try {
    const z = await webcrypto.subtle.deriveBits(
      { name: 'ECDH', public: epk },
      await agreementKey(expect.key),
      256,
    );
    const cek = await concatKdf(new Uint8Array(z), {
      algorithm: 'A256GCM',
      partyUInfo: new Uint8Array(0),
      partyVInfo: new Uint8Array(0),
      keyBits: 256,
    });
    const aes = await webcrypto.subtle.importKey(
      'raw',
      cek,
      { name: 'AES-GCM' },
      false,
      ['decrypt'],
    );
    plaintext = new Uint8Array(
      await webcrypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv,
          // RFC 7516 section 5.2: the ASCII of the encoded protected header, as sent.
          additionalData: ascii(parts[0]),
          tagLength: TAG_BYTES * 8,
        },
        aes,
        joined([ciphertext, tag]),
      ),
    );
  } catch {
    throw new Error(FACT.open);
  }

  const set = jsonOf(plaintext);
  if (!isRecord(set)) throw new Error(FACT.content);
  if (set.deployment !== expect.deployment)
    throw new Error(FACT.contentDeployment);
  if (set.sequence !== expect.sequence) throw new Error(FACT.contentSequence);
  if (!isRecord(set.values)) throw new Error(FACT.values);
  const entries: Array<[string, string]> = [];
  for (const [name, value] of Object.entries(set.values)) {
    if (typeof value !== 'string') throw new Error(FACT.values);
    entries.push([name, value]);
  }
  // Built from the entries, so a name such as `__proto__` stays a value of
  // its own instead of being dropped by an assignment.
  return Object.fromEntries(entries);
}
