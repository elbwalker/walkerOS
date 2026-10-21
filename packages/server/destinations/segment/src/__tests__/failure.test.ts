import { startFlow } from '@walkeros/collector';
import { createEvent, getEvent } from '@walkeros/core';
import { destinationSegment } from '..';
import type { SegmentAnalyticsMock, SegmentCallback } from '../types';

/**
 * A client that delivers every call except those `fails` picks, which it
 * answers the way the SDK does: through the callback, with a reason.
 */
function analyticsFailing(
  fails: (params: Record<string, unknown>) => boolean,
): SegmentAnalyticsMock {
  const send = (params: Record<string, unknown>, callback?: SegmentCallback) =>
    callback?.(fails(params) ? new Error('[503] Service Unavailable') : null);
  return {
    track: send,
    identify: send,
    group: send,
    page: send,
    screen: send,
    flush: () => Promise.resolve(),
    closeAndFlush: () => Promise.resolve(),
  };
}

describe('segment delivery failures', () => {
  it('fails a single push (batching off) when Segment reports the delivery failed', async () => {
    const { collector } = await startFlow({
      logger: { level: 'ERROR', handler: () => undefined },
      destinations: {
        segment: {
          code: destinationSegment,
          config: { settings: { writeKey: 'test' }, batch: undefined },
          env: { analytics: analyticsFailing(() => true) },
        },
      },
    });

    const result = await collector.push(getEvent('product view'));

    expect(result.ok).toBe(false);
    expect(result.failed?.segment?.reason).toMatchObject({
      code: 'transport',
      message: 'Segment track failed',
    });
    expect(collector.destinations.segment.dlq).toHaveLength(1);

    await collector.command('shutdown');
  });

  it('gives each entry of a batch its own outcome', async () => {
    const { collector } = await startFlow({
      logger: { level: 'ERROR', handler: () => undefined },
      destinations: {
        segment: {
          code: destinationSegment,
          config: { settings: { writeKey: 'test' } },
          env: {
            analytics: analyticsFailing(({ userId }) => userId === 'bad'),
          },
        },
      },
    });

    for (const id of ['a', 'bad', 'b'])
      await collector.push(createEvent({ name: 'product view', user: { id } }));
    await collector.command('flush');

    const status = collector.status.destinations.segment;
    expect(status.count).toBe(2);
    expect(status.failed).toBe(1);
    expect(collector.destinations.segment.dlq).toHaveLength(1);

    await collector.command('shutdown');
  });
});
