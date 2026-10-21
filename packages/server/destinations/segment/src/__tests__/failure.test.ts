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

  it('fails a call the SDK refuses at once with its own StepError', async () => {
    const refusing: SegmentAnalyticsMock = {
      ...analyticsFailing(() => false),
      track: () => {
        throw new Error('invalid message');
      },
    };
    const { collector } = await startFlow({
      logger: { level: 'ERROR', handler: () => undefined },
      destinations: {
        segment: {
          code: destinationSegment,
          config: { settings: { writeKey: 'test' }, batch: undefined },
          env: { analytics: refusing },
        },
      },
    });

    const result = await collector.push(getEvent('product view'));

    expect(result.failed?.segment?.reason).toMatchObject({
      code: 'transport',
      message: 'Segment track failed',
    });

    await collector.command('shutdown');
  });

  it('says at DEBUG which mapping a declared skip found nothing for', async () => {
    const lines: Array<[string, unknown]> = [];
    const { collector } = await startFlow({
      logger: {
        level: 'DEBUG',
        handler: (_level, message, context) => lines.push([message, context]),
      },
      destinations: {
        segment: {
          code: destinationSegment,
          config: {
            settings: { writeKey: 'test' },
            batch: undefined,
            mapping: {
              company: {
                update: {
                  silent: true,
                  settings: { group: { map: { groupId: 'data.company_id' } } },
                },
              },
            },
          },
          env: { analytics: analyticsFailing(() => false) },
        },
      },
    });

    await collector.push(
      createEvent({ name: 'company update', user: { id: 'us3r' }, data: {} }),
    );

    const skips = lines.filter(([message]) =>
      message.includes('resolved to nothing'),
    );
    expect(skips).toEqual([
      [
        'Segment skipped group: group resolved to nothing',
        expect.objectContaining({ event: 'company update' }),
      ],
    ]);

    await collector.command('shutdown');
  });
});
