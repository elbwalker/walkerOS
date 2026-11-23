import { randomBytes, webcrypto } from 'node:crypto';
import { ascii, base64url } from '../../service-auth/jws';
import { concatKdf, openSealedSecretSet } from '../../service-auth/sealed-set';
import { TEST_KEY_ECC_P256, testCredential } from './rfc9421-vectors';
import {
  C_ALGORITHM,
  C_DERIVED_KEY,
  C_KEY_BITS,
  C_PARTY_U_INFO,
  C_PARTY_V_INFO,
  C_Z,
} from './sealed-set-vectors';

const { subtle } = webcrypto;
const ECDH_P256 = { name: 'ECDH', namedCurve: 'P-256' };
const key = testCredential('deployment').enc;
const DEPLOYMENT = 'dep_0123456789abcdefghijk';
const SEQUENCE = 17;
const expected = { key, deployment: DEPLOYMENT, sequence: SEQUENCE };
/** Built from entries, so `__proto__` is a name of its own. */
const VALUES: Record<string, string> = Object.fromEntries([
  ['API_KEY', 'sk-live-4f1c9a7e'],
  ['__proto__', 'a value named __proto__'],
]);

interface Header {
  alg: string;
  enc: string;
  epk: { kty: string; crv: string; x: string; y: string };
  kid: string;
  deployment: string;
  sequence: number;
}

interface PublicKey {
  kty: string;
  crv: string;
  x: string;
  y: string;
}

const utf8 = (text: string) => new Uint8Array(Buffer.from(text, 'utf8'));
const content = (fields: Record<string, unknown>) =>
  JSON.stringify({
    deployment: DEPLOYMENT,
    sequence: SEQUENCE,
    values: VALUES,
    ...fields,
  });

/**
 * The test's own sealer on WebCrypto: an ephemeral P-256 key, the Concat KDF
 * (proven on RFC 7518's vector below), AES-256-GCM over the plaintext with
 * the first part's ASCII as additional data, the exact header the app writes.
 * Each option changes one thing a hostile or broken sealer might.
 */
async function seal(
  options: {
    header?: (exact: Header) => unknown;
    plaintext?: string;
    ivBytes?: number;
    recipient?: PublicKey;
  } = {},
): Promise<string[]> {
  const ephemeral = await subtle.generateKey(ECDH_P256, true, ['deriveBits']);
  const { x, y } = await subtle.exportKey('jwk', ephemeral.publicKey);
  const exact: Header = {
    alg: 'ECDH-ES',
    enc: 'A256GCM',
    epk: { kty: 'EC', crv: 'P-256', x: x ?? '', y: y ?? '' },
    kid: key.kid,
    deployment: DEPLOYMENT,
    sequence: SEQUENCE,
  };
  const header = options.header ? options.header(exact) : exact;
  const first = base64url(JSON.stringify(header));
  const to = options.recipient ?? key;
  const recipient = await subtle.importKey(
    'jwk',
    { kty: to.kty, crv: to.crv, x: to.x, y: to.y },
    ECDH_P256,
    false,
    [],
  );
  const z = await subtle.deriveBits(
    { name: 'ECDH', public: recipient },
    ephemeral.privateKey,
    256,
  );
  const cek = await concatKdf(new Uint8Array(z), {
    algorithm: 'A256GCM',
    partyUInfo: new Uint8Array(0),
    partyVInfo: new Uint8Array(0),
    keyBits: 256,
  });
  const aes = await subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const iv = new Uint8Array(randomBytes(options.ivBytes ?? 12));
  const sealed = new Uint8Array(
    await subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: ascii(first), tagLength: 128 },
      aes,
      utf8(options.plaintext ?? content({})),
    ),
  );
  return [
    first,
    '',
    base64url(iv),
    base64url(sealed.subarray(0, -16)),
    base64url(sealed.subarray(-16)),
  ];
}

const compact = (parts: string[]) => utf8(parts.join('.'));

/** One part decoded, changed and encoded again. */
function rewrite(
  parts: string[],
  index: number,
  change: (bytes: Buffer) => Buffer,
): string[] {
  const next = [...parts];
  next[index] = base64url(change(Buffer.from(parts[index], 'base64url')));
  return next;
}

/** A fresh P-256 key's public half. */
async function anotherKey(): Promise<PublicKey> {
  const pair = await subtle.generateKey(ECDH_P256, true, ['deriveBits']);
  const { x, y } = await subtle.exportKey('jwk', pair.publicKey);
  return { kty: 'EC', crv: 'P-256', x: x ?? '', y: y ?? '' };
}

describe('concatKdf', () => {
  it("derives RFC 7518 Appendix C's key from its Z", async () => {
    const derived = await concatKdf(C_Z, {
      algorithm: C_ALGORITHM,
      partyUInfo: ascii(C_PARTY_U_INFO),
      partyVInfo: ascii(C_PARTY_V_INFO),
      keyBits: C_KEY_BITS,
    });
    expect(base64url(derived)).toBe(C_DERIVED_KEY);
  });
});

describe('openSealedSecretSet', () => {
  it('opens a set sealed to its key to its values, a name __proto__ kept as its own entry', async () => {
    const opened = await openSealedSecretSet(compact(await seal()), expected);
    expect({
      entries: Object.entries(opened),
      prototype: Object.getPrototypeOf(opened) === Object.prototype,
    }).toEqual({ entries: Object.entries(VALUES), prototype: true });
  });

  const NOT_COMPACT = 'The sealed set is not a compact JWE of five parts';
  const NOT_BASE64URL = 'The sealed set has a part that is not base64url';
  const HEADER_MEMBERS =
    "The sealed set's header does not hold exactly alg, enc, epk, kid, deployment and sequence";
  const EPK = "The sealed set's epk is not a P-256 public key";
  const DOES_NOT_OPEN = 'The sealed set does not open with this key';

  it.each<[string, () => Promise<string[]>, string]>([
    ['four parts', async () => (await seal()).slice(0, 4), NOT_COMPACT],
    [
      'a part that is not base64url',
      async () => {
        const parts = await seal();
        return [parts[0], '', parts[2], `${parts[3]}+`, parts[4]];
      },
      NOT_BASE64URL,
    ],
    [
      'a trailing newline',
      async () => {
        const parts = await seal();
        return [...parts.slice(0, 4), `${parts[4]}\n`];
      },
      NOT_BASE64URL,
    ],
    [
      'a non-empty second part',
      async () => {
        const parts = await seal();
        return [parts[0], base64url('key'), ...parts.slice(2)];
      },
      'The sealed set carries an encrypted key',
    ],
    [
      'a header that is not base64url JSON',
      async () => {
        const parts = await seal();
        return [base64url('{"alg":'), ...parts.slice(1)];
      },
      "The sealed set's header is not a JSON object",
    ],
    [
      'alg ECDH-ES+A256KW',
      () => seal({ header: (h) => ({ ...h, alg: 'ECDH-ES+A256KW' }) }),
      "The sealed set's alg is not ECDH-ES",
    ],
    [
      'enc A128GCM',
      () => seal({ header: (h) => ({ ...h, enc: 'A128GCM' }) }),
      "The sealed set's enc is not A256GCM",
    ],
    ...['zip', 'apu', 'apv', 'crit', 'typ'].map(
      (member): [string, () => Promise<string[]>, string] => [
        `one more member, ${member}`,
        () => seal({ header: (h) => ({ ...h, [member]: 'DEF' }) }),
        HEADER_MEMBERS,
      ],
    ),
    [
      'no sequence',
      () =>
        seal({
          header: ({ alg, enc, epk, kid, deployment }) => ({
            alg,
            enc,
            epk,
            kid,
            deployment,
          }),
        }),
      HEADER_MEMBERS,
    ],
    [
      'an epk of another curve',
      () =>
        seal({ header: (h) => ({ ...h, epk: { ...h.epk, crv: 'P-384' } }) }),
      EPK,
    ],
    [
      'an epk without y',
      () =>
        seal({
          header: (h) => ({
            ...h,
            epk: { kty: h.epk.kty, crv: h.epk.crv, x: h.epk.x },
          }),
        }),
      EPK,
    ],
    [
      'an epk off the curve',
      () =>
        seal({
          header: (h) => ({
            ...h,
            epk: { ...h.epk, y: TEST_KEY_ECC_P256.y },
          }),
        }),
      EPK,
    ],
    [
      'a kid of another key',
      () =>
        seal({
          // RFC 7638 section 3.1's example thumbprint, of another key.
          header: (h) => ({
            ...h,
            kid: 'NzbLsXh8uDCcd-6MNwXF4W_7noWXFZAfHkxZsRGC9Xs',
          }),
        }),
      'The sealed set is sealed to another key',
    ],
    [
      'another deployment in the header',
      () => seal({ header: (h) => ({ ...h, deployment: 'dep_other' }) }),
      "The sealed set's header names another deployment",
    ],
    [
      'another sequence in the header',
      () => seal({ header: (h) => ({ ...h, sequence: 18 }) }),
      "The sealed set's header names another sequence",
    ],
    [
      'a sequence that is a string',
      () => seal({ header: (h) => ({ ...h, sequence: '17' }) }),
      "The sealed set's header names another sequence",
    ],
    [
      'an IV of 16 bytes',
      () => seal({ ivBytes: 16 }),
      "The sealed set's IV is not 12 bytes",
    ],
    [
      'a tag cut to 12 bytes',
      async () => rewrite(await seal(), 4, (tag) => tag.subarray(0, 12)),
      "The sealed set's tag is not 16 bytes",
    ],
    [
      'one ciphertext byte flipped',
      async () =>
        rewrite(await seal(), 3, (ciphertext) => {
          const flipped = Buffer.from(ciphertext);
          flipped[0] ^= 1;
          return flipped;
        }),
      DOES_NOT_OPEN,
    ],
    [
      'the header encoded again with its members in another order',
      async () =>
        rewrite(await seal(), 0, (header) => {
          const members: unknown = JSON.parse(header.toString('utf8'));
          const entries =
            typeof members === 'object' && members !== null
              ? Object.entries(members)
              : [];
          return Buffer.from(
            JSON.stringify(Object.fromEntries(entries.reverse())),
          );
        }),
      DOES_NOT_OPEN,
    ],
    [
      'a set sealed to another key under this key id',
      async () => seal({ recipient: await anotherKey() }),
      DOES_NOT_OPEN,
    ],
    [
      'a plaintext that is not JSON',
      () => seal({ plaintext: 'API_KEY=sk-live-4f1c9a7e' }),
      "The sealed set's content is not a JSON object",
    ],
    [
      'a plaintext naming another deployment',
      () => seal({ plaintext: content({ deployment: 'dep_other' }) }),
      "The sealed set's content names another deployment",
    ],
    [
      'a plaintext naming another sequence',
      () => seal({ plaintext: content({ sequence: 18 }) }),
      "The sealed set's content names another sequence",
    ],
    [
      'a value that is a number',
      () => seal({ plaintext: content({ values: { API_KEY: 4711 } }) }),
      "The sealed set's values are not an object of strings",
    ],
  ])(
    'refuses %s with a fact that holds no value and no key',
    async (_name, parts, fact) => {
      await expect(
        openSealedSecretSet(compact(await parts()), expected),
      ).rejects.toThrow(new Error(fact));
    },
  );
});
