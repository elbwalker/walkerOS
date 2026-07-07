import { startFlow } from '@walkeros/collector';
import type { WalkerOS, Collector } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import { sourceSession } from '../index';
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
    test('ungated path registers a run subscription at init (emit deferred to run)', async () => {
      await createSessionSource(collector);

      // No consent configured: the emit is deferred to the run lifecycle, so
      // init registers a single on('run') rule rather than emitting at init
      // (which would be dropped at the collector's dormant gate).
      const runRegistrations = mockCommand.mock.calls.filter(
        ([cmd, data]) =>
          cmd === 'on' &&
          (data as { type?: string } | undefined)?.type === 'run',
      );
      expect(runRegistrations).toHaveLength(1);
    });
  });

  describe('factory side-effect-free (init hygiene)', () => {
    test('factory does not run sessionStart until init() runs', async () => {
      const source = await sourceSession({
        collector,
        config: { settings: { consent: 'marketing' } },
        env: {
          push: collector.push.bind(collector),
          command: mockCommand,
          elb: collector.elb,
          logger: createMockLogger(),
        },
        id: 'test-session',
        logger: createMockLogger(),
        withScope: async (_r, _resp, body) => body({} as never),
      });

      // Pass-1 factory must be side-effect-free: sessionStart (which registers
      // the consent rule + may emit state) has not run yet.
      expect(mockCommand).not.toHaveBeenCalled();

      // init() (Pass 2) runs sessionStart.
      await source.init?.();
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
