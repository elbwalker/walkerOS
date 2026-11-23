import { randomBytes, webcrypto } from 'crypto';

/**
 * The runner tests' own sealer of a release's secret set, as the app seals
 * one to a credential: a compact JWE (RFC 7516), ECDH-ES (RFC 7518 section
 * 4.6) with A256GCM, an empty encrypted key, and a protected header of
 * exactly `alg`, `enc`, `epk`, `kid`, `deployment` and `sequence`. Test code
 * only: walkerOS opens sets and never seals one.
 */

const { subtle } = webcrypto;
const ECDH_P256 = { name: 'ECDH', namedCurve: 'P-256' };

const base64url = (bytes: Uint8Array | string): string =>
  Buffer.from(bytes).toString('base64url');

/** The bytes of an ASCII or UTF-8 text, on an ArrayBuffer of their own. */
const bytesOf = (text: string): Uint8Array<ArrayBuffer> =>
  new Uint8Array(Buffer.from(text, 'utf8'));

function uint32(value: number): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value);
  return bytes;
}

function joined(parts: readonly Uint8Array[]): Uint8Array<ArrayBuffer> {
  return new Uint8Array(Buffer.concat(parts));
}

/**
 * RFC 7518 section 4.6.2's Concat KDF for a 256-bit key, one SHA-256 round:
 * the counter 1, Z, AlgorithmID `A256GCM`, empty PartyUInfo and PartyVInfo,
 * each as its length then its bytes, and SuppPubInfo 256.
 */
async function contentKey(z: Uint8Array): Promise<Uint8Array<ArrayBuffer>> {
  const algorithm = bytesOf('A256GCM');
  const round = await subtle.digest(
    'SHA-256',
    joined([
      uint32(1),
      z,
      uint32(algorithm.byteLength),
      algorithm,
      uint32(0),
      uint32(0),
      uint32(256),
    ]),
  );
  return new Uint8Array(round);
}

/** Every value sealed in this test file, the stand-in's seals included. */
const sealedValues = new Set<string>();

/**
 * The values this sealer has sealed so far: a check for values at rest reads
 * them apart from what the code under test knows, so a value the runner
 * never opened is still searched for.
 */
export function valuesSealed(): string[] {
  return [...sealedValues];
}

/**
 * Seals `values` to `key` (the credential's `enc`; only its public part is
 * read) for one deployment and sequence, named in the header and again in
 * the plaintext. `header` adds or changes members of the header, for a test
 * of a set the opener refuses.
 */
export async function sealSecretSet(input: {
  key: { x: string; y: string; kid: string };
  deployment: string;
  sequence: number;
  values: Record<string, string>;
  header?: Record<string, unknown>;
}): Promise<Uint8Array> {
  for (const value of Object.values(input.values)) sealedValues.add(value);
  const ephemeral = await subtle.generateKey(ECDH_P256, true, ['deriveBits']);
  const { x, y } = await subtle.exportKey('jwk', ephemeral.publicKey);
  const header = {
    alg: 'ECDH-ES',
    enc: 'A256GCM',
    epk: { kty: 'EC', crv: 'P-256', x, y },
    kid: input.key.kid,
    deployment: input.deployment,
    sequence: input.sequence,
    ...input.header,
  };
  const first = base64url(JSON.stringify(header));
  const recipient = await subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', x: input.key.x, y: input.key.y },
    ECDH_P256,
    false,
    [],
  );
  const z = await subtle.deriveBits(
    { name: 'ECDH', public: recipient },
    ephemeral.privateKey,
    256,
  );
  const aes = await subtle.importKey(
    'raw',
    await contentKey(new Uint8Array(z)),
    'AES-GCM',
    false,
    ['encrypt'],
  );
  const iv = new Uint8Array(randomBytes(12));
  const plaintext = JSON.stringify({
    deployment: input.deployment,
    sequence: input.sequence,
    values: input.values,
  });
  const sealed = new Uint8Array(
    await subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
        // RFC 7516 section 5.1: the ASCII of the encoded protected header.
        additionalData: bytesOf(first),
        tagLength: 128,
      },
      aes,
      bytesOf(plaintext),
    ),
  );
  return bytesOf(
    [
      first,
      '',
      base64url(iv),
      base64url(sealed.subarray(0, -16)),
      base64url(sealed.subarray(-16)),
    ].join('.'),
  );
}
