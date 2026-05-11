import type { WalkerOS, Elb, Collector, Source } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import { sourceDataLayer } from '../index';
import type { Types } from '../types';

// Test utility for creating properly typed mock push function
export function createMockPush(collectedEvents: WalkerOS.Event[]) {
  const mockPush = jest.fn();

  // Handle Collector.PushFn signature: (event: DeepPartialEvent, context?) => Promise<PushResult>
  mockPush.mockImplementation((event: WalkerOS.DeepPartialEvent) => {
    // Create a full event from partial event
    // Extract entity/action from name
    const nameParts = (event.name || '').split(' ');
    const entity = nameParts[0] || '';
    const action = nameParts.slice(1).join(' ') || '';

    const fullEvent: WalkerOS.Event = {
      id: `test-${Date.now()}-${Math.random()}`,
      name: event.name || 'unknown',
      entity,
      action,
      data: event.data || {},
      context: event.context || {},
      globals: event.globals || {},
      user: event.user || {},
      nested: (event.nested || []).filter(
        (n): n is WalkerOS.Entity => n !== undefined,
      ),
      consent: Object.entries(event.consent || {}).reduce((acc, [key, val]) => {
        if (val !== undefined) acc[key] = val;
        return acc;
      }, {} as WalkerOS.Consent),
      custom: event.custom || {},
      trigger: event.trigger || '',
      timestamp: event.timestamp || Date.now(),
      timing: event.timing || 0,
      source: {
        type: event.source?.type || 'dataLayer',
        platform: event.source?.platform || 'web',
      },
    };
    collectedEvents.push(fullEvent);
    return Promise.resolve({
      ok: true,
      event: fullEvent,
    });
  });

  return mockPush as jest.MockedFunction<Collector.PushFn>;
}

// Type assertion for dataLayer
export function getDataLayer(name = 'dataLayer'): unknown[] {
  return (window as Record<string, unknown>)[name] as unknown[];
}

// Helper function to create and initialize a dataLayer source with proper environment.
//
// Mirrors the collector's two-pass init: factory body is side-effect-free,
// and `init` performs the dataLayer interceptor install + pendingReplayCount
// snapshot. After init, `on('run')` is fired to replay any pre-existing
// dataLayer entries via `processExistingEvents`.
//
// Pass `{ runOnInit: false }` for tests that need to drive `walker run`
// themselves (e.g. historical replay tests that verify run-gated semantics).
export async function createDataLayerSource(
  collector: Collector.Instance,
  config?: Partial<Source.Config<Types>>,
  options: { runOnInit?: boolean } = {},
): Promise<Source.Instance<Types>> {
  const { runOnInit = true } = options;
  const source = await sourceDataLayer({
    collector,
    config: config || {},
    env: {
      push: collector.push.bind(collector),
      command: collector.command.bind(collector),
      elb: collector.sources.elb.push,
      window,
      logger: createMockLogger(),
    },
    id: 'test-datalayer',
    logger: createMockLogger(),
    setIngest: async () => {},
    setRespond: jest.fn(),
  });
  // Pass 2: lifecycle init — installs the dataLayer.push interceptor and
  // snapshots pendingReplayCount.
  await source.init?.();
  if (runOnInit) {
    // Drive the run lifecycle so processExistingEvents replays any items
    // queued before init.
    await source.on?.('run', collector);
  }
  return source;
}
