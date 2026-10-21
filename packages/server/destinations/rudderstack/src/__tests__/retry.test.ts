import type { Server } from 'http';
import { createServer } from 'http';
import { startFlow } from '@walkeros/collector';
import { createEvent } from '@walkeros/core';
import { destinationRudderStack } from '..';

/**
 * RudderStack's data plane behind the real SDK, on a local port: each
 * request gets the next answer, a status or no answer at all. Real timers:
 * axios bounds a request with the socket's own timer, which fake timers do
 * not drive, so a short config.timeout keeps the run fast.
 */
async function dataPlane(answers: Array<number | 'never'>) {
  let requests = 0;
  const server: Server = createServer((req, res) => {
    const answer = answers[Math.min(requests, answers.length - 1)];
    requests++;
    req.resume();
    if (answer !== 'never') res.writeHead(answer).end('{}');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  return {
    url: `http://127.0.0.1:${port}`,
    requests: () => requests,
    close: () => {
      server.closeAllConnections();
      return new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

/** 200 ms per request, two retries 80 ms apart: 760 ms at worst. */
const TIMEOUT = 800;

async function flowWith(dataPlaneUrl: string) {
  const { collector } = await startFlow({
    logger: { level: 'ERROR', handler: () => undefined },
    destinations: {
      rudderstack: {
        code: destinationRudderStack,
        config: {
          settings: { writeKey: 'w', dataPlaneUrl },
          batch: undefined,
          timeout: TIMEOUT,
        },
      },
    },
  });
  return collector;
}

describe('rudderstack retry within config.timeout', () => {
  it('delivers once RudderStack answers after two 503s, within the timeout', async () => {
    const plane = await dataPlane([503, 503, 200]);
    const collector = await flowWith(plane.url);

    const started = Date.now();
    const result = await collector.push(createEvent({ name: 'product view' }));

    expect(result.ok).toBe(true);
    expect(plane.requests()).toBe(3);
    expect(Date.now() - started).toBeLessThan(TIMEOUT);
    await collector.command('shutdown');
    await plane.close();
  });

  it('fails timeout once when RudderStack never answers, before the race', async () => {
    const plane = await dataPlane(['never']);
    const collector = await flowWith(plane.url);

    const result = await collector.push(createEvent({ name: 'product view' }));

    // The SDK's own timeout, not the collector's race: the package's message.
    expect(result.failed?.rudderstack?.reason).toMatchObject({
      code: 'timeout',
      message: 'RudderStack track failed',
    });
    expect(collector.status.destinations.rudderstack.failed).toBe(1);
    await plane.close();
  });
});
