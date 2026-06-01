import { startFlow } from '@walkeros/collector';
import type { WalkerOS, Collector } from '@walkeros/core';
import {
  createMockPush,
  createMockCommand,
  createSessionSource,
} from './test-utils';
import { examples } from '../dev';

describe('Session Source', () => {
  let collectedEvents: WalkerOS.Event[];
  let collector: Collector.Instance;
  let mockCommand: jest.MockedFunction<Collector.CommandFn>;

  beforeEach(async () => {
    collectedEvents = [];
    mockCommand = createMockCommand();

    // Initialize collector
    ({ collector } = await startFlow());

    // Override push with synchronous mock
    collector.push = createMockPush(collectedEvents);
    collector.command = mockCommand;
  });

  test('source initializes without errors', async () => {
    expect(async () => {
      await createSessionSource(collector);
    }).not.toThrow();
  });

  test('returns source instance with type "session"', async () => {
    const source = await createSessionSource(collector);

    expect(source.type).toBe('session');
  });

  test('returns source instance with push function', async () => {
    const source = await createSessionSource(collector);

    expect(source.push).toBeDefined();
    expect(typeof source.push).toBe('function');
  });

  test('does not expose an on handler (collector owns exactly-once)', async () => {
    const source = await createSessionSource(collector);

    // The consent rule is registered once at init via command('on', ...).
    // The collector guarantees exactly-once delivery, so the source no longer
    // reacts to consent events through its own `on` handler.
    expect(source.on).toBeUndefined();
  });

  describe('Session Start', () => {
    test('calls sessionStart on initialization', async () => {
      await createSessionSource(collector);

      // Session start should have been called, which calls command('user', ...)
      expect(mockCommand).toHaveBeenCalled();
    });
  });

  describe('Env Injection', () => {
    test('threads env.window/env.document to session', async () => {
      const mockWindow = {
        performance: {
          getEntriesByType: jest.fn().mockReturnValue([{ type: 'navigate' }]),
        },
        location: { href: 'https://injected.test/' },
      } as unknown as Window & typeof globalThis;

      const source = await createSessionSource(collector, undefined, {
        window: mockWindow,
      });

      expect(source.type).toBe('session');
      // Session initialized without errors using injected window
      expect(mockCommand).toHaveBeenCalled();
    });
  });

  describe('Consent Handling', () => {
    test('registers a single consent rule once at init', async () => {
      await createSessionSource(collector, {
        settings: { consent: 'marketing' },
      });

      // Exactly one consent registration; no re-registration on consent events
      // (the source no longer re-runs sessionStart per consent change).
      const consentRegistrations = mockCommand.mock.calls.filter(
        ([cmd, init]) =>
          cmd === 'on' &&
          (init as { type?: string } | undefined)?.type === 'consent',
      );
      expect(consentRegistrations).toHaveLength(1);
    });
  });
});
