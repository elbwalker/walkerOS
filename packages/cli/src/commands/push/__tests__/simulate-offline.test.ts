/**
 * A simulate run contacts no vendor: a source simulation starts no
 * destination, and the page answers a `<script src>` locally. A real push
 * still loads it.
 */

import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import http from 'http';
import { tmpdir } from 'os';
import { join } from 'path';
import type { Flow } from '@walkeros/core';
import { createCLILogger } from '../../../core/cli-logger.js';
import { withFlowContext } from '../flow-context';
import { simulateSource } from '../index.js';

/** What a destination's init does to load its vendor SDK. */
const loadScript = (src: string): string => `
  await new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = '${src}';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  })`;

const config: Flow.Json = {
  version: 4,
  flows: {
    default: {
      config: { platform: 'web' },
      sources: { page: { package: '@test/source' } },
    },
  },
};

describe('simulate contacts no vendor', () => {
  let dir: string;
  let server: http.Server;
  let src: string;
  let connections: number;

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'walkeros-offline-'));
    connections = 0;
    server = http.createServer((_req, res) => {
      res.setHeader('Content-Type', 'text/javascript');
      res.end('window.vendorLoaded = true;');
    });
    server.on('connection', () => connections++);
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    const address = server.address();
    if (!address || typeof address === 'string')
      throw new Error('server has no port');
    src = `http://127.0.0.1:${address.port}/loader.js`;
  });

  afterEach(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    rmSync(dir, { recursive: true, force: true });
  });

  /** A web flow wired with two destinations, whose source runs `trigger`. */
  function writeBundle(trigger: string): string {
    const bundlePath = join(dir, 'bundle.mjs');
    writeFileSync(
      bundlePath,
      `
export const __devExports = {
  '@test/source': async () => ({
    examples: {
      createTrigger: async (config) => ({
        flow: undefined,
        trigger: () => async () => {
${trigger}
        },
      }),
    },
  }),
};

export function wireConfig() {
  return { sources: { page: {} }, destinations: { ga4: {}, posthog: {} } };
}

export async function startFlow() {
  return { loaded: ${loadScript(src)}, ran: window.vendorLoaded === true };
}
`,
      'utf-8',
    );
    return bundlePath;
  }

  it('a source simulation starts no destination', async () => {
    const bundlePath = writeBundle(
      '          globalThis.startedDestinations = Object.keys(config.destinations);',
    );

    try {
      const result = await simulateSource(config, '', {
        sourceId: 'page',
        bundlePath,
        silent: true,
      });

      expect(result.error).toBeUndefined();
      expect(Reflect.get(globalThis, 'startedDestinations')).toEqual([]);
    } finally {
      Reflect.deleteProperty(globalThis, 'startedDestinations');
    }
  });

  it('a simulate run answers a script the page loads without a request', async () => {
    const bundlePath = writeBundle(`          ${loadScript(src)};`);

    const result = await simulateSource(config, '', {
      sourceId: 'page',
      bundlePath,
      silent: true,
    });

    expect(result.error).toBeUndefined();
    expect(connections).toBe(0);
  });

  it('a real push still loads the script', async () => {
    const bundlePath = writeBundle('');
    let flow: unknown;

    await withFlowContext(
      {
        esmPath: bundlePath,
        platform: 'web',
        logger: createCLILogger({ silent: true }),
        networkCalls: [],
      },
      async (mod) => {
        flow = await mod.startFlow({});
        return { success: true, duration: 0 };
      },
    );

    expect(flow).toEqual({ loaded: true, ran: true });
    expect(connections).toBeGreaterThan(0);
  });
});
