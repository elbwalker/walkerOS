/**
 * Which signer a flow's steps get: start mode hands a deployment's door
 * signer to the bundle as `context.authorize`, a remote child passes its own
 * through the pipeline option, and every other runner passes none. A stub
 * bundle records the context its factory receives; the runner's credential
 * read, pipeline and bundle load are real, the health server, heartbeat and
 * secrets read stand-ins, so nothing listens or calls out.
 */

import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { Authorize, ServiceTargetKind } from '@walkeros/core';
import { createCLILogger, createKnownValues } from '@walkeros/core/node';
import { SIGNATURE_TAGS, verifyRequestSignature } from '@walkeros/server-core';
import { TEST_APP, testCredential } from './helpers/credential.js';

jest.mock('../health-server.js', () => ({
  createHealthServer: jest.fn().mockResolvedValue({
    server: {},
    setFlowHandler: jest.fn(),
    setReady: jest.fn(),
    setFailed: jest.fn(),
    setDegraded: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('../heartbeat.js', () => ({
  ...jest.requireActual('../heartbeat.js'),
  createHeartbeat: jest.fn().mockReturnValue({
    start: jest.fn(),
    stop: jest.fn(),
    sendOnce: jest.fn(),
  }),
}));

jest.mock('../secrets-fetcher.js', () => ({
  ...jest.requireActual('../secrets-fetcher.js'),
  fetchSecrets: jest.fn().mockResolvedValue({}),
}));

import { resetProcessGuardsForTest, runPipeline } from '../pipeline.js';
import { runCommand } from '../run.js';

/** The global the stub bundle reports its factory's context through. */
const SEEN = '__doorAuthorizeSeen';

interface Seen {
  context: Record<string, unknown>;
  credentialInEnv: boolean;
}

const INGEST = 'https://ingest.example.test/events';

function isAuthorize(value: unknown): value is Authorize {
  return typeof value === 'function';
}

describe('the steps signer', () => {
  const originalEnv = process.env;
  const originalCwd = process.cwd();
  let dir: string;
  let bundle: string;
  let seen: Seen[];
  let arrived: Promise<Seen>;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'runner-door-'));
    bundle = join(dir, 'flow.mjs');
    writeFileSync(
      bundle,
      `export default async function (context) {
  globalThis.${SEEN}({
    context,
    credentialInEnv: process.env.WALKEROS_CREDENTIAL !== undefined,
  });
  return { collector: { push: async () => ({}), command: async () => {} } };
}
`,
    );
    seen = [];
    arrived = new Promise<Seen>((resolve) => {
      Object.assign(globalThis, {
        [SEEN]: (value: Seen) => {
          seen.push(value);
          resolve(value);
        },
      });
    });
    process.env = { ...originalEnv, WALKEROS_CACHE_DIR: join(dir, 'cache') };
    delete process.env.WALKEROS_CREDENTIAL;
    resetProcessGuardsForTest();
    // The pipeline waits for a signal once the flow runs; no handler stays.
    jest.spyOn(process, 'on').mockReturnValue(process);
    const printed: string[] = [];
    jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error(`the runner exited: ${printed.join(' | ')}`);
    });
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      printed.push(args.map(String).join(' '));
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = originalEnv;
    process.chdir(originalCwd);
    Reflect.deleteProperty(globalThis, SEEN);
    rmSync(dir, { recursive: true, force: true });
  });

  /** Start mode on the stub bundle, with the credential string given. */
  async function start(raw?: string): Promise<Seen> {
    if (raw !== undefined) process.env.WALKEROS_CREDENTIAL = raw;
    // A running flow keeps runCommand pending; an exit rejects it.
    return Promise.race([
      arrived,
      runCommand({ config: bundle, port: 8080 }).then(() => {
        throw new Error('the runner returned before the flow started');
      }),
    ]);
  }

  async function signsForIngest(
    authorize: Authorize,
    key: { kty: 'EC'; crv: 'P-256'; x: string; y: string },
  ): Promise<boolean> {
    const body = new TextEncoder().encode('{"row":1}\n');
    const headers = await authorize({ method: 'POST', url: INGEST, body });
    const result = await verifyRequestSignature({
      method: 'POST',
      url: INGEST,
      headers: new Headers(headers),
      body,
      key,
      tag: SIGNATURE_TAGS.ingest,
    });
    return result.ok;
  }

  it.each<[string, ServiceTargetKind | undefined, boolean]>([
    ['a deployment credential', 'deployment', true],
    ['an automation credential', 'automation', false],
    ['a data plane credential', 'data-plane', false],
    ['no credential', undefined, false],
  ])(
    'hands the bundle a door signer only with %s',
    async (_name, kind, signs) => {
      const made = kind ? await testCredential(kind) : undefined;

      const { context, credentialInEnv } = await start(made?.raw);

      expect(credentialInEnv).toBe(false);
      if (made) expect(JSON.stringify(context)).not.toContain(made.raw);
      const { authorize } = context;
      if (!signs || !made) {
        expect(context).not.toHaveProperty('authorize');
        return;
      }
      if (!isAuthorize(authorize))
        throw new Error('the context carries no signer');
      const { kty, crv, x, y } = made.credential.sig;
      await expect(signsForIngest(authorize, { kty, crv, x, y })).resolves.toBe(
        true,
      );
    },
  );

  // A step must never obtain headers for the app: the door signer refuses
  // the credential's resource origin with a fact and gives no header.
  it("refuses a step's POST to the credential's resource origin", async () => {
    const { raw } = await testCredential('deployment');
    const { context } = await start(raw);
    const { authorize } = context;
    if (!isAuthorize(authorize))
      throw new Error('the context carries no signer');

    await expect(
      authorize({ method: 'POST', url: `${TEST_APP}/api/runner/heartbeat` }),
    ).rejects.toThrow(
      'The door signer does not sign for the app or its auth server',
    );
  });

  // The remote child holds no credential; its signer comes as the option.
  it('hands the bundle the signer given as the pipeline option, unchanged', async () => {
    const authorize: Authorize = async () => ({ Signature: 'from the option' });

    const { context } = await Promise.race([
      arrived,
      runPipeline({
        bundlePath: bundle,
        port: 8080,
        logger: createCLILogger({}),
        knownValues: createKnownValues(),
        instanceId: '3f9a2b7c1d4e5f60',
        authorize,
      }).then(() => {
        throw new Error('the pipeline returned before the flow started');
      }),
    ]);

    expect(context.authorize).toBe(authorize);
  });
});
