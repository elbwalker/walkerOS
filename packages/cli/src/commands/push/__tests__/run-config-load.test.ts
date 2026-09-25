/**
 * `walkeros push` reads its config once, whatever it runs: the flow config
 * handed to every simulation, and the one a real push bundles, is the one read
 * for its secrets. A URL is fetched exactly once.
 */

import http from 'http';
import { runPushCommand } from '../run.js';

const flowJson = {
  version: 4,
  flows: { default: { config: { platform: 'server' } } },
};

describe('push config load', () => {
  let server: http.Server;
  let url: string;
  let requests = 0;

  beforeAll(async () => {
    server = http.createServer((_req, res) => {
      requests++;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(flowJson));
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    if (!address || typeof address === 'string')
      throw new Error('server has no port');
    url = `http://127.0.0.1:${address.port}/flow.json`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(() => {
    requests = 0;
  });

  // The flow name does not exist, so each run stops right after its load.
  it.each([
    ['a source simulation', ['source.browser']],
    ['a transformer simulation', ['transformer.enrich']],
    ['a collector simulation', ['collector.default']],
    ['a two-destination simulation', ['destination.a', 'destination.b']],
    ['a real push', []],
  ])('fetches a URL config once for %s', async (_label, simulate) => {
    const result = await runPushCommand({
      config: url,
      event: '{"name":"page view"}',
      flow: 'missing',
      simulate,
      silent: true,
    });

    expect(result.success).toBe(false);
    expect(requests).toBe(1);
  });
});
