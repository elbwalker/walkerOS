import type { WalkerOS, Collector, Source } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import { sourceSession } from '../index';
import type { Types } from '../types';

// Test utility for creating properly typed mock push function
export function createMockPush(collectedEvents: WalkerOS.Event[]) {
  const mockPush = jest.fn();

  mockPush.mockImplementation((event: WalkerOS.DeepPartialEvent) => {
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
      group: event.group || '',
      count: event.count || 0,
      version: {
        source: event.version?.source || '1.0.0',
        tagging: event.version?.tagging || 2,
      },
      source: {
        type: event.source?.type || 'session',
        id: event.source?.id || '',
        previous_id: event.source?.previous_id || '',
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

// Helper function to create mock command function
export function createMockCommand() {
  return jest.fn() as jest.MockedFunction<Collector.CommandFn>;
}

// Helper function to create and initialize a session source with proper environment
export async function createSessionSource(
  collector: Collector.Instance,
  config?: Partial<Source.Config<Types>>,
): Promise<Source.Instance<Types>> {
  return await sourceSession({
    collector,
    config: config || {},
    env: {
      push: collector.push.bind(collector),
      command: collector.command.bind(collector),
      elb: collector.sources?.elb?.push,
      logger: createMockLogger(),
    },
    id: 'test-session',
    logger: createMockLogger(),
    setIngest: async () => {},
  });
}
