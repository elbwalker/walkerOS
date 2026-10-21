jest.mock('posthog-node', () => ({ PostHog: class {} }));

import { startFlow } from '@walkeros/collector';
import { createEvent, getEvent } from '@walkeros/core';
import { destinationPostHog } from '..';
import type { Env } from '../types';

interface Failing {
  /** Captures the client refuses to queue (an invalid call). */
  capture?: (distinctId: unknown) => boolean;
  /** Fails every flush the way posthog-node does. */
  flush?: boolean;
}

/**
 * A client that fails the way posthog-node does: a failed request is an
 * `error` event plus a rejected flush.
 */
function failingEnv(failing: Failing): Env {
  return {
    PostHog: class {
      private listeners: Array<(error: unknown) => void> = [];
      on(_event: 'error', listener: (error: unknown) => void) {
        this.listeners.push(listener);
        return () => {
          this.listeners = this.listeners.filter((l) => l !== listener);
        };
      }
      capture({ distinctId }: { distinctId?: unknown }) {
        if (failing.capture?.(distinctId))
          throw new Error('The capture call was refused');
      }
      identify() {}
      groupIdentify() {}
      async flush() {
        if (!failing.flush) return;
        const error = new Error('HTTP error while fetching PostHog: 503');
        for (const listener of this.listeners) listener(error);
        throw error;
      }
      async shutdown() {}
      enable() {}
      disable() {}
    },
  };
}

describe('posthog send failures', () => {
  it('fails a single push (batching off) when its flush fails', async () => {
    const { collector } = await startFlow({
      logger: { level: 'ERROR', handler: () => undefined },
      destinations: {
        posthog: {
          code: destinationPostHog,
          config: { settings: { apiKey: 'phc_test' }, batch: undefined },
          env: failingEnv({ flush: true }),
        },
      },
    });

    const result = await collector.push(getEvent('page view'));

    expect(result.ok).toBe(false);
    expect(result.failed?.posthog?.reason).toMatchObject({
      code: 'transport',
      message: 'PostHog send failed',
    });
    expect(collector.status.destinations.posthog.failed).toBe(1);
    expect(collector.destinations.posthog.dlq).toHaveLength(1);

    await collector.command('shutdown');
  });

  it('gives each entry of a batch its own outcome', async () => {
    const { collector } = await startFlow({
      logger: { level: 'ERROR', handler: () => undefined },
      destinations: {
        posthog: {
          code: destinationPostHog,
          config: { settings: { apiKey: 'phc_test' } },
          env: failingEnv({ capture: (distinctId) => distinctId === 'bad' }),
        },
      },
    });

    for (const id of ['a', 'bad', 'b'])
      await collector.push(createEvent({ name: 'page view', user: { id } }));
    await collector.command('flush');

    const status = collector.status.destinations.posthog;
    expect(status.count).toBe(2);
    expect(status.failed).toBe(1);
    expect(collector.destinations.posthog.dlq).toHaveLength(1);

    await collector.command('shutdown');
  });

  it('fails the whole batch when its flush fails', async () => {
    const { collector } = await startFlow({
      logger: { level: 'ERROR', handler: () => undefined },
      destinations: {
        posthog: {
          code: destinationPostHog,
          config: { settings: { apiKey: 'phc_test' } },
          env: failingEnv({ flush: true }),
        },
      },
    });

    for (const id of ['a', 'b', 'c'])
      await collector.push(createEvent({ name: 'page view', user: { id } }));
    await collector.command('flush');

    const status = collector.status.destinations.posthog;
    expect(status.count).toBe(0);
    expect(status.failed).toBe(3);
    expect(collector.destinations.posthog.dlq).toHaveLength(3);

    await collector.command('shutdown');
  });
});
