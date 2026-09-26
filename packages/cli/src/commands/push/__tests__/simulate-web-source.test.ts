/**
 * Source simulate: only the simulated source starts, a web source runs in
 * the JSDOM page (its globals and URL), and a source whose package declares
 * simulation calls runs on its mock env with those calls recorded.
 */

import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import type { Flow } from '@walkeros/core';
import { isObject } from '@walkeros/core';
import { simulateSource } from '../index.js';
import { runPushCommand } from '../run.js';
import { bundleLocalFlow } from './local-bundle.js';

const VERSION = { version: '*' };

const PAGE_URL_SCOPE =
  '--page-url sets the page of a simulated web source; for request context use --ingest.';

const webConfig: Flow.Json = {
  version: 4,
  flows: {
    default: {
      config: {
        platform: 'web',
        bundle: {
          packages: {
            '@walkeros/collector': VERSION,
            '@walkeros/web-source-browser': VERSION,
            '@walkeros/web-source-cmp-usercentrics': VERSION,
            '@walkeros/web-source-cmp-cookiefirst': VERSION,
            '@walkeros/web-source-session': VERSION,
          },
        },
      },
      // Starting state the collector applies itself: never a source's call.
      collector: {
        globals: { language: 'en' },
        custom: { environment: 'test' },
      },
      sources: {
        browser: {
          package: '@walkeros/web-source-browser',
          primary: true,
          config: { settings: { pageview: true } },
        },
        usercentrics: {
          package: '@walkeros/web-source-cmp-usercentrics',
          config: {
            settings: {
              explicitOnly: true,
              categoryMap: {
                essential: 'functional',
                functional: 'functional',
                marketing: 'marketing',
              },
            },
          },
        },
        cookiefirst: {
          package: '@walkeros/web-source-cmp-cookiefirst',
        },
        session: {
          package: '@walkeros/web-source-session',
          config: { settings: { storage: true, length: 30 } },
        },
        sessionGated: {
          package: '@walkeros/web-source-session',
          config: {
            settings: { storage: true, consent: 'functional', length: 30 },
          },
        },
      },
    },
  },
};

const explicit = {
  status: true,
  history: [{ type: 'explicit', status: true }],
};

const explicitDecision = {
  trigger: { type: 'consent', options: { dispatch: 'cmp' } },
  content: [
    { categorySlug: 'essential', consent: explicit },
    { categorySlug: 'functional', consent: explicit },
    { categorySlug: 'marketing', consent: explicit },
  ],
};

const firstVisitImplicit = {
  trigger: { type: 'consent', options: { dispatch: 'init' } },
  content: [
    {
      categorySlug: 'essential',
      consent: { status: true, history: [{ type: 'implicit', status: true }] },
    },
    {
      categorySlug: 'functional',
      consent: {
        status: false,
        history: [{ type: 'implicit', status: false }],
      },
    },
    {
      categorySlug: 'marketing',
      consent: {
        status: false,
        history: [{ type: 'implicit', status: false }],
      },
    },
  ],
};

const marketingSession = {
  trigger: {
    type: 'load',
    options: {
      url: 'https://www.example.com/?utm_source=google&utm_medium=cpc&utm_campaign=trail&gclid=gclid-abc123',
    },
  },
  content: { storage: true },
};

const serverConfig: Flow.Json = {
  version: 4,
  flows: {
    default: {
      config: {
        platform: 'server',
        bundle: {
          packages: {
            '@walkeros/collector': VERSION,
            '@walkeros/server-source-aws': VERSION,
          },
        },
      },
      sources: {
        sqs: {
          package: '@walkeros/server-source-aws',
          import: 'sourceSqs',
          config: {
            settings: {
              queueName: 'walkeros-events',
              region: 'eu-central-1',
              waitTimeSeconds: 0,
            },
          },
        },
      },
    },
  },
};

describe('web source simulate', () => {
  let tmpDir: string;
  let bundlePath: string;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'simulate-web-source-'));
    bundlePath = await bundleLocalFlow(webConfig, path.join(tmpDir, 'web.mjs'));
  }, 180000);

  afterAll(async () => {
    await fs.remove(tmpDir);
  });

  const base = () => ({ bundlePath, silent: true });

  // The decision reaches the collector as a walker consent command: recorded
  // as the source's own call, never as an event. The starting consent and the
  // collector's globals and custom are its starting state, not the source's.
  it('records a CMP decision as its walker consent call, and nothing else', async () => {
    const result = await simulateSource(webConfig, explicitDecision, {
      ...base(),
      sourceId: 'usercentrics',
      consent: { functional: true },
    });

    expect(result.error).toBeUndefined();
    expect(result.events).toEqual([]);
    expect(result.calls).toEqual([
      {
        fn: 'elb',
        args: ['walker consent', { functional: true, marketing: true }],
        ts: expect.any(Number),
      },
    ]);
  });

  it('records the walker consent call of a CookieFirst grant', async () => {
    const result = await simulateSource(
      webConfig,
      {
        trigger: { type: 'consent' },
        content: {
          necessary: true,
          functional: true,
          performance: true,
          advertising: true,
        },
      },
      { ...base(), sourceId: 'cookiefirst' },
    );

    // The package trigger reads the grant at init and again on cf_init.
    expect(result.error).toBeUndefined();
    expect(result.calls.length).toBeGreaterThan(0);
    for (const call of result.calls)
      expect([call.fn, ...call.args]).toEqual([
        'elb',
        'walker consent',
        { functional: true, analytics: true, marketing: true },
      ]);
  });

  it('records no call for an implicit first visit', async () => {
    const result = await simulateSource(webConfig, firstVisitImplicit, {
      ...base(),
      sourceId: 'usercentrics',
    });

    expect(result.error).toBeUndefined();
    expect(result.calls).toEqual([]);
  });

  it('starts a consent-gated session from the starting consent, once', async () => {
    const result = await simulateSource(webConfig, marketingSession, {
      ...base(),
      sourceId: 'sessionGated',
      consent: { functional: true },
    });

    expect(result.error).toBeUndefined();
    expect(result.calls.map((call) => call.args[0])).toEqual([
      'user',
      'session',
    ]);
    expect(result.calls.every((call) => call.fn === 'elb')).toBe(true);
    const starts = result.events.filter(
      (event) => event.name === 'session start',
    );
    expect(starts).toHaveLength(1);
    expect(starts[0].data).toEqual(
      expect.objectContaining({ marketing: true, gclid: 'gclid-abc123' }),
    );
  });

  it('keeps a consent-gated session waiting without consent', async () => {
    const result = await simulateSource(webConfig, marketingSession, {
      ...base(),
      sourceId: 'sessionGated',
    });

    expect(result.error).toBeUndefined();
    expect(result.events).toEqual([]);
    expect(result.calls).toEqual([]);
  });

  it('runs a session source on the JSDOM storage', async () => {
    const result = await simulateSource(
      webConfig,
      {
        trigger: {
          type: 'load',
          options: {
            url: 'https://www.example.com/?utm_source=google&gclid=gclid-abc123',
          },
        },
        content: { storage: true },
      },
      { ...base(), sourceId: 'session' },
    );

    expect(result.error).toBeUndefined();
    expect(result.events.map((event) => event.name)).toContain('session start');
  });

  it('puts the page on --page-url', async () => {
    const result = await simulateSource(
      webConfig,
      { trigger: { type: 'load' }, content: {} },
      {
        ...base(),
        sourceId: 'browser',
        pageUrl: 'https://shop.example.com/p/1',
      },
    );

    expect(result.error).toBeUndefined();
    const pageView = result.events.find((event) => event.name === 'page view');
    expect(pageView?.source?.url).toBe('https://shop.example.com/p/1');
  });

  it("falls back to the trigger's options.url for the page", async () => {
    const result = await simulateSource(
      webConfig,
      {
        trigger: {
          type: 'load',
          options: { url: 'https://shop.example.com/p/2' },
        },
        content: {},
      },
      { ...base(), sourceId: 'browser' },
    );

    expect(result.error).toBeUndefined();
    const pageView = result.events.find((event) => event.name === 'page view');
    expect(pageView?.source?.url).toBe('https://shop.example.com/p/2');
  });

  it('restores the DOM globals it exposed', async () => {
    const names = ['CustomEvent', 'Event', 'localStorage', 'sessionStorage'];
    const before = names.map((name) =>
      Object.getOwnPropertyDescriptor(globalThis, name),
    );

    await simulateSource(webConfig, explicitDecision, {
      ...base(),
      sourceId: 'usercentrics',
    });

    expect(
      names.map((name) => Object.getOwnPropertyDescriptor(globalThis, name)),
    ).toEqual(before);
  });

  it.each(['/p/1', 'file:///tmp/p.html', 'data:text/html,x'])(
    'rejects a page URL that is not absolute http(s): %s',
    async (pageUrl) => {
      const result = await simulateSource(
        webConfig,
        { trigger: { type: 'load' }, content: {} },
        { ...base(), sourceId: 'browser', pageUrl },
      );

      expect(result.error?.message).toBe(
        `--page-url must be an absolute http(s) URL, e.g. https://www.example.com/ (got "${pageUrl}")`,
      );
    },
  );

  it('rejects an opaque trigger url and leaves the globals as they were', async () => {
    const names = ['CustomEvent', 'Event', 'localStorage', 'window'];
    const before = names.map((name) =>
      Object.getOwnPropertyDescriptor(globalThis, name),
    );

    const result = await simulateSource(
      webConfig,
      { trigger: { type: 'load', options: { url: 'about:blank' } } },
      { ...base(), sourceId: 'browser' },
    );

    expect(result.error?.message).toBe(
      '--page-url must be an absolute http(s) URL, e.g. https://www.example.com/ (got "about:blank")',
    );
    expect(
      names.map((name) => Object.getOwnPropertyDescriptor(globalThis, name)),
    ).toEqual(before);
  });
});

describe('server source simulate', () => {
  let tmpDir: string;
  let bundlePath: string;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'simulate-sqs-source-'));
    bundlePath = await bundleLocalFlow(
      serverConfig,
      path.join(tmpDir, 'server.mjs'),
    );
  }, 180000);

  afterAll(async () => {
    await fs.remove(tmpDir);
  });

  it('records the calls of a source that runs on its mock client', async () => {
    const result = await simulateSource(
      serverConfig,
      {
        content: {
          MessageId: 'm-1',
          Body: JSON.stringify({ name: 'page view', data: { title: 'Docs' } }),
        },
      },
      { bundlePath, silent: true, sourceId: 'sqs' },
    );

    expect(result.error).toBeUndefined();
    expect(result.events.map((event) => event.name)).toEqual(['page view']);
    expect(result.calls.map((call) => call.fn)).toContain('AWS.SQSClient.send');
  });

  it('rejects --page-url for a server source', async () => {
    const result = await simulateSource(
      serverConfig,
      { content: { MessageId: 'm-1', Body: '{}' } },
      {
        bundlePath,
        silent: true,
        sourceId: 'sqs',
        pageUrl: 'https://www.example.com/',
      },
    );

    expect(result.error?.message).toBe(PAGE_URL_SCOPE);
  });
});

describe('source command recording', () => {
  let dir: string;
  let bundlePath: string;

  // The stub source issues a command, a walker command through elb, an
  // event, and the wiring commands a source registers itself with. The wired
  // definitions live on globalThis, so the test can see them after the run.
  beforeAll(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'simulate-commands-'));
    bundlePath = path.join(dir, 'bundle.mjs');
    await fs.writeFile(
      bundlePath,
      `
const code = async ({ env }) => {
  await env.command('on', { type: 'run', rules: [] });
  await env.command('user', { id: 'u-1' });
  await env.elb('walker hook', { name: 'prePush', fn: () => undefined });
  await env.elb('walker consent', { marketing: true });
  await env.elb({ name: 'page view' });
  return { type: 'stub', config: {}, push: env.elb };
};
globalThis.__simulateStubCode = code;
globalThis.__simulateStubSources = { stub: { code, config: {} } };
export function wireConfig() {
  return { sources: globalThis.__simulateStubSources };
}
export async function startFlow(config) {
  const ok = async () => ({ ok: true });
  const env = { command: ok, elb: ok };
  for (const source of Object.values(config.sources))
    await source.code({ env, config: source.config });
  return { collector: { command: ok }, elb: ok };
}
export const __devExports = {
  '@walkeros/stub-source': async () => ({
    examples: {
      createTrigger: async (config) => {
        let flow;
        return {
          get flow() {
            return flow;
          },
          trigger: () => async () => {
            flow = await startFlow({ ...config });
          },
        };
      },
    },
  }),
};
`,
    );
  });

  afterAll(async () => {
    await fs.remove(dir);
  });

  const stubConfig: Flow.Json = {
    version: 4,
    flows: {
      default: {
        config: { platform: 'server' },
        sources: { stub: { package: '@walkeros/stub-source' } },
      },
    },
  };

  it("records the source's commands in its call shape, not its wiring", async () => {
    const result = await simulateSource(
      stubConfig,
      {},
      { bundlePath, silent: true, sourceId: 'stub' },
    );

    expect(result.error).toBeUndefined();
    expect(result.calls.map((call) => [call.fn, ...call.args])).toEqual([
      ['elb', 'user', { id: 'u-1' }],
      ['elb', 'walker consent', { marketing: true }],
    ]);
  });

  it('leaves the wired source definition untouched', async () => {
    await simulateSource(
      stubConfig,
      {},
      { bundlePath, silent: true, sourceId: 'stub' },
    );

    const wired: unknown = Reflect.get(globalThis, '__simulateStubSources');
    const code: unknown = Reflect.get(globalThis, '__simulateStubCode');
    const wiredCode =
      isObject(wired) && isObject(wired.stub) ? wired.stub.code : undefined;
    expect(wiredCode).toBe(code);
  });
});

describe('--page-url scope', () => {
  it.each([
    ['a real push', []],
    ['destination simulation', ['destination.gtag']],
    ['transformer simulation', ['transformer.enrich']],
  ])('rejects --page-url for %s', async (_label, simulate) => {
    const result = await runPushCommand({
      config: 'flow.json',
      event: '{"name":"page view"}',
      simulate,
      pageUrl: 'https://www.example.com/',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe(PAGE_URL_SCOPE);
  });
});
