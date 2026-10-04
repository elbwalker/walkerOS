import { createHash } from 'node:crypto';
import {
  canonicalContractHash,
  compareContract,
  fetchHealth,
  fetchOpenApi,
  formatContract,
} from '../contract.js';
import type { ClientOperation, ContractComparison } from '../contract.js';
import { operationDigests } from '../openapi-subset.js';
import {
  resetClientContext,
  setClientContext,
  type ClientContext,
} from '../client-context.js';

jest.mock('../../lib/config-file.js', () => ({
  resolveAppUrl: () => 'https://app.test',
}));

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Reference implementation of the app's computeContractHash, replicated here so
// the test fails loudly if contract.ts ever diverges from the app algorithm:
// sha256 hex of JSON.stringify(canonicalize(stripInfoVersion(doc))).
function refCanonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(refCanonicalize);
  if (isRecord(value)) {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      result[key] = refCanonicalize(value[key]);
    }
    return result;
  }
  return value;
}
function refStripInfoVersion(doc: unknown): unknown {
  if (!isRecord(doc) || !isRecord(doc.info)) return doc;
  const { version: _v, ...restInfo } = doc.info;
  return { ...doc, info: restInfo };
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

// === A small app: two client operations, one app-only operation ===

const CLIENT_LABEL = '4.7.0+aaaaaaaa';
const LIST = 'GET /api/projects';
const GET_ONE = 'GET /api/projects/{projectId}';
const MANIFEST = [
  { op: LIST, usedBy: ['mcp project_manage', 'walkeros projects list'] },
  { op: GET_ONE, usedBy: ['mcp project_manage', 'walkeros projects get'] },
];

interface ServerShape {
  label?: string;
  /** An operation only the app's own UI calls. */
  appOnlyOperation?: boolean;
  /** A different description on a client operation. */
  description?: string;
  /** The project schema gains a required property. */
  requiredOwner?: boolean;
  /** The server does not offer `GET /api/projects/{projectId}`. */
  withoutGetOne?: boolean;
}

function serverDoc(shape: ServerShape = {}) {
  const project = {
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      ...(shape.requiredOwner ? { owner: { type: 'string' } } : {}),
    },
    required: shape.requiredOwner ? ['id', 'name', 'owner'] : ['id', 'name'],
  };
  const ok = (ref: string) => ({
    '200': {
      description: 'OK',
      content: { 'application/json': { schema: { $ref: ref } } },
    },
  });
  return {
    openapi: '3.1.0',
    info: { title: 'walkerOS', version: shape.label ?? CLIENT_LABEL },
    paths: {
      '/api/projects': {
        get: {
          description: shape.description ?? 'List projects',
          responses: ok('#/components/schemas/ProjectList'),
        },
      },
      ...(shape.withoutGetOne
        ? {}
        : {
            '/api/projects/{projectId}': {
              parameters: [
                {
                  name: 'projectId',
                  in: 'path',
                  required: true,
                  schema: { type: 'string' },
                },
              ],
              get: { responses: ok('#/components/schemas/Project') },
            },
          }),
      ...(shape.appOnlyOperation
        ? {
            '/api/billing/portal': {
              post: { responses: { '204': { description: 'No content' } } },
            },
          }
        : {}),
    },
    components: {
      schemas: {
        Project: project,
        ProjectList: {
          type: 'object',
          properties: {
            projects: {
              type: 'array',
              items: { $ref: '#/components/schemas/Project' },
            },
          },
          required: ['projects'],
        },
      },
    },
  };
}

/** The client's baked data: the manifest plus digests of the client's own copy. */
const BAKED_DIGESTS = operationDigests(
  serverDoc(),
  MANIFEST.map((entry) => entry.op),
);
const OPERATIONS: ClientOperation[] = MANIFEST.map((entry) => ({
  ...entry,
  digest: BAKED_DIGESTS[entry.op],
}));

const CLI_4_8: ClientContext = { type: 'cli', version: '4.8.0' };

function health(extra: Record<string, unknown> = {}) {
  return {
    status: 'ok',
    appVersion: 'abc1234',
    contractVersion: CLIENT_LABEL,
    contractHash: 'f'.repeat(64),
    minSupportedClient: '4.7.0',
    ...extra,
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

interface AppAnswers {
  health?: unknown;
  healthError?: Error;
  openapi?: unknown;
  openapiStatus?: number;
}

const realFetch = global.fetch;

/** Answers the two public routes; records each request URL and its headers. */
function mockApp(answers: AppAnswers): {
  urls: string[];
  headers: Headers[];
} {
  const urls: string[] = [];
  const headers: Headers[] = [];
  const mock: typeof fetch = async (input, init) => {
    const url = String(input);
    urls.push(url);
    headers.push(new Headers(init?.headers));
    if (url.endsWith('/api/health')) {
      if (answers.healthError) throw answers.healthError;
      return json(answers.health ?? health());
    }
    if (url.endsWith('/api/openapi.json')) {
      return json(answers.openapi ?? serverDoc(), answers.openapiStatus);
    }
    return json({ error: 'not found' }, 404);
  };
  global.fetch = mock;
  return { urls, headers };
}

afterEach(() => {
  global.fetch = realFetch;
  resetClientContext();
  delete process.env.WALKEROS_TOKEN;
});

describe('fetchHealth', () => {
  it('probes the baseUrl it is given', async () => {
    const { urls } = mockApp({});
    await fetchHealth('https://passed.test');
    expect(urls).toEqual(['https://passed.test/api/health']);
  });

  it('probes the locally resolved app URL when no baseUrl is given', async () => {
    const { urls } = mockApp({});
    await fetchHealth();
    expect(urls).toEqual(['https://app.test/api/health']);
  });

  it('sends no credential, also with a token in the environment', async () => {
    process.env.WALKEROS_TOKEN = 'secret-token';
    const { headers } = mockApp({});
    await fetchHealth('https://passed.test');
    expect(headers[0].has('authorization')).toBe(false);
  });

  it('parses the contract fields and minSupportedClient', async () => {
    mockApp({ health: health() });
    expect(await fetchHealth()).toEqual({
      reachable: true,
      status: 'ok',
      appVersion: 'abc1234',
      contractVersion: CLIENT_LABEL,
      contractHash: 'f'.repeat(64),
      minSupportedClient: '4.7.0',
    });
  });

  it('reports a timeout as the reason', async () => {
    mockApp({
      healthError: new DOMException('aborted', 'TimeoutError'),
    });
    expect(await fetchHealth()).toEqual({
      reachable: false,
      error: 'timeout after 5000 ms',
    });
  });

  it('reports a network failure with its code', async () => {
    mockApp({
      healthError: new TypeError('fetch failed', {
        cause: Object.assign(new Error('connect'), { code: 'ECONNREFUSED' }),
      }),
    });
    expect(await fetchHealth()).toEqual({
      reachable: false,
      error: 'fetch failed (ECONNREFUSED)',
    });
  });

  it('counts a non-2xx answer as reachable, with its status', async () => {
    const mock: typeof fetch = async () =>
      new Response('<html>unavailable</html>', { status: 503 });
    global.fetch = mock;
    expect(await fetchHealth()).toEqual({ reachable: true, httpStatus: 503 });
  });

  it('counts a non-object body as reachable without fields', async () => {
    mockApp({ health: 'not json' });
    expect(await fetchHealth()).toEqual({ reachable: true });
  });
});

describe('fetchOpenApi', () => {
  it('returns the live document', async () => {
    const { urls } = mockApp({});
    const result = await fetchOpenApi('https://passed.test');
    expect(urls).toEqual(['https://passed.test/api/openapi.json']);
    expect(result).toEqual({
      ok: true,
      url: 'https://passed.test/api/openapi.json',
      document: serverDoc(),
    });
  });

  it('reports a non-2xx status', async () => {
    mockApp({ openapi: { error: 'down' }, openapiStatus: 503 });
    expect(await fetchOpenApi('https://passed.test')).toEqual({
      ok: false,
      url: 'https://passed.test/api/openapi.json',
      error: 'HTTP 503',
    });
  });

  it('reports a document without paths', async () => {
    mockApp({ openapi: { openapi: '3.1.0' } });
    expect(await fetchOpenApi('https://passed.test')).toEqual({
      ok: false,
      url: 'https://passed.test/api/openapi.json',
      error: 'no paths',
    });
  });
});

describe('compareContract', () => {
  const input = {
    bakedVersion: CLIENT_LABEL,
    operations: OPERATIONS,
    client: CLI_4_8,
  };

  it('compares against input.baseUrl, health and document alike', async () => {
    const { urls } = mockApp({});
    await compareContract({ ...input, baseUrl: 'https://stage.test' });
    expect(urls).toEqual([
      'https://stage.test/api/health',
      'https://stage.test/api/openapi.json',
    ]);
  });

  it('compares against the locally resolved app URL when baseUrl is omitted', async () => {
    const { urls } = mockApp({});
    const out = await compareContract(input);
    expect(out.appUrl).toBe('https://app.test');
    expect(urls).toEqual([
      'https://app.test/api/health',
      'https://app.test/api/openapi.json',
    ]);
  });

  it('sends no credential', async () => {
    process.env.WALKEROS_TOKEN = 'secret-token';
    const { headers } = mockApp({});
    await compareContract(input);
    expect(headers.every((h) => !h.has('authorization'))).toBe(true);
  });

  type Case = {
    name: string;
    app: AppAnswers;
    client?: ClientContext;
    expected: Partial<ContractComparison>;
  };

  const cases: Case[] = [
    // Server ahead of the client.
    {
      name: 'an app-only operation added under a new label: in-sync',
      app: {
        health: health({ contractVersion: '4.7.0+dddddddd' }),
        openapi: serverDoc({ appOnlyOperation: true, label: '4.7.0+dddddddd' }),
      },
      expected: {
        verdict: 'in-sync',
        server: '4.7.0+dddddddd',
        operations: 2,
        missing: [],
        changed: [],
      },
    },
    {
      name: 'only a description changed: in-sync',
      app: { openapi: serverDoc({ description: 'Every project you own' }) },
      expected: { verdict: 'in-sync', missing: [], changed: [] },
    },
    {
      name: 'a client response differs with the same floor: changed',
      app: {
        health: health({ contractVersion: '4.7.0+bbbbbbbb' }),
        openapi: serverDoc({ label: '4.7.0+bbbbbbbb', requiredOwner: true }),
      },
      expected: {
        verdict: 'changed',
        server: '4.7.0+bbbbbbbb',
        missing: [],
        changed: [LIST, GET_ONE],
      },
    },
    {
      name: 'a higher floor the client version meets, with a difference: changed',
      app: {
        health: health({
          contractVersion: '4.8.0+cccccccc',
          minSupportedClient: '4.8.0',
        }),
        openapi: serverDoc({ label: '4.8.0+cccccccc', requiredOwner: true }),
      },
      expected: { verdict: 'changed', server: '4.8.0+cccccccc' },
    },
    {
      name: 'the floor above the client: client-outdated, naming @walkeros/cli',
      app: { health: health({ minSupportedClient: '4.9.0' }) },
      expected: {
        verdict: 'client-outdated',
        requires: { package: '@walkeros/cli', version: '4.9.0' },
      },
    },
    {
      name: 'the floor above the MCP: client-outdated, naming @walkeros/mcp',
      app: { health: health({ minSupportedClient: '4.9.0' }) },
      client: { type: 'mcp', version: '4.8.0' },
      expected: {
        verdict: 'client-outdated',
        client: {
          package: '@walkeros/mcp',
          version: '4.8.0',
          contract: CLIENT_LABEL,
        },
        requires: { package: '@walkeros/mcp', version: '4.9.0' },
      },
    },
    {
      name: 'the client at the floor: not outdated',
      app: { health: health({ minSupportedClient: '4.8.0' }) },
      expected: { verdict: 'in-sync' },
    },
    // Server behind the client.
    {
      name: 'a manifest operation missing: server-older, with its callers',
      app: {
        health: health({ contractVersion: '4.6.1', minSupportedClient: '' }),
        openapi: serverDoc({ label: '4.6.1', withoutGetOne: true }),
      },
      expected: {
        verdict: 'server-older',
        server: '4.6.1',
        missing: [
          {
            op: GET_ONE,
            usedBy: ['mcp project_manage', 'walkeros projects get'],
          },
        ],
        changed: [],
      },
    },
    {
      name: 'legacy label 2.1.0 with a changed operation: server-older',
      app: {
        health: { status: 'ok', contractVersion: '2.1.0' },
        openapi: serverDoc({ label: '2.1.0', requiredOwner: true }),
      },
      expected: {
        verdict: 'server-older',
        server: '2.1.0',
        missing: [],
        changed: [LIST, GET_ONE],
      },
    },
    {
      name: 'legacy label 4.7.1 with a changed operation: server-older',
      app: {
        health: { status: 'ok', contractVersion: '4.7.1' },
        openapi: serverDoc({ label: '4.7.1', requiredOwner: true }),
      },
      expected: {
        verdict: 'server-older',
        server: '4.7.1',
        changed: [LIST, GET_ONE],
      },
    },
    {
      name: 'a lower floor with a changed operation: server-older',
      app: {
        health: health({ contractVersion: '4.6.1+bbbbbbbb' }),
        openapi: serverDoc({ label: '4.6.1+bbbbbbbb', requiredOwner: true }),
      },
      expected: { verdict: 'server-older', server: '4.6.1+bbbbbbbb' },
    },
    {
      name: 'no label with a changed operation: server-older',
      app: {
        health: { status: 'ok' },
        openapi: serverDoc({ label: 'dev', requiredOwner: true }),
      },
      expected: { verdict: 'server-older', server: 'dev' },
    },
    {
      name: 'a missing operation outranks a higher floor: server-older',
      app: {
        health: health({ contractVersion: '4.9.0+cccccccc' }),
        openapi: serverDoc({ label: '4.9.0+cccccccc', withoutGetOne: true }),
      },
      expected: { verdict: 'server-older' },
    },
    // Unknown.
    {
      name: 'health unreachable: unknown',
      app: { healthError: new DOMException('aborted', 'TimeoutError') },
      expected: {
        verdict: 'unknown',
        reason: 'GET https://app.test/api/health: timeout after 5000 ms',
      },
    },
    {
      name: 'openapi 503: unknown',
      app: { openapi: { error: 'down' }, openapiStatus: 503 },
      expected: {
        verdict: 'unknown',
        reason: 'GET https://app.test/api/openapi.json: HTTP 503',
      },
    },
    {
      name: 'openapi without paths: unknown',
      app: { openapi: { openapi: '3.1.0', info: { version: CLIENT_LABEL } } },
      expected: {
        verdict: 'unknown',
        reason: 'GET https://app.test/api/openapi.json: no paths',
      },
    },
  ];

  it.each(cases)('$name', async ({ app, client, expected }) => {
    mockApp(app);
    const out = await compareContract({
      ...input,
      ...(client ? { client } : {}),
    });
    expect(out).toMatchObject(expected);
  });

  it('answers unknown without client operations to compare', async () => {
    const { urls } = mockApp({});
    const out = await compareContract({ ...input, operations: [] });
    expect(out).toMatchObject({
      verdict: 'unknown',
      reason: 'no baked client operations',
    });
    expect(urls).toEqual(['https://app.test/api/health']);
  });

  it('names the package of the process client context by default', async () => {
    setClientContext({ type: 'mcp', version: '4.6.0' });
    mockApp({ health: health({ minSupportedClient: '4.7.0' }) });
    const out = await compareContract({
      bakedVersion: CLIENT_LABEL,
      operations: OPERATIONS,
    });
    expect(out.verdict).toBe('client-outdated');
    expect(out.requires).toEqual({
      package: '@walkeros/mcp',
      version: '4.7.0',
    });
  });
});

describe('formatContract', () => {
  const client = {
    package: '@walkeros/cli',
    version: '4.8.0',
    contract: '4.7.0+1a2b3c4d',
  };
  const appUrl = 'https://app.walkeros.io';

  const lines: Array<[string, ContractComparison, string]> = [
    [
      'in-sync',
      {
        verdict: 'in-sync',
        appUrl,
        client,
        server: '4.7.0+5e6f7a8b',
        operations: 54,
        missing: [],
        changed: [],
      },
      'contract: in-sync (server 4.7.0+5e6f7a8b, client 4.7.0+1a2b3c4d, 54 operations)',
    ],
    [
      'changed',
      {
        verdict: 'changed',
        appUrl,
        client,
        server: '4.7.0+9f8e7d6c',
        operations: 54,
        missing: [],
        changed: ['GET /api/projects/{projectId}/frames'],
      },
      'contract: changed (server 4.7.0+9f8e7d6c, client 4.7.0+1a2b3c4d); changed: GET /api/projects/{projectId}/frames',
    ],
    [
      'server-older',
      {
        verdict: 'server-older',
        appUrl,
        client,
        server: '2.1.0',
        operations: 54,
        missing: [
          {
            op: 'POST /api/oauth/device_authorization',
            usedBy: ['mcp auth', 'walkeros auth login'],
          },
          {
            op: 'GET /api/projects/{projectId}/frames',
            usedBy: ['mcp frame_manage'],
          },
        ],
        changed: ['GET /api/projects', 'GET /api/health'],
      },
      'contract: server-older (server 2.1.0, client 4.7.0+1a2b3c4d); not offered (2): POST /api/oauth/device_authorization (mcp auth, walkeros auth login), GET /api/projects/{projectId}/frames (mcp frame_manage); changed: 2',
    ],
    [
      'client-outdated',
      {
        verdict: 'client-outdated',
        appUrl,
        client,
        server: '4.9.0+00000000',
        requires: { package: '@walkeros/cli', version: '4.9.0' },
      },
      'contract: client-outdated (https://app.walkeros.io requires @walkeros/cli >= 4.9.0; this is 4.8.0)',
    ],
    [
      'unknown',
      {
        verdict: 'unknown',
        appUrl,
        client,
        reason: 'GET https://app.walkeros.io/api/health: timeout after 5000 ms',
      },
      'contract: unknown (GET https://app.walkeros.io/api/health: timeout after 5000 ms)',
    ],
    [
      'in-process',
      { verdict: 'in-process', appUrl, client, server: '4.7.0+1a2b3c4d' },
      'contract: in-process (server 4.7.0+1a2b3c4d)',
    ],
  ];

  it.each(lines)('%s', (_verdict, comparison, line) => {
    expect(formatContract(comparison)).toBe(line);
  });

  it('states facts only', () => {
    for (const [, comparison] of lines) {
      expect(formatContract(comparison)).not.toMatch(/\b(run|try|upgrade)\b/i);
    }
  });
});
