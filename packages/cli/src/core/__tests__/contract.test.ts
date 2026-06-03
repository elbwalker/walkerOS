import { createHash } from 'node:crypto';
import {
  annotateErrorWithDrift,
  canonicalContractHash,
  compareContract,
  fetchHealth,
} from '../contract.js';

jest.mock('../../lib/config-file.js', () => ({
  resolveAppUrl: () => 'https://app.test',
}));

// Reference implementation of the app's computeContractHash, replicated here so
// the test fails loudly if contract.ts ever diverges from the app algorithm:
// sha256 hex of JSON.stringify(canonicalize(stripInfoVersion(doc))).
function refCanonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(refCanonicalize);
  if (value !== null && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      result[key] = refCanonicalize(source[key]);
    }
    return result;
  }
  return value;
}
function refStripInfoVersion(doc: unknown): unknown {
  if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) return doc;
  const record = doc as Record<string, unknown>;
  const info = record.info;
  if (info === null || typeof info !== 'object' || Array.isArray(info))
    return doc;
  const { version: _v, ...restInfo } = info as Record<string, unknown>;
  return { ...record, info: restInfo };
}
function refHash(doc: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(refCanonicalize(refStripInfoVersion(doc))))
    .digest('hex');
}

describe('canonicalContractHash (app parity)', () => {
  it('matches the reference algorithm byte-for-byte', () => {
    const doc = {
      openapi: '3.1.0',
      info: { title: 'x', version: '9.9.9' },
      paths: { '/b': { get: {} }, '/a': { post: {} } },
    };
    expect(canonicalContractHash(doc)).toBe(refHash(doc));
  });

  it('is key-order independent', () => {
    const a = { info: { title: 't', version: '1.0.0' }, paths: { p: 1 } };
    const b = { paths: { p: 1 }, info: { version: '1.0.0', title: 't' } };
    expect(canonicalContractHash(a)).toBe(canonicalContractHash(b));
  });

  it('ignores info.version but reflects content changes', () => {
    const base = { info: { title: 't', version: '1.0.0' }, paths: { a: 1 } };
    const bumped = { info: { title: 't', version: '2.0.0' }, paths: { a: 1 } };
    const changed = { info: { title: 't', version: '1.0.0' }, paths: { a: 2 } };
    expect(canonicalContractHash(base)).toBe(canonicalContractHash(bumped));
    expect(canonicalContractHash(base)).not.toBe(
      canonicalContractHash(changed),
    );
  });
});

function mockHealth(body: unknown, ok = true): void {
  global.fetch = jest.fn(async () => ({
    ok,
    status: ok ? 200 : 503,
    json: async () => body,
  })) as unknown as typeof fetch;
}

describe('fetchHealth', () => {
  afterEach(() => jest.restoreAllMocks());

  it('parses contractVersion and contractHash defensively', async () => {
    mockHealth({
      status: 'ok',
      contractVersion: '1.2.0',
      contractHash: 'abc',
    });
    const h = await fetchHealth();
    expect(h).toEqual({
      reachable: true,
      status: 'ok',
      contractVersion: '1.2.0',
      contractHash: 'abc',
    });
  });

  it('returns reachable false on a network failure', async () => {
    global.fetch = jest.fn(async () => {
      throw new Error('down');
    }) as unknown as typeof fetch;
    const h = await fetchHealth();
    expect(h.reachable).toBe(false);
  });

  it('returns reachable true but omits fields on a non-object body', async () => {
    mockHealth('not json');
    const h = await fetchHealth();
    expect(h.reachable).toBe(true);
    expect(h.contractHash).toBeUndefined();
  });
});

describe('compareContract', () => {
  afterEach(() => jest.restoreAllMocks());

  it('in-sync when live hash equals baked hash', async () => {
    mockHealth({
      status: 'ok',
      contractVersion: '1.0.0',
      contractHash: 'BAKED_HASH',
    });
    const out = await compareContract({
      bakedVersion: '1.0.0',
      bakedHash: 'BAKED_HASH',
    });
    expect(out.verdict).toBe('in-sync');
    expect(out.action).toBeUndefined();
  });

  it('client-older when hashes differ and live version is higher (action present)', async () => {
    mockHealth({
      status: 'ok',
      contractVersion: '1.3.0',
      contractHash: 'LIVE',
    });
    const out = await compareContract({
      bakedVersion: '1.0.0',
      bakedHash: 'BAKED',
    });
    expect(out.verdict).toBe('client-older');
    expect(out.action).toContain('1.3.0');
    expect(out.action).toContain('@walkeros/cli');
  });

  it('client-newer when hashes differ and live version is lower', async () => {
    mockHealth({
      status: 'ok',
      contractVersion: '1.0.0',
      contractHash: 'LIVE',
    });
    const out = await compareContract({
      bakedVersion: '1.3.0',
      bakedHash: 'BAKED',
    });
    expect(out.verdict).toBe('client-newer');
    expect(out.action).toBeUndefined();
  });

  it('unknown when health is unreachable', async () => {
    global.fetch = jest.fn(async () => {
      throw new Error('down');
    }) as unknown as typeof fetch;
    const out = await compareContract({
      bakedVersion: '1.0.0',
      bakedHash: 'BAKED',
    });
    expect(out.verdict).toBe('unknown');
  });

  it('unknown when health is missing the contract fields', async () => {
    mockHealth({ status: 'ok' });
    const out = await compareContract({
      bakedVersion: '1.0.0',
      bakedHash: 'BAKED',
    });
    expect(out.verdict).toBe('unknown');
  });
});

describe('annotateErrorWithDrift', () => {
  afterEach(() => jest.restoreAllMocks());

  it('annotates an opaque error when the client is behind the server', async () => {
    mockHealth({
      status: 'ok',
      contractVersion: '1.3.0',
      contractHash: 'LIVE',
    });
    const annotated = await annotateErrorWithDrift(
      new Error('Unexpected response shape'),
      { bakedVersion: '1.0.0', bakedHash: 'BAKED' },
    );
    expect(annotated.message).toContain('Unexpected response shape');
    expect(annotated.message).toContain('1.3.0');
    expect(annotated.message).toContain('@walkeros/cli');
  });

  it('returns the original error unchanged when in-sync', async () => {
    mockHealth({
      status: 'ok',
      contractVersion: '1.0.0',
      contractHash: 'BAKED',
    });
    const original = new Error('boom');
    const annotated = await annotateErrorWithDrift(original, {
      bakedVersion: '1.0.0',
      bakedHash: 'BAKED',
    });
    expect(annotated.message).toBe('boom');
  });

  it('returns the original error unchanged when drift is unknown', async () => {
    global.fetch = jest.fn(async () => {
      throw new Error('down');
    }) as unknown as typeof fetch;
    const original = new Error('boom');
    const annotated = await annotateErrorWithDrift(original, {
      bakedVersion: '1.0.0',
      bakedHash: 'BAKED',
    });
    expect(annotated.message).toBe('boom');
  });
});
