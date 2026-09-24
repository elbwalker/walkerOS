/**
 * Integration Test: every step example of the canonical flow file simulates
 * to its `out`, and the cross-request behaviours hold at runtime.
 *
 * - Each flow is bundled ONCE (skipWrapper), every example simulates against
 *   that prebuilt bundle (pattern: ../simulate/prebuilt-bundle.test.ts).
 * - The committed file stays path-free: local monorepo package paths are
 *   injected in memory only.
 * - Every simulation runs stores and destinations on their packages' mock
 *   envs (Sheets, Pub/Sub, BigQuery, Data Manager); the HTTP test injects
 *   the same Sheets mock, seeded with one customer.
 * - Examples a simulation cannot reproduce yet are listed in WAITING with the
 *   reason; each shows up as a todo, never as a silent skip.
 */

import fs from 'fs-extra';
import http from 'http';
import os from 'os';
import path from 'path';
import { generateKeyPairSync } from 'crypto';
import type { Flow, Simulation } from '@walkeros/core';
import { isObject } from '@walkeros/core';
import { bundleCore } from '../../../commands/bundle/bundler.js';
import { loadBundleConfig } from '../../../config/loader.js';
import { validateFlowConfig } from '../../../config/validators.js';
import {
  simulateDestination,
  simulateSource,
  simulateTransformer,
} from '../../../commands/push/index.js';
import { withFlowContext } from '../../../commands/push/flow-context.js';
import { createCLILogger } from '../../../core/cli-logger.js';
import { toPrintable } from '../../../core/to-printable.js';

const examplesDir = path.resolve(__dirname, '../../../../examples');
const configPath = path.join(examplesDir, 'flow-complete.json');
const packagesDir = path.resolve(__dirname, '../../../../..');

/**
 * The fingerprint rotates daily (UTC), so its example shows the hash of the
 * day it was recorded. The test checks the shape of the hash instead.
 */
const DAILY_HASH = 'server.transformers.fingerprint.cookielessId';

/**
 * The GA4 decoder stamps the receive time (sid is the session start, not the
 * event time), so decoded examples are compared without their timestamp.
 */
function withoutReceiveTime(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutReceiveTime);
  if (!isObject(value)) return value;
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === 'timestamp' && typeof item === 'number') {
      result[key] = 'receive-time';
    } else result[key] = withoutReceiveTime(item);
  }
  return result;
}

/** Replaces every user.hash with a marker once it has the expected shape. */
function withoutDailyHash(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutDailyHash);
  if (!isObject(value)) return value;
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === 'user' && isObject(item) && typeof item.hash === 'string') {
      expect(item.hash).toMatch(/^[0-9a-f]{16}$/);
      result[key] = { ...item, hash: 'daily' };
    } else result[key] = withoutDailyHash(item);
  }
  return result;
}

const CHROME = {
  ip: '203.0.113.42',
  path: '/collect',
  method: 'POST',
  origin: 'https://www.example.com',
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  acceptLanguage: 'en-GB,en;q=0.9',
};

/**
 * Request context per example. A step example has no `ingest` field, so the
 * request the express source would have read lives here.
 */
const INGEST: Record<string, Record<string, unknown>> = {
  'server.transformers.fingerprint.cookielessId': CHROME,
  'server.transformers.bot.human': CHROME,
  'server.transformers.bot.curl': {
    ip: CHROME.ip,
    path: CHROME.path,
    method: CHROME.method,
    origin: CHROME.origin,
    userAgent: 'curl/8.5.0',
  },
  'server.destinations.meta.purchase': CHROME,
  'server.destinations.piwikpro.orderWithGoal': CHROME,
  'server.destinations.datamanager.conversionWithGclid': CHROME,
};

const OWNER = 'docs/plans/2026-09-24-step-examples-real.md';

/** Examples no simulation can reproduce yet, with the reason and owner. */
const WAITING: Record<string, string> = {
  'web.sources.usercentrics.explicitDecision': `simulate source: the jsdom window rejects the CMP CustomEvent (${OWNER})`,
  'web.sources.session.marketingSession': `simulate source: localStorage is not defined in the simulate jsdom globals (${OWNER})`,
  'web.destinations.ga4.consentUpdate': `simulate destination does not run command examples (${OWNER})`,
  'web.destinations.gtm.productAdd': `simulate destination cannot seed the consent require waits for; dataLayer.push is not recorded (${OWNER})`,
  'web.destinations.gtm.dataLayerEcho': `simulate destination cannot seed the consent require waits for (${OWNER})`,
  'server.transformers.file.walkerJs': `simulate transformer does not capture respond; the HTTP test below serves /walker.js (${OWNER})`,
};

type Kind = 'sources' | 'transformers' | 'destinations';

interface Case {
  id: string;
  flow: string;
  kind: Kind;
  step: string;
  example: Flow.StepExample;
}

function readPackageName(dir: string): string | undefined {
  const file = path.join(dir, 'package.json');
  if (!fs.existsSync(file)) return undefined;
  const pkg: unknown = fs.readJSONSync(file);
  return isObject(pkg) && typeof pkg.name === 'string' ? pkg.name : undefined;
}

/** Every @walkeros package directory of the monorepo, by package name. */
function findPackageDirs(
  dir: string,
  depth = 0,
  found = new Map<string, string>(),
): Map<string, string> {
  const name = readPackageName(dir);
  if (name?.startsWith('@walkeros/')) found.set(name, dir);
  if (depth >= 4) return found;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (['node_modules', 'dist', 'src', 'coverage'].includes(entry.name))
      continue;
    if (entry.name.startsWith('.')) continue;
    findPackageDirs(path.join(dir, entry.name), depth + 1, found);
  }
  return found;
}

/**
 * Points every package of a flow, and its @walkeros dependencies, at the
 * monorepo. `@walkeros/server-core` stays on the registry: a flow that only
 * declares it through a dependency fails the bundler's trace check when it is
 * injected as a local path.
 */
function injectLocalPaths(flow: Flow, dirs: Map<string, string>): void {
  const packages = flow.config?.bundle?.packages;
  if (!packages) return;
  const add = (name: string): void => {
    const dir = dirs.get(name);
    if (!dir || name === '@walkeros/server-core') return;
    if (packages[name]?.path) return;
    packages[name] = { ...packages[name], path: dir };
    const pkg: unknown = fs.readJSONSync(path.join(dir, 'package.json'));
    const deps =
      isObject(pkg) && isObject(pkg.dependencies) ? pkg.dependencies : {};
    for (const dep of Object.keys(deps))
      if (dep.startsWith('@walkeros/')) add(dep);
  };
  for (const name of Object.keys(packages)) add(name);
}

function loadTestConfig(): Flow.Json {
  const config = validateFlowConfig(fs.readJSONSync(configPath));
  const dirs = findPackageDirs(packagesDir);
  for (const flow of Object.values(config.flows)) injectLocalPaths(flow, dirs);
  return config;
}

function collectCases(config: Flow.Json): Case[] {
  const cases: Case[] = [];
  for (const [flowName, flow] of Object.entries(config.flows)) {
    const kinds: [Kind, Record<string, { examples?: Flow.StepExamples }>][] = [
      ['sources', flow.sources ?? {}],
      ['transformers', flow.transformers ?? {}],
      ['destinations', flow.destinations ?? {}],
    ];
    for (const [kind, steps] of kinds) {
      for (const [step, def] of Object.entries(steps)) {
        for (const [name, example] of Object.entries(def.examples ?? {})) {
          const id = `${flowName}.${kind}.${step}.${name}`;
          cases.push({ id, flow: flowName, kind, step, example });
        }
      }
    }
  }
  return cases;
}

/**
 * Comparable form of an out: JSON strings inside effects are parsed, and the
 * per-run random `trace` is dropped.
 */
function normalize(value: unknown): unknown {
  if (typeof value === 'string') {
    if (!/^[[{]/.test(value)) return value;
    try {
      const parsed: unknown = JSON.parse(value);
      return normalize(parsed);
    } catch {
      return value;
    }
  }
  if (Array.isArray(value)) return value.map(normalize);
  if (isObject(value)) {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (key !== 'trace') result[key] = normalize(item);
    }
    return result;
  }
  return value;
}

function sourceType(event: unknown): unknown {
  return isObject(event) && isObject(event.source)
    ? event.source.type
    : undefined;
}

/** The effects a source simulation produced for one example. */
function sourceOut(result: Simulation.Result, c: Case): Flow.StepOut {
  const { step, example } = c;
  // Every source of the flow starts, so the browser's own page view shows up
  // in every web simulation: keep the simulated source's events, and of those
  // the ones its trigger fired. Server sources forward the event they
  // received, whatever its source.type.
  let events = result.events.filter(
    (event) => c.flow !== 'web' || sourceType(event) === step,
  );
  const trigger = example.trigger?.type;
  if (trigger && events.some((event) => event.trigger === trigger))
    events = events.filter((event) => event.trigger === trigger);
  return events.map((event) => {
    const { id, ...rest } = event;
    return ['elb', rest];
  });
}

function transformerOut(result: Simulation.Result): Flow.StepOut {
  if (result.events.length === 0) return [['return', false]];
  return result.events.map((event) => ['return', { event }]);
}

/**
 * Recorded vendor calls, in the printable form `push --simulate --json`
 * shows (a Buffer becomes its UTF-8 text).
 */
function destinationOut(result: Simulation.Result): Flow.StepOut {
  return result.calls.map((call) => [
    call.fn,
    ...call.args.map((arg) => toPrintable(arg)),
  ]);
}

function toEvent(value: unknown): Record<string, unknown> {
  if (!isObject(value)) throw new Error('example in is not an event');
  return value;
}

describe('flow-complete.json', () => {
  let tmpDir: string;
  let config: Flow.Json;
  const bundles: Record<string, string> = {};
  const logger = createCLILogger({ silent: true });

  beforeAll(async () => {
    tmpDir = path.join(os.tmpdir(), `flow-complete-${Date.now()}`);
    await fs.outputFile(
      path.join(tmpDir, 'assets', 'walker.js'),
      'console.log("walker.js");',
    );

    // Dummy, syntactically valid service account: the flows only read it.
    const { privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    });
    process.env.GCP_SA = JSON.stringify({
      type: 'service_account',
      project_id: 'demo-project',
      client_email: 'walkeros@demo-project.iam.gserviceaccount.com',
      private_key: privateKey,
    });
    process.env.ASSETS_DIR = path.join(tmpDir, 'assets');
    process.env.FINGERPRINT_SALT = 'flow-complete-test-salt';
    process.env.META_ACCESS_TOKEN = 'meta-access-token';
    process.env.EMAIL_SALT = 'flow-complete-email-salt';

    config = loadTestConfig();
    for (const flowName of Object.keys(config.flows)) {
      const { flowSettings, buildOptions } = loadBundleConfig(config, {
        configPath,
        flowName,
      });
      const output = path.join(tmpDir, flowName, `${flowName}.mjs`);
      buildOptions.output = output;
      buildOptions.skipWrapper = true;
      buildOptions.format = 'esm';
      buildOptions.cache = false;
      buildOptions.minify = false;
      await bundleCore(flowSettings, buildOptions, logger);
      bundles[flowName] = output;
    }

    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  }, 600000);

  afterAll(async () => {
    jest.restoreAllMocks();
    delete process.env.GCP_SA;
    delete process.env.ASSETS_DIR;
    delete process.env.FINGERPRINT_SALT;
    delete process.env.META_ACCESS_TOKEN;
    delete process.env.EMAIL_SALT;
    await fs.remove(tmpDir);
  });

  const cases = collectCases(validateFlowConfig(fs.readJSONSync(configPath)));
  const runnable = cases.filter((c) => !(c.id in WAITING));
  const waiting = cases.filter((c) => c.id in WAITING);

  it('lists only existing examples as waiting', () => {
    const ids = new Set(cases.map((c) => c.id));
    expect(Object.keys(WAITING).filter((id) => !ids.has(id))).toEqual([]);
  });

  it.each(runnable.map((c) => [c.id, c] as const))(
    'step example %s simulates to its out',
    async (id, c) => {
      const bundlePath = bundles[c.flow];
      const base = { flow: c.flow, bundlePath, silent: true };
      let out: Flow.StepOut;
      if (c.kind === 'sources') {
        const result = await simulateSource(
          config,
          { content: c.example.in, trigger: c.example.trigger },
          { ...base, sourceId: c.step },
        );
        expect(result.error).toBeUndefined();
        out = sourceOut(result, c);
      } else if (c.kind === 'transformers') {
        // A decoder example's `in` is the request (ingest), not an event.
        const decoder = c.step === 'ga4Decode';
        const result = await simulateTransformer(
          config,
          decoder ? {} : toEvent(c.example.in),
          {
            ...base,
            transformerId: c.step,
            ingest: decoder ? toEvent(c.example.in) : INGEST[id],
          },
        );
        expect(result.error).toBeUndefined();
        out = transformerOut(result);
      } else {
        const result = await simulateDestination(
          config,
          toEvent(c.example.in),
          {
            ...base,
            destinationId: c.step,
            ingest: INGEST[id],
          },
        );
        expect(result.error).toBeUndefined();
        out = destinationOut(result);
      }
      const actual = normalize(out);
      const expected = normalize(c.example.out);
      if (id === DAILY_HASH)
        expect(withoutDailyHash(actual)).toEqual(withoutDailyHash(expected));
      else if (c.step === 'ga4Decode')
        expect(withoutReceiveTime(actual)).toEqual(
          withoutReceiveTime(expected),
        );
      else expect(actual).toEqual(expected);
    },
    60000,
  );

  it.each(waiting.map((c) => [c.id, WAITING[c.id]] as const))(
    'step example %s waits: %s',
    (id) => {
      const c = cases.find((item) => item.id === id);
      expect(c?.example.out).toBeUndefined();
    },
  );

  describe('server flow over HTTP', () => {
    const headers = {
      'content-type': 'application/json',
      'user-agent': CHROME.userAgent,
      'accept-language': CHROME.acceptLanguage,
      origin: CHROME.origin,
    };
    const base = {
      consent: { functional: true, marketing: true },
      globals: { language: 'en' },
      user: { device: 'd3v1c3', session: 's3ss10n', id: 'cust-42' },
      source: {
        type: 'browser',
        platform: 'web',
        url: 'https://www.example.com/checkout/thanks',
      },
      timestamp: 1700000000000,
      trigger: 'load',
    };
    const order = (id: string, orderId: string) => ({
      ...base,
      user: { ...base.user, email: 'Jane.Doe@Example.com' },
      id,
      name: 'order complete',
      entity: 'order',
      action: 'complete',
      data: { id: orderId, total: 129.9, currency: 'EUR' },
      nested: [
        {
          entity: 'product',
          data: { id: 'SKU-1', name: 'Trail Runner', price: 129.9 },
        },
      ],
    });
    const sessionStart = {
      ...base,
      id: 'ev-session',
      name: 'session start',
      entity: 'session',
      action: 'start',
      data: {
        id: 's3ss10n',
        isNew: true,
        count: 1,
        marketing: true,
        gclid: 'gclid-abc123',
      },
    };

    it('dedups resends, restores the session, pseudonymises email for Pub/Sub, decodes only the sub-site GA4, sends an order to Meta once and serves walker.js', async () => {
      const seen: Record<string, unknown>[] = [];
      const metaBodies: unknown[] = [];

      await withFlowContext(
        { esmPath: bundles.server, platform: 'server', logger },
        async (module) => {
          const flowConfig = module.wireConfig(module.__configData);
          // The runner owns the port; the test mounts the handler itself.
          delete flowConfig.sources.express.config.settings.port;
          // The customers sheet runs on the Sheets package mock, seeded with
          // one customer whose lifetime value is 420.
          const loadSheetsDev =
            module.__devExports?.['@walkeros/server-store-sheets'];
          const sheetsDev: unknown =
            typeof loadSheetsDev === 'function'
              ? await loadSheetsDev()
              : undefined;
          const createSheetsFetch =
            isObject(sheetsDev) &&
            isObject(sheetsDev.examples) &&
            isObject(sheetsDev.examples.env)
              ? sheetsDev.examples.env.createSheetsFetch
              : undefined;
          if (typeof createSheetsFetch !== 'function')
            throw new Error('no Sheets mock');
          flowConfig.stores.customers.env = {
            fetch: createSheetsFetch([['cust-42', '420']]),
          };
          const destinations = flowConfig.destinations;
          // No GCP in the test: Data Manager and Piwik PRO leave, and a spy
          // replaces the Pub/Sub code but keeps its before route, so it sees
          // exactly what the topic would get.
          delete destinations.datamanager;
          delete destinations.piwikpro;
          destinations.meta.config.env = {
            sendServer: async (_url: string, body: string) => {
              metaBodies.push(JSON.parse(body));
              return { ok: true, data: { events_received: 1 } };
            },
          };
          destinations.pubsub.code = {
            type: 'spy',
            config: {},
            push: (event: Record<string, unknown>) => {
              seen.push(event);
            },
          };

          const flow = await module.startFlow(flowConfig);
          const handler: unknown = flow.httpHandler;
          if (typeof handler !== 'function') throw new Error('no httpHandler');
          const server = http.createServer((req, res) => {
            handler(req, res);
          });
          await new Promise<void>((resolve) => server.listen(0, resolve));
          const address = server.address();
          if (!address || typeof address === 'string')
            throw new Error('no port');
          const url = `http://127.0.0.1:${address.port}`;
          const post = (body: unknown) =>
            fetch(`${url}/collect`, {
              method: 'POST',
              headers,
              body: JSON.stringify(body),
            });
          // POST is async (the response goes out before the pipeline runs),
          // so wait for the spy, a bounded number of rounds.
          const settled = async (count: number) => {
            for (let round = 0; seen.length < count && round < 500; round++)
              await new Promise((resolve) => setTimeout(resolve, 10));
          };

          try {
            await post(sessionStart);
            await settled(1);
            await post(order('ev-order-1', 'ORD-1'));
            await settled(2);
            // Transport resend: same event id, stopped by dedup.
            await post(order('ev-order-1', 'ORD-1'));
            // Thank-you page reload: new event id, same order.
            await post(order('ev-order-2', 'ORD-1'));
            await settled(3);

            // GA4 hits: the sub-site property is decoded, the main site
            // property is dropped at the route.
            const ga4 = (tid: string, sequence: number) =>
              fetch(
                `${url}/g/collect?v=2&tid=${tid}&_p=p7&_s=${sequence}&cid=cid-9&sid=1700000000&gcs=G111&en=page_view&dl=https%3A%2F%2Fshop.example.org%2F&dt=Sub`,
                { headers },
              );
            await ga4('G-MAINSITE', 1);
            await ga4('G-SUBSITE', 2);
            await settled(4);

            const script = await fetch(`${url}/walker.js`, { headers });
            expect(script.status).toBe(200);
            expect(script.headers.get('content-type')).toContain('javascript');
            expect(script.headers.get('cache-control')).toBe(
              'public, max-age=300',
            );
            expect(script.headers.get('cross-origin-resource-policy')).toBe(
              'same-site',
            );
            expect(await script.text()).toBe('console.log("walker.js");');

            expect(seen).toHaveLength(4);
            expect(seen.slice(0, 3).map((event) => event.id)).toEqual([
              'ev-session',
              'ev-order-1',
              'ev-order-2',
            ]);
            const decoded = seen[3];
            expect(decoded.source).toMatchObject({ type: 'ga4' });
            expect(decoded.consent).toMatchObject({ functional: true });

            // Pub/Sub never sees a clear-text email; events without one
            // pass untouched.
            expect(JSON.stringify(seen)).not.toContain('@');
            expect(seen[0].user).not.toHaveProperty('email');
            for (const event of seen.slice(1, 3))
              expect(event.user).toMatchObject({
                email: expect.stringMatching(/^[0-9a-f]{64}$/),
              });
            const first = seen[1];
            expect(first.data).toMatchObject({
              session: { gclid: 'gclid-abc123' },
            });
            expect(first.user).toMatchObject({ ltv: 420 });
            expect(first.source).toMatchObject({ valid: true });
            expect(metaBodies).toHaveLength(1);
          } finally {
            await new Promise((resolve) => server.close(resolve));
            await flow.collector.command('shutdown');
          }
          return { success: true, duration: 0 };
        },
      );
    }, 60000);
  });
});
