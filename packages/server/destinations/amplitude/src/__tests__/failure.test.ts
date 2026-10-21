jest.mock('@amplitude/analytics-node', () => ({ __esModule: true }));

import { startFlow } from '@walkeros/collector';
import { clone, createEvent, getEvent } from '@walkeros/core';
import { destinationAmplitude } from '..';
import { examples } from '../dev';
import type { Env } from '../types';

/**
 * The examples env, whose track answers the way the SDK does: it resolves
 * with the HTTP code, 503 for the events `fails` picks.
 */
function envFailing(fails: (options?: { user_id?: string }) => boolean): Env {
  const env: Env = clone(examples.env.push);
  const amplitude = env.amplitude;
  if (!amplitude) throw new Error('examples env has no amplitude');
  amplitude.track = (_type, _properties, options) => ({
    promise: Promise.resolve(
      fails(options)
        ? { code: 503, message: 'Service Unavailable' }
        : { code: 200, message: 'OK' },
    ),
  });
  return env;
}

describe('amplitude send failures', () => {
  it('fails a single push (batching off) when Amplitude answers with an error code', async () => {
    const { collector } = await startFlow({
      logger: { level: 'ERROR', handler: () => undefined },
      destinations: {
        amplitude: {
          code: destinationAmplitude,
          config: { settings: { apiKey: 'test' }, batch: undefined },
          env: envFailing(() => true),
        },
      },
    });

    const result = await collector.push(getEvent('page view'));

    expect(result.ok).toBe(false);
    expect(result.failed?.amplitude?.reason).toMatchObject({
      code: 'transport',
      status: 503,
      retryable: true,
      message: 'Amplitude track failed (code 503)',
    });
    expect(collector.destinations.amplitude.dlq).toHaveLength(1);

    await collector.command('shutdown');
  });

  it('gives each entry of a batch its own outcome', async () => {
    const { collector } = await startFlow({
      logger: { level: 'ERROR', handler: () => undefined },
      destinations: {
        amplitude: {
          code: destinationAmplitude,
          config: {
            settings: {
              apiKey: 'test',
              identify: { map: { user_id: 'user.id' } },
            },
          },
          env: envFailing((options) => options?.user_id === 'bad'),
        },
      },
    });

    for (const id of ['user-a', 'bad', 'user-b'])
      await collector.push(createEvent({ name: 'page view', user: { id } }));
    await collector.command('flush');

    const status = collector.status.destinations.amplitude;
    expect(status.count).toBe(2);
    expect(status.failed).toBe(1);
    expect(collector.destinations.amplitude.dlq).toHaveLength(1);

    await collector.command('shutdown');
  });
});
