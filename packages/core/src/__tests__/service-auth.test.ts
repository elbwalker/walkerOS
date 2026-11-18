import type { ServiceCredential } from '../service-auth';
import {
  SERVICE_CREDENTIAL_PREFIX,
  decodeServiceCredential,
  encodeServiceCredential,
} from '../service-auth';

// The members of RFC 9421 Appendix B.1.3's test-key-ecc-p256; the schema
// checks shapes only, so one key serves both slots.
const KEY = {
  kty: 'EC',
  crv: 'P-256',
  x: 'qIVYZVLCrPZHGHjP17CTW0_-D9Lfw0EkjqF7xB4FivA',
  y: 'Mc4nN9LTDOBhfoUeg8Ye9WedFRhnZXZJA12Qp0zZ6F0',
  d: 'UpuF81l-kOxbjf7T4mNSv0r5tN67Gim7rnf6EFpcYDs',
  kid: 'NzbLsXh8uDCcd-6MNwXF4W_7noWXFZAfHkxZsRGC9Xs',
} as const;

const credential: ServiceCredential = {
  v: 1,
  iss: 'https://auth.walkeros.io',
  resource: 'https://app.walkeros.io/api',
  client_id: 'crd_0123456789abcdefghijklmn',
  target: { kind: 'deployment', id: 'dep_0123456789abcdefghijk' },
  sig: { ...KEY, use: 'sig', alg: 'ES256' },
  enc: { ...KEY, use: 'enc', alg: 'ECDH-ES' },
};

/** A credential string of any JSON, past encode's own check. */
function raw(value: unknown): string {
  const body = btoa(JSON.stringify(value))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return SERVICE_CREDENTIAL_PREFIX + body;
}

describe('service credential', () => {
  it.each([
    ['the hosted app', credential],
    [
      'the smoke run on a Docker bridge (RFC 1918)',
      {
        ...credential,
        iss: 'http://172.17.0.1:3999',
        resource: 'http://172.17.0.1:3999/api',
      },
    ],
    [
      'a local app',
      {
        ...credential,
        iss: 'http://localhost:3000',
        resource: 'http://localhost:3000/api',
      },
    ],
  ])('encodes and decodes to itself for %s', (_name, value) => {
    const encoded = encodeServiceCredential(value);
    expect(encoded.startsWith(SERVICE_CREDENTIAL_PREFIX)).toBe(true);
    expect(decodeServiceCredential(encoded)).toEqual(value);
  });

  it.each([
    ['another prefix', `wos_pat_${raw(credential).slice(9)}`],
    ['bad base64url', `${SERVICE_CREDENTIAL_PREFIX}e30!!`],
    ['format version 2', raw({ ...credential, v: 2 })],
    [
      'a signing key without d',
      raw({ ...credential, sig: { ...credential.sig, d: undefined } }),
    ],
    [
      'a P-384 key',
      raw({ ...credential, sig: { ...credential.sig, crv: 'P-384' } }),
    ],
    [
      'use swapped',
      raw({ ...credential, sig: { ...credential.sig, use: 'enc' } }),
    ],
    [
      'alg swapped',
      raw({ ...credential, enc: { ...credential.enc, alg: 'ES256' } }),
    ],
    [
      'an http issuer on a public address',
      raw({ ...credential, iss: 'http://203.0.113.1' }),
    ],
    [
      'an unknown target kind',
      raw({ ...credential, target: { kind: 'runner', id: 'dep_1' } }),
    ],
    ['an extra member', raw({ ...credential, extra: 'x' })],
  ])('refuses %s with the fact, never the value', (_name, value) => {
    let message = '';
    try {
      decodeServiceCredential(value);
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toMatch(
      /^WALKEROS_CREDENTIAL is not a walkerOS credential/,
    );
    expect(message).not.toContain(KEY.d);
    expect(message).not.toContain(
      value.slice(SERVICE_CREDENTIAL_PREFIX.length),
    );
  });
});
