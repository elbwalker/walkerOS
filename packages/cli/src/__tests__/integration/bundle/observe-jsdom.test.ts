/**
 * Observe in browser builds, run in jsdom against this working tree.
 *
 * A web flow's own `collector.observe` never reports from the visitors of a
 * site: its production bundle sends nothing and names the block it ignores.
 * A preview wrap sends preview rows to the route and token the wrap was given,
 * never usage, whatever the flow file's own block says.
 */
import { readFile, mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { JSDOM, VirtualConsole } from 'jsdom';

import { bundle } from '../../../commands/bundle/index.js';
import { wrapSkeleton } from '../../../commands/bundle/wrap.js';
import { MINIMAL_FLOW } from '../../fixtures/minimal-flow.js';
import { withLocalPackages } from '../../helpers/local-packages.js';

const INGEST = 'https://ingest.example.com';

/** The minimal flow, naming its own reporter options in its file. */
const OBSERVED_FLOW = withLocalPackages({
  ...MINIMAL_FLOW,
  flows: {
    default: {
      ...MINIMAL_FLOW.flows.default,
      collector: {
        observe: {
          usage: { url: `${INGEST}/usage`, token: 'wos_usage_t1_flow' },
          preview: {
            url: `${INGEST}/flow-preview`,
            token: 'wos_preview_t1_flow',
          },
        },
      },
    },
  },
});

interface FetchCall {
  url: string;
  authorization?: string;
  body: string;
}

interface Page {
  fetchCalls: FetchCall[];
  errors: string[];
  elb: (event: string, data?: Record<string, unknown>) => Promise<unknown>;
  wait: (ms: number) => Promise<void>;
  close: () => void;
}

function headerOf(headers: unknown, name: string): string | undefined {
  if (headers === null || typeof headers !== 'object') return undefined;
  const value: unknown = Reflect.get(headers, name);
  return typeof value === 'string' ? value : undefined;
}

/** Run a browser bundle in a fresh jsdom window with a captured fetch. */
async function load(script: string): Promise<Page> {
  const errors: string[] = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', () => {});
  virtualConsole.on('error', (...args: unknown[]) => {
    errors.push(args.map(String).join(' '));
  });

  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    runScripts: 'outside-only',
    url: 'https://shop.example.com/',
    virtualConsole,
  });

  const fetchCalls: FetchCall[] = [];
  // jsdom has no `Response`: answer with Node's, as a browser would.
  const fetch = async (
    url: unknown,
    init?: { body?: unknown; headers?: unknown },
  ): Promise<Response> => {
    fetchCalls.push({
      url: String(url),
      authorization: headerOf(init?.headers, 'Authorization'),
      body: init?.body != null ? String(init.body) : '',
    });
    return new Response('{}', { status: 200 });
  };
  Reflect.set(dom.window, 'fetch', fetch);

  const wait = (ms: number) =>
    new Promise<void>((resolve) => dom.window.setTimeout(resolve, ms));

  dom.window.eval(script);
  await wait(100);

  const elb = (event: string, data?: Record<string, unknown>) => {
    const fn: unknown = Reflect.get(dom.window, 'elb');
    if (typeof fn !== 'function') throw new Error('window.elb is missing');
    return Promise.resolve(fn(event, data));
  };

  return { fetchCalls, errors, elb, wait, close: () => dom.window.close() };
}

function ingestCalls(page: Page): FetchCall[] {
  return page.fetchCalls.filter((call) => call.url.startsWith(INGEST));
}

describe('Observe in browser builds', () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'walkeros-observe-'));
  });

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  });

  it('a production bundle of a flow that names collector.observe sends nothing and names the block', async () => {
    const out = join(tmpDir, 'walker.js');
    await bundle(OBSERVED_FLOW, {
      target: 'cdn',
      silent: true,
      cache: false,
      buildOverrides: { output: out },
    });
    const page = await load(await readFile(out, 'utf8'));

    await page.elb('page view', { title: 'Home' });
    await page.elb('walker flush');
    await page.wait(100);

    // The flow itself runs: its api destination sent the events.
    expect(
      page.fetchCalls.some((call) =>
        call.url.startsWith('https://example.com/events'),
      ),
    ).toBe(true);
    expect(ingestCalls(page)).toEqual([]);
    expect(
      page.errors.some((line) =>
        line.includes('observe: not in this build, config ignored'),
      ),
    ).toBe(true);
    page.close();
  }, 120000);

  it("a preview wrap sends preview rows to its own route only, never the flow's usage", async () => {
    const skeletonPath = join(tmpDir, 'skel.mjs');
    await bundle(OBSERVED_FLOW, {
      target: 'cdn-skeleton',
      silent: true,
      cache: false,
      buildOverrides: { output: skeletonPath },
    });
    const out = join(tmpDir, 'preview.js');
    await wrapSkeleton({
      skeletonPath,
      platform: 'browser',
      outputPath: out,
      observe: {
        preview: { url: `${INGEST}/preview`, token: 'wos_preview_t1_wrap' },
      },
    });
    const page = await load(await readFile(out, 'utf8'));

    await page.elb('page view', { title: 'Home' });
    await page.elb('walker flush');
    await page.wait(200);

    const calls = ingestCalls(page);
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) {
      expect(call.url).toBe(`${INGEST}/preview`);
      expect(call.authorization).toBe('Bearer wos_preview_t1_wrap');
    }
    const rows = calls.flatMap((call) =>
      call.body
        .split('\n')
        .filter(Boolean)
        .map((line): unknown => JSON.parse(line)),
    );
    expect(rows).toContainEqual(
      expect.objectContaining({ kind: 'event', name: 'page view' }),
    );
    expect(page.errors).toEqual([]);
    page.close();
  }, 120000);
});
