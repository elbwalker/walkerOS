import { startFlow } from '@walkeros/collector';
import { createEvent, getEvent } from '@walkeros/core';
import { destinationRudderStack } from '..';
import type { RudderStackAnalyticsMock, RudderStackCallback } from '../types';

const settings = {
  writeKey: 'test',
  dataPlaneUrl: 'https://hosted.rudderlabs.com',
};

/**
 * A client that sends every call except those `fails` picks, which it answers
 * the way the SDK does: through the callback, with an error.
 */
function analyticsFailing(
  fails: (params: Record<string, unknown>) => boolean,
): RudderStackAnalyticsMock {
  const send = (
    params: Record<string, unknown>,
    callback?: RudderStackCallback,
  ) => callback?.(fails(params) ? new Error('Service Unavailable') : undefined);
  return {
    track: send,
    identify: send,
    group: send,
    page: send,
    screen: send,
    alias: send,
    flush: () => Promise.resolve(),
  };
}

describe('rudderstack send failures', () => {
  it('fails a single push (batching off) when RudderStack reports the send failed', async () => {
    const { collector } = await startFlow({
      logger: { level: 'ERROR', handler: () => undefined },
      destinations: {
        rudderstack: {
          code: destinationRudderStack,
          config: { settings, batch: undefined },
          env: { analytics: analyticsFailing(() => true) },
        },
      },
    });

    const result = await collector.push(getEvent('product view'));

    expect(result.ok).toBe(false);
    expect(result.failed?.rudderstack?.reason).toMatchObject({
      code: 'transport',
      message: 'RudderStack track failed',
    });
    expect(collector.destinations.rudderstack.dlq).toHaveLength(1);

    await collector.command('shutdown');
  });

  it('gives each entry of a batch its own outcome', async () => {
    const { collector } = await startFlow({
      logger: { level: 'ERROR', handler: () => undefined },
      destinations: {
        rudderstack: {
          code: destinationRudderStack,
          config: { settings },
          env: {
            analytics: analyticsFailing(({ userId }) => userId === 'bad'),
          },
        },
      },
    });

    for (const id of ['a', 'bad', 'b'])
      await collector.push(createEvent({ name: 'product view', user: { id } }));
    await collector.command('flush');

    const status = collector.status.destinations.rudderstack;
    expect(status.count).toBe(2);
    expect(status.failed).toBe(1);
    expect(collector.destinations.rudderstack.dlq).toHaveLength(1);

    await collector.command('shutdown');
  });
});
