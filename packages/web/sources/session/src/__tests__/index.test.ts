import { startFlow } from '@walkeros/collector';
import type { WalkerOS, Collector } from '@walkeros/core';
import {
  createMockPush,
  createMockCommand,
  createSessionSource,
} from './test-utils';

describe('Session Source', () => {
  let collectedEvents: WalkerOS.Event[];
  let collector: Collector.Instance;
  let mockCommand: jest.MockedFunction<Collector.CommandFn>;

  beforeEach(async () => {
    collectedEvents = [];
    mockCommand = createMockCommand();

    // Initialize collector
    ({ collector } = await startFlow({
      tagging: 2,
    }));

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

  test('returns source instance with on function', async () => {
    const source = await createSessionSource(collector);

    expect(source.on).toBeDefined();
    expect(typeof source.on).toBe('function');
  });

  describe('Session Start', () => {
    test('calls sessionStart on initialization', async () => {
      await createSessionSource(collector);

      // Session start should have been called, which calls command('user', ...)
      expect(mockCommand).toHaveBeenCalled();
    });

    test('pushes session start event when session is new', async () => {
      await createSessionSource(collector);

      // Should have pushed a session start event
      const sessionEvent = collectedEvents.find(
        (e) => e.name === 'session start',
      );
      expect(sessionEvent).toBeDefined();
    });
  });

  describe('Consent Handling', () => {
    test('re-initializes session on consent event', async () => {
      const source = await createSessionSource(collector);

      // Clear previous calls
      mockCommand.mockClear();

      // Trigger consent event
      await source.on?.('consent');

      // Session should be re-initialized
      expect(mockCommand).toHaveBeenCalled();
    });

    test('does not re-initialize on other events', async () => {
      const source = await createSessionSource(collector);

      // Clear previous calls
      mockCommand.mockClear();

      // Trigger other events
      await source.on?.('ready');
      await source.on?.('run');

      // Session should NOT be re-initialized for these events
      expect(mockCommand).not.toHaveBeenCalled();
    });
  });
});
