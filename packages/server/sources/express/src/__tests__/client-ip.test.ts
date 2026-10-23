import { startFlow } from '@walkeros/collector';
import { isObject, isString, Source } from '@walkeros/core';
import type {
  Destination,
  Ingest,
  Mapping,
  Source as SourceNS,
} from '@walkeros/core';
import { sourceExpress } from '../index';
import type { ExpressSource, Types } from '../types';

function serverOf(
  source: SourceNS.Instance<Types>,
): ExpressSource['server'] | undefined {
  const candidate: { type: string; server?: ExpressSource['server'] } = source;
  return candidate.server;
}

// The documented one-liner for a proxy that appends `<client-ip>, <proxy-ip>`:
// the entry one hop in from the right of X-Forwarded-For.
const secondFromRight: Mapping.Fn = (scope) => {
  if (!isObject(scope) || !isObject(scope.headers)) return undefined;
  const chain = scope.headers['x-forwarded-for'];
  return isString(chain) ? chain.split(',').at(-2)?.trim() : undefined;
};

/**
 * One request to a started Express source on a real collector, with
 * `config.ingest.map.ip` set to the given mapping; returns the ingest the
 * destination receives.
 */
async function ingestFor(
  ip: Mapping.Value,
  headers: Record<string, string>,
): Promise<Ingest> {
  const received: Ingest[] = [];
  const recorder: Destination.Instance = {
    type: 'recorder',
    config: {},
    push: (_event, context) => {
      received.push(context.ingest);
    },
  };
  const { collector } = await startFlow({
    sources: {
      express: {
        code: sourceExpress,
        config: {
          async: false,
          settings: { port: 0, paths: ['/collect'] },
          ingest: { map: { ip } },
        },
      },
    },
    destinations: { recorder: { code: recorder } },
  });
  const server = serverOf(Source.getSource<Types>(collector, 'express'));
  try {
    const address = server?.address();
    if (!address || typeof address === 'string') {
      throw new Error('Server did not bind');
    }
    const response = await fetch(`http://127.0.0.1:${address.port}/collect`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify({ name: 'page view' }),
    });
    expect(response.status).toBe(200);
  } finally {
    await new Promise<void>((resolve) => {
      if (!server) return resolve();
      server.close(() => resolve());
    });
  }
  expect(received).toHaveLength(1);
  return received[0];
}

describe('client IP behind a proxy, as the Express docs map it', () => {
  it.each([
    [
      'a single-address header the proxy sets',
      { key: 'headers.x-client-ip' },
      { 'x-client-ip': '203.0.113.7' },
      '203.0.113.7',
    ],
    [
      'the second entry from the right of X-Forwarded-For',
      { fn: secondFromRight },
      { 'x-forwarded-for': '198.51.100.9, 203.0.113.7, 10.0.0.1' },
      '203.0.113.7',
    ],
  ])('reads %s into ingest.ip', async (_, ip, headers, expected) => {
    const ingest = await ingestFor(ip, headers);

    expect(ingest.ip).toBe(expected);
  });

  it('leaves ingest.ip absent when X-Forwarded-For has a single entry', async () => {
    const ingest = await ingestFor(
      { fn: secondFromRight },
      { 'x-forwarded-for': '10.0.0.1' },
    );

    expect(ingest).not.toHaveProperty('ip');
  });
});
