/**
 * Source simulate: only the simulated source starts, a web source runs in
 * the JSDOM page (its globals and URL), and a source whose package declares
 * simulation calls runs on its mock env with those calls recorded.
 */

import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import type { Flow } from '@walkeros/core';
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
            '@walkeros/web-source-session': VERSION,
          },
        },
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
        session: {
          package: '@walkeros/web-source-session',
          config: { settings: { storage: true, length: 30 } },
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

  // The decision reaches the collector as a walker consent command, which
  // a source simulation does not capture as an event; what it proves here
  // is that the CMP's own CustomEvent now dispatches, and that no other
  // source (the browser's page view) adds events.
  it('runs a CMP decision alone: no throw, no page view', async () => {
    const result = await simulateSource(webConfig, explicitDecision, {
      ...base(),
      sourceId: 'usercentrics',
    });

    expect(result.error).toBeUndefined();
    expect(result.events).toEqual([]);
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
