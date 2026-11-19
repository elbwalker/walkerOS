/**
 * The runner's credential path against a stub app and a stub auth server:
 * where each app call goes, which headers it carries, what reaches another
 * host, what a refused credential writes, and that the variable is gone
 * before the flow loads. Only the network is stubbed: the credential's
 * client, the heartbeat, the secrets read and the bundle read are real.
 */

import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { Logger, ServiceCredential } from '@walkeros/core';
import { createKnownValues, type KnownValues } from '@walkeros/core/node';
import {
  APP_SIGNATURE_TAG,
  verifyRequestSignature,
} from '@walkeros/server-core';
import { connectApp } from '../credentials.js';
import { createHeartbeat } from '../heartbeat.js';
import { removeInstanceFolder } from '../instance-folder.js';
import type { PipelineOptions } from '../pipeline.js';
import { resolveBundle } from '../resolve-bundle.js';
import { fetchSecrets } from '../secrets-fetcher.js';
import { TEST_APP, TEST_ISSUER, testCredential } from './helpers/credential.js';

const runPipeline = jest.fn<Promise<void>, [PipelineOptions]>();

jest.mock('../pipeline.js', () => ({
  runPipeline: (options: PipelineOptions) => runPipeline(options),
}));

jest.mock('../stdin.js', () => ({
  isStdinPiped: () => false,
  readStdin: jest.fn(),
}));

import { runCommand } from '../run.js';

const ARCHIVE = `${TEST_APP}/api/runner/versions/dv_1/bundle-archive`;
const STORAGE = 'https://storage.example.test/flow.mjs?X-Amz-Signature=abc';
const CDN = 'https://cdn.example.test/flow.mjs';
const REFUSED_LINE =
  "The app refused this runner's credential (replaced, revoked or ended); a self-hosted runner is paired again on its Self-hosted tab (HTTP 401)";

interface Seen {
  url: string;
  method: string;
  headers: Headers;
  body?: Uint8Array;
  redirect?: RequestInit['redirect'];
}

/** The stub network: the auth server, the app, the storage and a CDN, every request recorded. */
function stubNetwork(options: { token: 'up' | 'down'; checkIn?: number }) {
  const seen: Seen[] = [];
  let issued = 0;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    const body = init?.body;
    seen.push({
      url,
      method: init?.method ?? 'GET',
      headers: new Headers(init?.headers),
      body: body instanceof Uint8Array ? body : undefined,
      redirect: init?.redirect,
    });
    switch (url) {
      case `${TEST_ISSUER}/.well-known/oauth-authorization-server`:
        return Response.json({
          issuer: TEST_ISSUER,
          service_token_endpoint: `${TEST_ISSUER}/api/services/token`,
          dpop_signing_alg_values_supported: ['ES256'],
        });
      case `${TEST_ISSUER}/api/services/token`:
        if (options.token === 'down') throw new TypeError('fetch failed');
        issued += 1;
        return Response.json({
          access_token: `tok-${issued}`,
          token_type: 'DPoP',
          expires_in: 86400,
          scope: 'runner:heartbeat runner:secrets runner:release',
        });
      case `${TEST_APP}/api/runner/check-in`:
        return Response.json({}, { status: options.checkIn ?? 200 });
      case `${TEST_APP}/api/runner/secrets`:
        return Response.json({ values: { API_KEY: 'key-from-app' } });
      case ARCHIVE:
        return new Response(null, {
          status: 302,
          headers: { Location: STORAGE },
        });
      case STORAGE:
      case CDN:
        return new Response('export default async () => ({});');
      default:
        return new Response(null, { status: 404 });
    }
  };
  const to = (prefix: string) => seen.filter((s) => s.url.startsWith(prefix));
  return { seen, to };
}

/** A logger that keeps its ERROR lines. */
function linesLogger(): { logger: Logger.Instance; errors: string[] } {
  const errors: string[] = [];
  const logger: Logger.Instance = {
    error: (message) => {
      errors.push(String(message));
    },
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    throw: (message: string | Error): never => {
      throw new Error(String(message));
    },
    json: jest.fn(),
    mask: (text: string) => text,
    scope: () => logger,
  };
  return { logger, errors };
}

const SIGNED = ['signature-input', 'signature', 'content-digest'];

describe('the runner with WALKEROS_CREDENTIAL', () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = process.env;
  let credential: ServiceCredential;
  let raw: string;
  let dir: string;
  let artifact: string;
  let knownValues: KnownValues;
  let lines: ReturnType<typeof linesLogger>;

  beforeAll(async () => {
    ({ credential, raw } = await testCredential());
  });

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'runner-credential-'));
    artifact = join(dir, 'flow.mjs');
    writeFileSync(artifact, 'export default async () => ({});');
    process.env = {
      ...originalEnv,
      WALKEROS_CREDENTIAL: raw,
      WALKEROS_CACHE_DIR: join(dir, 'cache'),
    };
    knownValues = createKnownValues();
    lines = linesLogger();
    runPipeline.mockReset().mockResolvedValue(undefined);
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
    jest.restoreAllMocks();
    rmSync(dir, { recursive: true, force: true });
  });

  function connect() {
    const link = connectApp({
      env: process.env,
      logger: lines.logger,
      knownValues,
    });
    if (!link) throw new Error('the credential was not read');
    return link.app;
  }

  function heartbeat(
    app: ReturnType<typeof connect>,
    getErrors?: () => Array<{
      message: string;
      count: number;
      firstSeen: number;
      lastSeen: number;
    }>,
  ) {
    return createHeartbeat(
      {
        app,
        instanceId: '3f9a2b7c1d4e5f60',
        intervalMs: 60_000,
        getErrors,
        knownValues,
      },
      lines.logger,
    );
  }

  async function verifies(request: Seen): Promise<boolean> {
    const { kty, crv, x, y } = credential.sig;
    const result = await verifyRequestSignature({
      method: request.method,
      url: request.url,
      headers: request.headers,
      body: request.body ?? new Uint8Array(),
      key: { kty, crv, x, y },
      tag: APP_SIGNATURE_TAG,
    });
    return result.ok;
  }

  it.each<[string, () => Promise<void>]>([
    [
      'the check-in goes to /api/runner/check-in with the token and its proof, and no ids',
      async () => {
        const net = stubNetwork({ token: 'up' });
        await heartbeat(connect()).sendOnce();
        const [checkIn] = net.to(`${TEST_APP}/api/runner/check-in`);
        expect(checkIn?.method).toBe('POST');
        expect(checkIn?.headers.get('authorization')).toBe('DPoP tok-1');
        expect(checkIn?.headers.get('dpop')).toEqual(expect.any(String));
        const body: Record<string, unknown> = JSON.parse(
          new TextDecoder().decode(checkIn?.body),
        );
        expect(body).not.toHaveProperty('flowId');
        expect(body).not.toHaveProperty('deploymentId');
      },
    ],
    [
      'the boot secret read goes to /api/runner/secrets with the token and its proof',
      async () => {
        const net = stubNetwork({ token: 'up' });
        await expect(fetchSecrets({ app: connect() })).resolves.toEqual({
          API_KEY: 'key-from-app',
        });
        const [read] = net.to(`${TEST_APP}/api/runner/secrets`);
        expect(read?.method).toBe('GET');
        expect(read?.headers.get('authorization')).toBe('DPoP tok-1');
        expect(read?.headers.get('dpop')).toEqual(expect.any(String));
      },
    ],
    [
      'a BUNDLE on the app origin carries the headers, and its redirect carries none',
      async () => {
        const net = stubNetwork({ token: 'up' });
        const resolved = await resolveBundle(ARCHIVE, { app: connect() });
        if (resolved.folder) removeInstanceFolder(resolved.folder);
        const [archive] = net.to(ARCHIVE);
        expect(archive?.headers.get('authorization')).toBe('DPoP tok-1');
        expect(archive?.redirect).toBe('manual');
        const [storage] = net.to('https://storage.example.test/');
        expect(storage?.url).toBe(STORAGE);
        expect([...(storage?.headers.keys() ?? [])]).toEqual([]);
      },
    ],
    [
      'a BUNDLE on another origin carries no header and buys no token',
      async () => {
        const net = stubNetwork({ token: 'up' });
        const resolved = await resolveBundle(CDN, { app: connect() });
        if (resolved.folder) removeInstanceFolder(resolved.folder);
        expect(net.seen.map((request) => request.url)).toEqual([CDN]);
        expect([...(net.seen[0]?.headers.keys() ?? [])]).toEqual([]);
      },
    ],
    [
      'the variable is gone from the environment before the flow loads',
      async () => {
        let atFlowLoad: string | undefined = 'unread';
        runPipeline.mockImplementation(async () => {
          atFlowLoad = process.env.WALKEROS_CREDENTIAL;
        });
        await runCommand({ config: artifact });
        expect(atFlowLoad).toBeUndefined();
        expect(runPipeline.mock.calls[0]?.[0].api?.app.origin).toBe(TEST_APP);
      },
    ],
    [
      'with the token endpoint failing, the check-in and the secret read arrive signed',
      async () => {
        const net = stubNetwork({ token: 'down' });
        const app = connect();
        await fetchSecrets({ app });
        await heartbeat(app).sendOnce();
        const calls = [
          ...net.to(`${TEST_APP}/api/runner/secrets`),
          ...net.to(`${TEST_APP}/api/runner/check-in`),
        ];
        expect(calls).toHaveLength(2);
        for (const call of calls) {
          expect(call.headers.get('authorization')).toBeNull();
          for (const name of SIGNED) expect(call.headers.has(name)).toBe(true);
          expect(await verifies(call)).toBe(true);
        }
      },
    ],
    [
      'a 401 on the check-in writes the refused line once and keeps serving',
      async () => {
        stubNetwork({ token: 'up', checkIn: 401 });
        const beat = heartbeat(connect());
        await expect(beat.sendOnce()).resolves.toBeUndefined();
        await expect(beat.sendOnce()).resolves.toBeUndefined();
        expect(lines.errors.filter((line) => line === REFUSED_LINE)).toEqual([
          REFUSED_LINE,
        ]);
      },
    ],
    [
      'a set WALKEROS_TOKEN or WALKEROS_FLOW_ID changes nothing and starts no app call',
      async () => {
        const net = stubNetwork({ token: 'up' });
        delete process.env.WALKEROS_CREDENTIAL;
        process.env.WALKEROS_TOKEN = 'wos_run_left_over';
        process.env.WALKEROS_DEPLOY_TOKEN = 'wos_run_left_over';
        process.env.WALKEROS_FLOW_ID = 'flow_1';
        process.env.WALKEROS_PROJECT_ID = 'proj_1';
        process.env.WALKEROS_APP_URL = TEST_APP;
        await runCommand({ config: artifact });
        expect(runPipeline.mock.calls[0]?.[0].api).toBeUndefined();
        expect(runPipeline.mock.calls[0]?.[0].errorRing).toBeUndefined();
        expect(net.seen).toEqual([]);
      },
    ],
    [
      'a heartbeat body holding the credential string leaves masked',
      async () => {
        const net = stubNetwork({ token: 'up' });
        const now = Date.now();
        await heartbeat(connect(), () => [
          {
            message: `export failed with ${raw}`,
            count: 1,
            firstSeen: now,
            lastSeen: now,
          },
        ]).sendOnce();
        const [checkIn] = net.to(`${TEST_APP}/api/runner/check-in`);
        const text = new TextDecoder().decode(checkIn?.body);
        expect(text).toContain('export failed with ***');
        expect(text).not.toContain(raw);
      },
    ],
  ])('%s', async (_name, run) => {
    await run();
  });
});
