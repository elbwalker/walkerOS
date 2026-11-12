/**
 * Push and simulate run test events, so they never report them: a flow's own
 * `collector.observe` sends nothing from either. The flow reports to a local
 * listener, which would see the usage report a running collector sends at
 * once and the final one at shutdown.
 */

import http from 'http';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import type { Flow } from '@walkeros/core';
import { bundle } from '../../bundle/index.js';
import { simulateCollector } from '../index.js';
import { runPushCommand } from '../run.js';
import { withLocalPackages } from '../../../__tests__/helpers/local-packages.js';

function observedFlow(base: string): Flow.Json {
  return withLocalPackages({
    version: 4,
    flows: {
      default: {
        config: { platform: 'server' },
        collector: {
          observe: {
            usage: { url: `${base}/usage`, token: 'wos_usage_t1_secret' },
            preview: { url: `${base}/preview`, token: 'wos_preview_t1_secret' },
          },
        },
        destinations: {
          sink: {
            code: { type: 'sink', push: '$code:() => {}' },
            config: {},
          },
        },
      },
    },
  });
}

describe('push and simulate with a flow that names collector.observe', () => {
  let server: http.Server;
  let requests: string[];
  let tmpDir: string;
  let config: Flow.Json;

  beforeAll(async () => {
    requests = [];
    server = http.createServer((req, res) => {
      requests.push(`${req.method} ${req.url}`);
      req.resume();
      req.on('end', () => res.writeHead(200).end());
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    const address = server.address();
    if (address === null || typeof address === 'string')
      throw new Error('the listener has no port');
    config = observedFlow(`http://127.0.0.1:${address.port}`);
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'observe-dropped-'));
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await fs.remove(tmpDir);
  });

  beforeEach(() => {
    requests.length = 0;
  });

  // A prebuilt bundle is never rebuilt, so only the drop at run time covers
  // it.
  it.each<[string, () => Promise<string>]>([
    [
      'a flow config',
      async () => {
        const configPath = path.join(tmpDir, 'flow.json');
        await fs.writeJSON(configPath, config);
        return configPath;
      },
    ],
    [
      'a prebuilt push bundle',
      async () => {
        const bundlePath = path.join(tmpDir, 'push.mjs');
        await bundle(config, {
          target: 'push',
          silent: true,
          cache: false,
          buildOverrides: { output: bundlePath },
        });
        return bundlePath;
      },
    ],
  ])(
    'push of %s reports nothing',
    async (_name, input) => {
      const result = await runPushCommand({
        config: await input(),
        event: JSON.stringify({ name: 'page view', data: { title: 'Home' } }),
        silent: true,
      });

      expect(result.error).toBeUndefined();
      expect(result.success).toBe(true);
      expect(requests).toEqual([]);
    },
    120000,
  );

  it('simulate reports nothing', async () => {
    const result = await simulateCollector(
      config,
      { name: 'page view', data: { title: 'Home' } },
      { collectorName: 'default', silent: true },
    );

    expect(result.error).toBeUndefined();
    expect(result.events.map((event) => event.name)).toEqual(['page view']);
    expect(requests).toEqual([]);
  }, 120000);
});
