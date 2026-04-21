/**
 * Task 7: jsdom smoke test for the CDN bundle.
 *
 * Ensures that the full two-stage cdn target produces a script that, when
 * evaluated in a jsdom browser-like environment:
 *   - exposes window.elb as a callable function
 *   - initializes window.elbLayer as an array
 *   - actually routes an event through the collector into the api destination
 *     (observed via a captured fetch call)
 *
 * The third assertion is the Bug 2 regression guard: before the env-injection
 * fix, the IIFE would load but pushes to elb/elbLayer would never reach the
 * api destination because the browser source never wired up `window`/`document`.
 */
import { readFile, mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { JSDOM, VirtualConsole } from 'jsdom';

import { bundle } from '../../../commands/bundle/index.js';
import { MINIMAL_FLOW } from '../../fixtures/minimal-flow.js';

interface FetchCall {
  url: string;
  body?: string;
}

interface LoadedBundle {
  dom: JSDOM;
  fetchCalls: FetchCall[];
}

describe('CDN bundle — jsdom smoke', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'walkeros-jsdom-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  });

  async function buildAndLoad(): Promise<LoadedBundle> {
    const out = join(tmpDir, 'walker.js');
    await bundle(MINIMAL_FLOW, {
      target: 'cdn',
      silent: true,
      buildOverrides: {
        output: out,
        windowCollector: 'walkerOS',
        windowElb: 'elb',
      },
    });
    const script = await readFile(out, 'utf8');

    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', () => {});

    const dom = new JSDOM('<!doctype html><html><body></body></html>', {
      runScripts: 'outside-only',
      url: 'https://example.com/',
      virtualConsole,
    });

    const fetchCalls: FetchCall[] = [];
    const windowAny = dom.window as unknown as {
      fetch: (url: unknown, init?: { body?: unknown }) => unknown;
      Response: new (body?: unknown, init?: unknown) => unknown;
      setTimeout: typeof setTimeout;
    };
    windowAny.fetch = (async (url: unknown, init?: { body?: unknown }) => {
      fetchCalls.push({
        url: String(url),
        body: init?.body != null ? String(init.body) : undefined,
      });
      return new windowAny.Response('{}', { status: 200 });
    }) as unknown as typeof windowAny.fetch;

    dom.window.eval(script);
    // Wait for async startFlow to resolve.
    await new Promise((r) => windowAny.setTimeout(r, 100));

    return { dom, fetchCalls };
  }

  it('sets window.elb as a function after load', async () => {
    const { dom } = await buildAndLoad();
    expect(typeof (dom.window as unknown as { elb: unknown }).elb).toBe(
      'function',
    );
    dom.window.close();
  }, 120000);

  it('sets window.elbLayer as an array after load', async () => {
    const { dom } = await buildAndLoad();
    expect(
      Array.isArray((dom.window as unknown as { elbLayer: unknown }).elbLayer),
    ).toBe(true);
    dom.window.close();
  }, 120000);

  // Bug 2 regression: previously elbLayer existed but nothing routed through
  // to destinations because the browser source had no env.window/env.document.
  it('elb("page view") reaches the api destination via elbLayer', async () => {
    const { dom, fetchCalls } = await buildAndLoad();
    const win = dom.window as unknown as {
      elb: (event: string, data?: Record<string, unknown>) => void;
      setTimeout: typeof setTimeout;
    };

    win.elb('page view', { title: 'Test' });
    await new Promise((r) => win.setTimeout(r, 50));

    expect(fetchCalls.length).toBeGreaterThan(0);
    const last = fetchCalls[fetchCalls.length - 1];
    expect(last.url).toContain('example.com/events');
    expect(last.body).toContain('page view');

    dom.window.close();
  }, 120000);
});
