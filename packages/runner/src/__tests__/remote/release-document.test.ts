import type { RefusalCheck } from '@walkeros/core';
import {
  ReleaseRefusal,
  readReleaseDocument,
  sha256Hex,
} from '../../remote/release-document.js';

const DEPLOYMENT = 'dep_shop1';
const SHA = 'a'.repeat(64);

function documentFields(): Record<string, unknown> {
  return {
    version: 1,
    deployment: DEPLOYMENT,
    sequence: 17,
    release: 'dv_abc123',
    flowName: 'shop',
    artifact: { sha256: SHA, bytes: 2048 },
    secrets: { app: ['API_KEY'], server: ['SALT'] },
    secretsSince: 12,
    releasedAt: '2026-11-18T10:00:00.000Z',
  };
}

function encode(value: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(value));
}

function withFields(fields: Record<string, unknown>): Uint8Array {
  return encode({ ...documentFields(), ...fields });
}

function without(name: string): Uint8Array {
  const fields = documentFields();
  delete fields[name];
  return encode(fields);
}

function refusalOf(run: () => unknown): ReleaseRefusal {
  try {
    run();
  } catch (error) {
    if (error instanceof ReleaseRefusal) return error;
    throw error;
  }
  throw new Error('no refusal');
}

describe('sha256Hex', () => {
  it('answers the lowercase hex digest of the bytes', () => {
    expect(sha256Hex(new TextEncoder().encode('abc'))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});

describe('readReleaseDocument', () => {
  it('reads a valid document back with the sha256 of its bytes', () => {
    const bytes = encode(documentFields());

    expect(readReleaseDocument(bytes, { deployment: DEPLOYMENT })).toEqual({
      document: documentFields(),
      sha256: sha256Hex(bytes),
    });
  });

  it.each<[string, string, string]>([
    ['a newline', 'shop\nmain', 'shop\uFFFDmain'],
    ['an escape sequence', 'shop\u001b[31m', 'shop\uFFFD[31m'],
    ['a delete character', 'shop\u007f', 'shop\uFFFD'],
    ['a C1 control sequence introducer', 'shop\u009b31m', 'shop\uFFFD31m'],
    ['a bidi override', 'shop\u202egnirts', 'shop\uFFFDgnirts'],
    ['a bidi isolate', 'shop\u2066x\u2069', 'shop\uFFFDx\uFFFD'],
    ['129 characters', 'n'.repeat(129), 'n'.repeat(128)],
    ['10 kB', 'n'.repeat(10_240), 'n'.repeat(128)],
    ['255 characters with controls', '\n'.repeat(255), '\uFFFD'.repeat(128)],
  ])(
    'shows a flowName with %s cleaned and cut, never refused',
    (_case, flowName, shown) => {
      const { document } = readReleaseDocument(withFields({ flowName }), {
        deployment: DEPLOYMENT,
      });

      expect(document.flowName).toBe(shown);
    },
  );

  it('ignores an unknown field', () => {
    const { document } = readReleaseDocument(
      withFields({ channel: 'beta', notes: { a: 1 } }),
      { deployment: DEPLOYMENT },
    );

    expect(document).toEqual(documentFields());
  });

  it('passes the high-water sequence with the same bytes', () => {
    const bytes = encode(documentFields());

    expect(
      readReleaseDocument(bytes, {
        deployment: DEPLOYMENT,
        highWater: { sequence: 17, sha256: sha256Hex(bytes) },
      }).document.sequence,
    ).toBe(17);
  });

  const HIGH_WATER = { sequence: 17, sha256: 'b'.repeat(64) };

  it.each<
    [
      string,
      () => Uint8Array,
      RefusalCheck,
      number | undefined,
      { sequence: number; sha256: string } | undefined,
    ]
  >([
    [
      'bytes that are not JSON',
      () => new TextEncoder().encode('{"version":'),
      'document-format',
      undefined,
      undefined,
    ],
    [
      'bytes that are not UTF-8',
      () => new Uint8Array([0x7b, 0xff, 0x7d]),
      'document-format',
      undefined,
      undefined,
    ],
    [
      'an array',
      () => encode([documentFields()]),
      'document-format',
      undefined,
      undefined,
    ],
    ['null', () => encode(null), 'document-format', undefined, undefined],
    [
      'version 2',
      () => withFields({ version: 2, sequence: 'x' }),
      'document-version',
      undefined,
      undefined,
    ],
    [
      'no version',
      () => without('version'),
      'document-version',
      undefined,
      undefined,
    ],
    [
      'a missing flowName',
      () => without('flowName'),
      'document-format',
      17,
      undefined,
    ],
    [
      'a missing artifact',
      () => without('artifact'),
      'document-format',
      17,
      undefined,
    ],
    [
      'a missing releasedAt',
      () => without('releasedAt'),
      'document-format',
      17,
      undefined,
    ],
    [
      'a numeric flowName',
      () => withFields({ flowName: 42 }),
      'document-format',
      17,
      undefined,
    ],
    [
      'a sequence that is not an integer',
      () => withFields({ sequence: 17.5 }),
      'document-format',
      undefined,
      undefined,
    ],
    [
      'a sequence of 0',
      () => withFields({ sequence: 0, secretsSince: 0 }),
      'document-format',
      undefined,
      undefined,
    ],
    [
      'a numeric deployment',
      () => withFields({ deployment: 7 }),
      'document-format',
      17,
      undefined,
    ],
    [
      'a numeric release',
      () => withFields({ release: 7 }),
      'document-format',
      17,
      undefined,
    ],
    [
      'a string artifact size',
      () => withFields({ artifact: { sha256: SHA, bytes: '2048' } }),
      'document-format',
      17,
      undefined,
    ],
    [
      'an uppercase artifact sha256',
      () => withFields({ artifact: { sha256: 'A'.repeat(64), bytes: 2048 } }),
      'document-format',
      17,
      undefined,
    ],
    [
      'a short artifact sha256',
      () => withFields({ artifact: { sha256: 'a'.repeat(63), bytes: 2048 } }),
      'document-format',
      17,
      undefined,
    ],
    [
      'a secret list that is not an array',
      () => withFields({ secrets: { app: 'API_KEY', server: [] } }),
      'document-format',
      17,
      undefined,
    ],
    [
      'a secret name that is not a string',
      () => withFields({ secrets: { app: [1], server: [] } }),
      'document-format',
      17,
      undefined,
    ],
    [
      'a secret name 1X',
      () => withFields({ secrets: { app: ['1X'], server: [] } }),
      'document-format',
      17,
      undefined,
    ],
    [
      'a secret name twice in one list',
      () => withFields({ secrets: { app: ['A', 'A'], server: [] } }),
      'document-format',
      17,
      undefined,
    ],
    [
      'a secret name in both lists',
      () => withFields({ secrets: { app: ['SALT'], server: ['SALT'] } }),
      'document-format',
      17,
      undefined,
    ],
    [
      'secretsSince above sequence',
      () => withFields({ secretsSince: 18 }),
      'document-format',
      17,
      undefined,
    ],
    [
      'secretsSince of 0',
      () => withFields({ secretsSince: 0 }),
      'document-format',
      17,
      undefined,
    ],
    [
      'a releasedAt Date.parse cannot read',
      () => withFields({ releasedAt: 'yesterday' }),
      'document-format',
      17,
      undefined,
    ],
    [
      'another deployment',
      () => withFields({ deployment: 'dep_other' }),
      'deployment',
      17,
      undefined,
    ],
    [
      'release dv_../x',
      () => withFields({ release: 'dv_../x' }),
      'release-id',
      17,
      undefined,
    ],
    [
      'release ver_x',
      () => withFields({ release: 'ver_x' }),
      'release-id',
      17,
      undefined,
    ],
    [
      'artifact.bytes 536 870 913',
      () => withFields({ artifact: { sha256: SHA, bytes: 536_870_913 } }),
      'artifact-bytes',
      17,
      undefined,
    ],
    [
      'artifact.bytes 0',
      () => withFields({ artifact: { sha256: SHA, bytes: 0 } }),
      'artifact-bytes',
      17,
      undefined,
    ],
    [
      'a sequence below the high-water mark',
      () => withFields({ sequence: 16 }),
      'sequence',
      16,
      HIGH_WATER,
    ],
    [
      'the high-water sequence with other bytes',
      () => withFields({ flowName: 'shop2' }),
      'sequence',
      17,
      HIGH_WATER,
    ],
  ])('refuses %s', (_case, bytes, check, sequence, highWater) => {
    const refusal = refusalOf(() =>
      readReleaseDocument(bytes(), { deployment: DEPLOYMENT, highWater }),
    );

    expect(refusal.check).toBe(check);
    expect(refusal.sequence).toBe(sequence);
  });

  it('names its check and sequence in the refusal message', () => {
    const refusal = refusalOf(() =>
      readReleaseDocument(withFields({ deployment: 'dep_other' }), {
        deployment: DEPLOYMENT,
      }),
    );

    expect(refusal.message).toBe('Release v17 refused (deployment)');
  });
});
